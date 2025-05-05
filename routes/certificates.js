const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Get all certificates
router.get('/', certificateController.getAllCertificates);

// Get certificate template
router.get('/template', certificateController.getCertificateTemplate);

// Update certificate template
router.put('/template', certificateController.updateCertificateTemplate);

// Download certificate
router.get('/download/:id', certificateController.downloadCertificate);

module.exports = router;