const Parcel = require("../models/Parcel");
const Warehouse = require("../models/Warehouse");
const Driver = require("../models/Driver");
const Route = require("../models/Route");

/**
 * PARCEL CONTROLLER
 * Handles all parcel-related operations
 */

// @route   POST /api/parcels
// @desc    Create a new parcel pickup request
// @access  Public
exports.createParcel = async (req, res) => {
  try {
    const {
      parcelId,
      latitude,
      longitude,
      weight,
      destinationPort,
      pickupLocationName,
    } = req.body;

    // Validation
    if (!parcelId || !latitude || !longitude || !destinationPort) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide parcelId, latitude, longitude, and destinationPort",
      });
    }

    // Check if parcel ID already exists
    const existingParcel = await Parcel.findOne({ parcelId });
    if (existingParcel) {
      return res.status(400).json({
        success: false,
        message: "Parcel ID already exists",
      });
    }

    // Generate container code based on destination port
    const containerCode = `${destinationPort}-${Date.now().toString().slice(-6)}`;

    // Create parcel
    const parcel = new Parcel({
      parcelId,
      latitude,
      longitude,
      // pickupLocationName,
      weight: weight || 1,
      destinationPort: destinationPort.toUpperCase(),
      containerCode,
      assignedWarehouse: req.body.assignedWarehouse || null,
    });

    await parcel.save();

    res.status(201).json({
      success: true,
      message: "Parcel created successfully",
      data: parcel,
    });
  } catch (error) {
    console.error("Create parcel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getAllParcels = async (req, res) => {
  try {
    const { status, destinationPort, assignedRoute } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (destinationPort) filter.destinationPort = destinationPort.toUpperCase();
    if (assignedRoute) filter.assignedRoute = assignedRoute;

    // RBAC: If Delivery Boy, only show parcels for their assigned routes
    if (req.user && req.user.role === "deliveryboy") {
      const driver = await Driver.findOne({ user: req.user.id });
      if (driver) {
        // Find all routes assigned to this driver
        const routes = await Route.find({ assignedDriver: driver._id });
        const routeIds = routes.map((r) => r._id);
        filter.assignedRoute = { $in: routeIds };
      } else {
        // If no driver profile, return empty list
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    const parcels = await Parcel.find(filter)
      .populate("assignedWarehouse", "name code")
      .populate("assignedRoute", "routeId status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Get parcels error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/parcels/:id
// @desc    Get single parcel by ID
// @access  Public
exports.getParcelById = async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate("assignedWarehouse")
      .populate("assignedRoute");

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    res.json({
      success: true,
      data: parcel,
    });
  } catch (error) {
    console.error("Get parcel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   PUT /api/parcels/:id
// @desc    Update parcel
// @access  Public
exports.updateParcel = async (req, res) => {
  try {
    const { status, assignedWarehouse, assignedRoute } = req.body;

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    // Update fields - RBAC logic
    if (req.user.role === "deliveryboy") {
      // Check if parcel is assigned to this driver's routes
      const driver = await Driver.findOne({ user: req.user.id });
      const routes = await Route.find({ assignedDriver: driver._id });
      const routeIds = routes.map((r) => r._id.toString());

      if (
        !parcel.assignedRoute ||
        !routeIds.includes(parcel.assignedRoute.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this parcel",
        });
      }

      // Delivery boy can only update status
      if (status) parcel.status = status;
    } else {
      // Admin can update everything
      if (status) parcel.status = status;
      if (assignedWarehouse) parcel.assignedWarehouse = assignedWarehouse;
      if (assignedRoute) parcel.assignedRoute = assignedRoute;
    }

    // If status is being set back to CREATED, clear the stale assignedRoute
    if (status === "CREATED" && parcel.assignedRoute) {
      parcel.assignedRoute = null;
    }

    await parcel.save();

    // === CASCADING STATUS LOGIC ===
    if (parcel.assignedRoute) {
      const route = await Route.findById(parcel.assignedRoute);

      if (
        route &&
        route.optimizedSequence &&
        route.optimizedSequence.length > 0
      ) {
        const sequence = route.optimizedSequence;
        const allRouteParcels = await Parcel.find({ assignedRoute: route._id });

        // Find current parcel's position in the optimized sequence
        const currentIndex = sequence.findIndex(
          (step) => step.parcelId === parcel.parcelId,
        );

        const isLastParcel = currentIndex === sequence.length - 1;

        // When a parcel is marked as PICKED_UP
        if (status === "PICKED_UP") {
          // Move any previously PICKED_UP parcels to MULTIPLE_PICKUPS
          await Parcel.updateMany(
            {
              assignedRoute: route._id,
              _id: { $ne: parcel._id },
              status: "PICKED_UP",
            },
            { $set: { status: "MULTIPLE_PICKUPS" } },
          );

          if (isLastParcel) {
            // Last parcel picked up → all parcels are now on the way to warehouse
            await Parcel.updateMany(
              {
                assignedRoute: route._id,
                status: { $in: ["PICKED_UP", "MULTIPLE_PICKUPS"] },
              },
              { $set: { status: "ON_WAY_TO_WAREHOUSE" } },
            );
          } else {
            // Set next parcel in sequence to PICKUP_IN_PROGRESS
            const nextStep = sequence[currentIndex + 1];
            if (nextStep) {
              const nextParcel = allRouteParcels.find(
                (p) => p.parcelId === nextStep.parcelId,
              );
              if (nextParcel) {
                nextParcel.status = "PICKUP_IN_PROGRESS";
                await nextParcel.save();
              }
            }
          }
        }

        // When last parcel is set to ARRIVED_AT_WAREHOUSE → all parcels arrive
        if (status === "ARRIVED_AT_WAREHOUSE" && isLastParcel) {
          await Parcel.updateMany(
            {
              assignedRoute: route._id,
              _id: { $ne: parcel._id },
              status: {
                $in: ["PICKED_UP", "MULTIPLE_PICKUPS", "ON_WAY_TO_WAREHOUSE"],
              },
            },
            { $set: { status: "ARRIVED_AT_WAREHOUSE" } },
          );
        }

        // When last parcel is set to DELIVERED → all parcels delivered
        if (status === "DELIVERED" && isLastParcel) {
          await Parcel.updateMany(
            {
              assignedRoute: route._id,
              _id: { $ne: parcel._id },
              status: {
                $in: [
                  "PICKED_UP",
                  "MULTIPLE_PICKUPS",
                  "ON_WAY_TO_WAREHOUSE",
                  "ARRIVED_AT_WAREHOUSE",
                ],
              },
            },
            { $set: { status: "DELIVERED" } },
          );
        }
      }
    }

    // === CHECK FOR ROUTE COMPLETION ===
    // If status is DELIVERED, check if all parcels in this route are finished
    if (status === "DELIVERED" && parcel.assignedRoute) {
      const pendingCount = await Parcel.countDocuments({
        assignedRoute: parcel.assignedRoute,
        status: { $nin: ["DELIVERED", "CANCELLED", "RETURNED"] },
      });

      console.log(`Route completion check: ${pendingCount} pending parcels`);

      if (pendingCount === 0) {
        // All parcels delivered! Mark route as COMPLETED and free driver
        const route = await Route.findById(parcel.assignedRoute);
        if (route) {
          console.log(
            `Route ${route.routeId} completed. Updating status and driver availability.`,
          );

          route.status = "COMPLETED";
          route.completedAt = Date.now();
          // Remove driver from route? No, keep history.
          // Just update driver availability.
          await route.save();

          if (route.assignedDriver) {
            await Driver.findByIdAndUpdate(route.assignedDriver, {
              isAvailable: true,
              currentRoute: null,
              // Keep onDuty true so they can get new assignments
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Parcel updated successfully",
      data: parcel,
    });
  } catch (error) {
    console.error("Update parcel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   DELETE /api/parcels/:id
// @desc    Delete parcel
// @access  Public
exports.deleteParcel = async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found",
      });
    }

    // Don't allow deletion if parcel is assigned to a route (unless it's CREATED with stale data or DELIVERED)
    if (
      parcel.assignedRoute &&
      parcel.status !== "DELIVERED" &&
      parcel.status !== "CREATED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete parcel that is assigned to a route.. Mark it as DELIVERED first or unassign it.",
      });
    }

    await Parcel.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Parcel deleted successfully",
    });
  } catch (error) {
    console.error("Delete parcel error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/parcels/pending/list
// @desc    Get all pending parcels (not assigned to any route)
// @access  Public
exports.getPendingParcels = async (req, res) => {
  try {
    const { assignedWarehouse } = req.query;
    const filter = {
      status: "CREATED",
      assignedRoute: null,
    };

    if (assignedWarehouse) {
      filter.assignedWarehouse = assignedWarehouse;
    }

    const parcels = await Parcel.find(filter);

    res.json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Get pending parcels error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
