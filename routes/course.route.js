const express = require('express');

const {
  getUndergraduateCourseCards,
  getPostgraduateCourseCards,
  getEarlyCareerProfessionalCourseCards,
  getCourseCardById,
  getCourseByCourseCardId,
} = require('../controllers/Course.controller.js');

const router = express.Router();

router.get('/ug', getUndergraduateCourseCards);
router.get('/pg', getPostgraduateCourseCards);
router.get('/early-career', getEarlyCareerProfessionalCourseCards);
router.get('/course-card/:id', getCourseCardById);
router.get('/:id', getCourseByCourseCardId);

module.exports = router;
