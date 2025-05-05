const path = require('path');
const fs = require('fs-extra');

const certificatesFile = path.join(__dirname, '../data/certificates.json');
const templateFile = path.join(__dirname, '../data/template.json');

// Get all certificates
exports.getAllCertificates = async () => {
  try {
    const data = await fs.readJson(certificatesFile);
    return data.certificates || [];
  } catch (error) {
    console.error('Error reading certificates file:', error);
    return [];
  }
};

// Get certificate by ID
exports.getCertificateById = async (id) => {
  try {
    const certificates = await this.getAllCertificates();
    return certificates.find(cert => cert.id === id);
  } catch (error) {
    console.error('Error getting certificate by ID:', error);
    return null;
  }
};

// Create a new certificate
exports.createCertificate = async (certificate) => {
  try {
    const certificates = await this.getAllCertificates();
    certificates.push(certificate);
    await fs.writeJson(certificatesFile, { certificates });
    return certificate;
  } catch (error) {
    console.error('Error creating certificate:', error);
    throw error;
  }
};

// Get certificate template
exports.getCertificateTemplate = async () => {
  try {
    const data = await fs.readJson(templateFile);
    return data.template || '';
  } catch (error) {
    console.error('Error reading template file:', error);
    return '';
  }
};

// Update certificate template
exports.updateCertificateTemplate = async (template) => {
  try {
    await fs.writeJson(templateFile, { template });
    return template;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};