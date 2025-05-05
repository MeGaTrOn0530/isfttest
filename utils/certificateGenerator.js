// Generate certificate HTML
exports.generateCertificateHtml = (certificate, template) => {
    try {
      // Format date
      const date = new Date(certificate.date);
      const formattedDate = date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Replace placeholders in template
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Certificate</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .certificate {
              width: 800px;
              height: 600px;
              margin: 0 auto;
              background-color: white;
              border: 20px solid #7c3aed;
              padding: 50px;
              position: relative;
              box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            }
            .certificate-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .certificate-title {
              font-size: 36px;
              color: #7c3aed;
              margin-bottom: 10px;
            }
            .certificate-subtitle {
              font-size: 24px;
              color: #4b5563;
            }
            .certificate-body {
              text-align: center;
              margin-bottom: 40px;
            }
            .student-name {
              font-size: 30px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 20px;
            }
            .certificate-content {
              font-size: 18px;
              color: #4b5563;
              line-height: 1.5;
            }
            .certificate-footer {
              text-align: center;
              position: absolute;
              bottom: 50px;
              left: 50px;
              right: 50px;
            }
            .certificate-date {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .certificate-signature {
              margin-top: 30px;
            }
            .signature-line {
              width: 200px;
              height: 1px;
              background-color: #111827;
              margin: 0 auto 10px;
            }
            .signature-name {
              font-size: 16px;
              color: #111827;
            }
            .signature-title {
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="certificate-header">
              <div class="certificate-title">SERTIFIKAT</div>
              <div class="certificate-subtitle">Muvaffaqiyatli o'tganligi uchun</div>
            </div>
            
            <div class="certificate-body">
              <div class="student-name">${certificate.studentName}</div>
              <div class="certificate-content">
                ${template
                  .replace('{{studentName}}', certificate.studentName)
                  .replace('{{testName}}', certificate.testName)
                  .replace('{{score}}', certificate.score)
                  .replace('{{date}}', formattedDate)
                }
              </div>
            </div>
            
            <div class="certificate-footer">
              <div class="certificate-date">Sana: ${formattedDate}</div>
              <div class="certificate-signature">
                <div class="signature-line"></div>
                <div class="signature-name">Administrator</div>
                <div class="signature-title">Sertifikat beruvchi</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return html;
    } catch (error) {
      console.error('Error generating certificate HTML:', error);
      throw error;
    }
  };