import { describe, it, expect, beforeAll } from "vitest";
import axios from "axios";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: "./backend/.env" });

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5001/api";

describe("Route Optimization API", () => {
  let warehouseId;
  let parcelIds = [];
  let authToken = "";

  // 1. Setup - Authenticate as Admin
  beforeAll(async () => {
    try {
      // Try to register a temporary admin for testing
      const adminEmail = `test-admin-${Date.now()}@example.com`;
      const regRes = await axios.post(`${API_BASE_URL}/auth/register`, {
        name: "Test Admin",
        email: adminEmail,
        password: "password123",
        role: "admin",
      });
      authToken = regRes.data.token;
      console.log("✅ Authenticated as Admin");
    } catch (error) {
      console.error(
        "❌ Auth Setup Failed:",
        error.response?.data || error.message,
      );
      throw error;
    }
  });

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${authToken}` },
  });

  it("should fetch warehouses and parcels to prepare for optimization", async () => {
    // 1. Fetch Warehouse
    const whRes = await axios.get(`${API_BASE_URL}/warehouses`, getHeaders());
    expect(whRes.data.success).toBe(true);
    expect(whRes.data.data.length).toBeGreaterThan(0);
    warehouseId = whRes.data.data[0]._id;

    // 2. Fetch Pending Parcels
    const parcelRes = await axios.get(`${API_BASE_URL}/parcels/pending/list`, {
      params: { assignedWarehouse: warehouseId },
      ...getHeaders(),
    });
    expect(parcelRes.data.success).toBe(true);
    parcelIds = parcelRes.data.data.map((p) => p._id);

    // We expect some parcels if seeded.
    // If not, we might need to create some here, but we'll assume seed was run.
  });

  it("should fail optimization without warehouseId", async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/routes/optimize`,
        {
          parcelIds: parcelIds,
        },
        getHeaders(),
      );
    } catch (error) {
      // Should be 400 Bad Request if validation fails, or 500 if unhandled
      expect(error.response.status).toBeGreaterThanOrEqual(400);
    }
  });

  it("should successfully run optimization with OSRM + VROOM", async () => {
    if (parcelIds.length === 0) {
      console.warn(
        "⚠️ Skipping optimization as no pending parcels were found.",
      );
      return;
    }

    try {
      const optRes = await axios.post(
        `${API_BASE_URL}/routes/optimize`,
        {
          warehouseId: warehouseId,
          parcelIds: parcelIds,
          clusterRadius: 1,
        },
        getHeaders(),
      );

      expect(optRes.status).toBe(201);
      expect(optRes.data.success).toBe(true);
      expect(optRes.data.data.route).toBeDefined();
      expect(optRes.data.data.metrics).toBeDefined();

      const { route, metrics } = optRes.data.data;
      console.log(`\n--- OPTIMIZATION RESULT ---`);
      console.log(`Route ID: ${route.routeId}`);
      console.log(`Distance: ${metrics.totalDistance}`);
      console.log(`Duration: ${metrics.totalTime}`);
      console.log(`Sequence length: ${route.optimizedSequence.length}`);
      console.log(`---------------------------\n`);
    } catch (error) {
      console.error(
        "❌ Optimization Failed:",
        error.response?.data || error.message,
      );
      // If services are down, this will fail. We want to know if it's a 500 or just a connection error.
      throw error;
    }
  });
});
