const path = require('path');
const fs = require('fs-extra');
const pdf = require('html-pdf');
const CertificateModel = require('../models/certificateModel');
const certificateGenerator = require('../utils/certificateGenerator');

// Get all certificates
exports.getAllCertificates = async (req, res) => {
  try {
    const certificates = await CertificateModel.getAllCertificates();
    const template = await CertificateModel.getCertificateTemplate();
    
    res.json({ certificates, template });
  } catch (error) {
    console.error('Error getting certificates:', error);
    res.status(500).json({ error: 'Failed to get certificates' });
  }
};

// Get certificate template
exports.getCertificateTemplate = async (req, res) => {
  try {
    const template = await CertificateModel.getCertificateTemplate();
    res.json({ template });
  } catch (error) {
    console.error('Error getting certificate template:', error);
    res.status(500).json({ error: 'Failed to get certificate template' });
  }
};

// Update certificate template
exports.updateCertificateTemplate = async (req, res) => {
  try {
    const { template } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }
    
    await CertificateModel.updateCertificateTemplate(template);
    
    res.json({ message: 'Certificate template updated successfully' });
  } catch (error) {
    console.error('Error updating certificate template:', error);
    res.status(500).json({ error: 'Failed to update certificate template' });
  }
};

// Download certificate
exports.downloadCertificate = async (req, res) => {
  try {
    const certificateId = req.params.id;
    
    // Get certificate
    const certificate = await CertificateModel.getCertificateById(certificateId);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Get template
    const template = await CertificateModel.getCertificateTemplate();
    
    // Generate certificate HTML
    const certificateHtml = certificateGenerator.generateCertificateHtml(certificate, template);
    
    // Create PDF
    const pdfOptions = {
      format: 'A4',
      orientation: 'landscape',
      border: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    };
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    fs.ensureDirSync(tempDir);
    
    const pdfPath = path.join(tempDir, `certificate-${certificateId}.pdf`);
    
    pdf.create(certificateHtml, pdfOptions).toFile(pdfPath, (err, result) => {
      if (err) {
        console.error('Error generating PDF:', err);
        return res.status(500).json({ error: 'Failed to generate certificate PDF' });
      }
      
      // Send PDF file
      res.download(pdfPath, `certificate-${certificate.studentName}.pdf`, (err) => {
        if (err) {
          console.error('Error sending PDF:', err);
        }
        
        // Delete temp file after download
        fs.unlink(pdfPath, (err) => {
          if (err) console.error('Error deleting temp PDF:', err);
        });
      });
    });
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
};