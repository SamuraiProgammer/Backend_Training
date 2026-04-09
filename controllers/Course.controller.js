const mongoose = require('mongoose');
const CourseCard = require('../models/CourseCard');
const Course = require('../models/Course');

const getCourseCardsByProgram = async (res, program) => {
  try {
    const courseCards = await CourseCard.find({ currentAcademicProgram: program }).sort({
      createdAt: -1,
      _id: -1,
    });

    return res.status(200).json({
      success: true,
      count: courseCards.length,
      data: courseCards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course cards',
      error: error.message,
    });
  }
};

const getUndergraduateCourseCards = async (req, res) => {
  return getCourseCardsByProgram(res, 'undergraduate');
};

const getPostgraduateCourseCards = async (req, res) => {
  return getCourseCardsByProgram(res, 'postgraduate');
};

const getEarlyCareerProfessionalCourseCards = async (req, res) => {
  return getCourseCardsByProgram(res, 'early career professional');
};

const getCourseCardById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course card id',
      });
    }

    const courseCard = await CourseCard.findById(id);

    if (!courseCard) {
      return res.status(404).json({
        success: false,
        message: 'Course card not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: courseCard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course card',
      error: error.message,
    });
  }
};

const getCourseByCourseCardId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course card id',
      });
    }

    const course = await Course.findOne({ coursecardid: id }).populate('coursecardid');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found for the given course card id',
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message,
    });
  }
};

module.exports = {
  getUndergraduateCourseCards,
  getPostgraduateCourseCards,
  getEarlyCareerProfessionalCourseCards,
  getCourseCardById,
  getCourseByCourseCardId,
};
