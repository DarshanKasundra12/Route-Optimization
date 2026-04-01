const axios = require("axios");
const osrmTextInstructions = require("osrm-text-instructions")("v5");

/**
 * OSRM SERVICE
 * Handles all interactions with the OSRM (Open Source Routing Machine) API
 * OSRM provides real road distances and travel times
 */

const OSRM_HOST = process.env.OSRM_HOST || "http://localhost:5000";

class OSRMService {
  /**
   * Get route between two points
   * @param {Object} start - {latitude, longitude}
   * @param {Object} end - {latitude, longitude}
   * @returns {Object} - {distance, duration, geometry}
   */
  async getRoute(start, end) {
    try {
      const url = `${OSRM_HOST}/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

      const response = await axios.get(url);

      if (response.data.code !== "Ok") {
        throw new Error("OSRM routing failed");
      }

      const route = response.data.routes[0];

      return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry.coordinates, // array of [lng, lat]
      };
    } catch (error) {
      console.error("OSRM getRoute error:", error.message);
      throw new Error("Failed to get route from OSRM");
    }
  }

  /**
   * Get distance and time matrix for multiple locations
   * Used by VROOM for optimization
   * @param {Array} locations - Array of {latitude, longitude}
   * @returns {Object} - {distances: [][], durations: [][]}
   */
  async getMatrix(locations) {
    try {
      // Build coordinates string: "lng1,lat1;lng2,lat2;..."
      const coordinates = locations
        .map((loc) => `${loc.longitude},${loc.latitude}`)
        .join(";");

      const url = `${OSRM_HOST}/table/v1/driving/${coordinates}?annotations=distance,duration`;

      const response = await axios.get(url);

      if (response.data.code !== "Ok") {
        const errorDetail = response.data.message || response.data.code;
        throw new Error(`OSRM matrix calculation failed: ${errorDetail}`);
      }

      return {
        distances: response.data.distances, // 2D array in meters
        durations: response.data.durations, // 2D array in seconds
      };
    } catch (error) {
      console.error("OSRM getMatrix error:", error.response?.data || error.message);
      const detail = error.response?.data?.message || error.message;
      throw new Error(`Failed to get distance matrix: ${detail}`);
    }
  }

  /**
   * Get detailed route with turn-by-turn instructions
   * @param {Array} waypoints - Array of {latitude, longitude}
   * @returns {Object} - Complete route with geometry and steps
   */
  async getDetailedRoute(waypoints) {
    try {
      const coordinates = waypoints
        .map((wp) => `${wp.longitude},${wp.latitude}`)
        .join(";");

      const url = `${OSRM_HOST}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`;
      // console.log("OSRM Request URL:", url); // DEBUG

      const response = await axios.get(url);

      if (response.data.code !== "Ok") {
        throw new Error("OSRM detailed routing failed");
      }

      const route = response.data.routes[0];

      const result = {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates,
        legs: route.legs.map((leg) => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map((step) => {
            // Generate instruction text since OSRM doesn't verify provide it directly
            if (step.maneuver) {
              try {
                step.maneuver.instruction = osrmTextInstructions.compile(
                  "en",
                  step,
                );
                // console.log("Generated instruction:", step.maneuver.instruction);
              } catch (e) {
                console.error("Instruction generation failed:", e);
                step.maneuver.instruction = step.name || "Proceed";
              }
            }
            return step;
          }),
        })),
      };

      if (response.data.routes[0].legs[0].steps.length > 0) {
        // Log the first instruction of the first leg to verify
        const firstStep = result.legs[0].steps[0];
        console.log(
          "OSRM Service Debug - First Instruction:",
          firstStep.maneuver?.instruction,
        );
      }

      return result;
    } catch (error) {
      console.error("OSRM getDetailedRoute error:", error.message);
      throw new Error("Failed to get detailed route from OSRM");
    }
  }

  /**
   * Check if OSRM service is healthy
   * @returns {Boolean}
   */
  async healthCheck() {
    try {
      // Simple route query to check if OSRM is responding
      const url = `${OSRM_HOST}/route/v1/driving/72.5,23.0;72.6,23.1`;
      const response = await axios.get(url, { timeout: 5000 });
      return response.data.code === "Ok";
    } catch (error) {
      console.error("OSRM health check failed:", error.message);
      return false;
    }
  }
}

module.exports = new OSRMService();
