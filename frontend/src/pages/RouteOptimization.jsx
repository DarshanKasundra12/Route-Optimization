import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  Map as MapIcon,
  List,
  Settings,
  Truck,
  Play,
  CheckCircle,
  Clock,
  Navigation2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  parcelService,
  routeService,
  warehouseService,
  driverService,
} from "../services/api";
import MapView from "../components/MapView";

const RouteOptimization = () => {
  const [pendingParcels, setPendingParcels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [activeTab, setActiveTab] = useState("selection"); // selection, result
  const [metrics, setMetrics] = useState(null);
  const [hoveredParcelId, setHoveredParcelId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchPendingParcels();
    }
  }, [selectedWarehouse]);

  const fetchInitialData = async () => {
    try {
      const [warehousesRes, driversRes] = await Promise.all([
        warehouseService.getAll(),
        driverService.getAll({ isAvailable: "true" }),
      ]);
      setWarehouses(warehousesRes.data.data);
      setDrivers(driversRes.data.data);
      if (warehousesRes.data.data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(warehousesRes.data.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchPendingParcels = async () => {
    try {
      setLoading(true);
      const res = await parcelService.getPending({
        assignedWarehouse: selectedWarehouse,
      });
      setPendingParcels(res.data.data);
      // Clear selection when sub-list changes
      setSelectedParcels([]);
    } catch (error) {
      console.error("Error fetching parcels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParcel = (id) => {
    setSelectedParcels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleOptimize = async () => {
    if (!selectedWarehouse || selectedParcels.length === 0) {
      alert("Please select a warehouse and at least one parcel.");
      return;
    }

    try {
      setLoading(true);
      const res = await routeService.optimize({
        warehouseId: selectedWarehouse,
        parcelIds: selectedParcels,
      });

      setOptimizedRoute(res.data.data.route);
      setMetrics(res.data.data.metrics);
      setActiveTab("result");
      setLoading(false);
    } catch (error) {
      console.error("Optimization failed:", error);
      alert(
        "Failed to optimize route. Make sure OSRM and VROOM services are running.",
      );
      setLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver || !optimizedRoute) return;

    try {
      setLoading(true);
      await routeService.assignDriver(optimizedRoute._id, selectedDriver);
      alert("Route successfully locked and assigned to driver!");
      // Reset everything for next optimization
      setOptimizedRoute(null);
      setSelectedParcels([]);
      setSelectedDriver("");
      setActiveTab("selection");
      fetchPendingParcels(); // Refresh list for current warehouse
    } catch (error) {
      console.error("Assignment failed:", error);
      alert("Failed to assign driver.");
    } finally {
      setLoading(false);
    }
  };

  const currentWarehouse = warehouses.find((w) => w._id === selectedWarehouse);

  return (
    <div className="optimization-page">
      <header className="page-header">
        <h1>Route Optimization</h1>
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "selection" ? "active" : ""}`}
            onClick={() => setActiveTab("selection")}
          >
            <List size={18} /> Selection
          </button>
          <button
            className={`tab-btn ${activeTab === "result" ? "active" : ""}`}
            disabled={!optimizedRoute}
            onClick={() => setActiveTab("result")}
          >
            <Navigation size={18} /> Optimized Path
          </button>
        </div>
      </header>

      <div className="optimization-layout">
        <div className="control-sidebar scrollable">
          <AnimatePresence mode="wait">
            {activeTab === "selection" ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="control-section"
              >
                <div className="glass-card config-card">
                  <h3>
                    <Settings size={18} /> Configuration
                  </h3>
                  <div className="form-group">
                    <label>Starting Warehouse</label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                    >
                      {warehouses.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="glass-card parcel-selector">
                  <div className="selector-header">
                    <h3>Pending Parcels</h3>
                    <span>{selectedParcels.length} Selected</span>
                  </div>
                  <div className="parcel-check-list">
                    {pendingParcels.map((parcel) => (
                      <div
                        key={parcel._id}
                        className={`parcel-check-item ${selectedParcels.includes(parcel._id) ? "checked" : ""}`}
                        onClick={() => handleToggleParcel(parcel._id)}
                      >
                        <div className="check-box">
                          {selectedParcels.includes(parcel._id) && (
                            <CheckCircle size={16} />
                          )}
                        </div>
                        <div className="check-info">
                          <span className="p-id">{parcel.parcelId}</span>
                          <span className="p-meta">
                            {parcel.destinationPort} • {parcel.weight}kg
                          </span>
                        </div>
                      </div>
                    ))}
                    {pendingParcels.length === 0 && (
                      <p className="empty-msg">No pending parcels available</p>
                    )}
                  </div>
                </div>

                <button
                  className={`btn btn-primary optimize-btn ${loading ? "loading" : ""}`}
                  onClick={handleOptimize}
                  disabled={loading || selectedParcels.length === 0}
                >
                  {loading ? (
                    "Calculating..."
                  ) : (
                    <>
                      <Play size={18} fill="currentColor" />
                      Run Optimization
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="control-section"
              >
                <div className="glass-card metrics-card">
                  <h3>Optimization Result</h3>
                  <div className="metrics-grid">
                    <div className="metric">
                      <Navigation2 size={16} />
                      <span>{metrics?.totalDistance}</span>
                    </div>
                    <div className="metric">
                      <Clock size={16} />
                      <span>{metrics?.totalTime}</span>
                    </div>
                    <div className="metric">
                      <Truck size={16} />
                      <span>{metrics?.estimatedFuelCost}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card sequence-card">
                  <h3>Optimal Sequence</h3>
                  <div className="sequence-list">
                    <div
                      className="sequence-item warehouse"
                      onMouseEnter={() => setHoveredParcelId("start")}
                      onMouseLeave={() => setHoveredParcelId(null)}
                    >
                      <div className="idx">🏠</div>
                      <div className="seq-info">
                        <strong>Warehouse</strong>
                        <span>Start point</span>
                      </div>
                    </div>
                    {optimizedRoute?.optimizedSequence.map((step, index) => {
                      // Find the actual parcel object to get its _id
                      const parcelObj = pendingParcels.find(
                        (p) => p.parcelId === step.parcelId,
                      );
                      const isHovered = hoveredParcelId === parcelObj?._id;

                      return (
                        <div
                          key={index}
                          className={`sequence-item ${isHovered ? "active" : ""}`}
                          onMouseEnter={() =>
                            parcelObj && setHoveredParcelId(parcelObj._id)
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
                              {step.latitude.toFixed(4)},{" "}
                              {step.longitude.toFixed(4)}
                            </span>
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
                        <strong>Warehouse</strong>
                        <span>End point</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card config-card">
                  <h3>
                    <Truck size={18} /> Assign Driver
                  </h3>
                  <div className="form-group">
                    <label>Select Available Driver</label>
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.vehicleNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="action-buttons">
                  <button
                    className="btn btn-primary full-width"
                    onClick={handleAssignDriver}
                    disabled={!selectedDriver || loading}
                  >
                    {loading ? "Assigning..." : "Lock & Assign Route"}
                  </button>
                  <button
                    className="btn btn-outline full-width"
                    onClick={() => {
                      setOptimizedRoute(null);
                      setActiveTab("selection");
                    }}
                  >
                    Discard & Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="map-view-container">
          <MapView
            warehouse={currentWarehouse}
            parcels={pendingParcels}
            highlightedParcelIds={
              activeTab === "selection"
                ? selectedParcels
                : optimizedRoute?.parcels
            }
            routePolyline={
              activeTab === "result" ? optimizedRoute?.routePolyline : []
            }
            returnRoutePolyline={
              activeTab === "result" ? optimizedRoute?.returnRoutePolyline : []
            }
            optimizedSequence={optimizedRoute?.optimizedSequence}
            activeParcelId={hoveredParcelId}
            fitBoundsKey={`${currentWarehouse?._id}-${pendingParcels.length}-${activeTab}`}
          />

          <div className="map-overlay-info">
            <div className={`osrm-status ${loading ? "syncing" : "active"}`}>
              <div className="status-indicator"></div>
              <span>OSRM Engine Online</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .optimization-page {
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

        .tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: var(--radius-md);
          gap: 4px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          transition: var(--transition);
        }

        .tab-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-btn.active {
          background: var(--bg-card);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .optimization-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.5rem;
          overflow: hidden;
        }

        .control-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .control-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .config-card h3,
        .parcel-selector h3,
        .metrics-card h3,
        .sequence-card h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        select {
          background: var(--bg-card); /* Darker background */
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          outline: none;
          cursor: pointer;
        }

        select option {
          background: var(--bg-card); /* Solid dark background for dropdown */
          color: white;
          padding: 10px;
        }

        .parcel-selector {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .selector-header span {
          font-size: 0.75rem;
          // background: var(--primary);
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .parcel-check-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .parcel-check-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          cursor: pointer;
          border: 1px solid transparent;
          transition: var(--transition);
        }

        .parcel-check-item:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .parcel-check-item.checked {
          background: rgba(37, 99, 235, 0.1);
          border-color: var(--primary-glow);
        }

        .check-box {
          width: 20px;
          height: 20px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .checked .check-box {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .check-info {
          display: flex;
          flex-direction: column;
        }

        .p-id {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .p-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .optimize-btn {
          padding: 1rem;
          justify-content: center;
          font-size: 1rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
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
        }

        .sequence-item.active {
          background: rgba(37, 99, 235, 0.2);
          border-color: var(--primary-glow);
          transform: translateX(5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sequence-item.active .idx {
          background: var(--secondary);
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
        }

        .seq-info strong {
          font-size: 0.875rem;
          color: white;
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

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .full-width {
          width: 100%;
          justify-content: center;
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

        .syncing .status-indicator {
          background: var(--warning);
          animation: pulse 1s infinite;
        }

        /* Route Optimization Responsive */
        @media (max-width: 1024px) {
          .optimization-layout {
            grid-template-columns: 280px 1fr;
            gap: 1rem;
          }
        }

        @media (max-width: 768px) {
          .optimization-page {
            height: auto;
            overflow: visible;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .tabs {
            width: 100%;
            overflow-x: auto;
          }
          .tab-btn {
            white-space: nowrap;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }
          .optimization-layout {
            grid-template-columns: 1fr;
            overflow-y: auto;
            position: relative;
          }
          
          .control-sidebar {
            height: auto;
            padding-right: 0;
          }
          
          .map-view-container {
            height: 400px;
            flex-shrink: 0;
            order: -1;
          }
          
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .osrm-status {
            font-size: 0.7rem;
            padding: 0.4rem 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .map-view-container {
            height: 300px;
          }
          .metrics-grid {
            grid-template-columns: 1fr 1fr;
          }
          .tab-btn {
            padding: 0.4rem 0.6rem;
            font-size: 0.8rem;
            gap: 0.3rem;
          }
          .sequence-item {
            gap: 0.5rem;
            padding: 0.4rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RouteOptimization;
