const User = require("../models/User");
const Driver = require("../models/Driver");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Capture old role before update
    const oldRole = user.role;

    user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      {
        new: true,
        runValidators: true,
      },
    );

    // Sync with Driver profile
    if (user.role === "deliveryboy") {
      await Driver.findOneAndUpdate(
        { user: user._id },
        { name: user.name, email: user.email },
        { new: true },
      );
    }

    // If role changed to deliveryboy from admin, ensure driver profile exists
    if (role === "deliveryboy" && oldRole !== "deliveryboy") {
      const driverExists = await Driver.findOne({ user: user._id });
      if (!driverExists) {
        await Driver.create({
          name: user.name,
          email: user.email,
          employeeId: "TEMP-" + Date.now().toString().slice(-6),
          phone: "0000000000",
          vehicleNumber: "PENDING",
          vehicleType: "VAN",
          user: user._id,
        });
      }
    }

    // If role changed FROM deliveryboy TO admin, delete driver profile
    if (oldRole === "deliveryboy" && role === "admin") {
      await Driver.findOneAndDelete({ user: user._id });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check for associated driver profile
    const driver = await Driver.findOne({ user: user._id });

    // Safety: don't delete user if they are a driver currently on a trip
    if (driver && !driver.isAvailable) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete user whose driver profile is currently on an active route",
      });
    }

    // Automatically delete associated driver profile if it exists
    if (driver) {
      await driver.deleteOne();
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
