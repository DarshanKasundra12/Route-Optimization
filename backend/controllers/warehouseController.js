const Warehouse = require("../models/Warehouse");
const Parcel = require("../models/Parcel");

// @route   POST /api/warehouses
// @desc    Create warehouse
exports.createWarehouse = async (req, res) => {
  try {
    const { name, code, latitude, longitude, address, capacity } = req.body;

    const warehouse = new Warehouse({
      name,
      code: code.toUpperCase(),
      latitude,
      longitude,
      address,
      capacity,
    });

    await warehouse.save();

    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/warehouses
// @desc    Get all warehouses with current stock
exports.getAllWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).lean();

    // Get parcel counts for each warehouse
    const warehousesWithStock = await Promise.all(
      warehouses.map(async (warehouse) => {
        const currentStock = await Parcel.countDocuments({
          assignedWarehouse: warehouse._id,
          // Optional: Filter by status if needed, e.g., not DELIVERED
          // status: { $ne: 'DELIVERED' }
        });
        return { ...warehouse, currentStock };
      }),
    );

    res.json({
      success: true,
      count: warehousesWithStock.length,
      data: warehousesWithStock,
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   GET /api/warehouses/:id
// @desc    Get warehouse by ID with current stock
exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id).lean();

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const currentStock = await Parcel.countDocuments({
      assignedWarehouse: warehouse._id,
    });

    res.json({
      success: true,
      data: { ...warehouse, currentStock },
    });
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   PUT /api/warehouses/:id
// @desc    Update warehouse
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.json({
      success: true,
      message: "Warehouse updated successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @route   DELETE /api/warehouses/:id
// @desc    Delete warehouse
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    // Optional: Check if any parcels are assigned to this warehouse
    const Parcel = require("../models/Parcel");
    const count = await Parcel.countDocuments({
      assignedWarehouse: req.params.id,
    });
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete warehouse with assigned parcels",
      });
    }

    await Warehouse.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
