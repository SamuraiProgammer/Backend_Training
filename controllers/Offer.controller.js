const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const PreviewOffer = require("../models/PreviewOffer");
const PreviewRegistration = require("../models/PreviewRegistration");
const CourseCard = require("../models/CourseCard");
const Course = require("../models/Course");
const User = require("../models/User");
const { sendTemplatedEmail } = require("../SES/ses");

const OFFER_ALLOWED_FIELDS = [
  "slug",
  "badge",
  "cardTitle",
  "cardSubtitle",
  "cardDescription",
  "heroEyebrow",
  "heroTitle",
  "heroSubtitle",
  "price",
  "originalPrice",
  "currency",
  "buttonText",
  "supportText",
  "confirmationTitle",
  "confirmationMessage",
  "contactWhatsapp",
  "highlights",
  "terms",
  "deliverables",
  "batches",
  "visibleOnExplore",
  "isFeatured",
  "isActive",
  "displayOrder",
];

const OFFER_REQUIRED_FIELDS = ["slug", "cardTitle", "heroTitle", "price", "batches"];
const BATCH_MODE_OPTIONS = ["online", "offline", "hybrid"];

let razorpayClient = null;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const ensureBody = (body) => {
  if (!isPlainObject(body)) {
    throw createBadRequestError("Request body must be a valid JSON object");
  }
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const sanitizeRequiredString = (value, fieldName) => {
  if (!isNonEmptyString(value)) {
    throw createBadRequestError(`${fieldName} is required`);
  }

  return value.trim();
};

const sanitizeOptionalString = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw createBadRequestError(`${fieldName} must be a string`);
  }

  return value.trim();
};

const sanitizeBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    throw createBadRequestError(`${fieldName} must be a boolean`);
  }

  return value;
};

const sanitizeNumber = (value, fieldName, options = {}) => {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    throw createBadRequestError(`${fieldName} must be a valid number`);
  }

  if (options.integer && !Number.isInteger(numericValue)) {
    throw createBadRequestError(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && numericValue < options.min) {
    throw createBadRequestError(`${fieldName} must be at least ${options.min}`);
  }

  return numericValue;
};

const sanitizeStringArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError(`${fieldName} must be an array`);
  }

  return value
    .map((item, index) => sanitizeRequiredString(item, `${fieldName}[${index}]`))
    .filter(Boolean);
};

const slugify = (value) =>
  sanitizeRequiredString(value, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const sanitizeDate = (value, fieldName) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createBadRequestError(`${fieldName} must be a valid date/time`);
  }

  return date;
};

const sanitizeDeliverables = (value) => {
  if (!Array.isArray(value)) {
    throw createBadRequestError("deliverables must be an array");
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createBadRequestError(`deliverables[${index}] must be an object`);
    }

    return {
      title: sanitizeRequiredString(item.title, `deliverables[${index}].title`),
      description:
        sanitizeOptionalString(
          item.description,
          `deliverables[${index}].description`
        ) || "",
    };
  });
};

const sanitizeBatches = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw createBadRequestError("batches must be a non-empty array");
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createBadRequestError(`batches[${index}] must be an object`);
    }

    const startAt = sanitizeDate(item.startAt, `batches[${index}].startAt`);
    const endAt = sanitizeDate(item.endAt, `batches[${index}].endAt`);

    if (endAt <= startAt) {
      throw createBadRequestError(
        `batches[${index}].endAt must be later than startAt`
      );
    }

    const mode =
      sanitizeOptionalString(item.mode, `batches[${index}].mode`) || "online";

    if (!BATCH_MODE_OPTIONS.includes(mode)) {
      throw createBadRequestError(
        `batches[${index}].mode must be one of ${BATCH_MODE_OPTIONS.join(", ")}`
      );
    }

    const batch = {
      title: sanitizeRequiredString(item.title, `batches[${index}].title`),
      description:
        sanitizeOptionalString(
          item.description,
          `batches[${index}].description`
        ) || "",
      startAt,
      endAt,
      timezoneLabel:
        sanitizeOptionalString(
          item.timezoneLabel,
          `batches[${index}].timezoneLabel`
        ) || "IST",
      mode,
      venue:
        sanitizeOptionalString(item.venue, `batches[${index}].venue`) || "",
      seats: sanitizeNumber(item.seats ?? 30, `batches[${index}].seats`, {
        integer: true,
        min: 1,
      }),
      isActive:
        item.isActive === undefined
          ? true
          : sanitizeBoolean(item.isActive, `batches[${index}].isActive`),
    };

    if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
      batch._id = item._id;
    }

    return batch;
  });
};

