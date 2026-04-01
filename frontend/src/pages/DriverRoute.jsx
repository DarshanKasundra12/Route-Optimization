import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  Navigation2,
  Clock,
  Truck,
  Package,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { routeService, driverService, parcelService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

const DriverRoute = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredParcelId, setHoveredParcelId] = useState(null);

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  const fetchMyRoutes = async () => {
    try {
      setLoading(true);
      const res = await routeService.getAll();
      const myRoutes = res.data.data;
      setRoutes(myRoutes);

      // Auto-select the active route (IN_PROGRESS or ASSIGNED)
      const activeRoute = myRoutes.find(
        (r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED",
      );
      if (activeRoute) {
        setSelectedRoute(activeRoute);
      } else if (myRoutes.length > 0) {
        setSelectedRoute(myRoutes[0]);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async (routeId) => {
    try {
      await routeService.getById(routeId); // Verify exists
      // Update status to IN_PROGRESS
      const res = await routeService.getAll();
      // Re-fetch to get updated data
      fetchMyRoutes();
    } catch (error) {
      console.error("Error starting route:", error);
    }
  };

  const handleCompleteRoute = async (routeId) => {
    if (window.confirm("Mark this route as completed?")) {
      try {
        await routeService.complete(routeId);
        fetchMyRoutes();
      } catch (error) {
        console.error("Error completing route:", error);
        alert("Failed to complete route.");
      }
    }
  };

  const handleStatusUpdate = async (parcelId, newStatus) => {
    try {
      await parcelService.update(parcelId, { status: newStatus });
      fetchMyRoutes(); // Refresh data to show updated status
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update parcel status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ASSIGNED":
        return "#3b82f6";
      case "IN_PROGRESS":
        return "#f59e0b";
      case "COMPLETED":
        return "#10b981";
      case "CANCELLED":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "ASSIGNED":
        return "Ready to Start";
      case "IN_PROGRESS":
        return "In Progress";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your routes...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 4rem);
            gap: 1rem;
            color: var(--text-muted);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="driver-route-page">
      <header className="page-header">
        <div className="header-title">
          <h1>My Optimized Route</h1>
          {selectedRoute && (
            <div
              className="route-status-badge"
              style={{
                background: `${getStatusColor(selectedRoute.status)}20`,
                color: getStatusColor(selectedRoute.status),
                border: `1px solid ${getStatusColor(selectedRoute.status)}40`,
              }}
            >
              <span
                className="status-dot"
                style={{
                  background: getStatusColor(selectedRoute.status),
                }}
              ></span>
              {getStatusLabel(selectedRoute.status)}
            </div>
          )}
        </div>
        {selectedRoute && selectedRoute.status === "ASSIGNED" && (
          <button
            className="btn btn-primary"
            onClick={() => handleCompleteRoute(selectedRoute._id)}
          >
            <CheckCircle size={18} /> Mark Complete
          </button>
        )}
        {selectedRoute && selectedRoute.status === "IN_PROGRESS" && (
          <button
            className="btn btn-primary"
            onClick={() => handleCompleteRoute(selectedRoute._id)}
          >
            <CheckCircle size={18} /> Complete Route
          </button>
        )}
      </header>

      {routes.length === 0 ? (
        <div className="no-routes glass-card">
          <AlertTriangle size={48} />
          <h2>No Routes Assigned</h2>
          <p>
            You don't have any routes assigned yet. Contact your admin to get
            started.
          </p>
        </div>
      ) : (
        <div className="route-layout">
          {/* Sidebar with route list and details */}
          <div className="route-sidebar scrollable">
            {/* Route Selector */}
            {routes.length > 1 && (
              <div className="glass-card route-list-card">
                <h3>
                  <Navigation size={16} /> My Routes ({routes.length})
                </h3>
                <div className="route-list">
                  {routes.map((route) => (
                    <motion.div
                      key={route._id}
                      whileHover={{ x: 4 }}
                      className={`route-list-item ${selectedRoute?._id === route._id ? "active" : ""}`}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <div
                        className="route-dot"
                        style={{ background: getStatusColor(route.status) }}
                      ></div>
                      <div className="route-list-info">
                        <strong>{route.routeId}</strong>
                        <span>
                          {route.parcels?.length || 0} parcels •{" "}
                          {getStatusLabel(route.status)}
                        </span>
                      </div>
                      <ChevronRight size={16} className="arrow-icon" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Route Metrics */}
            {selectedRoute && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRoute._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="route-details"
                >
                  <div className="glass-card metrics-card">
                    <h3>Route Metrics</h3>
                    <div className="metrics-grid">
                      <div className="metric">
                        <Navigation2 size={18} />
                        <div className="metric-data">
                          <span className="metric-value">
                            {(selectedRoute.totalDistance / 1000).toFixed(1)} km
                          </span>
                          <span className="metric-label">Distance</span>
                        </div>
                      </div>
                      <div className="metric">
                        <Clock size={18} />
                        <div className="metric-data">
                          <span className="metric-value">
                            {Math.round(selectedRoute.totalTime / 60)} min
                          </span>
                          <span className="metric-label">Est. Time</span>
                        </div>
                      </div>
                      <div className="metric">
                        <Package size={18} />
                        <div className="metric-data">
                          <span className="metric-value">
                            {selectedRoute.parcels?.length || 0}
                          </span>
                          <span className="metric-label">Parcels</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimal Sequence */}
                  <div className="glass-card sequence-card">
                    <h3>Delivery Sequence</h3>
                    <div className="sequence-list">
                      {/* Start - Warehouse */}
                      <div
                        className="sequence-item warehouse"
                        onMouseEnter={() => setHoveredParcelId("start")}
                        onMouseLeave={() => setHoveredParcelId(null)}
                      >
                        <div className="idx">🏠</div>
                        <div className="seq-info">
                          <strong>
                            {selectedRoute.warehouse?.name || "Warehouse"}
                          </strong>
                          <span>Start point</span>
                        </div>
                      </div>

                      {/* Parcels */}
                      {selectedRoute.optimizedSequence?.map((step, index) => {
                        const parcelObj = selectedRoute.parcels?.find(
                          (p) =>
                            (typeof p === "object" ? p.parcelId : null) ===
                            step.parcelId,
                        );
                        const parcelId =
                          typeof parcelObj === "object"
                            ? parcelObj._id
                            : parcelObj;
                        const isHovered = hoveredParcelId === parcelId;

                        return (
                          <div
                            key={index}
                            className={`sequence-item ${isHovered ? "active" : ""}`}
                            onMouseEnter={() =>
                              parcelId && setHoveredParcelId(parcelId)
                            }
                            onMouseLeave={() => setHoveredParcelId(null)}
                          >
                            <div className="idx">{index + 1}</div>
                            <div className="seq-info">
                              <div className="seq-main">
                                <strong>{step.parcelId}</strong>
                                <span className="arrival-time">
                                  {Math.floor(step.arrivalTime / 60)} min
                                </span>
                              </div>
                              <span className="seq-location">
                                {step.pickupLocationName}
                              </span>
                              <span className="seq-coords">
                                {step.latitude?.toFixed(4)},{" "}
                                {step.longitude?.toFixed(4)}
                              </span>
                            </div>

                            <div
                              className="status-action"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                className="status-select"
                                value={parcelObj?.status || ""}
                                onChange={(e) =>
                                  handleStatusUpdate(
                                    parcelObj._id,
                                    e.target.value,
                                  )
                                }
                                disabled={!parcelObj}
                              >
                                <option value="CREATED">Created</option>
                                <option value="ASSIGNED_TO_ROUTE">
                                  Assigned
                                </option>
                                <option value="PICKUP_IN_PROGRESS">
                                  Pickup In Progress
                                </option>
                                <option value="PICKED_UP">Picked Up</option>
                                <option value="MULTIPLE_PICKUPS">
                                  Multiple Pickups
                                </option>
                                <option value="ON_WAY_TO_WAREHOUSE">
                                  On Way to Warehouse
                                </option>
                                <option value="ARRIVED_AT_WAREHOUSE">
                                  Arrived At Warehouse
                                </option>
                                <option value="DELIVERED">Delivered</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      {/* End - Warehouse */}
                      <div
                        className="sequence-item warehouse"
                        onMouseEnter={() => setHoveredParcelId("end")}
                        onMouseLeave={() => setHoveredParcelId(null)}
                      >
                        <div className="idx">🏠</div>
                        <div className="seq-info">
                          <strong>
                            {selectedRoute.warehouse?.name || "Warehouse"}
                          </strong>
                          <span>Return point</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Map */}
          <div className="map-view-container">
            {selectedRoute && (
              <MapView
                warehouse={selectedRoute.warehouse}
                parcels={
                  selectedRoute.parcels?.filter((p) => typeof p === "object") ||
                  []
                }
                highlightedParcelIds={
                  selectedRoute.parcels
                    ?.map((p) => (typeof p === "object" ? p._id : p))
                    .filter(Boolean) || []
                }
                routePolyline={selectedRoute.routePolyline || []}
                returnRoutePolyline={selectedRoute.returnRoutePolyline || []}
                optimizedSequence={selectedRoute.optimizedSequence || []}
                activeParcelId={hoveredParcelId}
              />
            )}

            <div className="map-overlay-info">
              <div className="osrm-status active">
                <div className="status-indicator"></div>
                <span>Route Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .driver-route-page {
          height: calc(100vh - 4rem);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .route-status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse-status 2s infinite;
        }

        @keyframes pulse-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .no-routes {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
          text-align: center;
          color: var(--text-muted);
        }

        .no-routes h2 {
          color: var(--text-main);
        }

        .route-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.5rem;
          overflow: hidden;
        }

        .route-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .route-list-card h3,
        .metrics-card h3,
        .sequence-card h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .route-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .route-list-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          cursor: pointer;
          border: 1px solid transparent;
          transition: var(--transition);
        }

        .route-list-item:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .route-list-item.active {
          background: rgba(37, 99, 235, 0.1);
          border-color: var(--primary);
        }

        .route-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .route-list-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .route-list-info strong {
          font-size: 0.875rem;
        }

        .route-list-info span {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .arrow-icon {
          color: var(--border-color);
          transition: var(--transition);
        }

        .route-list-item.active .arrow-icon {
          color: var(--primary);
          transform: translateX(4px);
        }

        .route-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .metrics-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          color: var(--primary);
        }

        .metric-data {
          display: flex;
          flex-direction: column;
        }

        .metric-value {
          font-size: 1rem;
          font-weight: 700;
          color: white;
        }

        .metric-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .sequence-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sequence-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          position: relative;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .sequence-item:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .sequence-item.active {
          background: rgba(37, 99, 235, 0.2);
          border-color: var(--primary-glow);
          transform: translateX(5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sequence-item.active .idx {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .sequence-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 1.15rem;
          top: 2rem;
          width: 2px;
          height: 0.5rem;
          background: var(--border-color);
        }

        .idx {
          width: 24px;
          height: 24px;
          background: var(--bg-card);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .warehouse .idx {
          border: none;
          background: none;
        }

        .seq-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .seq-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .seq-info strong {
          font-size: 0.875rem;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          flex: 1;
          min-width: 0;
        }

        .seq-info span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .arrival-time {
          font-size: 0.7rem;
          background: rgba(37, 99, 235, 0.15);
          color: var(--primary);
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .seq-location {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .seq-coords {
          font-size: 0.7rem;
          color: var(--primary);
          opacity: 0.7;
          font-family: monospace;
        }

        .map-view-container {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .map-overlay-info {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
        }

        .osrm-status {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          background: var(--success);
          border-radius: 50%;
        }

        .status-action {
          margin-left: auto;
          pointer-events: auto;
        }

        .status-select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          color: white;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          outline: none;
          cursor: pointer;
          transition: var(--transition);
        }

        .status-select:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: var(--primary);
        }

        .status-select option {
          background: #1f2937;
          color: white;
        }

        /* --- RESPONSIVE CSS --- */
        @media (max-width: 1024px) {
          .route-layout {
            grid-template-columns: 280px 1fr;
            gap: 1rem;
          }
        }

        @media (max-width: 768px) {
          .driver-route-page {
            height: auto;
            overflow: visible;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .route-layout {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
            overflow: visible;
          }
          .map-view-container {
            height: 350px;
            min-height: 250px;
            order: -1;
            flex-shrink: 0;
          }
          .route-sidebar {
            height: auto;
            max-height: none;
            overflow-y: visible;
          }
          .route-card {
            padding: 1rem;
          }
          .route-metrics {
            flex-wrap: wrap;
          }
          .sequence-item {
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .map-view-container {
            height: 280px;
            min-height: 200px;
          }
          .route-card {
            padding: 0.75rem;
          }
          .route-title {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverRoute;
