const express = require("express");
const router = express.Router();
const parcelController = require("../controllers/parcelController");

const { protect, authorize } = require("../middleware/auth");

// Shared routes (authenticated)
router.get("/", protect, parcelController.getAllParcels);
router.get("/pending/list", protect, parcelController.getPendingParcels);
router.get("/:id", protect, parcelController.getParcelById);

// Admin and Delivery Boy routes
router.put(
  "/:id",
  protect,
  authorize("admin", "deliveryboy"),
  parcelController.updateParcel,
);

// Admin-only routes
router.post("/", protect, authorize("admin"), parcelController.createParcel);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  parcelController.deleteParcel,
);

module.exports = router;
