const mongoose = require("mongoose");

const deliverableSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  { _id: true }
);

const batchSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    timezoneLabel: {
      type: String,
      trim: true,
      default: "IST",
      maxlength: 50,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    venue: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    seats: {
      type: Number,
      min: 1,
      default: 30,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const previewOfferSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    badge: {
      type: String,
      trim: true,
      default: "Live Preview",
      maxlength: 60,
    },
    cardTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    cardSubtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 240,
    },
    cardDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 600,
    },
    heroEyebrow: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    heroTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    heroSubtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    originalPrice: {
      type: Number,
      min: 1,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      maxlength: 8,
    },
    buttonText: {
      type: String,
      trim: true,
      default: "Register Now",
      maxlength: 60,
    },
    supportText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 400,
    },
    confirmationTitle: {
      type: String,
      trim: true,
      default: "Registration Confirmed",
      maxlength: 160,
    },
    confirmationMessage: {
      type: String,
      trim: true,
      default: "Your payment was successful and your preview slot is reserved.",
      maxlength: 1000,
    },
    contactWhatsapp: {
      type: String,
      trim: true,
      default: "918448154111",
      maxlength: 20,
    },
    highlights: {
      type: [String],
      default: [],
    },
    terms: {
      type: [String],
      default: [],
    },
    deliverables: {
      type: [deliverableSchema],
      default: [],
    },
    batches: {
      type: [batchSchema],
      default: [],
    },
    visibleOnExplore: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

previewOfferSchema.index({ isActive: 1, visibleOnExplore: 1, displayOrder: 1 });
previewOfferSchema.index({ isFeatured: 1, isActive: 1 });

module.exports = mongoose.model("PreviewOffer", previewOfferSchema);
