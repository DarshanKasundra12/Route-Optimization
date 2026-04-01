import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation,
  List,
  Settings,
  Truck,
  CheckCircle,
  Clock,
  Navigation2,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  parcelService,
  routeService,
  warehouseService,
  driverService,
} from "../services/api";
import MapView from "../components/MapView";

const Distributor = () => {
  const [pendingParcels, setPendingParcels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("selection"); // selection, result
  const [distributionResult, setDistributionResult] = useState(null);
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

  const handleToggleDriver = (id) => {
    setSelectedDrivers((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleDistribute = async () => {
    if (
      !selectedWarehouse ||
      selectedParcels.length === 0 ||
      selectedDrivers.length === 0
    ) {
      alert(
        "Please select a warehouse, at least one parcel, and at least one driver.",
      );
      return;
    }

    try {
      setLoading(true);
      const res = await routeService.distribute({
        warehouseId: selectedWarehouse,
        parcelIds: selectedParcels,
        driverIds: selectedDrivers,
      });

      setDistributionResult(res.data.data);
      setActiveTab("result");
      setLoading(false);

      // Notify parent/user
      alert(res.data.message);
    } catch (error) {
      setLoading(false);
      const serverMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      console.error("Distribution failed:", serverMsg);
      alert("Distribution failed: " + serverMsg);
    }
  };

  const currentWarehouse = warehouses.find((w) => w._id === selectedWarehouse);

  return (
    <div className="optimization-page">
      <header className="page-header">
        <h1>Driver Distribution</h1>
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "selection" ? "active" : ""}`}
            onClick={() => setActiveTab("selection")}
          >
            <List size={18} /> Selection
          </button>
          <button
            className={`tab-btn ${activeTab === "result" ? "active" : ""}`}
            disabled={!distributionResult}
            onClick={() => setActiveTab("result")}
          >
            <CheckCircle size={18} /> Result
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
                    <div className="d-flex align-items-center gap-2">
                       <div className="form-check m-0">
                          <input 
                             type="checkbox" 
                             className="form-check-input"
                             style={{ cursor: 'pointer' }}
                             checked={pendingParcels.length > 0 && selectedParcels.length === pendingParcels.length}
                             onChange={() => {
                                if (selectedParcels.length === pendingParcels.length) {
                                   setSelectedParcels([]);
                                } else {
                                   setSelectedParcels(pendingParcels.map(p => p._id));
                                }
                             }}
                          />
                          <label className="small text-muted mb-0 ms-1" style={{ cursor: 'pointer' }}>All</label>
                       </div>
                       <span>{selectedParcels.length} Selected</span>
                    </div>
                  </div>
                  <div className="parcel-check-list scrollable-small">
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

                <div className="glass-card driver-selector">
                  <div className="selector-header">
                    <h3>Available Drivers</h3>
                    <div className="d-flex align-items-center gap-2">
                       <div className="form-check m-0">
                          <input 
                             type="checkbox" 
                             className="form-check-input"
                             style={{ cursor: 'pointer' }}
                             checked={drivers.length > 0 && selectedDrivers.length === drivers.length}
                             onChange={() => {
                                if (selectedDrivers.length === drivers.length) {
                                   setSelectedDrivers([]);
                                } else {
                                   setSelectedDrivers(drivers.map(d => d._id));
                                }
                             }}
                          />
                          <label className="small text-muted mb-0 ms-1" style={{ cursor: 'pointer' }}>All</label>
                       </div>
                       <span>{selectedDrivers.length} Selected</span>
                    </div>
                  </div>
                  <div className="driver-check-list scrollable-small">
                    {drivers.map((driver) => (
                      <div
                        key={driver._id}
                        className={`parcel-check-item ${selectedDrivers.includes(driver._id) ? "checked" : ""}`}
                        onClick={() => handleToggleDriver(driver._id)}
                      >
                        <div className="check-box">
                          {selectedDrivers.includes(driver._id) && (
                            <CheckCircle size={16} />
                          )}
                        </div>
                        <div className="check-info">
                          <span className="p-id">{driver.name}</span>
                          <span className="p-meta">
                            {driver.vehicleNumber} • {driver.vehicleType}
                          </span>
                        </div>
                      </div>
                    ))}
                    {drivers.length === 0 && (
                      <p className="empty-msg">No available drivers found</p>
                    )}
                  </div>
                </div>

                <button
                  className={`btn btn-secondary distribute-btn full-width ${loading ? "loading" : ""}`}
                  onClick={handleDistribute}
                  disabled={
                    loading ||
                    selectedParcels.length === 0 ||
                    selectedDrivers.length === 0
                  }
                >
                  {loading ? (
                    "Distributing..."
                  ) : (
                    <>
                      <Truck size={18} />
                      Distribute to Drivers
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
                  <h3>Distribution Summary</h3>
                  <div className="metrics-grid">
                    <div className="metric">
                      <Truck size={16} />
                      <span>{distributionResult?.length} Routes</span>
                    </div>
                    <div className="metric">
                      <List size={16} />
                      <span>
                        {distributionResult?.reduce(
                          (acc, r) => acc + r.parcels.length,
                          0,
                        )}{" "}
                        Parcels
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sequence-card">
                  <h3>Created Routes</h3>
                  <div className="sequence-list">
                    {distributionResult?.map((route, idx) => (
                      <div
                        key={route._id}
                        className="glass-card mb-3"
                        style={{
                          borderLeft: `4px solid ${["#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#10b981"][idx % 6]}`,
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong
                            style={{
                              color: [
                                "#3b82f6",
                                "#ec4899",
                                "#8b5cf6",
                                "#06b6d4",
                                "#f97316",
                                "#10b981",
                              ][idx % 6],
                            }}
                          >
                            Route {idx + 1}
                          </strong>
                          <span className="badge bg-primary">
                            Active Assignment
                          </span>
                        </div>
                        <div className="small text-muted mb-2">
                          <Users size={12} className="me-1" />
                          Driver:{" "}
                          <strong>
                            {drivers.find((d) => d._id === route.assignedDriver)
                              ?.name || "Unknown"}
                          </strong>
                        </div>
                        <div className="small text-muted mb-2 d-flex gap-3">
                          <span className="d-flex align-items-center">
                            <Navigation2 size={12} className="me-1" />{" "}
                            {(route.totalDistance / 1000).toFixed(2)} km
                          </span>
                          <span className="d-flex align-items-center">
                            <Clock size={12} className="me-1" />{" "}
                            {(route.totalTime / 60).toFixed(0)} mins
                          </span>
                        </div>
                        <div className="mt-2 pt-2 border-top border-secondary">
                          <div className="small font-weight-bold mb-1">
                            Assigned Parcels ({route.parcels.length}):
                          </div>
                          <div className="d-flex flex-wrap gap-1">
                            {route.optimizedSequence.map((step, sIdx) => (
                              <span
                                key={sIdx}
                                className="badge bg-dark"
                                style={{
                                  fontSize: "0.65rem",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {step.parcelId}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-outline full-width mt-3"
                  onClick={() => {
                    setDistributionResult(null);
                    setActiveTab("selection");
                    fetchPendingParcels();
                  }}
                >
                  Reset & New Distribution
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="map-view-container">
          <MapView
            warehouse={currentWarehouse}
            parcels={pendingParcels}
            highlightedParcelIds={selectedParcels}
            routes={activeTab === "result" ? distributionResult : []}
            activeParcelId={hoveredParcelId}
            fitBoundsKey={`${currentWarehouse?._id}-${pendingParcels.length}-${activeTab}`}
          />
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
        .driver-selector h3,
        .metrics-card h3 {
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
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          outline: none;
        }

        .scrollable-small {
          max-height: 200px;
          overflow-y: auto;
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

        .btn-secondary {
          background: var(--secondary);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: 600;
          justify-content: center;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
          font-size: 0.875rem;
          font-weight: 600;
        }

        .full-width {
          width: 100%;
        }

        .map-view-container {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .mb-3 { margin-bottom: 1rem; }
        .mt-3 { margin-top: 1rem; }
        .me-1 { margin-right: 0.25rem; }
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }
        .align-items-center { align-items: center; }
        
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .bg-primary { background: var(--primary); color: white; }
      `}</style>
    </div>
  );
};

export default Distributor;
