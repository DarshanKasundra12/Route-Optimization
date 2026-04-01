import React, { useEffect, useImperativeHandle, forwardRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Warehouse Icon (Blue)
const warehouseIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Parcel Icon (Yellow)
const parcelIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Dimmed Parcel Icon (Grey)
const dimmedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: markerShadow,
  iconSize: [20, 32], // Slightly smaller
  iconAnchor: [10, 32],
  popupAnchor: [1, -34],
  opacity: 0.5,
});

// Next Drop/Active Icon (Green)
const activeIcon = new L.DivIcon({
  html: `
    <div class="pulse-marker">
      <div class="pulse-ring"></div>
      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" style="width: 25px; height: 41px; position: relative; z-index: 2;" />
    </div>
  `,
  className: "custom-div-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 41],
  popupAnchor: [0, -34],
});

// Component to auto-fit map bounds to all markers
const FitBounds = ({
  warehouse,
  warehouses,
  parcels,
  drivers,
  fitBoundsKey,
  activeParcelId,
  routePolyline,
  routes = [], // New prop for multiple routes
  exposedRef,
}) => {
  const map = useMap();
  const dataRef = React.useRef({
    warehouse,
    warehouses,
    parcels,
    drivers,
    routePolyline,
    routes
  });

  // Update ref when data changes so effect has access to latest without re-triggering
  useEffect(() => {
    dataRef.current = {
      warehouse,
      warehouses,
      parcels,
      drivers,
      routePolyline,
      routes
    };
  }, [warehouse, warehouses, parcels, drivers, routePolyline, routes]);

  // Effect 2: Fit bounds on key change (Initial load or Driver select)
  // Reusable function to fit bounds based on current data
  const fitToData = () => {
    const { warehouse, warehouses, parcels, drivers, routePolyline, routes } =
      dataRef.current;

    // Logic copied from the effect to ensure consistent behavior
    const points = [];

    // Single warehouse
    if (warehouse && warehouse.latitude && warehouse.longitude) {
      points.push([warehouse.latitude, warehouse.longitude]);
    }

    // Multiple warehouses
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach((w) => {
        if (w.latitude && w.longitude) {
          points.push([w.latitude, w.longitude]);
        }
      });
    }

    if (parcels && parcels.length > 0) {
      parcels.forEach((p) => {
        if (p.latitude && p.longitude) {
          points.push([p.latitude, p.longitude]);
        }
      });
    }

    if (drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        if (d.currentLocation?.latitude && d.currentLocation?.longitude) {
          points.push([
            d.currentLocation.latitude,
            d.currentLocation.longitude,
          ]);
        }
      });
    }

    if (routePolyline && routePolyline.length > 0) {
      routePolyline.forEach((p) => {
        if (p) points.push(p);
      });
    }

    // Multiple routes from distributor
    if (routes && routes.length > 0) {
      routes.forEach(route => {
        if (route.routePolyline) {
          route.routePolyline.forEach(p => {
             if (p) points.push([p[1], p[0]]); // OSRM [lng, lat] to Leaflet [lat, lng]
          });
        }
      });
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    }
  };

  useImperativeHandle(exposedRef, () => ({
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    resetView: fitToData,
  }));

  // Effect 2: Fit bounds on key change (Initial load or Driver select)
  useEffect(() => {
    // Read from ref to avoid dependency on changing data
    const { warehouse, warehouses, parcels, drivers } = dataRef.current;

    // If no key provided, or waiting for data, don't fit
    if (!fitBoundsKey || fitBoundsKey === "waiting") return;

    fitToData(); // Use the shared function
  }, [fitBoundsKey, map]); // Only trigger on key change

  // Fit map bounds depending on hover parcel or full overview
  useEffect(() => {
    const { warehouse, parcels, warehouses, drivers, routePolyline, routes } =
      dataRef.current;

    const points = [];

    // Single warehouse
    if (warehouse?.latitude && warehouse?.longitude) {
      points.push([warehouse.latitude, warehouse.longitude]);
    }

    // Multiple warehouses
    warehouses?.forEach((w) => {
      if (w.latitude && w.longitude) {
        points.push([w.latitude, w.longitude]);
      }
    });

    // Parcels
    parcels?.forEach((p) => {
      if (p.latitude && p.longitude) {
        points.push([p.latitude, p.longitude]);
      }
    });

    // Drivers
    drivers?.forEach((d) => {
      if (d.currentLocation?.latitude && d.currentLocation?.longitude) {
        points.push([d.currentLocation.latitude, d.currentLocation.longitude]);
      }
    });

    // Single Route
    routePolyline?.forEach((p) => {
      if (p) points.push(p);
    });

    // Multiple Routes
    routes?.forEach(route => {
      if (route.routePolyline) {
        route.routePolyline.forEach(p => {
           if (p) points.push([p[1], p[0]]);
        });
      }
    });

    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 15,
      animate: true,
      duration: 0.5,
    });
  }, [activeParcelId, map]);

  return null;
};

