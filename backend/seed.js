const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Warehouse = require("./models/Warehouse");
const Parcel = require("./models/Parcel");
const Driver = require("./models/Driver");

dotenv.config();

const WAREHOUSES = [
  {
    name: "Main Hub Ahmedabad",
    code: "AMD-HB-01",
    latitude: 23.0225,
    longitude: 72.5714,
    address: "Income Tax Circle, Ashram Road, Ahmedabad",
    capacity: 5000,
  },
  {
    name: "Satellite Warehouse",
    code: "AMD-SW-02",
    latitude: 23.012,
    longitude: 72.5108,
    address: "Prahlad Nagar, Ahmedabad",
    capacity: 2000,
  },
];

const PARCELS = [
  {
    parcelId: "PKG-1001",
    latitude: 23.0338,
    longitude: 72.585,
    weight: 2.5,
    destinationPort: "MUMBAI",
  },
  {
    parcelId: "PKG-1002",
    latitude: 23.048,
    longitude: 72.522,
    weight: 5.0,
    destinationPort: "DUBAI",
  },
  {
    parcelId: "PKG-1003",
    latitude: 23.001,
    longitude: 72.592,
    weight: 1.2,
    destinationPort: "LONDON",
  },
  {
    parcelId: "PKG-1004",
    latitude: 23.055,
    longitude: 72.601,
    weight: 3.8,
    destinationPort: "SINGAPORE",
  },
  {
    parcelId: "PKG-1005",
    latitude: 23.015,
    longitude: 72.541,
    weight: 0.8,
    destinationPort: "NEW YORK",
  },
  {
    parcelId: "PKG-1006",
    latitude: 23.061,
    longitude: 72.535,
    weight: 4.2,
    destinationPort: "MUMBAI",
  },
];

const DRIVERS = [
  {
    name: "Rahul Sharma",
    employeeId: "DRV-001",
    phone: "9876543210",
    vehicleNumber: "GJ-01-AB-1234",
    vehicleType: "VAN",
  },
  {
    name: "Amit Patel",
    employeeId: "DRV-002",
    phone: "9876543211",
    vehicleNumber: "GJ-01-CD-5678",
    vehicleType: "TRUCK",
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/route-optimization",
    );
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await Warehouse.deleteMany({});
    await Parcel.deleteMany({});
    await Driver.deleteMany({});

    // Insert Warehouses
    const createdWarehouses = await Warehouse.insertMany(WAREHOUSES);
    console.log(`✅ Seeded ${createdWarehouses.length} warehouses`);

    // Insert Drivers
    await Driver.insertMany(DRIVERS);
    console.log(`✅ Seeded ${DRIVERS.length} drivers`);

    // Insert Parcels and assign to first warehouse
    const parcelsWithWH = PARCELS.map((p) => ({
      ...p,
      assignedWarehouse: createdWarehouses[0]._id,
      containerCode: `${p.destinationPort}-${Date.now().toString().slice(-4)}`,
    }));
    await Parcel.insertMany(parcelsWithWH);
    console.log(`✅ Seeded ${PARCELS.length} parcels`);

    console.log("DB Seeded Successfully!");
    process.exit();
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedDB();
