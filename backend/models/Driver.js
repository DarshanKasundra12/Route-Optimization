const mongoose = require("mongoose");

/**
 * DRIVER SCHEMA
 * Stores delivery personnel information
 */
const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  vehicleNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  vehicleType: {
    type: String,
    enum: ["BIKE", "VAN", "TRUCK"],
    default: "VAN",
  },
  // Current assignment
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  onDuty: {
    type: Boolean,
    default: false,
  },
  // Real-time tracking
  currentLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    lastUpdated: { type: Date, default: null },
    heading: { type: Number, default: 0 }, // Direction in degrees (0-360)
    speed: { type: Number, default: 0 }, // Speed in km/h
  },
  // Link to User model for auth
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  efficiency: {
    type: Number,
    default: 0, // Percentage
  },
  totalDeliveries: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Driver", DriverSchema);