const buildOfferPayload = (body, options = {}) => {
  ensureBody(body);

  const fieldsToValidate = options.requireAllFields
    ? OFFER_REQUIRED_FIELDS.concat(Object.keys(body))
    : Object.keys(body);

  if (!options.requireAllFields && fieldsToValidate.length === 0) {
    throw createBadRequestError("At least one offer field is required");
  }

  const payload = {};

  for (const field of fieldsToValidate) {
    if (!OFFER_ALLOWED_FIELDS.includes(field)) {
      throw createBadRequestError(`Invalid field provided: ${field}`);
    }

    const value = body[field];

    switch (field) {
      case "slug":
        if (value === undefined) {
          if (options.requireAllFields) {
            throw createBadRequestError("slug is required");
          }
          break;
        }
        payload.slug = slugify(value);
        break;

      case "cardTitle":
      case "heroTitle":
        if (value === undefined) {
          if (options.requireAllFields) {
            throw createBadRequestError(`${field} is required`);
          }
          break;
        }
        payload[field] = sanitizeRequiredString(value, field);
        break;

      case "badge":
      case "cardSubtitle":
      case "cardDescription":
      case "heroEyebrow":
      case "heroSubtitle":
      case "buttonText":
      case "supportText":
      case "confirmationTitle":
      case "confirmationMessage":
      case "contactWhatsapp":
      case "currency":
        if (value === undefined) {
          break;
        }
        payload[field] = sanitizeOptionalString(value, field) || "";
        break;

      case "price":
        if (value === undefined) {
          if (options.requireAllFields) {
            throw createBadRequestError("price is required");
          }
          break;
        }
        payload.price = sanitizeNumber(value, "price", { min: 1 });
        break;

      case "originalPrice":
        if (value === undefined || value === null || value === "") {
          payload.originalPrice = null;
          break;
        }
        payload.originalPrice = sanitizeNumber(value, "originalPrice", {
          min: 1,
        });
        break;

      case "displayOrder":
        if (value === undefined) {
          break;
        }
        payload.displayOrder = sanitizeNumber(value, "displayOrder", {
          integer: true,
        });
        break;

      case "highlights":
      case "terms":
        if (value === undefined) {
          break;
        }
        payload[field] = sanitizeStringArray(value, field);
        break;

      case "deliverables":
        if (value === undefined) {
          if (options.requireAllFields) {
            payload.deliverables = [];
          }
          break;
        }
        payload.deliverables = sanitizeDeliverables(value);
        break;

      case "batches":
        if (value === undefined) {
          if (options.requireAllFields) {
            throw createBadRequestError("batches is required");
          }
          break;
        }
        payload.batches = sanitizeBatches(value);
        break;

      case "visibleOnExplore":
      case "isFeatured":
      case "isActive":
        if (value === undefined) {
          break;
        }
        payload[field] = sanitizeBoolean(value, field);
        break;

      default:
        break;
    }
  }

  return payload;
};

