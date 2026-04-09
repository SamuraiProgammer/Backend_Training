const mongoose = require('mongoose');
const CourseCard = require('../models/CourseCard');
const Course = require('../models/Course');

const COURSE_CARD_ALLOWED_FIELDS = ['badge', 'heading', 'subheading', 'currentAcademicProgram', 'description', 'hours', 'benefits'];
const COURSE_CARD_REQUIRED_FIELDS = ['badge', 'heading', 'subheading', 'currentAcademicProgram', 'description', 'hours'];
const ALLOWED_ACADEMIC_PROGRAMS = ['undergraduate', 'postgraduate', 'early career professional'];

const COURSE_ALLOWED_FIELDS = [
  'title', 'subtitle',
  'duration',
  'period',
  'price',
  'category',
  'subcategory',
  'coursecardid',
  'mode',
  'learning',
  'skills',
  'pedagogy',
  'courseStructure',
  'courseStructureDescription',
  'outcome',
  'isActive',
  'courseImageUrl',
  'images',
  'level',
  'type',
  'module',
];
const COURSE_REQUIRED_FIELDS = ['coursecardid'];

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const sanitizeRequiredString = (value, fieldName) => {
  if (!isNonEmptyString(value)) {
    throw createBadRequestError(`${fieldName} is required and must be a non-empty string`);
  }

  return value.trim();
};

const sanitizeOptionalString = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw createBadRequestError(`${fieldName} must be a string`);
  }

  return value.trim();
};

const normalizeAcademicProgram = (value) => {
  const normalizedValue = sanitizeRequiredString(value, 'currentAcademicProgram');

  if (!ALLOWED_ACADEMIC_PROGRAMS.includes(normalizedValue)) {
    throw createBadRequestError(
      `currentAcademicProgram must be one of: ${ALLOWED_ACADEMIC_PROGRAMS.join(', ')}`
    );
  }

  return normalizedValue;
};

const normalizeHours = (hours) => {
  if (!Array.isArray(hours) || hours.length === 0) {
    throw createBadRequestError('hours must be a non-empty array');
  }

  const normalizedHours = hours.map((value) => {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      throw createBadRequestError('hours must contain only positive integers');
    }

    return parsedValue;
  });

  return [...new Set(normalizedHours)].sort((a, b) => a - b);
};

const normalizeBenefits = (benefits) => {
  if (!Array.isArray(benefits)) {
    throw createBadRequestError('benefits must be an array');
  }

  return benefits.map((benefit, index) => {
    if (!isPlainObject(benefit)) {
      throw createBadRequestError(`benefits[${index}] must be an object`);
    }

    const normalizedBenefit = {
      text: sanitizeRequiredString(benefit.text, `benefits[${index}].text`),
      imageurl: '',
    };

    if (benefit.imageurl !== undefined && benefit.imageurl !== null) {
      if (typeof benefit.imageurl !== 'string') {
        throw createBadRequestError(`benefits[${index}].imageurl must be a string`);
      }

      normalizedBenefit.imageurl = benefit.imageurl.trim();
    }

    if (benefit._id && mongoose.Types.ObjectId.isValid(benefit._id)) {
      normalizedBenefit._id = benefit._id;
    }

    return normalizedBenefit;
  });
};

const normalizeStringArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError(`${fieldName} must be an array`);
  }

  return value.map((item, index) => sanitizeRequiredString(item, `${fieldName}[${index}]`));
};

const normalizePedagogy = (value) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError('pedagogy must be an array');
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createBadRequestError(`pedagogy[${index}] must be an object`);
    }

    return {
      image: sanitizeOptionalString(item.image, `pedagogy[${index}].image`) || '',
      title: sanitizeOptionalString(item.title, `pedagogy[${index}].title`) || '',
      description: sanitizeOptionalString(item.description, `pedagogy[${index}].description`) || '',
    };
  });
};

const normalizeOutcome = (value) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError('outcome must be an array');
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createBadRequestError(`outcome[${index}] must be an object`);
    }

    return {
      title: sanitizeOptionalString(item.title, `outcome[${index}].title`) || '',
      description: sanitizeOptionalString(item.description, `outcome[${index}].description`) || '',
    };
  });
};

