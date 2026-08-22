const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { submitReview, listDoctorReviews, reviewStatusForAppointment } = require('../controllers/reviewController');
const router = express.Router();
router.get('/doctor/:doctorId', listDoctorReviews);
router.get('/appointment/:appointmentId/status', protect, requireRole('patient'), reviewStatusForAppointment);
router.post('/', protect, requireRole('patient'), submitReview);
module.exports = router;
