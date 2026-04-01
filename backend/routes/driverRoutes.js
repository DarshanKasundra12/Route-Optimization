const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
const { protect, authorize } = require("../middleware/auth");

// Shared routes (authenticated)
router.get("/:id", protect, driverController.getDriverById);
router.put(
  "/:id/location",
  protect,
  authorize("admin", "deliveryboy"),
  driverController.updateLocation,
);

router.put(
  "/:id/toggle-duty",
  protect,
  authorize("admin", "deliveryboy"),
  driverController.toggleDuty,
);

// Admin-only routes
router.post("/", protect, authorize("admin"), driverController.createDriver);
router.get("/", protect, driverController.getAllDrivers);
router.put(
  "/:id",
  protect,
  authorize("admin", "deliveryboy"),
  driverController.updateDriver,
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  driverController.deleteDriver,
);

module.exports = router;
