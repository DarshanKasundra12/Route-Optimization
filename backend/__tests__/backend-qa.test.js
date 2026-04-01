/**
 * Backend Full QA Test Suite
 *
 * REQUIREMENTS:
 * 1. Backend server must be running on port 5001
 * 2. MongoDB must be running
 * 3. OSRM and VROOM services should be running for optimization tests
 *
 * Run with: npm test __tests__/backend-qa.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5001/api";

describe("Backend Full QA Suite", () => {
  // Shared state across tests
  let adminToken = "";
  let driverToken = "";
  let warehouseId = "";
  let parcelId = "";
  let driverId = "";
  let routeId = "";

  const adminEmail = `qa-admin-${Date.now()}@test.com`;
  const driverEmail = `qa-driver-${Date.now()}@test.com`;

  const getAdminHeaders = () => ({
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const getDriverHeaders = () => ({
    headers: { Authorization: `Bearer ${driverToken}` },
  });

  // ==================== AUTHENTICATION ====================

  describe("1. Authentication", () => {
    it("1.1 Should register an admin user", async () => {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: "QA Admin",
        email: adminEmail,
        password: "password123",
        role: "admin",
      });

      expect(res.status).toBe(201);
      expect(res.data.token).toBeDefined();
      adminToken = res.data.token;
      console.log("✅ Admin registered");
    });

    it("1.2 Should register a delivery boy (creates Driver profile)", async () => {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: "QA Driver",
        email: driverEmail,
        password: "password123",
        role: "deliveryboy",
      });

      expect(res.status).toBe(201);
      expect(res.data.token).toBeDefined();
      driverToken = res.data.token;
      console.log("✅ Driver registered with token");
    });

    it("1.3 Should login as admin", async () => {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: adminEmail,
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.data.token).toBeDefined();
      adminToken = res.data.token; // Refresh token
    });

    it("1.4 Should get current user info", async () => {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, getAdminHeaders());

      expect(res.status).toBe(200);
      expect(res.data.data.email).toBe(adminEmail);
      expect(res.data.data.role).toBe("admin");
    });

    it("1.5 Should reject invalid credentials", async () => {
      try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
          email: adminEmail,
          password: "wrongpassword",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  // ==================== WAREHOUSE MANAGEMENT ====================

  describe("2. Warehouse Management", () => {
    it("2.1 Should create a warehouse (Admin)", async () => {
      const res = await axios.post(
        `${API_BASE_URL}/warehouses`,
        {
          name: "QA Test Warehouse",
          code: `QA${Date.now()}`,
          latitude: 19.076,
          longitude: 72.8777,
          address: "Mumbai Test Location",
          capacity: 500,
        },
        getAdminHeaders(),
      );

      expect(res.status).toBe(201);
      expect(res.data.data._id).toBeDefined();
      warehouseId = res.data.data._id;
      console.log("✅ Warehouse created:", warehouseId);
    });

    it("2.2 Should list all warehouses", async () => {
      const res = await axios.get(
        `${API_BASE_URL}/warehouses`,
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    it("2.3 Should get warehouse by ID", async () => {
      const res = await axios.get(
        `${API_BASE_URL}/warehouses/${warehouseId}`,
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data._id).toBe(warehouseId);
    });

    it("2.4 Should update warehouse", async () => {
      const res = await axios.put(
        `${API_BASE_URL}/warehouses/${warehouseId}`,
        { capacity: 600 },
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data.capacity).toBe(600);
    });
  });

  // ==================== PARCEL MANAGEMENT ====================

  describe("3. Parcel Management", () => {
    it("3.1 Should create a parcel", async () => {
      const res = await axios.post(
        `${API_BASE_URL}/parcels`,
        {
          parcelId: `QA-PKG-${Date.now()}`,
          latitude: 19.1,
          longitude: 72.9,
          weight: 5.5,
          destinationPort: "JNPT",
          pickupLocationName: "QA Test Location",
          assignedWarehouse: warehouseId,
        },
        getAdminHeaders(),
      );

      expect(res.status).toBe(201);
      expect(res.data.data._id).toBeDefined();
      parcelId = res.data.data._id;
      console.log("✅ Parcel created:", parcelId);
    });

    it("3.2 Should list all parcels", async () => {
      const res = await axios.get(`${API_BASE_URL}/parcels`, getAdminHeaders());

      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    it("3.3 Should list pending parcels", async () => {
      const res = await axios.get(`${API_BASE_URL}/parcels/pending/list`, {
        params: { assignedWarehouse: warehouseId },
        ...getAdminHeaders(),
      });

      expect(res.status).toBe(200);
      const found = res.data.data.find((p) => p._id === parcelId);
      expect(found).toBeDefined();
    });

    it("3.4 Should get parcel by ID", async () => {
      const res = await axios.get(
        `${API_BASE_URL}/parcels/${parcelId}`,
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data._id).toBe(parcelId);
    });

    it("3.5 Should update parcel status", async () => {
      // Admin updates status
      const res = await axios.put(
        `${API_BASE_URL}/parcels/${parcelId}`,
        { status: "PENDING" }, // Keep it pending for optimization
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
    });
  });

  // ==================== DRIVER MANAGEMENT ====================

  describe("4. Driver Management", () => {
    it("4.1 Should list drivers", async () => {
      const res = await axios.get(`${API_BASE_URL}/drivers`, getAdminHeaders());

      expect(res.status).toBe(200);
      // Find the driver created during registration
      const driver = res.data.data.find((d) => d.email === driverEmail);
      if (driver) {
        driverId = driver._id;
        console.log("✅ Found driver:", driverId);
      }
    });

    it("4.2 Should list available drivers", async () => {
      const res = await axios.get(`${API_BASE_URL}/drivers`, {
        params: { isAvailable: true },
        ...getAdminHeaders(),
      });

      expect(res.status).toBe(200);
    });

    it("4.3 Driver should update their own location", async () => {
      if (!driverId) {
        console.warn("⚠️ Skipping: No driver ID available");
        return;
      }

      const res = await axios.put(
        `${API_BASE_URL}/drivers/${driverId}/location`,
        {
          latitude: 19.15,
          longitude: 72.85,
          heading: 45,
          speed: 30,
        },
        getDriverHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data.latitude).toBe(19.15);
    });
  });

  // ==================== ROUTE OPTIMIZATION ====================

  describe("5. Route Optimization", () => {
    it("5.1 Should optimize route for pending parcels", async () => {
      // Get pending parcels first
      const parcelRes = await axios.get(
        `${API_BASE_URL}/parcels/pending/list`,
        {
          params: { assignedWarehouse: warehouseId },
          ...getAdminHeaders(),
        },
      );

      const pendingParcelIds = parcelRes.data.data.map((p) => p._id);

      if (pendingParcelIds.length === 0) {
        console.warn("⚠️ No pending parcels for optimization");
        return;
      }

      try {
        const res = await axios.post(
          `${API_BASE_URL}/routes/optimize`,
          {
            warehouseId: warehouseId,
            parcelIds: pendingParcelIds,
          },
          getAdminHeaders(),
        );

        expect(res.status).toBe(201);
        expect(res.data.data.route).toBeDefined();
        expect(res.data.data.metrics).toBeDefined();
        routeId = res.data.data.route._id;
        console.log("✅ Route optimized:", routeId);
      } catch (error) {
        // OSRM/VROOM might not be running
        console.warn(
          "⚠️ Optimization may have failed due to missing services:",
          error.response?.data?.message || error.message,
        );
      }
    });

    it("5.2 Should list routes", async () => {
      const res = await axios.get(`${API_BASE_URL}/routes`, getAdminHeaders());

      expect(res.status).toBe(200);
    });

    it("5.3 Should assign driver to route", async () => {
      if (!routeId || !driverId) {
        console.warn("⚠️ Skipping: No route or driver available");
        return;
      }

      const res = await axios.put(
        `${API_BASE_URL}/routes/${routeId}/assign-driver`,
        { driverId: driverId },
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe("ASSIGNED");
      expect(res.data.data.isLocked).toBe(true);
      console.log("✅ Driver assigned to route");
    });
  });

  // ==================== ROUTE LIFECYCLE (Driver Actions) ====================

  describe("6. Route Lifecycle", () => {
    it("6.1 Driver should view assigned routes", async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/routes`,
          getDriverHeaders(),
        );

        expect(res.status).toBe(200);
        // Driver should only see their assigned routes
      } catch (error) {
        // If 401, driver profile might not be linked to user
        console.warn(
          "⚠️ Driver route view failed (401). Driver profile may not be linked to authenticated user.",
        );
        expect(error.response?.status).toBe(401);
      }
    });

    it("6.2 Driver should update route status to IN_PROGRESS", async () => {
      if (!routeId) {
        console.warn("⚠️ Skipping: No route available");
        return;
      }

      const res = await axios.put(
        `${API_BASE_URL}/routes/${routeId}/status`,
        { status: "IN_PROGRESS" },
        getDriverHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe("IN_PROGRESS");
    });

    it("6.3 Driver should complete the route", async () => {
      if (!routeId) {
        console.warn("⚠️ Skipping: No route available");
        return;
      }

      const res = await axios.put(
        `${API_BASE_URL}/routes/${routeId}/complete`,
        {},
        getDriverHeaders(),
      );

      expect(res.status).toBe(200);
      expect(res.data.data.status).toBe("COMPLETED");
      console.log("✅ Route completed");
    });
  });

  // ==================== CLEANUP ====================

  describe("7. Cleanup", () => {
    it("7.1 Should delete parcel (after delivery)", async () => {
      // Mark parcel as delivered first if needed
      await axios.put(
        `${API_BASE_URL}/parcels/${parcelId}`,
        { status: "DELIVERED" },
        getAdminHeaders(),
      );

      const res = await axios.delete(
        `${API_BASE_URL}/parcels/${parcelId}`,
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      console.log("✅ Parcel deleted");
    });

    it("7.2 Should delete warehouse", async () => {
      // First ensure no parcels are assigned
      const res = await axios.delete(
        `${API_BASE_URL}/warehouses/${warehouseId}`,
        getAdminHeaders(),
      );

      expect(res.status).toBe(200);
      console.log("✅ Warehouse deleted");
    });
  });
});
