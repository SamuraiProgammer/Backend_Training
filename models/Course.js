const mongoose = require("mongoose");

const structureItemSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true
  },
  subheading: {
    type: [String],
    default: []
  }
}, { _id: false });

const courseStructureSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  structure: {
    type: [structureItemSchema],
    default: []
  }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  duration: String,
  period: String,
  price: String,
  category: String,
  subcategory: String,

  coursecardid: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CourseCard', 
    required: true
  },
  
  mode: [String],
  learning: [String],
  skills: [String],

  pedagogy: [{
    image: String,
    title: String,
    description: String
  }],

  // 🔥 Updated field
  courseStructure: {
    type: [courseStructureSectionSchema],
    default: []
  },

  courseStructureDescription: String,

  outcome: [{
    title: String,
    description: String
  }],

  isActive: Boolean,

  courseImageUrl: String,
  images: {
    Courseimage: String,
    Outcomeimage: String
  },

  level: String,
  type: String,
  module: String

}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);