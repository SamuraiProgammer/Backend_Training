// models/User.js
const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: 'Please provide a valid email',
      },
      index: true, // For faster email lookups
    },

    phone_no: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Supports Indian numbers (10 digits) and international format
          return /^\+?[1-9]\d{1,14}$/.test(v.replace(/\s+/g, ''));
        },
        message: 'Please provide a valid phone number',
      },
    },

    college: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      minlength: [3, 'College name must be at least 3 characters'],
      maxlength: [200, 'College name cannot exceed 200 characters'],
    },

    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
      minlength: [2, 'Course must be at least 2 characters'],
      maxlength: [150, 'Course cannot exceed 150 characters'],
    },

    // Optional: Add more fields as needed for production
    isVerified: {
      type: Boolean,
      default: false,
    },

    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============== INDEXES (Very Important for Production) ==============
userSchema.index({ email: 1 });
userSchema.index({ phone_no: 1 });
userSchema.index({ college: 1, course: 1 }); // Compound index if you query by college + course

// ============== PRE-SAVE MIDDLEWARE ==============
// userSchema.pre('save', function (next) {
//   // Additional sanitization if needed
//   if (this.phone_no) {
//     this.phone_no = this.phone_no.replace(/\s+/g, ''); // Remove spaces
//   }
//   next();
// });

// ============== VIRTUALS (Optional) ==============
userSchema.virtual('fullInfo').get(function () {
  return `${this.name} - ${this.course} at ${this.college}`;
});

// ============== STATIC METHODS ==============
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// ============== INSTANCE METHODS ==============
userSchema.methods.isPhoneValid = function () {
  return /^\+?[1-9]\d{1,14}$/.test(this.phone_no);
};

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User;