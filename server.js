// Kutilmagan xatoliklarni ushlash
process.on("uncaughtException", (err) => {
  console.error("Kutilmagan xatolik:", err)
})

const PORT = process.env.PORT || 3001

const express = require("express")
const fs = require("fs-extra")
const { v4: uuidv4 } = require("uuid")
const cors = require("cors")
const path = require("path")
const fileUpload = require("express-fileupload")
const PDFDocument = require("pdfkit")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload())

// Absolyut yo'llarni ishlatish
const dataDir = path.join(__dirname, "data")
fs.ensureDirSync(dataDir)

// Fayl yo'llarini to'g'ri ko'rsatish
const testsFile = path.join(dataDir, "tests.json")
const testResultsFile = path.join(dataDir, "test-results.json")
const certificatesFile = path.join(dataDir, "certificates.json")
const templateFile = path.join(dataDir, "template.json")
const uploadsDir = path.join(__dirname, "uploads")
const certificatesDir = path.join(uploadsDir, "certificates")

fs.ensureDirSync(uploadsDir)
fs.ensureDirSync(certificatesDir)

// Ma'lumotlar fayllarini yaratish (agar mavjud bo'lmasa)
if (!fs.existsSync(testsFile)) {
  fs.writeJsonSync(testsFile, { tests: [] })
}

if (!fs.existsSync(testResultsFile)) {
  fs.writeJsonSync(testResultsFile, { results: [] })
}

if (!fs.existsSync(certificatesFile)) {
  fs.writeJsonSync(certificatesFile, { certificates: [] })
}

if (!fs.existsSync(templateFile)) {
  fs.writeJsonSync(templateFile, { template: "" })
}

// Statik fayllarni xizmat qilish
app.use("/api/student_api/images", express.static(uploadsDir))

// Talaba API yo'llari
app.get("/api/student_api/tests/active", async (req, res) => {
  try {
    const data = await fs.readJson(testsFile)
    const activeTests = (data.tests || []).filter((test) => test.isActive)

    // Xavfsizlik uchun savollarni olib tashlash
    const testsForStudents = activeTests.map((test) => {
      return {
        id: test.id,
        name: test.name,
        description: test.description,
        duration: test.duration,
        questionCount: test.questionCount,
        passingScore: test.passingScore,
      }
    })

    res.json({ tests: testsForStudents })
  } catch (error) {
    console.error("Faol testlarni olishda xatolik:", error)
    res.status(500).json({ error: "Faol testlarni olishda xatolik yuz berdi" })
  }
})

app.get("/api/student_api/tests/:id", async (req, res) => {
  try {
    const testId = req.params.id
    const data = await fs.readJson(testsFile)
    const test = (data.tests || []).find((t) => t.id === testId)

    if (!test) {
      return res.status(404).json({ error: "Test topilmadi" })
    }

    res.json(test)
  } catch (error) {
    console.error("Testni olishda xatolik:", error)
    res.status(500).json({ error: "Testni olishda xatolik yuz berdi" })
  }
})

app.post("/api/student_api/test-results", async (req, res) => {
  try {
    const { testId, score, passed, timeSpent, answers } = req.body
    const studentId = req.headers["x-student-id"] || "anonymous"
    const studentName = req.headers["x-student-name"] || "Anonymous Student"

    // Kerakli maydonlarni tekshirish
    if (!testId || score === undefined || passed === undefined) {
      return res.status(400).json({ error: "Kerakli maydonlar to'ldirilmagan" })
    }

    // Testni olish
    const testsData = await fs.readJson(testsFile)
    const test = (testsData.tests || []).find((t) => t.id === testId)

    if (!test) {
      return res.status(404).json({ error: "Test topilmadi" })
    }

    // Test natijasini yaratish
    const testResult = {
      id: uuidv4(),
      testId,
      testName: test.name,
      studentId,
      studentName,
      score,
      passed,
      timeSpent,
      answers,
      date: new Date().toISOString(),
    }

    // Test natijasini saqlash
    const resultsData = await fs.readJson(testResultsFile)
    const results = resultsData.results || []
    results.push(testResult)
    await fs.writeJson(testResultsFile, { results })

    // Agar o'tgan bo'lsa, sertifikat yaratish
    if (passed) {
      const certificate = {
        id: uuidv4(),
        testResultId: testResult.id,
        testId,
        testName: test.name,
        studentId,
        studentName,
        score,
        date: new Date().toISOString(),
      }

      const certificatesData = await fs.readJson(certificatesFile)
      const certificates = certificatesData.certificates || []
      certificates.push(certificate)
      await fs.writeJson(certificatesFile, { certificates })

      testResult.certificateId = certificate.id

      // Sertifikat rasmini yaratish
      await generateCertificateImage(certificate)
    }

    res.status(201).json(testResult)
  } catch (error) {
    console.error("Test natijasini yuborishda xatolik:", error)
    res.status(500).json({ error: "Test natijasini yuborishda xatolik yuz berdi" })
  }
})