// Component to handle map resizing and invalidation
const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const MapView = forwardRef(
  (
    {
      warehouse,
      warehouses = [],
      parcels = [],
      highlightedParcelIds = [],
      routePolyline = [],
      returnRoutePolyline = [],
      optimizedSequence = [],
      activeParcelId = null,
      drivers = [],
      routes = [], // NEW PROP
      fitBoundsKey,
    },
    ref,
  ) => {
    const center = warehouse
      ? [warehouse.latitude, warehouse.longitude]
      : [23.0225, 72.5714];

    // IMPORTANT: OSRM returns [lng, lat], Leaflet needs [lat, lng]
    const formattedRoute =
      routePolyline?.map((point) => [point[1], point[0]]) || [];

    const formattedReturnRoute =
      returnRoutePolyline?.map((point) => [point[1], point[0]]) || [];

    // Split logic for hover highlighting and progress tracking
    let completedSegment = [];
    let highlightedSegment = [];
    let remainingSegment = [];
    let isReturnHighlighted = false;

    // 1. Identify "Completed" path (Green)
    // Find the index in the polyline where the last completed parcel is located
    let lastCompletedPolylineIdx = 0;

    if (formattedRoute.length > 0 && optimizedSequence.length > 0) {
      // Find the last parcel in the sequence that is "done"
      let lastCompletedSequenceIdx = -1;
      const completedStatuses = [
        "PICKED_UP",
        "MULTIPLE_PICKUPS",
        "ON_WAY_TO_WAREHOUSE",
        "ARRIVED_AT_WAREHOUSE",
        "DELIVERED",
      ];

      for (let i = optimizedSequence.length - 1; i >= 0; i--) {
        const step = optimizedSequence[i];
        const parcel = parcels.find((p) => p.parcelId === step.parcelId);
        if (parcel && completedStatuses.includes(parcel.status)) {
          lastCompletedSequenceIdx = i;
          break;
        }
      }

      if (lastCompletedSequenceIdx !== -1) {
        // Find the polyline index for this step
        const targetCoord = [
          optimizedSequence[lastCompletedSequenceIdx].latitude,
          optimizedSequence[lastCompletedSequenceIdx].longitude,
        ];

        let minDist = Infinity;
        for (let i = 0; i < formattedRoute.length; i++) {
          const d =
            Math.pow(formattedRoute[i][0] - targetCoord[0], 2) +
            Math.pow(formattedRoute[i][1] - targetCoord[1], 2);
          if (d < minDist) {
            minDist = d;
            lastCompletedPolylineIdx = i;
          }
        }

        // Allow green line to go slightly past the point to ensure connection
        completedSegment = formattedRoute.slice(
          0,
          lastCompletedPolylineIdx + 1,
        );
      }
    }

    // Define the rest of the route (after completed part)
    const routeAfterCompletion = formattedRoute.slice(lastCompletedPolylineIdx);

    // 2. Identify "Highlighted" path (Yellow) vs "Remaining" path (White)
    if (activeParcelId && routeAfterCompletion.length > 0) {
      if (activeParcelId === "start") {
        highlightedSegment = [];
        remainingSegment = routeAfterCompletion;
      } else if (activeParcelId === "end") {
        highlightedSegment = [];
        remainingSegment = routeAfterCompletion;
        isReturnHighlighted = true;
      } else {
        // Find the index of the active parcel in the sequence
        const parcelIndex = optimizedSequence.findIndex(
          (s) =>
            parcels.find((p) => p.parcelId === s.parcelId)?._id ===
            activeParcelId,
        );

        if (parcelIndex !== -1) {
          // Target coordinate
          const targetCoord = [
            optimizedSequence[parcelIndex].latitude,
            optimizedSequence[parcelIndex].longitude,
          ];

          // Find closest point in routeAfterCompletion
          let splitIdx = 0;
          let minDist = Infinity;
          for (let i = 0; i < routeAfterCompletion.length; i++) {
            const d =
              Math.pow(routeAfterCompletion[i][0] - targetCoord[0], 2) +
              Math.pow(routeAfterCompletion[i][1] - targetCoord[1], 2);
            if (d < minDist) {
              minDist = d;
              splitIdx = i;
            }
          }

          // Highlight from where completed segment ended to the active parcel
          highlightedSegment = routeAfterCompletion.slice(0, splitIdx + 1);
          remainingSegment = routeAfterCompletion.slice(splitIdx);
        } else {
          remainingSegment = routeAfterCompletion;
        }
      }
    } else {
      remainingSegment = routeAfterCompletion;
    }

    // Distinct colors for multiple routes
    const routeColors = [
      "#3b82f6", // Blue
      "#ec4899", // Pink
      "#8b5cf6", // Purple
      "#06b6d4", // Cyan
      "#f97316", // Orange
      "#10b981", // Emerald
    ];

    return (
      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <ResizeMap />
          <FitBounds
            warehouse={warehouse}
            warehouses={warehouses}
            parcels={parcels}
            drivers={drivers}
            routePolyline={formattedRoute}
            routes={routes}
            fitBoundsKey={fitBoundsKey}
            activeParcelId={activeParcelId}
            exposedRef={ref}
          />

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Single Warehouse Marker */}
          {warehouse && (
            <Marker
              position={[warehouse.latitude, warehouse.longitude]}
              icon={
                activeParcelId === "start" || activeParcelId === "end"
                  ? activeIcon
                  : warehouseIcon
              }
            >
              <Popup>
                <div className="map-popup">
                  <strong>Warehouse: {warehouse.name}</strong>
                  <br />
                  {warehouse.code}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Multiple Warehouse Markers */}
          {warehouses.map((wh) => (
            <Marker
              key={wh._id}
              position={[wh.latitude, wh.longitude]}
              icon={warehouseIcon}
            >
              <Popup>
                <div className="map-popup">
                  <strong>Warehouse: {wh.name}</strong>
                  <br />
                  {wh.code}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Parcel Markers */}
          {parcels.map((parcel) => {
            const isHighlighted =
              highlightedParcelIds.length === 0 ||
              highlightedParcelIds.includes(parcel._id);
            const icon =
              parcel._id === activeParcelId
                ? activeIcon
                : isHighlighted
                  ? parcelIcon
                  : dimmedIcon;

            return (
              <Marker
                key={parcel._id}
                position={[parcel.latitude, parcel.longitude]}
                icon={icon}
                opacity={isHighlighted ? 1 : 0.6}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>Parcel: {parcel.parcelId}</strong>
                    <br />
                    Destination: {parcel.destinationPort}
                    <br />
                    Weight: {parcel.weight} kg
                    <br />
                    Status: {parcel.status}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Driver Markers */}
          {drivers.map((driver) =>
            driver.currentLocation &&
            driver.currentLocation.latitude &&
            driver.currentLocation.longitude ? (
              <Marker
                key={driver._id}
                position={[
                  driver.currentLocation.latitude,
                  driver.currentLocation.longitude,
                ]}
                icon={
                  new L.DivIcon({
                    html: `<div style="font-size: 28px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); transform: rotate(${driver.currentLocation.heading || 0}deg) perspective(500px) rotateX(20deg); transform-style: preserve-3d;">🚚</div>`,
                    className: "driver-marker-icon",
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                  })
                }
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{driver.name}</strong>
                    <br />
                    Vehicle: {driver.vehicleNumber}
                    <br />
                    Speed: {driver.currentLocation.speed || 0} km/h
                    <br />
                    Status: {driver.isAvailable ? "Available" : "On Route"}
                  </div>
                </Popup>
              </Marker>
            ) : null,
          )}

          {/* Render ALL Distributor Routes */}
          {routes && routes.length > 0 && routes.map((route, rIdx) => {
             const color = routeColors[rIdx % routeColors.length];
             const poly = route.routePolyline?.map(p => [p[1], p[0]]) || [];
             if (poly.length === 0) return null;

             return (
               <React.Fragment key={`multi-route-${rIdx}`}>
                <Polyline
                  positions={poly}
                  pathOptions={{
                    color: color,
                    weight: 8,
                    opacity: 0.15,
                  }}
                />
                <Polyline
                  positions={poly}
                  pathOptions={{
                    color: color,
                    weight: 4,
                    opacity: 0.9,
                    lineJoin: "round",
                  }}
                  className="route-going"
                />
               </React.Fragment>
             );
          })}

          {/* COMPLETED Route - Green */}
          {completedSegment.length > 0 && (
            <>
              <Polyline
                positions={completedSegment}
                pathOptions={{
                  color: "#10b981", // Green
                  weight: 8,
                  opacity: 0.2, // Glow
                }}
              />
              <Polyline
                positions={completedSegment}
                pathOptions={{
                  color: "#10b981", // Green
                  weight: 4,
                  opacity: 1,
                  lineJoin: "round",
                }}
                className="route-completed"
              />
            </>
          )}

          {/* GAING Route - Highlighted (Yellow) */}
          {highlightedSegment.length > 0 && (
            <>
              <Polyline
                positions={highlightedSegment}
                pathOptions={{
                  color: "#fbbf24",
                  weight: 8,
                  opacity: 0.15,
                }}
              />
              <Polyline
                positions={highlightedSegment}
                pathOptions={{
                  color: "#fbbf24",
                  weight: 4,
                  opacity: 0.9,
                  lineJoin: "round",
                }}
                className="route-highlight"
              />
            </>
          )}

          {/* GOING Route - Remaining (White) */}
          {remainingSegment.length > 0 && (
            <>
              <Polyline
                positions={remainingSegment}
                pathOptions={{
                  color: "#ffffff",
                  weight: 8,
                  opacity: 0.1,
                }}
              />
              <Polyline
                positions={remainingSegment}
                pathOptions={{
                  color: "#ffffff",
                  weight: 4,
                  opacity: 0.8,
                  lineJoin: "round",
                }}
                className="route-going"
              />
            </>
          )}

          {/* RETURN Route Polyline */}
          {formattedReturnRoute.length > 0 && (
            <>
              <Polyline
                positions={formattedReturnRoute}
                pathOptions={{
                  color: isReturnHighlighted ? "#fbbf24" : "#ffffff",
                  weight: 8,
                  opacity: 0.15,
                }}
              />
              <Polyline
                positions={formattedReturnRoute}
                pathOptions={{
                  color: isReturnHighlighted ? "#fbbf24" : "#ffffff",
                  weight: 4,
                  opacity: 0.8,
                  lineJoin: "round",
                }}
                className="route-return"
              />
            </>
          )}
        </MapContainer>

        <style>{`
        .map-wrapper {
          height: 100%;
          width: 100%;
          border-radius: var(--radius-md);
          overflow: hidden;
          position: relative;
        }

        .map-popup {
          color: var(--bg-main);
          font-family: "Inter", sans-serif;
        }

        /* Pulsate Animation */
        .pulse-marker {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 40px;
          height: 40px;
        }

        .pulse-ring {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.4);
          animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 1; }
          80%, 100% { transform: scale(3); opacity: 0; }
        }

        /* Route Animations */
        .route-going, .route-highlight, .route-return {
          stroke-dasharray: 10, 10;
          animation: dash-animation 20s linear infinite;
        }

        .route-return {
          stroke-dasharray: 6, 12; /* Different dash for return */
        }

        @keyframes dash-animation {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      </div>
    );
  },
);

export default MapView;