const normalizeCourseStructure = (value) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError('courseStructure must be an array');
  }

  return value.map((section, sectionIndex) => {
    if (!isPlainObject(section)) {
      throw createBadRequestError(`courseStructure[${sectionIndex}] must be an object`);
    }

    const structureItems = section.structure === undefined
      ? []
      : (() => {
          if (!Array.isArray(section.structure)) {
            throw createBadRequestError(`courseStructure[${sectionIndex}].structure must be an array`);
          }

          return section.structure.map((item, itemIndex) => {
            if (!isPlainObject(item)) {
              throw createBadRequestError(`courseStructure[${sectionIndex}].structure[${itemIndex}] must be an object`);
            }

            return {
              heading: sanitizeRequiredString(
                item.heading,
                `courseStructure[${sectionIndex}].structure[${itemIndex}].heading`
              ),
              subheading: item.subheading === undefined
                ? []
                : normalizeStringArray(
                    item.subheading,
                    `courseStructure[${sectionIndex}].structure[${itemIndex}].subheading`
                  ),
            };
          });
        })();

    return {
      title: sanitizeRequiredString(section.title, `courseStructure[${sectionIndex}].title`),
      description: sanitizeOptionalString(section.description, `courseStructure[${sectionIndex}].description`) || '',
      structure: structureItems,
    };
  });
};

const normalizeImages = (value) => {
  if (!isPlainObject(value)) {
    throw createBadRequestError('images must be an object');
  }

  return {
    Courseimage: sanitizeOptionalString(value.Courseimage, 'images.Courseimage') || '',
    Outcomeimage: sanitizeOptionalString(value.Outcomeimage, 'images.Outcomeimage') || '',
  };
};

const ensureRequestBody = (body) => {
  if (!isPlainObject(body)) {
    throw createBadRequestError('Request body must be a valid JSON object');
  }
};

