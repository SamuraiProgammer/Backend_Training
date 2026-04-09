const express = require('express');

const {
  addCourseCard,
  editCourseCard,
  deleteCourseCard,
  createCourse,
  editCourse,
  deleteCourse,
} = require('../controllers/Admin.controller.js');

const router = express.Router();

router.post('/course-cards', addCourseCard);
router.patch('/course-cards/:id', editCourseCard);
router.delete('/course-cards/:id', deleteCourseCard);
router.post('/courses', createCourse);
router.patch('/courses/:id', editCourse);
router.delete('/courses/:id', deleteCourse);

module.exports = router;
