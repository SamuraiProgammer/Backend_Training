const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    phone_no: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    college: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    currentAcademicProgram: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
  },
  { _id: false }
);

const previewRegistrationSchema = new mongoose.Schema(
  {
    registrationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PreviewOffer",
      required: true,
      index: true,
    },
    offerSlugSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    offerTitleSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    batchTitleSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    batchStartAt: {
      type: Date,
      required: true,
    },
    batchEndAt: {
      type: Date,
      required: true,
    },
    batchTimezoneLabel: {
      type: String,
      trim: true,
      default: "IST",
    },
    sourceCourseTitle: {
      type: String,
      trim: true,
      default: "",
    },
    applicant: {
      type: applicantSchema,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paymentProvider: {
      type: String,
      trim: true,
      default: "razorpay",
    },
    paymentMode: {
      type: String,
      enum: ["live", "mock"],
      default: "live",
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: "",
    },
    paymentCapturedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

previewRegistrationSchema.index(
  {
    offerId: 1,
    batchId: 1,
    "applicant.email": 1,
    paymentStatus: 1,
  },
  { name: "offer_batch_email_status_idx" }
);

module.exports = mongoose.model("PreviewRegistration", previewRegistrationSchema);
