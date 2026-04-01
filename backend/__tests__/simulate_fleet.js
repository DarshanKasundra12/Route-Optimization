const axios = require("axios");

const API_BASE_URL = "http://localhost:5001/api";
const UPDATE_INTERVAL = 3000; // 3 seconds

// Simulation state
const driverStates = {};

async function simulate() {
  console.log("🚀 Starting Fleet Simulation...");

  while (true) {
    try {
      // 1. Get all drivers
      const driversRes = await axios.get(`${API_BASE_URL}/drivers`);
      const drivers = driversRes.data.data;

      for (const driver of drivers) {
        if (!driver.currentRoute) {
          // Just move randomly or stay put if no route
          continue;
        }

        // 2. Get route details if not already in state
        if (
          !driverStates[driver._id] ||
          driverStates[driver._id].routeId !== driver.currentRoute._id
        ) {
          try {
            const routeRes = await axios.get(
              `${API_BASE_URL}/routes/${driver.currentRoute._id || driver.currentRoute}`,
            );
            const route = routeRes.data.data;

            if (
              route &&
              route.routePolyline &&
              route.routePolyline.length > 0
            ) {
              driverStates[driver._id] = {
                routeId: route._id,
                path: route.routePolyline,
                index: 0,
                speed: 40 + Math.random() * 20,
              };
              console.log(
                `📍 Driver ${driver.name} started route ${route.routeId}`,
              );
            }
          } catch (e) {
            // Route might not be found or other error
            continue;
          }
        }

        const state = driverStates[driver._id];
        if (!state) continue;

        // 3. Move to next point in polyline
        state.index = (state.index + 1) % state.path.length;
        const currentPos = state.path[state.index]; // [lng, lat]
        const nextPos = state.path[(state.index + 1) % state.path.length];

        // Calculate heading (approximate)
        const heading = calculateHeading(currentPos, nextPos);

        // 4. Update location in backend
        await axios.put(`${API_BASE_URL}/drivers/${driver._id}/location`, {
          latitude: currentPos[1],
          longitude: currentPos[0],
          heading: heading,
          speed: Math.round(state.speed + (Math.random() * 5 - 2.5)),
        });

        // console.log(`🚚 Updated ${driver.name}: [${currentPos[1].toFixed(4)}, ${currentPos[0].toFixed(4)}]`);
      }
    } catch (error) {
      console.error("❌ Simulation Error:", error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, UPDATE_INTERVAL));
  }
}

function calculateHeading(p1, p2) {
  if (!p1 || !p2) return 0;
  const dy = p2[1] - p1[1];
  const dx = p2[0] - p1[0];
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (90 - angle + 360) % 360; // Adjust for map rotation
}

simulate();
