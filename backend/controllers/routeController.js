const Route = require("../models/Route");
const Parcel = require("../models/Parcel");
const Warehouse = require("../models/Warehouse");
const Driver = require("../models/Driver");
const vroomService = require("../services/vroomService");
const osrmService = require("../services/osrmService");
const clusteringService = require("../services/clusteringService");

/**
 * ROUTE CONTROLLER
 * Handles route optimization and management using VROOM and OSRM
 */

// @route   POST /api/routes/optimize
// @desc    Generate optimized route for pending parcels
// @access  Public
exports.optimizeRoute = async (req, res) => {
  try {
    const { warehouseId, parcelIds, clusterRadius } = req.body;

    // Get warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    // Get parcels
    let parcels;
    if (parcelIds && parcelIds.length > 0) {
      parcels = await Parcel.find({
        _id: { $in: parcelIds },
        assignedRoute: null,
      });
    } else {
      // Get all pending parcels
      parcels = await Parcel.find({ status: "CREATED", assignedRoute: null });
    }

    if (parcels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No parcels available for optimization",
      });
    }

    console.log(
      `Optimizing route for ${parcels.length} parcels from warehouse ${warehouse.name}`,
    );

    // Step 1: Cluster parcels (optional, for better performance with many parcels)
    let parcelData = parcels.map((p) => ({
      id: p._id.toString(),
      parcelId: p.parcelId, // Keep original ID for reference
      pickupLocationName: p.pickupLocationName,
      latitude: p.latitude,
      longitude: p.longitude,
      weight: p.weight,
    }));

    if (clusterRadius && parcels.length > 10) {
      const clusters = clusteringService.greedyCluster(
        parcelData,
        clusterRadius,
      );
      console.log(
        `Clustered ${parcels.length} parcels into ${clusters.length} clusters`,
      );

      // Update parcels with cluster IDs
      clusters.forEach((cluster, index) => {
        cluster.parcels.forEach((p) => {
          const parcel = parcels.find(
            (parcel) => parcel._id.toString() === p.id,
          );
          if (parcel) parcel.clusterId = index;
        });
      });
    }

    // Step 2: Use VROOM to optimize route
    const warehouseData = {
      id: warehouse._id.toString(),
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
    };

    const vroomResult = await vroomService.optimizeRoute(
      warehouseData,
      parcelData,
    );

    console.log("VROOM optimization result:", {
      parcels: vroomResult.parcelCount,
      distance: vroomResult.totalDistance,
      duration: vroomResult.totalDuration,
    });

    // Step 3: Get detailed route geometry from OSRM
    // Split into GOING (Warehouse -> All Parcels) and RETURN (Last Parcel -> Warehouse)
    const goingWaypoints = [
      { latitude: warehouse.latitude, longitude: warehouse.longitude },
      ...vroomResult.optimizedSequence.map((seq) => ({
        latitude: seq.latitude,
        longitude: seq.longitude,
      })),
    ];

    const returnWaypoints = [
      goingWaypoints[goingWaypoints.length - 1], // Last parcel
      { latitude: warehouse.latitude, longitude: warehouse.longitude }, // Back to warehouse
    ];

    const [goingRoute, returnRoute] = await Promise.all([
      osrmService.getDetailedRoute(goingWaypoints),
      osrmService.getDetailedRoute(returnWaypoints),
    ]);

    // Step 4: Calculate fuel cost (example: ₹8 per km)
    const fuelCostPerKm = 4.5;
    const totalDistanceInMeters = goingRoute.distance + returnRoute.distance;
    const distanceInKm = totalDistanceInMeters / 1000;
    const estimatedFuelCost = distanceInKm * fuelCostPerKm;

    // Step 5: Create route in database
    const routeId = `RT-${Date.now()}`;
    const route = new Route({
      routeId,
      warehouse: warehouse._id,
      parcels: parcels.map((p) => p._id),
      optimizedSequence: vroomResult.optimizedSequence,
      routePolyline: goingRoute.geometry, // "Going" path (White)
      returnRoutePolyline: returnRoute.geometry, // "Return" path (Yellow)
      totalDistance: totalDistanceInMeters,
      totalTime: goingRoute.duration + returnRoute.duration,
      estimatedFuelCost,
      navigationSteps: [...goingRoute.legs, ...returnRoute.legs],
      status: "PENDING",
    });

    await route.save();

    // Step 6: Update parcels with route assignment
    await Parcel.updateMany(
      { _id: { $in: parcels.map((p) => p._id) } },
      {
        $set: {
          assignedRoute: route._id,
          status: "ASSIGNED_TO_ROUTE",
        },
      },
    );

    res.status(201).json({
      success: true,
      message: "Route optimized successfully",
      data: {
        route,
        metrics: {
          totalParcels: parcels.length,
          totalDistance: `${distanceInKm.toFixed(2)} km`,
          totalTime: `${(vroomResult.totalDuration / 60).toFixed(0)} minutes`,
          estimatedFuelCost: `₹${estimatedFuelCost.toFixed(2)}`,
          unassignedParcels: vroomResult.unassignedParcels.length,
        },
      },
    });
  } catch (error) {
    console.error("Optimize route error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to optimize route",
      error: error.message,
    });
  }
};

