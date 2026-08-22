const express = require('express');
const { getSystemOverview, listDoctorsForAdmin, setDoctorStatus, listLeaveRequests, reviewLeaveRequest, getAnalytics } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/overview', getSystemOverview);
router.get('/analytics', getAnalytics);
router.get('/doctors', listDoctorsForAdmin);
router.patch('/doctors/:doctorId/status', setDoctorStatus);
router.get('/leave-requests', listLeaveRequests);
router.patch('/leave-requests/:requestId', reviewLeaveRequest);

module.exports = router;
