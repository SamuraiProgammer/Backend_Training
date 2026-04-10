const express = require("express");

const {
  getPublicOffers,
  getFeaturedOffer,
  getOfferBySlug,
  createOfferOrder,
  verifyOfferPayment,
} = require("../controllers/Offer.controller");

const router = express.Router();

router.get("/", getPublicOffers);
router.get("/featured", getFeaturedOffer);
router.get("/:slug", getOfferBySlug);
router.post("/:slug/create-order", createOfferOrder);
router.post("/:slug/verify-payment", verifyOfferPayment);

module.exports = router;
