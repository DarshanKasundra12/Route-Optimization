const User = require("../models/User");
const Driver = require("../models/Driver");
const jwt = require("jsonwebtoken");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // If user is a delivery boy, create a corresponding Driver profile
    if (role === "deliveryboy") {
      const driverProfile = await Driver.create({
        name,
        email,
        employeeId: "TEMP-" + Date.now().toString().slice(-6), // Temporary ID until updated
        phone: "0000000000", // Placeholder
        vehicleNumber: "PENDING",
        vehicleType: "VAN", // Default
        user: user._id,
      });
      console.log(
        `✅ Driver profile created for user ${user._id}:`,
        driverProfile._id,
      );
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error("Register Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Error registering user",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Login Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Error logging in",
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("GetMe Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "secret_key_123",
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    },
  );

  // LOG TOKEN TO CONSOLE AS REQUESTED
  console.log("----------------------------------------------------");
  console.log(`GENERATED TOKEN FOR USER ${user.email} (${user.role}):`);
  console.log(token);
  console.log("----------------------------------------------------");

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
};
