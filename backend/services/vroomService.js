const axios = require("axios");

/**
 * VROOM SERVICE
 * Handles route optimization using VROOM (Vehicle Routing Open-source Optimization Machine)
 */

const VROOM_HOST = process.env.VROOM_HOST || "http://localhost:3000";

class VROOMService {
  /**
   * Optimize route for multiple pickup locations
   */
  async optimizeRoute(warehouse, parcels) {
    try {
      const startLoc = warehouse.startLocation
        ? [warehouse.startLocation.longitude, warehouse.startLocation.latitude]
        : [warehouse.longitude, warehouse.latitude];

      const vroomRequest = {
        vehicles: [
          {
            id: 1,
            start: startLoc,
            end: [warehouse.longitude, warehouse.latitude],
            capacity: [1000],
            profile: "default",
          },
        ],
        jobs: parcels.map((parcel, index) => ({
          id: index + 1,
          location: [parcel.longitude, parcel.latitude],
          delivery: [parcel.weight || 1],
          service: 300,
        })),
        options: {
          g: true,
        },
      };

      const response = await axios.post(`${VROOM_HOST}`, vroomRequest, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.code !== 0) {
        throw new Error(`VROOM failed with code ${response.data.code}`);
      }

      const solution = response.data;
      const route = solution.routes[0];

      const optimizedSequence = (route?.steps || [])
        .filter((step) => step.type === "job")
        .map((step) => {
          const jobIndex = step.job - 1;
          const parcel = parcels[jobIndex];
          return {
            parcelId: parcel.parcelId || parcel.id,
            _id: parcel._id || parcel._id,
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            arrivalTime: step.arrival || 0,
            serviceTime: step.service || 300,
            distanceFromPrevious: step.distance || 0,
            travelTimeFromPrevious: step.duration || 0,
          };
        });

      return {
        optimizedSequence,
        routeGeometry: route?.geometry || [],
        totalDistance: route?.distance || 0,
        totalDuration: route?.duration || 0,
        parcelCount: optimizedSequence.length,
        unassignedParcels: solution.unassigned || [],
      };
    } catch (error) {
      console.error("VROOM Error:", error.message);
      throw error;
    }
  }

  /**
   * ADVANCED Optimization using OSRM Table
   */
  async optimizeWithMatrix(vehicles, jobs, matrices) {
    try {
      const vroomRequest = {
        vehicles,
        jobs,
        matrices,
        options: { g: false },
      };

      const response = await axios.post(`${VROOM_HOST}`, vroomRequest, {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      });

      if (response.data.code !== 0) {
        throw new Error(`VROOM failed with code ${response.data.code}`);
      }

      return response.data;
    } catch (error) {
      console.error(
        "VROOM Advanced Error:",
        error.response?.data || error.message,
      );
      const serverError =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      throw new Error(serverError);
    }
  }
}

module.exports = new VROOMService();