// @route   POST /api/routes/distribute
// @desc    Distribute multiple parcels to multiple drivers
// @access  Public
exports.distributeParcels = async (req, res) => {
  try {
    const { warehouseId, parcelIds, driverIds } = req.body;

    // 1. Get warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    // 2. Get parcels
    let parcels;
    if (parcelIds && parcelIds.length > 0) {
      parcels = await Parcel.find({
        _id: { $in: parcelIds },
        assignedRoute: null,
      });
    } else {
      parcels = await Parcel.find({
        status: { $in: ["CREATED", "ARRIVED_AT_WAREHOUSE"] },
        assignedRoute: null,
      });
    }

    if (parcels.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No parcels available for distribution",
      });
    }

    // 3. Get drivers
    let drivers;
    if (driverIds && driverIds.length > 0) {
      drivers = await Driver.find({
        _id: { $in: driverIds },
        isAvailable: true,
      });
    } else {
      drivers = await Driver.find({ isAvailable: true, onDuty: true });
    }

    if (drivers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No available drivers found for distribution",
      });
    }

    console.log(
      `Distributing ${parcels.length} parcels among ${drivers.length} drivers`,
    ); // 4. Build VROOM Problem using Matrix (Legacy Project Logic)
    const locations = [];

    // Vehicle Start/End locations (2 for each vehicle: start and end)
    const vehicleLocations = drivers.map((d) => {
      // Use driver's current location if available, fallback to warehouse
      // Ensure we have numbers
      const hasLoc =
        d.currentLocation &&
        typeof d.currentLocation.latitude === "number" &&
        typeof d.currentLocation.longitude === "number";

      const start = hasLoc
        ? {
            latitude: d.currentLocation.latitude,
            longitude: d.currentLocation.longitude,
          }
        : {
            latitude: Number(warehouse.latitude),
            longitude: Number(warehouse.longitude),
          };
      const end = {
        latitude: Number(warehouse.latitude),
        longitude: Number(warehouse.longitude),
      };
      return { start, end };
    });

    vehicleLocations.forEach((v) => {
      locations.push(v.start);
      locations.push(v.end);
    });

    // Parcel locations (1 for each pickup/job)
    parcels.forEach((p) => {
      locations.push({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
      });
    });

    console.log(
      `[DISTRIBUTOR] Fetching matrix for ${locations.length} locations...`,
    );

    // 5. Fetch Matrix from OSRM
    const matrix = await osrmService.getMatrix(locations);
    if (!matrix || !matrix.durations) {
      throw new Error(
        "Failed to fetch duration matrix from OSRM. Ensure OSRM is reachable.",
      );
    }

    // 6. Force optimization to use all drivers by setting max_tasks
    const numDrivers = drivers.length;
    const totalParcels = parcels.length;
    const maxParcelsPerDriver =
      numDrivers > 1 ? Math.ceil(totalParcels / numDrivers) + 2 : totalParcels;

    const vroomVehicles = drivers.map((d, idx) => ({
      id: idx + 1,
      profile: "default",
      start: [
        vehicleLocations[idx].start.longitude,
        vehicleLocations[idx].start.latitude,
      ],
      start_index: idx * 2,
      end: [
        vehicleLocations[idx].end.longitude,
        vehicleLocations[idx].end.latitude,
      ],
      end_index: idx * 2 + 1,
      capacity: [1000],
      max_tasks: maxParcelsPerDriver,
    }));

    const vroomJobs = parcels.map((p, idx) => ({
      id: idx + 1,
      location: [Number(p.longitude), Number(p.latitude)],
      location_index: numDrivers * 2 + idx,
      delivery: [p.weight || 1],
      service: 300,
    }));

    console.log(`[DISTRIBUTOR] Solving with VROOM...`);

    // 7. Solve with VROOM
    const vroomSolution = await vroomService.optimizeWithMatrix(
      vroomVehicles,
      vroomJobs,
      {
        default: {
          durations: matrix.durations.map((row) =>
            row.map((d) => Math.round(d || 0)),
          ),
        },
      },
    );

    if (!vroomSolution || !vroomSolution.routes) {
      console.warn("[DISTRIBUTOR] VROOM returned no routes", vroomSolution);
    }

    const createdRoutes = [];
    const fuelCostPerKm = 4.5;

    // 8. Process each optimized route from VROOM
    for (const vroomRoute of vroomSolution?.routes || []) {
      if (!vroomRoute.steps || vroomRoute.steps.length <= 2) continue;

      const driverIdx = vroomRoute.vehicle - 1;
      const driver = drivers[driverIdx];
      if (!driver) continue;

      const startLoc = vehicleLocations[driverIdx].start;

      // Filter to get only job steps (parcels)
      const routeSteps = vroomRoute.steps
        .filter((s) => s.type === "job")
        .map((step) => {
          const parcelIdx = step.job - 1;
          const parcel = parcels[parcelIdx];
          if (!parcel) return null;
          return {
            _id: parcel._id,
            parcelId: parcel.parcelId,
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            pickupLocationName: parcel.pickupLocationName || "Unknown",
            weight: parcel.weight,
          };
        })
        .filter(Boolean);

      if (routeSteps.length === 0) continue;

      console.log(
        `[DISTRIBUTOR] Fetching detailed route geometry for Driver: ${driver.name}...`,
      );

      // 9. Enrich with Detailed OSRM Route
      const allWaypoints = [
        startLoc,
        ...routeSteps.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        { latitude: warehouse.latitude, longitude: warehouse.longitude },
      ];

      try {
        const osrmResult = await osrmService.getDetailedRoute(allWaypoints);

        const lastParcel = routeSteps[routeSteps.length - 1];
        const returnWaypoints = [
          { latitude: lastParcel.latitude, longitude: lastParcel.longitude },
          { latitude: warehouse.latitude, longitude: warehouse.longitude },
        ];
        const returnRoute = await osrmService.getDetailedRoute(returnWaypoints);

        const routeId = `RT-DIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const route = new Route({
          routeId,
          warehouse: warehouse._id,
          parcels: routeSteps.map((s) => s._id),
          optimizedSequence: routeSteps,
          routePolyline: osrmResult.geometry,
          returnRoutePolyline: returnRoute.geometry,
          totalDistance: osrmResult.distance,
          totalTime: osrmResult.duration,
          estimatedFuelCost: (osrmResult.distance / 1000) * fuelCostPerKm,
          navigationSteps: osrmResult.legs,
          assignedDriver: driver._id,
          status: "ASSIGNED",
          isLocked: true,
        });

        await route.save();
        createdRoutes.push(route);

        // 10. Update Parcel Assignments
        const parcelMongoIds = routeSteps.map((s) => s._id);
        await Parcel.updateMany(
          { _id: { $in: parcelMongoIds } },
          { $set: { assignedRoute: route._id, status: "ASSIGNED_TO_ROUTE" } },
        );

        // 11. Update Driver Availability
        await Driver.findByIdAndUpdate(driver._id, {
          currentRoute: route._id,
          isAvailable: false,
        });
      } catch (osrmError) {
        console.error(
          `[DISTRIBUTOR] OSRM Enrichment failed for driver ${driver.name}:`,
          osrmError.message,
        );
        // Continue to next driver instead of failing entire request
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully distributed parcels into ${createdRoutes.length} optimized routes`,
      data: createdRoutes,
    });
  } catch (error) {
    console.error("Distribute parcels error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to distribute parcels",
      error: error.message,
    });
  }
};

