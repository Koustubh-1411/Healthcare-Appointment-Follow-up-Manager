const express = require('express');
const {
  bookAppointment, submitSymptoms, submitPostVisit, cancelAppointment, markNoShow, myAppointments,
} = require('../controllers/appointmentController');
const { protect, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(protect); // every appointment route requires login

router.get('/mine', myAppointments);
router.post('/', requireRole('patient'), bookAppointment);
router.put('/:id/symptoms', requireRole('patient'), submitSymptoms);
router.put('/:id/post-visit', requireRole('doctor'), submitPostVisit);
router.put('/:id/cancel', cancelAppointment);
router.put('/:id/no-show', markNoShow);

module.exports = router;
