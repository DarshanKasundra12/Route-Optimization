const mongoose = require("mongoose");

/**
 * PARCEL SCHEMA
 * Stores parcel pickup requests with location, weight, and destination information
 */
const ParcelSchema = new mongoose.Schema({
  parcelId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
  },
  pickupLocationName: {
    type: String,
    trim: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    default: 1, // in kg
  },
  destinationPort: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  // Warehouse assignment
  assignedWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    default: null,
  },
  // Container code based on destination port
  containerCode: {
    type: String,
    default: null,
  },
  // Status tracking
  status: {
    type: String,
    enum: [
      "CREATED",
      "ASSIGNED_TO_ROUTE",
      "PICKUP_IN_PROGRESS",
      "PICKED_UP",
      "MULTIPLE_PICKUPS",
      "ON_WAY_TO_WAREHOUSE",
      "ARRIVED_AT_WAREHOUSE",
      "DELIVERED",
    ],
    default: "CREATED",
  },
  // Route assignment
  assignedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    default: null,
  },
  // Cluster information for optimization
  clusterId: {
    type: Number,
    default: null,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
ParcelSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Parcel", ParcelSchema);