// @route   PUT /api/routes/:id/recalculate
// @desc    Recalculate path and instructions for an existing route
// @access  Admin
exports.recalculateRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate("warehouse");
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Check if route has necessary data
    if (
      !route.warehouse ||
      !route.optimizedSequence ||
      route.optimizedSequence.length === 0
    ) {
      // If no sequence, maybe try to use parcel list? But optimizedSequence is critical for ordering.
      return res.status(400).json({
        success: false,
        message:
          "Route is missing optimized sequence data, cannot recalculate path.",
      });
    }

    console.log(`Recalculating route ${route.routeId}...`);

    // Prepare waypoints
    const warehouse = route.warehouse;

    // Going path (Warehouse -> First Parcel -> ... -> Last Parcel)
    console.log(
      `Building going path with ${route.optimizedSequence.length} stops`,
    );
    const goingWaypoints = [
      { latitude: warehouse.latitude, longitude: warehouse.longitude },
      ...route.optimizedSequence.map((seq) => ({
        latitude: seq.latitude,
        longitude: seq.longitude,
      })),
    ];

    // Return path (Last Parcel -> Warehouse)
    const lastPoint = goingWaypoints[goingWaypoints.length - 1];
    const returnWaypoints = [
      lastPoint,
      { latitude: warehouse.latitude, longitude: warehouse.longitude },
    ];

    // Call OSRM
    const [goingRoute, returnRoute] = await Promise.all([
      osrmService.getDetailedRoute(goingWaypoints),
      osrmService.getDetailedRoute(returnWaypoints),
    ]);

    // Update route details
    const totalDistanceInMeters = goingRoute.distance + returnRoute.distance;
    const distanceInKm = totalDistanceInMeters / 1000;
    const estimatedFuelCost = distanceInKm * 4.5; // Using previous constant

    route.routePolyline = goingRoute.geometry;
    route.returnRoutePolyline = returnRoute.geometry;
    route.totalDistance = totalDistanceInMeters;
    route.totalTime = goingRoute.duration + returnRoute.duration;
    route.estimatedFuelCost = estimatedFuelCost;

    // Update navigation steps
    const newSteps = [...goingRoute.legs, ...returnRoute.legs];
    console.log(`New navigation steps count: ${newSteps.length} legs`);
    route.navigationSteps = newSteps;

    await route.save();

    res.json({
      success: true,
      message: "Route recalculated successfully",
      data: route,
    });
  } catch (error) {
    console.error("Recalculate route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/routes
// @desc    Get all routes
// @access  Public
exports.getAllRoutes = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    // RBAC: If Delivery Boy, only show routes assigned to them
    if (req.user && req.user.role === "deliveryboy") {
      const driver = await Driver.findOne({ user: req.user.id });
      if (driver) {
        filter.assignedDriver = driver._id;
      } else {
        // If no driver profile, return empty list
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    const routes = await Route.find(filter)
      .populate("warehouse", "name code latitude longitude")
      .populate(
        "parcels",
        "parcelId destinationPort weight latitude longitude status",
      )
      .populate("assignedDriver", "name employeeId vehicleNumber")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    console.error("Get routes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/routes/:id
// @desc    Get single route with full details
// @access  Public
exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate("warehouse")
      .populate("parcels")
      .populate("assignedDriver");

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error("Get route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   PUT /api/routes/:id/assign-driver
// @desc    Assign driver to route and lock it
// @access  Public
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (route.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Route is already locked and assigned",
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    if (!driver.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Driver is not available",
      });
    }

    // Assign driver and lock route
    route.assignedDriver = driver._id;
    route.status = "ASSIGNED";
    route.isLocked = true;
    await route.save();

    // Update driver
    driver.currentRoute = route._id;
    driver.isAvailable = false;
    await driver.save();

    // Set all route parcels to ASSIGNED_TO_ROUTE
    await Parcel.updateMany(
      { _id: { $in: route.parcels } },
      { $set: { status: "ASSIGNED_TO_ROUTE" } },
    );

    res.json({
      success: true,
      message: "Driver assigned successfully",
      data: route,
    });
  } catch (error) {
    console.error("Assign driver error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   PUT /api/routes/:id/status
// @desc    Update route status (e.g. IN_PROGRESS)
// @access  Public (Protected)
exports.updateRouteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // RBAC check for delivery boys
    if (req.user.role === "deliveryboy") {
      const driver = await Driver.findOne({ user: req.user.id });
      if (
        !driver ||
        route.assignedDriver.toString() !== driver._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this route",
        });
      }
    }

    route.status = status;
    if (status === "IN_PROGRESS" && !route.startedAt) {
      route.startedAt = new Date();
    }
    await route.save();

    // When route starts (IN_PROGRESS), set first parcel to PICKUP_IN_PROGRESS
    if (
      status === "IN_PROGRESS" &&
      route.optimizedSequence &&
      route.optimizedSequence.length > 0
    ) {
      // First, ensure all parcels are ASSIGNED_TO_ROUTE
      await Parcel.updateMany(
        { _id: { $in: route.parcels } },
        { $set: { status: "ASSIGNED_TO_ROUTE" } },
      );

      // Then set the first parcel in sequence to PICKUP_IN_PROGRESS
      const firstParcelId = route.optimizedSequence[0].parcelId;
      const firstParcel = await Parcel.findOne({
        assignedRoute: route._id,
        parcelId: firstParcelId,
      });
      if (firstParcel) {
        firstParcel.status = "PICKUP_IN_PROGRESS";
        await firstParcel.save();
      }
    }

    res.json({
      success: true,
      message: `Route status updated to ${status}`,
      data: route,
    });
  } catch (error) {
    console.error("Update route status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   PUT /api/routes/:id/complete
// @desc    Mark route as completed
// @access  Public
exports.completeRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // RBAC check for delivery boys
    if (req.user.role === "deliveryboy") {
      const driver = await Driver.findOne({ user: req.user.id });
      if (
        !driver ||
        route.assignedDriver.toString() !== driver._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to complete this route",
        });
      }
    }

    route.status = "COMPLETED";
    route.completedAt = new Date();
    await route.save();

    // Update driver availability
    if (route.assignedDriver) {
      await Driver.findByIdAndUpdate(route.assignedDriver, {
        isAvailable: true,
        currentRoute: null,
      });
    }

    // Update parcels status (only those that weren't delivered)
    await Parcel.updateMany(
      {
        _id: { $in: route.parcels },
        status: { $ne: "DELIVERED" },
      },
      { $set: { status: "ARRIVED_AT_WAREHOUSE" } },
    );

    res.json({
      success: true,
      message: "Route completed successfully",
      data: route,
    });
  } catch (error) {
    console.error("Complete route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   DELETE /api/routes/:id
// @desc    Delete route (only if not locked)
// @access  Public
exports.deleteRoute = async (req, res) => {
  try {
    console.log(`[DELETE] Request for route ID: ${req.params.id}`);
    const route = await Route.findById(req.params.id);
    if (!route) {
      console.log(`[DELETE] Route not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    console.log(
      `[DELETE] Route status: ${route.status}, isLocked: ${route.isLocked}`,
    );

    // Permitting deletion of routes regardless of status for Admins (who are the only ones with access to this endpoint)
    // Removed IN_PROGRESS check per user request for deletion flexibility.

    // Unassign parcels (reset non-delivered ones to CREATED)
    await Parcel.updateMany(
      {
        _id: { $in: route.parcels },
        status: { $ne: "DELIVERED" },
      },
      {
        $set: {
          assignedRoute: null,
          status: "CREATED",
        },
      },
    );

    // Clear route reference for DELIVERED parcels without changing status
    await Parcel.updateMany(
      {
        _id: { $in: route.parcels },
        status: "DELIVERED",
      },
      {
        $set: { assignedRoute: null },
      },
    );

    // Clear assigned driver's currentRoute
    if (route.assignedDriver) {
      await Driver.findByIdAndUpdate(route.assignedDriver, {
        currentRoute: null,
        isAvailable: true,
      });
    }

    await Route.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Route deleted successfully",
    });
  } catch (error) {
    console.error("Delete route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
