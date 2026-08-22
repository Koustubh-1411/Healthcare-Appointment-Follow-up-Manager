const express = require('express');
const {
  createDoctor, listDoctors, getAvailableSlots, requestLeave, myLeaveRequests, getDailyBriefing, getPatientClinicalInsight,
} = require('../controllers/doctorController');
const { protect, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', listDoctors); // public search
router.get('/slots', getAvailableSlots); // public - check availability before login
router.post('/', protect, requireRole('admin'), createDoctor);
router.post('/leave', protect, requireRole('doctor'), requestLeave);
router.get('/me/leave-requests', protect, requireRole('doctor'), myLeaveRequests);

// "AI Daily Briefing" card on the doctor Overview screen
router.get('/me/daily-briefing', protect, requireRole('doctor'), getDailyBriefing);
// "AI Clinical Insight" card on a patient's detail page
router.get('/me/patients/:patientId/insight', protect, requireRole('doctor'), getPatientClinicalInsight);

module.exports = router;