// Sertifikat rasmini yaratish
async function generateCertificateImage(certificate) {
  try {
    // PDF ni to'g'ridan-to'g'ri yaratish
    const pdfPath = path.join(certificatesDir, `${certificate.id}.pdf`)
    const doc = new PDFDocument({ size: "A4", margin: 50 })
    const stream = fs.createWriteStream(pdfPath)

    doc.pipe(stream)

    // Shablonni olish
    const templateData = await fs.readJson(templateFile)
    const template = templateData.template || ""

    // Sanani formatlash
    const date = new Date(certificate.date)
    const formattedDate = date.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Sertifikat mazmunini chizish
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#7c3aed").text("SERTIFIKAT", { align: "center" }).moveDown(1)

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#111827")
      .text(certificate.studentName, { align: "center" })
      .moveDown(0.5)

    doc
      .font("Helvetica")
      .fontSize(14)
      .text(`${certificate.testName} testidan muvaffaqiyatli o'tganligi uchun berildi`, { align: "center" })
      .moveDown(1)

    doc.font("Helvetica-Bold").fontSize(16).text(`Natija: ${certificate.score}%`, { align: "center" }).moveDown(0.5)

    doc.font("Helvetica").fontSize(14).text(`Sana: ${formattedDate}`, { align: "center" })

    // Chegarani qo'shish
    doc
      .rect(50, 50, doc.page.width - 100, doc.page.height - 100)
      .lineWidth(3)
      .stroke("#7c3aed")

    doc.end()

    // Brauzerda ko'rish uchun oddiy HTML yaratish
    const htmlContent = `
      <div style="text-align: center; padding: 20px; border: 2px solid #7c3aed; border-radius: 10px;">
        <h1 style="color: #7c3aed; margin-bottom: 20px;">SERTIFIKAT</h1>
        <p style="font-size: 18px; margin-bottom: 10px;">${certificate.studentName}</p>
        <p style="font-size: 16px;">${certificate.testName} testidan muvaffaqiyatli o'tganligi uchun berildi</p>
        <p style="font-size: 18px;">Natija: ${certificate.score}%</p>
        <p style="font-size: 18px;">Sana: ${formattedDate}</p>
      </div>
    `

    // HTML mazmunini saqlash
    const htmlPath = path.join(certificatesDir, `${certificate.id}.html`)
    await fs.writeFile(htmlPath, htmlContent)
  } catch (error) {
    console.error("Sertifikat yaratishda xatolik:", error)
  }
}

app.get("/api/student_api/certificates", async (req, res) => {
  try {
    const studentId = req.query.studentId || "anonymous"

    const certificatesData = await fs.readJson(certificatesFile)
    let certificates = certificatesData.certificates || []

    // Talaba ID bo'yicha filtrlash
    if (studentId) {
      certificates = certificates.filter((cert) => cert.studentId === studentId)
    }

    res.json({ certificates })
  } catch (error) {
    console.error("Sertifikatlarni olishda xatolik:", error)
    res.status(500).json({ error: "Sertifikatlarni olishda xatolik yuz berdi" })
  }
})