const handleControllerError = (res, error, notFoundMessage) => {
  if (error instanceof mongoose.Error.DocumentNotFoundError) {
    return res.status(404).json({
      success: false,
      message: notFoundMessage || 'Resource not found',
    });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value provided',
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format provided',
    });
  }

  if (error && error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || 'Request failed',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

const buildCourseCardPayload = (body, options) => {
  ensureRequestBody(body);

  const payload = {};
  const fieldsToValidate = options.requireAllFields ? COURSE_CARD_REQUIRED_FIELDS : Object.keys(body);

  if (!options.requireAllFields && fieldsToValidate.length === 0) {
    throw createBadRequestError('At least one field is required to update the course card');
  }

  for (const field of fieldsToValidate) {
    if (!COURSE_CARD_ALLOWED_FIELDS.includes(field)) {
      throw createBadRequestError(`Invalid field provided: ${field}`);
    }

    const value = body[field];

    if (field === 'badge' || field === 'heading' || field === 'subheading' || field === 'description') {
      if (value === undefined) {
        if (options.requireAllFields) {
          throw createBadRequestError(`${field} is required`);
        }
        continue;
      }

      payload[field] = sanitizeRequiredString(value, field);
      continue;
    }

    if (field === 'currentAcademicProgram') {
      if (value === undefined) {
        if (options.requireAllFields) {
          throw createBadRequestError('currentAcademicProgram is required');
        }
        continue;
      }

      payload.currentAcademicProgram = normalizeAcademicProgram(value);
      continue;
    }

    if (field === 'hours') {
      if (value === undefined) {
        if (options.requireAllFields) {
          throw createBadRequestError('hours is required');
        }
        continue;
      }

      payload.hours = normalizeHours(value);
      continue;
    }

    if (field === 'benefits') {
      if (value === undefined) {
        continue;
      }

      payload.benefits = normalizeBenefits(value);
    }
  }

  return payload;
};

const ensureCourseCardExists = async (courseCardId) => {
  if (!mongoose.Types.ObjectId.isValid(courseCardId)) {
    throw createBadRequestError('Invalid course card id');
  }

  const existingCourseCard = await CourseCard.findById(courseCardId).select('_id');

  if (!existingCourseCard) {
    const error = new Error('Course card not found');
    error.statusCode = 404;
    throw error;
  }
};

const buildCoursePayload = async (body, options) => {
  ensureRequestBody(body);

  const payload = {};
  const fieldsToValidate = options.requireAllFields ? COURSE_REQUIRED_FIELDS.concat(Object.keys(body)) : Object.keys(body);

  if (!options.requireAllFields && fieldsToValidate.length === 0) {
    throw createBadRequestError('At least one field is required to update the course');
  }

  for (const field of fieldsToValidate) {
    if (!COURSE_ALLOWED_FIELDS.includes(field)) {
      throw createBadRequestError(`Invalid field provided: ${field}`);
    }

    const value = body[field];

    if (field === 'coursecardid') {
      if (value === undefined) {
        if (options.requireAllFields) {
          throw createBadRequestError('coursecardid is required');
        }
        continue;
      }

      await ensureCourseCardExists(value);
      payload.coursecardid = value;
      continue;
    }

    if (
      field === 'title' ||
      field === 'subtitle' ||
      field === 'duration' ||
      field === 'period' ||
      field === 'price' ||
      field === 'category' ||
      field === 'subcategory' ||
      field === 'courseStructureDescription' ||
      field === 'courseImageUrl' ||
      field === 'level' ||
      field === 'type' ||
      field === 'module'
    ) {
      if (value === undefined) {
        continue;
      }

      payload[field] = sanitizeOptionalString(value, field) || '';
      continue;
    }

    if (field === 'mode' || field === 'learning' || field === 'skills') {
      if (value === undefined) {
        continue;
      }

      payload[field] = normalizeStringArray(value, field);
      continue;
    }

    if (field === 'pedagogy') {
      if (value === undefined) {
        continue;
      }

      payload.pedagogy = normalizePedagogy(value);
      continue;
    }

    if (field === 'courseStructure') {
      if (value === undefined) {
        continue;
      }

      payload.courseStructure = normalizeCourseStructure(value);
      continue;
    }

    if (field === 'outcome') {
      if (value === undefined) {
        continue;
      }

      payload.outcome = normalizeOutcome(value);
      continue;
    }

    if (field === 'isActive') {
      if (value === undefined) {
        continue;
      }

      if (typeof value !== 'boolean') {
        throw createBadRequestError('isActive must be a boolean');
      }

      payload.isActive = value;
      continue;
    }

    if (field === 'images') {
      if (value === undefined) {
        continue;
      }

      payload.images = normalizeImages(value);
    }
  }

  return payload;
};

const addCourseCard = async (req, res) => {
  try {
    const payload = buildCourseCardPayload(req.body, { requireAllFields: true });
    const courseCard = await CourseCard.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Course card created successfully',
      data: courseCard,
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course card not found');
  }
};

const editCourseCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course card id',
      });
    }

    const updates = buildCourseCardPayload(req.body, { requireAllFields: false });
    const courseCard = await CourseCard.findById(id);

    if (!courseCard) {
      return res.status(404).json({
        success: false,
        message: 'Course card not found',
      });
    }

    Object.assign(courseCard, updates);
    await courseCard.save();

    return res.status(200).json({
      success: true,
      message: 'Course card updated successfully',
      data: courseCard,
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course card not found');
  }
};

const deleteCourseCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course card id',
      });
    }

  const deletedCourseCard = await CourseCard.findById(id);

    if (!deletedCourseCard) {
      return res.status(404).json({
        success: false,
        message: 'Course card not found',
      });
    }

    await Course.deleteMany({ coursecardid: id });
    await deletedCourseCard.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Course card and linked course deleted successfully',
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course card not found');
  }
};

const createCourse = async (req, res) => {
  try {
    const payload = await buildCoursePayload(req.body, { requireAllFields: true });
    const course = await Course.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course not found');
  }
};

const editCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course id',
      });
    }

    const updates = await buildCoursePayload(req.body, { requireAllFields: false });
    const course = await Course.findOne({coursecardid:id});

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    Object.assign(course, updates);
    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course not found');
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course id',
      });
    }

    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    return handleControllerError(res, error, 'Course not found');
  }
};

module.exports = {
  addCourseCard,
  editCourseCard,
  deleteCourseCard,
  createCourse,
  editCourse,
  deleteCourse,
};