const createRegistrationCode = () =>
  `BTP-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

const isRazorpayMockMode = () =>
  process.env.RAZORPAY_MOCK_MODE === "true" ||
  !process.env.RAZORPAY_KEY_ID ||
  !process.env.RAZORPAY_KEY_SECRET;

const getRazorpayClient = () => {
  if (isRazorpayMockMode()) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayClient;
};

const handleControllerError = (res, error, fallbackMessage = "Request failed") => {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with the same unique value already exists",
    });
  }

  if (error && error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || fallbackMessage,
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: error.message,
  });
};

const getPaidRegistrationCounts = async (offerIds) => {
  if (!Array.isArray(offerIds) || offerIds.length === 0) {
    return new Map();
  }

  const stats = await PreviewRegistration.aggregate([
    {
      $match: {
        offerId: { $in: offerIds.map((id) => new mongoose.Types.ObjectId(id)) },
        paymentStatus: "paid",
      },
    },
    {
      $group: {
        _id: {
          offerId: "$offerId",
          batchId: "$batchId",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce((map, item) => {
    map.set(`${item._id.offerId}:${item._id.batchId}`, item.count);
    return map;
  }, new Map());
};

const enrichOffer = (offer, batchStatsMap) => {
  const normalizedOffer = offer.toObject ? offer.toObject() : offer;
  const offerId = normalizedOffer._id.toString();

  const batches = (normalizedOffer.batches || []).map((batch) => {
    const batchId = batch._id.toString();
    const bookedCount = batchStatsMap.get(`${offerId}:${batchId}`) || 0;
    const availableSeats = Math.max((batch.seats || 0) - bookedCount, 0);

    return {
      ...batch,
      bookedCount,
      availableSeats,
      isSoldOut: availableSeats <= 0,
    };
  });

  return {
    ...normalizedOffer,
    batches,
    registrationsCount: batches.reduce(
      (total, batch) => total + (batch.bookedCount || 0),
      0
    ),
  };
};

const getPublicOffers = async (req, res) => {
  try {
    const offers = await PreviewOffer.find({
      isActive: true,
      visibleOnExplore: true,
    })
      .sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 })
      .lean();

    const statsMap = await getPaidRegistrationCounts(offers.map((offer) => offer._id));
    const data = offers.map((offer) => enrichOffer(offer, statsMap));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch offers");
  }
};

const getFeaturedOffer = async (req, res) => {
  try {
    const offer =
      (await PreviewOffer.findOne({
        isActive: true,
        visibleOnExplore: true,
        isFeatured: true,
      }).lean()) ||
      (await PreviewOffer.findOne({
        isActive: true,
        visibleOnExplore: true,
      })
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean());

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "No active offer found",
      });
    }

    const statsMap = await getPaidRegistrationCounts([offer._id]);

    return res.status(200).json({
      success: true,
      data: enrichOffer(offer, statsMap),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch featured offer");
  }
};

const getOfferBySlug = async (req, res) => {
  try {
    const offer = await PreviewOffer.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const statsMap = await getPaidRegistrationCounts([offer._id]);

    return res.status(200).json({
      success: true,
      data: enrichOffer(offer, statsMap),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch offer");
  }
};

const createOfferOrder = async (req, res) => {
  try {
    const offer = await PreviewOffer.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    ensureBody(req.body);

    const applicant = req.body.applicant;
    const sourceCourseTitle =
      sanitizeOptionalString(req.body.sourceCourseTitle, "sourceCourseTitle") || "";
    const batchId = sanitizeRequiredString(req.body.batchId, "batchId");

    if (!isPlainObject(applicant)) {
      throw createBadRequestError("applicant is required");
    }

    const batch = offer.batches.id(batchId);

    if (!batch || !batch.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected batch is not available",
      });
    }

    const bookedCount = await PreviewRegistration.countDocuments({
      offerId: offer._id,
      batchId: batch._id,
      paymentStatus: "paid",
    });

    if (bookedCount >= batch.seats) {
      return res.status(409).json({
        success: false,
        message: "Selected batch is full. Please choose another batch.",
      });
    }

    const normalizedApplicant = {
      name: sanitizeRequiredString(applicant.name, "applicant.name"),
      email: sanitizeRequiredString(applicant.email, "applicant.email").toLowerCase(),
      phone_no: sanitizeRequiredString(applicant.phone_no, "applicant.phone_no"),
      college: sanitizeRequiredString(applicant.college, "applicant.college"),
      currentAcademicProgram: sanitizeRequiredString(
        applicant.currentAcademicProgram,
        "applicant.currentAcademicProgram"
      ),
    };

    const existingPaidRegistration = await PreviewRegistration.findOne({
      offerId: offer._id,
      batchId: batch._id,
      paymentStatus: "paid",
      $or: [
        { "applicant.email": normalizedApplicant.email },
        { "applicant.phone_no": normalizedApplicant.phone_no },
      ],
    }).lean();

    if (existingPaidRegistration) {
      return res.status(409).json({
        success: false,
        message: "This user is already registered for the selected batch",
      });
    }

    const paymentMode = isRazorpayMockMode() ? "mock" : "live";
    const amountInPaise = Math.round(offer.price * 100);

    let orderId = `mock_order_${Date.now()}`;

    if (paymentMode === "live") {
      const client = getRazorpayClient();
      const order = await client.orders.create({
        amount: amountInPaise,
        currency: offer.currency || "INR",
        receipt: `preview_${Date.now()}`,
        notes: {
          offerSlug: offer.slug,
          batchId: batch._id.toString(),
          applicantEmail: normalizedApplicant.email,
        },
      });

      orderId = order.id;
    }

    const registration = await PreviewRegistration.create({
      registrationCode: createRegistrationCode(),
      offerId: offer._id,
      offerSlugSnapshot: offer.slug,
      offerTitleSnapshot: offer.heroTitle,
      batchId: batch._id,
      batchTitleSnapshot: batch.title,
      batchStartAt: batch.startAt,
      batchEndAt: batch.endAt,
      batchTimezoneLabel: batch.timezoneLabel || "IST",
      sourceCourseTitle,
      applicant: normalizedApplicant,
      amount: offer.price,
      currency: offer.currency || "INR",
      paymentStatus: "pending",
      paymentMode,
      razorpayOrderId: orderId,
    });

    return res.status(201).json({
      success: true,
      data: {
        registrationId: registration._id,
        registrationCode: registration.registrationCode,
        paymentMode,
        razorpayKeyId:
          paymentMode === "live"
            ? process.env.RAZORPAY_KEY_ID
            : "mock_checkout_key",
        order: {
          id: orderId,
          amount: amountInPaise,
          currency: offer.currency || "INR",
        },
        offer: {
          slug: offer.slug,
          title: offer.heroTitle,
          price: offer.price,
          buttonText: offer.buttonText,
        },
        batch: {
          id: batch._id,
          title: batch.title,
          startAt: batch.startAt,
          endAt: batch.endAt,
          timezoneLabel: batch.timezoneLabel || "IST",
          mode: batch.mode,
          venue: batch.venue,
        },
        applicant: normalizedApplicant,
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to create payment order");
  }
};

const verifyOfferPayment = async (req, res) => {
  try {
    ensureBody(req.body);

    const registrationId = sanitizeRequiredString(
      req.body.registrationId,
      "registrationId"
    );

    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      throw createBadRequestError("registrationId is invalid");
    }

    const registration = await PreviewRegistration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    if (registration.offerSlugSnapshot !== req.params.slug) {
      return res.status(400).json({
        success: false,
        message: "Offer mismatch for the provided registration",
      });
    }

    if (registration.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        data: registration,
      });
    }

    if (registration.paymentMode === "mock") {
      registration.paymentStatus = "paid";
      registration.razorpayPaymentId =
        sanitizeOptionalString(req.body.razorpay_payment_id, "razorpay_payment_id") ||
        `mock_pay_${Date.now()}`;
      registration.razorpaySignature =
        sanitizeOptionalString(req.body.razorpay_signature, "razorpay_signature") ||
        "mock_signature";
      registration.paymentCapturedAt = new Date();
      await registration.save();

      return res.status(200).json({
        success: true,
        data: registration,
      });
    }

    const razorpayOrderId = sanitizeRequiredString(
      req.body.razorpay_order_id,
      "razorpay_order_id"
    );
    const razorpayPaymentId = sanitizeRequiredString(
      req.body.razorpay_payment_id,
      "razorpay_payment_id"
    );
    const razorpaySignature = sanitizeRequiredString(
      req.body.razorpay_signature,
      "razorpay_signature"
    );

    if (registration.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Order id mismatch",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed",
      });
    }

    registration.paymentStatus = "paid";
    registration.razorpayPaymentId = razorpayPaymentId;
    registration.razorpaySignature = razorpaySignature;
    registration.paymentCapturedAt = new Date();
    await registration.save();

    const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // gives HH:MM in 24-hour format
  });
};

  const templateData = {
    name: registration.applicant.name,
    email: registration.applicantemail,
    amount: registration.amount,
    registrationCode: registration.registrationCode,
    batchStartAt: formatDate(registration.batchStartAt),
    batchEndAt: formatDate(registration.batchEndAt),
  };

  try {
          await sendTemplatedEmail(["info@thewholepoint.org","info@ensolab.in"], "BecomingTrainingPaymentSuccessAdmin", templateData);
        } catch (e) {
          console.warn("Email send failed", e?.response?.data || e?.message);
        }
        try {
        await sendTemplatedEmail(
          [registration.applicant.email],                    // Send to the user
          "BecomingTrainingPaymentSuccessUser",             // Use a different template name
          templateData
        );
      } catch (e) {
        console.warn("Welcome email send failed", e?.response?.data || e?.message);
      }

    return res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to verify payment");
  }
};

const listOffersAdmin = async (req, res) => {
  try {
    const offers = await PreviewOffer.find({})
      .sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 });
    const statsMap = await getPaidRegistrationCounts(offers.map((offer) => offer._id));
    const data = offers.map((offer) => enrichOffer(offer, statsMap));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch offers");
  }
};

const getOfferAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer id",
      });
    }

    const offer = await PreviewOffer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const statsMap = await getPaidRegistrationCounts([offer._id]);

    return res.status(200).json({
      success: true,
      data: enrichOffer(offer, statsMap),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch offer");
  }
};

const createOfferAdmin = async (req, res) => {
  try {
    const payload = buildOfferPayload(req.body, { requireAllFields: true });

    if (payload.isFeatured) {
      await PreviewOffer.updateMany({}, { $set: { isFeatured: false } });
    }

    const offer = await PreviewOffer.create(payload);
    const statsMap = await getPaidRegistrationCounts([offer._id]);

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: enrichOffer(offer, statsMap),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to create offer");
  }
};

const updateOfferAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer id",
      });
    }

    const updates = buildOfferPayload(req.body, { requireAllFields: false });
    const offer = await PreviewOffer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    if (updates.isFeatured === true) {
      await PreviewOffer.updateMany(
        { _id: { $ne: offer._id } },
        { $set: { isFeatured: false } }
      );
    }

    Object.assign(offer, updates);
    await offer.save();

    const statsMap = await getPaidRegistrationCounts([offer._id]);

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: enrichOffer(offer, statsMap),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to update offer");
  }
};

const deleteOfferAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer id",
      });
    }

    const offer = await PreviewOffer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    await PreviewRegistration.deleteMany({ offerId: offer._id });

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to delete offer");
  }
};

const listOfferRegistrationsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer id",
      });
    }

    const offer = await PreviewOffer.findById(id).select("_id heroTitle slug");

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const registrations = await PreviewRegistration.find({ offerId: offer._id })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: registrations.length,
      offer,
      data: registrations,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch offer registrations"
    );
  }
};

const listAllPreviewRegistrationsAdmin = async (req, res) => {
  try {
    const registrations = await PreviewRegistration.find({})
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch preview registrations"
    );
  }
};

const deletePreviewRegistrationAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration id",
      });
    }

    const deletedRegistration = await PreviewRegistration.findByIdAndDelete(id);

    if (!deletedRegistration) {
      return res.status(404).json({
        success: false,
        message: "Preview registration not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preview registration deleted successfully",
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to delete preview registration"
    );
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOffers,
      totalCourseCards,
      totalCourses,
      previewRegistrations,
      paidPreviewRegistrations,
      latestUsers,
      latestPreviewRegistrations,
      offers,
    ] = await Promise.all([
      User.countDocuments({}),
      PreviewOffer.countDocuments({}),
      CourseCard.countDocuments({}),
      Course.countDocuments({}),
      PreviewRegistration.countDocuments({}),
      PreviewRegistration.countDocuments({ paymentStatus: "paid" }),
      User.find({}).sort({ createdAt: -1, _id: -1 }).limit(5).lean(),
      PreviewRegistration.find({})
        .sort({ createdAt: -1, _id: -1 })
        .limit(8)
        .lean(),
      PreviewOffer.find({}).sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 }),
    ]);

    const revenueStats = await PreviewRegistration.aggregate([
      {
        $match: {
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: {
            offerId: "$offerId",
            offerTitleSnapshot: "$offerTitleSnapshot",
            batchId: "$batchId",
            batchTitleSnapshot: "$batchTitleSnapshot",
          },
          registrations: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          revenue: -1,
          registrations: -1,
        },
      },
    ]);

    const totalRevenue = revenueStats.reduce(
      (sum, item) => sum + (item.revenue || 0),
      0
    );

    const offerBreakdownMap = new Map();

    for (const item of revenueStats) {
      const offerId = item._id.offerId.toString();

      if (!offerBreakdownMap.has(offerId)) {
        offerBreakdownMap.set(offerId, {
          offerId,
          offerTitle: item._id.offerTitleSnapshot,
          totalRevenue: 0,
          totalRegistrations: 0,
          batches: [],
        });
      }

      const existing = offerBreakdownMap.get(offerId);
      existing.totalRevenue += item.revenue || 0;
      existing.totalRegistrations += item.registrations || 0;
      existing.batches.push({
        batchId: item._id.batchId,
        batchTitle: item._id.batchTitleSnapshot,
        registrations: item.registrations || 0,
        revenue: item.revenue || 0,
      });
    }

    const batchStatsMap = await getPaidRegistrationCounts(offers.map((offer) => offer._id));
    const offersWithStats = offers.map((offer) => enrichOffer(offer, batchStatsMap));

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          totalUsers,
          totalOffers,
          totalCourseCards,
          totalCourses,
          previewRegistrations,
          paidPreviewRegistrations,
          totalRevenue,
        },
        latestUsers,
        latestPreviewRegistrations,
        offerBreakdown: Array.from(offerBreakdownMap.values()),
        offers: offersWithStats,
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch admin dashboard");
  }
};

module.exports = {
  getPublicOffers,
  getFeaturedOffer,
  getOfferBySlug,
  createOfferOrder,
  verifyOfferPayment,
  listOffersAdmin,
  getOfferAdminById,
  createOfferAdmin,
  updateOfferAdmin,
  deleteOfferAdmin,
  listOfferRegistrationsAdmin,
  listAllPreviewRegistrationsAdmin,
  deletePreviewRegistrationAdmin,
  getAdminDashboard,
};
