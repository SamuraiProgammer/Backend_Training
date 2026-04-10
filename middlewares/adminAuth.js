const jwt = require("jsonwebtoken");

const getAdminJwtSecret = () =>
  process.env.ADMIN_JWT_SECRET || "becoming-training-admin-secret";

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Admin authorization required",
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, getAdminJwtSecret());

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Invalid admin token",
      });
    }

    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Admin session expired or invalid",
    });
  }
};

module.exports = {
  requireAdminAuth,
  getAdminJwtSecret,
};
