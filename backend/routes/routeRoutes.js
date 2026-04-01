const express = require("express");
const router = express.Router();
const routeController = require("../controllers/routeController");
const { protect, authorize } = require("../middleware/auth");

// Shared routes (authenticated)
router.get("/", protect, routeController.getAllRoutes);
router.get("/:id", protect, routeController.getRouteById);
router.put(
  "/:id/status",
  protect,
  authorize("admin", "deliveryboy"),
  routeController.updateRouteStatus,
);
router.put(
  "/:id/complete",
  protect,
  authorize("admin", "deliveryboy"),
  routeController.completeRoute,
);

// Admin-only routes
router.post(
  "/optimize",
  protect,
  authorize("admin"),
  routeController.optimizeRoute,
);
router.post(
  "/distribute",
  protect,
  authorize("admin"),
  routeController.distributeParcels,
);
router.put(
  "/:id/recalculate",
  protect,
  authorize("admin"),
  routeController.recalculateRoute,
);
router.put(
  "/:id/assign-driver",
  protect,
  authorize("admin"),
  routeController.assignDriver,
);
router.delete("/:id", protect, authorize("admin"), routeController.deleteRoute);

module.exports = router;
