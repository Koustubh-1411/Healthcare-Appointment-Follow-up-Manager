const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { patientRecords, doctorPatientRecords, createRecord } = require('../controllers/medicalController');
const router = express.Router();
router.get('/mine', protect, requireRole('patient'), patientRecords);
router.get('/patient/:patientId', protect, requireRole('doctor'), doctorPatientRecords);
router.post('/patient/:patientId', protect, requireRole('doctor'), createRecord);
module.exports = router;
