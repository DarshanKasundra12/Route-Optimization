import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Navigation,
  Navigation2,
  Activity,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  Search,
  Package,
  X,
} from "lucide-react";
import { driverService, routeService } from "../services/api";
import MapView from "../components/MapView";

const LiveTracking = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredParcelId, setHoveredParcelId] = useState(null);
  const [mapFitKey, setMapFitKey] = useState("waiting");

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await driverService.getAll();
      const driversData = res.data.data;
      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update selected driver info when drivers list updates
  useEffect(() => {
    if (selectedDriver) {
      const updated = drivers.find((d) => d._id === selectedDriver._id);
      if (
        updated &&
        updated.currentLocation?.lastUpdated !==
          selectedDriver.currentLocation?.lastUpdated
      ) {
        setSelectedDriver(updated);
      }
    }
  }, [drivers]);

  // Poll for active route updates (parcel statuses)
  useEffect(() => {
    if (!activeRoute?._id) return;

    const fetchRouteDetails = async () => {
      try {
        const res = await routeService.getById(activeRoute._id);
        // Only update if status or parcels changed to avoid re-renders?
        // For simplicity, just update. proper diffing would be better but this is fine.
        setActiveRoute(res.data.data);
      } catch (error) {
        console.error("Error refreshing route:", error);
      }
    };

    const interval = setInterval(fetchRouteDetails, 5000);
    return () => clearInterval(interval);
  }, [activeRoute?._id]);

  const handleSelectDriver = async (driver) => {
    setSelectedDriver(driver);
    setHoveredParcelId(null);
    setActiveRoute(null); // Clear previous route immediately

    try {
      // Always search all routes to find the driver's active route
      const res = await routeService.getAll();
      const driverRoute = res.data.data.find(
        (r) =>
          r.assignedDriver &&
          (r.assignedDriver._id === driver._id ||
            r.assignedDriver === driver._id) &&
          (r.status === "ASSIGNED" || r.status === "IN_PROGRESS"),
      );

      if (driverRoute) {
        // Fetch full route details (with populated parcels)
        const fullRoute = await routeService.getById(driverRoute._id);
        setActiveRoute(fullRoute.data.data);
        setMapFitKey(driver._id + "-" + Date.now());
      } else if (driver.currentRoute) {
        // Fallback: try using driver.currentRoute directly
        const routeId = driver.currentRoute._id || driver.currentRoute;
        const fallbackRes = await routeService.getById(routeId);
        setActiveRoute(fallbackRes.data.data);
        setMapFitKey(driver._id + "-" + Date.now());
      } else {
        setActiveRoute(null);
        setMapFitKey(driver._id + "-" + Date.now());
      }
    } catch (error) {
      console.error("Error fetching driver route:", error);
      setActiveRoute(null);
      setMapFitKey(driver._id + "-" + Date.now());
    }
  };

  const handleCloseDetails = () => {
    setSelectedDriver(null);
    setActiveRoute(null);
    setHoveredParcelId(null);
    setMapFitKey("all-drivers-" + Date.now());
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Map data from active route
  const routeParcels =
    activeRoute?.parcels?.filter((p) => typeof p === "object") || [];
  const routeParcelIds = routeParcels.map((p) => p._id).filter(Boolean);

  return (
    <div className="live-tracking-page">
      <header className="page-header">
        <div className="header-title">
          <h1>Fleet Live Tracking</h1>
          <div className="live-tag">
            <span className="pulse-dot"></span>
            LIVE SYSTEM
          </div>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search driver or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="tracking-layout">
        <aside className="fleet-sidebar scrollable">
          <div className="sidebar-header">
            <h3>Active Fleet ({drivers.length})</h3>
          </div>
          <div className="driver-list">
            {filteredDrivers.map((driver) => (
              <motion.div
                key={driver._id}
                whileHover={{ x: 4 }}
                className={`driver-card glass-card ${selectedDriver?._id === driver._id ? "active" : ""}`}
                onClick={() => handleSelectDriver(driver)}
              >
                <div className="driver-status">
                  <div
                    className={`status-icon ${driver.isAvailable ? "available" : "busy"}`}
                  >
                    <Truck size={20} />
                  </div>
                </div>
                <div className="driver-info">
                  <div className="driver-main">
                    <h4>{driver.name}</h4>
                    <span className="v-num">{driver.vehicleNumber}</span>
                  </div>
                  <div className="driver-meta">
                    <span className="speed">
                      <Zap size={12} /> {driver.currentLocation?.speed || 0}{" "}
                      km/h
                    </span>
                    <span className="status-text">
                      {driver.isAvailable ? "Available" : "On Route"}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="arrow" />
              </motion.div>
            ))}
          </div>

          {/* Route sequence panel in sidebar when driver selected */}
          <AnimatePresence>
            {selectedDriver && activeRoute && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="route-sequence-panel"
              >
                <div className="glass-card route-detail-card">
                  <div className="route-detail-header">
                    <h3>
                      <Navigation size={16} /> {selectedDriver.name}'s Route
                    </h3>
                    <button className="close-btn" onClick={handleCloseDetails}>
                      <X size={16} />
                    </button>
                  </div>

                  {/* Metrics */}
                  <div className="route-metrics-row">
                    <div className="r-metric">
                      <Navigation2 size={14} />
                      <span>
                        {(activeRoute.totalDistance / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="r-metric">
                      <Clock size={14} />
                      <span>{Math.round(activeRoute.totalTime / 60)} min</span>
                    </div>
                    <div className="r-metric">
                      <Package size={14} />
                      <span>{activeRoute.parcels?.length || 0}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="route-status-row">
                    <span className="route-id">{activeRoute.routeId}</span>
                    <span
                      className="route-status-tag"
                      data-status={activeRoute.status}
                    >
                      {activeRoute.status}
                    </span>
                  </div>

                  {/* Delivery sequence */}
                  <div className="sequence-list compact">
                    <div
                      className="sequence-item warehouse"
                      onMouseEnter={() => setHoveredParcelId("start")}
                      onMouseLeave={() => setHoveredParcelId(null)}
                    >
                      <div className="idx">🏠</div>
                      <div className="seq-info">
                        <strong>
                          {activeRoute.warehouse?.name || "Warehouse"}
                        </strong>
                        <span>Start</span>
                      </div>
                    </div>

                    {activeRoute.optimizedSequence?.map((step, index) => {
                      const parcelObj = routeParcels.find(
                        (p) => p.parcelId === step.parcelId,
                      );
                      const parcelId = parcelObj?._id;
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
                                {Math.floor(step.arrivalTime / 60)}m
                              </span>
                            </div>
                            <span className="seq-location">
                              {step.pickupLocationName}
                            </span>
                            {parcelObj && (
                              <span
                                className={`status-badge ${parcelObj.status?.toLowerCase()}`}
                                style={{
                                  fontSize: "0.6rem",
                                  padding: "2px 6px",
                                  marginTop: "4px",
                                  width: "fit-content",
                                }}
                              >
                                {parcelObj.status?.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className="sequence-item warehouse"
                      onMouseEnter={() => setHoveredParcelId("end")}
                      onMouseLeave={() => setHoveredParcelId(null)}
                    >
                      <div className="idx">🏠</div>
                      <div className="seq-info">
                        <strong>
                          {activeRoute.warehouse?.name || "Warehouse"}
                        </strong>
                        <span>Return</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <main className="tracking-map-container">
          <MapView
            drivers={drivers}
            warehouse={activeRoute?.warehouse || null}
            parcels={routeParcels}
            highlightedParcelIds={routeParcelIds}
            routePolyline={activeRoute?.routePolyline || []}
            returnRoutePolyline={activeRoute?.returnRoutePolyline || []}
            optimizedSequence={activeRoute?.optimizedSequence || []}
            activeParcelId={hoveredParcelId}
            fitBoundsKey={mapFitKey}
          />

          <AnimatePresence>
            {selectedDriver && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="floating-driver-details"
              >
                <div className="details-header">
                  <div className="d-title">
                    <Truck />
                    <div>
                      <h3>{selectedDriver.name}</h3>
                      <span>
                        {selectedDriver.vehicleNumber} •{" "}
                        {selectedDriver.vehicleType}
                      </span>
                    </div>
                  </div>
                  <div className="d-actions">
                    <button className="btn-icon" onClick={handleCloseDetails}>
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="detail-item">
                    <Activity size={16} />
                    <div className="item-text">
                      <label>Current Speed</label>
                      <span>
                        {selectedDriver.currentLocation?.speed || 0} km/h
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <MapPin size={16} />
                    <div className="item-text">
                      <label>Last Known Location</label>
                      <span>
                        {selectedDriver.currentLocation?.latitude?.toFixed(4)},
                        {selectedDriver.currentLocation?.longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <div className="item-text">
                      <label>Last Updated</label>
                      <span>
                        {selectedDriver.currentLocation?.lastUpdated
                          ? new Date(
                              selectedDriver.currentLocation.lastUpdated,
                            ).toLocaleTimeString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Navigation size={16} />
                    <div className="item-text">
                      <label>Route</label>
                      <span>
                        {activeRoute
                          ? `${activeRoute.routeId} (${activeRoute.status})`
                          : "No active route"}
                      </span>
                    </div>
                  </div>
                </div>

                {activeRoute && (
                  <div className="active-route-info">
                    <div className="route-bar">
                      <div className="bar-label">
                        <span>Route Progress</span>
                        <span>{activeRoute.status}</span>
                      </div>
                      <div className="progress-track">
                        <motion.div
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              activeRoute.status === "COMPLETED"
                                ? "100%"
                                : activeRoute.status === "IN_PROGRESS"
                                  ? "45%"
                                  : "10%",
                          }}
                        />
                      </div>
                    </div>
                    <div className="route-meta">
                      <span>
                        Total Distance:{" "}
                        {(activeRoute.totalDistance / 1000).toFixed(2)} km
                      </span>
                      <span>
                        Est. Time: {Math.round(activeRoute.totalTime / 60)} mins
                      </span>
                      <span>Parcels: {activeRoute.parcels?.length || 0}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .live-tracking-page {
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

        .live-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--danger);
          border-radius: 50%;
          animation: pulse-red 2s infinite;
        }

        .search-bar {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 300px;
        }

        .search-bar input {
          background: none;
          border: none;
          color: white;
          width: 100%;
          outline: none;
        }

        .tracking-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.5rem;
          overflow: hidden;
        }

        .fleet-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-right: 0.5rem;
          overflow-y: auto;
        }

        .sidebar-header h3 {
          font-size: 1.1rem;
          color: var(--text-muted);
        }

        .driver-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .driver-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .driver-card.active {
          background: rgba(37, 99, 235, 0.1);
          border-color: var(--primary);
        }

        .status-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-icon.available {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .status-icon.busy {
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }

        .driver-info {
          flex: 1;
        }

        .driver-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .driver-main h4 {
          font-size: 0.95rem;
        }

        .v-num {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 700;
        }

        .driver-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
        }

        .speed {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--accent);
          font-weight: 600;
        }

        .status-text {
          color: var(--text-muted);
        }

        .arrow {
          color: var(--border-color);
        }

        .driver-card.active .arrow {
          color: var(--primary);
          transform: translateX(4px);
        }

        /* Route sequence panel in sidebar */
        .route-sequence-panel {
          overflow: hidden;
        }

        .route-detail-card {
          padding: 1rem;
        }

        .route-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .route-detail-header h3 {
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .close-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          padding: 4px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .route-metrics-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .r-metric {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
        }

        .r-metric span {
          color: white;
        }

        .route-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .route-id {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          font-family: monospace;
        }

        .route-status-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .route-status-tag[data-status="ASSIGNED"] {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .route-status-tag[data-status="IN_PROGRESS"] {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .route-status-tag[data-status="COMPLETED"] {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .sequence-list.compact {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .sequence-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 0.6rem;
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
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .sequence-item.active .idx {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .sequence-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 0.95rem;
          top: 1.75rem;
          width: 2px;
          height: 0.35rem;
          background: var(--border-color);
        }

        .idx {
          width: 22px;
          height: 22px;
          background: var(--bg-card);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
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
          gap: 1px;
          flex: 1;
          min-width: 0;
        }

        .seq-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .seq-info strong {
          font-size: 0.8rem;
          color: white;
        }

        .seq-info span {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .arrival-time {
          font-size: 0.65rem !important;
          background: rgba(37, 99, 235, 0.15);
          color: var(--primary) !important;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
        }

        .seq-location {
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* Map container */
        .tracking-map-container {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .floating-driver-details {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          padding: 1.5rem;
          display: flex;
          background: rgba(30, 41, 59, 0.01); 
          backdrop-filter: blur(1.5px); 
          border: 2.5px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          flex-direction: column;
          gap: 1.5rem;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .d-title {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .d-title span {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          color: var(--primary);
        }

        .item-text {
          display: flex;
          flex-direction: column;
        }

        .item-text label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
        }

        .item-text span {
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .active-route-info {
          background: rgba(0, 0, 0, 0.2);
          padding: 1rem;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .route-bar {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          box-shadow: 0 0 10px var(--primary-glow);
        }

        .route-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .btn-icon {
          background: rgba(255,255,255,0.05);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
          padding: 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        .btn-icon:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .d-actions {
          display: flex;
          gap: 0.5rem;
        }

        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* --- RESPONSIVE CSS --- */
        @media (max-width: 1024px) {
          .tracking-layout {
            grid-template-columns: 280px 1fr;
            gap: 1rem;
          }
          .details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }

        @media (max-width: 768px) {
          .live-tracking-page {
            height: auto;
            overflow: visible;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .header-actions {
            width: 100%;
          }
          .search-bar {
            min-width: auto;
            width: 100%;
          }
          .tracking-layout {
            display: flex;
            flex-direction: column;
            overflow: visible;
          }
          .fleet-sidebar {
            max-height: none;
            overflow: visible;
          }
          .driver-list {
            max-height: 35vh;
            overflow-y: auto;
          }
          .tracking-map-container {
            min-height: auto;
            height: auto;
            display: flex;
            flex-direction: column;
          }
          .tracking-map-container .map-wrapper {
            height: 50vh !important;
            min-height: 400px;
            flex-shrink: 0;
          }
          .floating-driver-details {
            position: relative;
            bottom: auto;
            left: auto;
            right: auto;
            margin-top: 1rem;
            margin-bottom: 2rem;
            flex-shrink: 0;
          }
          .details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .route-meta {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
          .route-metrics-row {
            flex-direction: column;
          }
          .driver-card {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveTracking;
