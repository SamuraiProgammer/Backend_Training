const express = require('express');
const { requireAdminAuth } = require('../middlewares/adminAuth');

const {
  addCourseCard,
  editCourseCard,
  deleteCourseCard,
  createCourse,
  editCourse,
  deleteCourse,
} = require('../controllers/Admin.controller.js');
const {
  listOffersAdmin,
  getOfferAdminById,
  createOfferAdmin,
  updateOfferAdmin,
  deleteOfferAdmin,
  listOfferRegistrationsAdmin,
  listAllPreviewRegistrationsAdmin,
  deletePreviewRegistrationAdmin,
  getAdminDashboard,
} = require('../controllers/Offer.controller.js');

const router = express.Router();

router.use(requireAdminAuth);

router.post('/course-cards', addCourseCard);
router.patch('/course-cards/:id', editCourseCard);
router.delete('/course-cards/:id', deleteCourseCard);
router.post('/courses', createCourse);
router.patch('/courses/:id', editCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/dashboard', getAdminDashboard);
router.get('/preview-registrations', listAllPreviewRegistrationsAdmin);
router.delete('/preview-registrations/:id', deletePreviewRegistrationAdmin);
router.get('/offers', listOffersAdmin);
router.get('/offers/:id', getOfferAdminById);
router.post('/offers', createOfferAdmin);
router.patch('/offers/:id', updateOfferAdmin);
router.delete('/offers/:id', deleteOfferAdmin);
router.get('/offers/:id/registrations', listOfferRegistrationsAdmin);

module.exports = router;
