const mongoose = require('mongoose');

const benefitSchema = new mongoose.Schema({
  imageurl: {
    type: String,
    trim: true,
    default: '',           
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
}, { _id: true });

// Main Service Schema
const courseCardSchema = new mongoose.Schema(
  {
    badge: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    heading: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    subheading: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    currentAcademicProgram: {
      type: String,
      required: true,
      enum: ['undergraduate', 'postgraduate', 'early career professional'],
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    hours: {
      type: [Number],
      required: true,
      validate: {
        validator: function (hours) {
          return Array.isArray(hours) && 
                 hours.length > 0 && 
                 hours.every(h => Number.isInteger(h) && h > 0);
        },
        message: 'Hours must be a non-empty array of positive integers',
      },
    },
    benefits: {
      type: [benefitSchema],
      default: [
        {
          imageurl: '',
          text: 'With Completion Certification'
        },
        {
          imageurl: '',
          text: 'Globally Accepted Program'
        }
      ],
    },
  },
  {
    timestamps: true,           // Adds createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to clean hours array
// courseCardSchema.pre('save', function (next) {
//   if (this.hours) {
//     // Remove duplicates and sort ascending
//     this.hours = [...new Set(this.hours)].sort((a, b) => a - b);
//   }
//   next();
// });

// Optional indexes for better performance
courseCardSchema.index({ badge: 1 });
courseCardSchema.index({ heading: 1 });

// Create Model
const CourseCard = mongoose.model('CourseCard', courseCardSchema);

module.exports = CourseCard;