// Sertifikatni ko'rish funksiyasini to'g'rilash
app.get("/api/student_api/certificates/view/:id", async (req, res) => {
  try {
    const certificateId = req.params.id

    // Sertifikatni olish
    const certificatesData = await fs.readJson(certificatesFile)
    const certificate = (certificatesData.certificates || []).find((c) => c.id === certificateId)

    if (!certificate) {
      return res.status(404).send("Sertifikat topilmadi")
    }

    // Shablonni olish
    const templateData = await fs.readJson(templateFile)
    const template = templateData.template || ""

    // Sanani formatlash
    const date = new Date(certificate.date)
    const formattedDate = date.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // HTML sertifikatni yaratish
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sertifikat - ${certificate.studentName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f9fafb;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .certificate {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 800px;
            width: 100%;
            border: 10px solid #7c3aed;
            position: relative;
          }
          .certificate h1 {
            color: #7c3aed;
            text-align: center;
            font-size: 36px;
            margin-bottom: 30px;
          }
          .certificate p {
            text-align: center;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .student-name {
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0;
          }
          .medal {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 100px;
            height: 100px;
            background-color: gold;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(-15deg);
            font-weight: bold;
            font-size: 24px;
          }
          .print-button {
            margin-top: 30px;
            text-align: center;
          }
          .print-button button {
            background-color: #7c3aed;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          @media print {
            .print-button {
              display: none;
            }
            body {
              background-color: white;
            }
            .certificate {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="medal">A+</div>
          <h1>SERTIFIKAT</h1>
          <p class="student-name">${certificate.studentName}</p>
          <p>${certificate.testName} testidan muvaffaqiyatli o'tganligi uchun berildi</p>
          <p><strong>Natija:</strong> ${certificate.score}%</p>
          <p><strong>Sana:</strong> ${formattedDate}</p>
          
          <div class="print-button">
            <button onclick="window.print()">Chop etish</button>
          </div>
        </div>
      </body>
      </html>
    `

    res.send(htmlContent)
  } catch (error) {
    console.error("Sertifikatni ko'rishda xatolik:", error)
    res.status(500).send("Sertifikatni ko'rishda xatolik")
  }
})

// Sertifikatni yuklab olish funksiyasini to'g'rilash
app.get("/api/student_api/certificates/download/:id", async (req, res) => {
  try {
    const certificateId = req.params.id
    const format = req.query.format || "html"

    // Sertifikatni olish
    const certificatesData = await fs.readJson(certificatesFile)
    const certificate = (certificatesData.certificates || []).find((c) => c.id === certificateId)

    if (!certificate) {
      return res.status(404).json({ error: "Sertifikat topilmadi" })
    }

    // Sanani formatlash
    const date = new Date(certificate.date)
    const formattedDate = date.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // PDF so'ralgan bo'lsa
    if (format === "pdf") {
      const pdfPath = path.join(certificatesDir, `${certificateId}.pdf`)

      // Agar PDF mavjud bo'lmasa, uni yaratish
      if (!fs.existsSync(pdfPath)) {
        // PDF yaratish
        const doc = new PDFDocument({ size: "A4", margin: 50 })
        const stream = fs.createWriteStream(pdfPath)

        doc.pipe(stream)

        // PDF ga mazmun qo'shish
        doc.font("Helvetica-Bold").fontSize(28).fillColor("#7c3aed").text("SERTIFIKAT", { align: "center" }).moveDown(1)

        doc
          .font("Helvetica-Bold")
          .fontSize(20)
          .fillColor("#111827")
          .text(certificate.studentName, { align: "center" })
          .moveDown(0.5)

        doc
          .font("Helvetica")
          .fontSize(14)
          .text(`${certificate.testName} testidan muvaffaqiyatli o'tganligi uchun berildi`, { align: "center" })
          .moveDown(1)

        doc.font("Helvetica-Bold").fontSize(16).text(`Natija: ${certificate.score}%`, { align: "center" }).moveDown(0.5)

        doc.font("Helvetica").fontSize(14).text(`Sana: ${formattedDate}`, { align: "center" })

        // Chegarani qo'shish
        doc
          .rect(50, 50, doc.page.width - 100, doc.page.height - 100)
          .lineWidth(3)
          .stroke("#7c3aed")

        doc.end()

        // PDF yaratilishini kutish
        await new Promise((resolve) => {
          stream.on("finish", resolve)
        })
      }

      // PDF ni yuborish
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="certificate-${certificateId}.pdf"`)
      return fs.createReadStream(pdfPath).pipe(res)
    }

    // HTML format uchun ko'rish sahifasiga yo'naltirish
    if (format === "html") {
      return res.redirect(`/api/student_api/certificates/view/${certificateId}`)
    }

    // Sertifikat ma'lumotlarini JSON sifatida qaytarish
    res.json({
      certificate,
      formattedDate,
    })
  } catch (error) {
    console.error("Sertifikatni yuklab olishda xatolik:", error)
    res.status(500).json({ error: "Sertifikatni yuklab olishda xatolik yuz berdi" })
  }
})

// Admin API yo'llari
app.get("/api/student_api/tests", async (req, res) => {
  try {
    const data = await fs.readJson(testsFile)
    res.json({ tests: data.tests || [] })
  } catch (error) {
    console.error("Testlarni olishda xatolik:", error)
    res.status(500).json({ error: "Testlarni olishda xatolik yuz berdi" })
  }
})

app.post("/api/student_api/tests", async (req, res) => {
  try {
    const { name, description, content, duration, questionCount, passingScore, isActive } = req.body

    // Kerakli maydonlarni tekshirish
    if (!name || !description || !content) {
      return res.status(400).json({ error: "Kerakli maydonlar to'ldirilmagan" })
    }

    // Mazmunni agar string bo'lsa parse qilish
    let parsedContent = content
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content)
      } catch (e) {
        return res.status(400).json({ error: "Noto'g'ri mazmun formati" })
      }
    }

    // Rasm yuklamalarini boshqarish
    const uploadedImages = []
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images]

      for (const image of images) {
        const imageName = `${Date.now()}-${image.name}`
        const imagePath = path.join(uploadsDir, imageName)

        await image.mv(imagePath)
        uploadedImages.push(imageName)

        // Savollardagi rasm URL larini yangilash
        parsedContent = parsedContent.map((q) => {
          if (q.imageUrl && q.imageUrl === image.name) {
            return { ...q, imageUrl: imageName }
          }
          return q
        })
      }
    }

    // Yangi test yaratish
    const newTest = {
      id: uuidv4(),
      name,
      description,
      questions: parsedContent,
      duration: Number.parseInt(duration) || 30,
      questionCount: Number.parseInt(questionCount) || 20,
      passingScore: Number.parseInt(passingScore) || 70,
      isActive: isActive === "true" || isActive === true,
      createdAt: new Date().toISOString(),
    }

    // Testni saqlash
    const data = await fs.readJson(testsFile)
    const tests = data.tests || []
    tests.push(newTest)
    await fs.writeJson(testsFile, { tests })

    res.status(201).json({ message: "Test muvaffaqiyatli yaratildi", test: newTest })
  } catch (error) {
    console.error("Test yaratishda xatolik:", error)
    res.status(500).json({ error: "Test yaratishda xatolik yuz berdi" })
  }
})

app.put("/api/student_api/tests/:id", async (req, res) => {
  try {
    const testId = req.params.id
    const { name, description, duration, questionCount, passingScore, isActive } = req.body

    // Mavjud testni olish
    const data = await fs.readJson(testsFile)
    const tests = data.tests || []
    const testIndex = tests.findIndex((t) => t.id === testId)

    if (testIndex === -1) {
      return res.status(404).json({ error: "Test topilmadi" })
    }

    // Testni yangilash
    tests[testIndex] = {
      ...tests[testIndex],
      name: name || tests[testIndex].name,
      description: description || tests[testIndex].description,
      duration: Number.parseInt(duration) || tests[testIndex].duration,
      questionCount: Number.parseInt(questionCount) || tests[testIndex].questionCount,
      passingScore: Number.parseInt(passingScore) || tests[testIndex].passingScore,
      isActive: isActive === "true" || isActive === true,
      updatedAt: new Date().toISOString(),
    }

    await fs.writeJson(testsFile, { tests })

    res.json({ message: "Test muvaffaqiyatli yangilandi", test: tests[testIndex] })
  } catch (error) {
    console.error("Testni yangilashda xatolik:", error)
    res.status(500).json({ error: "Testni yangilashda xatolik yuz berdi" })
  }
})

app.delete("/api/student_api/tests/:id", async (req, res) => {
  try {
    const testId = req.params.id

    // Mavjud testlarni olish
    const data = await fs.readJson(testsFile)
    const tests = data.tests || []
    const filteredTests = tests.filter((t) => t.id !== testId)

    if (tests.length === filteredTests.length) {
      return res.status(404).json({ error: "Test topilmadi" })
    }

    await fs.writeJson(testsFile, { tests: filteredTests })

    res.json({ message: "Test muvaffaqiyatli o'chirildi" })
  } catch (error) {
    console.error("Testni o'chirishda xatolik:", error)
    res.status(500).json({ error: "Testni o'chirishda xatolik yuz berdi" })
  }
})

app.get("/api/student_api/certificates/all", async (req, res) => {
  try {
    const certificatesData = await fs.readJson(certificatesFile)
    const templateData = await fs.readJson(templateFile)

    res.json({
      certificates: certificatesData.certificates || [],
      template: templateData.template || "",
    })
  } catch (error) {
    console.error("Sertifikatlarni olishda xatolik:", error)
    res.status(500).json({ error: "Sertifikatlarni olishda xatolik yuz berdi" })
  }
})

app.put("/api/student_api/certificates/template", async (req, res) => {
  try {
    const { template } = req.body

    if (!template) {
      return res.status(400).json({ error: "Shablon talab qilinadi" })
    }

    await fs.writeJson(templateFile, { template })

    res.json({ message: "Sertifikat shabloni muvaffaqiyatli yangilandi", template })
  } catch (error) {
    console.error("Sertifikat shablonini yangilashda xatolik:", error)
    res.status(500).json({ error: "Sertifikat shablonini yangilashda xatolik yuz berdi" })
  }
})

app.post("/api/student_api/certificates/files", async (req, res) => {
  try {
    // Sertifikat rasmini yuklash
    if (req.files && req.files.image) {
      const image = req.files.image
      const imagePath = path.join(certificatesDir, "template.png")
      await image.mv(imagePath)
    }

    // Sertifikat PDF ni yuklash
    if (req.files && req.files.pdf) {
      const pdf = req.files.pdf
      const pdfPath = path.join(certificatesDir, "template.pdf")
      await pdf.mv(pdfPath)
    }

    // Shablon sozlamalarini yangilash
    const templateData = await fs.readJson(templateFile)
    templateData.useHtmlTemplate = req.body.useHtmlTemplate === "true"
    await fs.writeJson(templateFile, templateData)

    res.json({ message: "Sertifikat fayllari muvaffaqiyatli yuklandi" })
  } catch (error) {
    console.error("Sertifikat fayllarini yuklashda xatolik:", error)
    res.status(500).json({ error: "Sertifikat fayllarini yuklashda xatolik yuz berdi" })
  }
})

app.get("/api/student_api/statistics", async (req, res) => {
  try {
    // Barcha ma'lumotlarni olish
    const testsData = await fs.readJson(testsFile)
    const resultsData = await fs.readJson(testResultsFile)
    const certificatesData = await fs.readJson(certificatesFile)

    const tests = testsData.tests || []
    const results = resultsData.results || []
    const certificates = certificatesData.certificates || []

    // Noyob talabalarni olish
    const uniqueStudents = [...new Set(results.map((r) => r.studentId))]

    // Test statistikasini hisoblash
    const testStatistics = tests.map((test) => {
      const testResults = results.filter((r) => r.testId === test.id)
      const studentCount = testResults.length
      const totalScore = testResults.reduce((sum, r) => sum + r.score, 0)
      const averageScore = studentCount > 0 ? Math.round(totalScore / studentCount) : 0
      const passedCount = testResults.filter((r) => r.passed).length
      const successRate = studentCount > 0 ? Math.round((passedCount / studentCount) * 100) : 0

      return {
        testId: test.id,
        testName: test.name,
        studentCount,
        averageScore,
        successRate,
      }
    })

    // Talaba reytinglarini hisoblash
    const studentMap = {}

    results.forEach((result) => {
      if (!studentMap[result.studentId]) {
        studentMap[result.studentId] = {
          studentId: result.studentId,
          studentName: result.studentName,
          testCount: 0,
          totalScore: 0,
          certificateCount: 0,
        }
      }

      studentMap[result.studentId].testCount++
      studentMap[result.studentId].totalScore += result.score
    })

    certificates.forEach((cert) => {
      if (studentMap[cert.studentId]) {
        studentMap[cert.studentId].certificateCount++
      }
    })

    const studentRankings = Object.values(studentMap)
      .map((student) => {
        return {
          studentId: student.studentId,
          studentName: student.studentName,
          testCount: student.testCount,
          averageScore: Math.round(student.totalScore / student.testCount),
          certificateCount: student.certificateCount,
        }
      })
      .sort((a, b) => b.averageScore - a.averageScore)

    res.json({
      testCount: tests.length,
      studentCount: uniqueStudents.length,
      certificateCount: certificates.length,
      testStatistics,
      studentRankings,
    })
  } catch (error) {
    console.error("Statistikani olishda xatolik:", error)
    res.status(500).json({ error: "Statistikani olishda xatolik yuz berdi" })
  }
})

// Serverni ishga tushirish
try {
  app.listen(PORT, () => {
    console.log(`Server ${PORT} portda ishga tushdi`)
    console.log(`API URL: http://localhost:${PORT}/api/student_api`)
  })
} catch (error) {
  console.error("Serverni ishga tushirishda xatolik:", error)
}