const express = require("express");
const router = express.Router();
const warehouseController = require("../controllers/warehouseController");
const { protect, authorize } = require("../middleware/auth");

// Public routes (authenticated)
router.get("/", protect, warehouseController.getAllWarehouses);
router.get("/:id", protect, warehouseController.getWarehouseById);

// Admin-only routes
router.post(
  "/",
  protect,
  authorize("admin"),
  warehouseController.createWarehouse,
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  warehouseController.updateWarehouse,
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  warehouseController.deleteWarehouse,
);

module.exports = router;
