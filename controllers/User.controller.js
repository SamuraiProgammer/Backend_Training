const User = require('../models/User');
const { sendTemplatedEmail } = require("../SES/ses");

const registerUser = async (req, res) => {
  try {
    const { name, email, phone_no, college, course, registeredForProgram } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone_no }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User already exists with this email or phone number',
      });
    }

    const newUser = await User.create({
      name,
      email,
      phone_no,
      college,
      currentAcademicProgram:course,
      registeredForProgram
    });

    // try {
    //     await sendTemplatedEmail(["info@thewholepoint.org","info@ensolab.in"], "BecomingTrainingFormSubmission", {
    //       name, email, phone_no, college, course
    //     });
    //   } catch (e) {
    //     console.warn("Email send failed", e?.response?.data || e?.message);
    //   }
    //   try {
    //   await sendTemplatedEmail(
    //     [email],                    // Send to the user
    //     "BecomingTrainingUserWelcomeEmail",             // Use a different template name
    //     {
    //       name,
    //       email,
    //       phone_no,
    //       college,
    //       registeredForProgram
    //     }
    //   );
    // } catch (e) {
    //   console.warn("Welcome email send failed", e?.response?.data || e?.message);
    // }

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        college: newUser.college,
        course: newUser.course,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  getAllUsers,
};
