import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  MapPin,
  Trash2,
  Search,
  ClipboardList,
  Anchor,
  Weight,
  Edit2,
  Navigation,
  Truck,
  CheckCircle,
  X,
  Zap,
  Clock,
  Navigation2,
} from "lucide-react";
import {
  parcelService,
  warehouseService,
  routeService,
  driverService,
} from "../services/api";
import { geocodeAddress } from "../services/geocoding";
import { useAuth } from "../context/AuthContext";

const Parcels = () => {
  const { user } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    parcelId: "",
    latitude: "",
    longitude: "",
    weight: "",
    destinationPort: "",
    assignedWarehouse: "",
    pickupLocationName: "",
    status: "CREATED",
  });
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Route optimization state
  const [selectedParcelIds, setSelectedParcelIds] = useState([]);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [parcelsRes, warehousesRes] = await Promise.all([
        parcelService.getAll(),
        warehouseService.getAll(),
      ]);
      setParcels(parcelsRes.data.data);
      setWarehouses(warehousesRes.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await parcelService.update(editingId, formData);
        alert("Parcel updated successfully");
      } else {
        await parcelService.create(formData);
        alert("Parcel created successfully");
      }
      setFormData({
        parcelId: "",
        latitude: "",
        longitude: "",
        weight: "",
        destinationPort: "",
        assignedWarehouse: "",
        pickupLocationName: "",
        status: "CREATED",
      });
      setEditMode(false);
      setEditingId(null);
      setLocationQuery("");
      setShowForm(false);
      fetchInitialData();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving parcel");
    }
  };

  const handleEdit = (parcel) => {
    setFormData({
      parcelId: parcel.parcelId,
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      weight: parcel.weight,
      destinationPort: parcel.destinationPort,
      assignedWarehouse:
        parcel.assignedWarehouse?._id || parcel.assignedWarehouse || "",
      pickupLocationName: parcel.pickupLocationName || "",
      status: parcel.status || "CREATED",
    });
    setEditingId(parcel._id);
    setEditMode(true);
    setLocationQuery(parcel.pickupLocationName || "");
    setShowForm(true);
  };

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleLocationSearch = async (query) => {
    setLocationQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeoutId = setTimeout(async () => {
      const results = await geocodeAddress(query);
      setSearchResults(results);
      setSearching(false);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const filteredParcels = parcels.filter((p) => {
    // Delivery boys should not see "CREATED" parcels (only Admin)
    if (user?.role === "deliveryboy" && p.status === "CREATED") return false;

    const matchesStatus =
      statusFilter === "ALL" ? true : p.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.parcelId.toLowerCase().includes(query) ||
      (p.pickupLocationName || "").toLowerCase().includes(query) ||
      (p.destinationPort || "").toLowerCase().includes(query) ||
      (p.assignedWarehouse?.name || "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const statusCounts = parcels.reduce(
    (acc, p) => {
      // Don't count CREATED parcels for delivery boys
      if (user?.role === "deliveryboy" && p.status === "CREATED") return acc;

      acc[p.status] = (acc[p.status] || 0) + 1;
      acc.ALL = (acc.ALL || 0) + 1;
      return acc;
    },
    { ALL: 0 },
  );

  const statusCards = [
    {
      label: "All Parcels",
      value: "ALL",
      icon: <Package size={20} />,
      color: "var(--text)",
    },
    {
      label: "Created",
      value: "CREATED",
      icon: <Plus size={20} />,
      color: "var(--warning)",
    },
    {
      label: "Assigned",
      value: "ASSIGNED_TO_ROUTE",
      icon: <Navigation size={20} />,
      color: "var(--primary)",
    },
    {
      label: "Delivered",
      value: "DELIVERED",
      icon: <CheckCircle size={20} />,
      color: "var(--success)",
    },
  ].filter((card) => user?.role !== "deliveryboy" || card.value !== "CREATED");

  const selectLocation = (result) => {
    setFormData((prev) => ({
      ...prev,
      latitude: result.lat,
      longitude: result.lon,
      pickupLocationName: result.display_name,
    }));
    setLocationQuery(result.display_name);
    setSearchResults([]);
  };

  // Route optimization handlers
  const createdParcels = parcels.filter((p) => p.status === "CREATED");

  const handleToggleParcelSelect = (id) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSelectAllCreated = () => {
    if (selectedParcelIds.length === createdParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(createdParcels.map((p) => p._id));
    }
  };

  const handleOpenOptimize = async () => {
    if (selectedParcelIds.length === 0) return;
    try {
      const driversRes = await driverService.getAll();
      setDrivers(driversRes.data.data);
    } catch (e) {
      console.error("Error fetching drivers:", e);
    }
    setShowOptimizeModal(true);
  };

  const handleRunOptimization = async () => {
    const selected = parcels.filter((p) => selectedParcelIds.includes(p._id));
    const warehouseId =
      selected[0]?.assignedWarehouse?._id || selected[0]?.assignedWarehouse;
    if (!warehouseId) {
      alert("Selected parcels must have an assigned warehouse.");
      return;
    }
    try {
      setOptimizing(true);
      const res = await routeService.optimize({
        warehouseId,
        parcelIds: selectedParcelIds,
      });
      setOptimizedResult(res.data.data);
    } catch (error) {
      console.error("Optimization failed:", error);
      alert(
        "Failed to optimize route. Make sure OSRM and VROOM services are running.",
      );
    } finally {
      setOptimizing(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver || !optimizedResult) return;
    try {
      setAssigning(true);
      await routeService.assignDriver(
        optimizedResult.route._id,
        selectedDriver,
      );
      alert("Route optimized and assigned to driver successfully!");
      setShowOptimizeModal(false);
      setOptimizedResult(null);
      setSelectedParcelIds([]);
      setSelectedDriver("");
      fetchInitialData();
    } catch (error) {
      alert("Failed to assign driver.");
    } finally {
      setAssigning(false);
    }
  };

  const handleCloseOptimizeModal = () => {
    setShowOptimizeModal(false);
    setOptimizedResult(null);
    setSelectedDriver("");
  };

  const handleDelete = async (parcel) => {
    // Allow deletion of CREATED parcels even if they have a stale assignedRoute
    if (
      parcel.status !== "CREATED" &&
      parcel.status !== "DELIVERED" &&
      parcel.assignedRoute
    ) {
      alert(
        "Cannot delete a parcel that is currently assigned to a route. Mark it as DELIVERED first or unassign it.",
      );
      return;
    }

    if (window.confirm("Are you sure you want to delete this parcel?")) {
      try {
        await parcelService.delete(parcel._id);
        fetchInitialData();
      } catch (error) {
        alert(error.response?.data?.message || "Error deleting parcel");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="management-page"
    >
      <header className="page-header">
        <div>
          <div className="header-text">
            <h1>
              {user?.role === "deliveryboy"
                ? "My Deliveries"
                : "Parcel Management"}
            </h1>
            <p>
              {user?.role === "deliveryboy"
                ? "View your assigned parcels"
                : "Register and track individual pickup requests"}
            </p>
          </div>
        </div>
        {user?.role !== "deliveryboy" && (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (showForm) {
                setEditMode(false);
                setEditingId(null);
                setFormData({
                  parcelId: "",
                  latitude: "",
                  longitude: "",
                  weight: "",
                  destinationPort: "",
                  assignedWarehouse: "",
                  pickupLocationName: "",
                });
                setLocationQuery("");
              }
              setShowForm(!showForm);
            }}
          >
            {showForm ? (
              "View List"
            ) : (
              <>
                <Plus size={18} /> Add New Parcel
              </>
            )}
          </button>
        )}
      </header>

      {showForm ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="form-container glass-card"
        >
          <form onSubmit={handleSubmit} className="premium-form">
            <h2>
              {editMode ? "Update Pickup Request" : "Add New Pickup Request"}
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <ClipboardList size={14} /> Parcel ID
                </label>
                <input
                  type="text"
                  name="parcelId"
                  placeholder="e.g. PKG-5001"
                  value={formData.parcelId}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <Anchor size={14} /> Assigned Warehouse
                </label>
                <select
                  name="assignedWarehouse"
                  value={formData.assignedWarehouse}
                  onChange={(e) => {
                    const shelf = warehouses.find(
                      (w) => w._id === e.target.value,
                    );
                    setFormData((prev) => ({
                      ...prev,
                      assignedWarehouse: e.target.value,
                      destinationPort: shelf ? shelf.code : "",
                    }));
                  }}
                  required
                >
                  <option value="">-- Select Destination Hub --</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width-input">
                <label>
                  <MapPin size={14} /> Search Pickup Location
                </label>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Enter location name or area..."
                    value={locationQuery}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                  />
                  {searching && <div className="spinner"></div>}
                </div>
                {searchResults.length > 0 && (
                  <div className="search-results-dropdown glass-card">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="search-result-item"
                        onClick={() => selectLocation(result)}
                      >
                        <MapPin size={14} />
                        <span>{result.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>
                  <MapPin size={14} /> Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  placeholder="23.0225"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <MapPin size={14} /> Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  placeholder="72.5714"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <Weight size={14} /> Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  placeholder="5.5"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {editMode && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="CREATED">CREATED</option>
                    <option value="ASSIGNED_TO_ROUTE">ASSIGNED TO ROUTE</option>
                    <option value="PICKUP_IN_PROGRESS">
                      PICKUP IN PROGRESS
                    </option>
                    <option value="PICKED_UP">PICKED UP</option>
                    <option value="MULTIPLE_PICKUPS">MULTIPLE PICKUPS</option>
                    <option value="ON_WAY_TO_WAREHOUSE">
                      ON WAY TO WAREHOUSE
                    </option>
                    <option value="ARRIVED_AT_WAREHOUSE">
                      ARRIVED AT WAREHOUSE
                    </option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editMode ? "Update Parcel" : "Create Parcel Request"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowForm(false);
                  setEditMode(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="list-container">
          <div className="table-header glass-card">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by Parcel ID, Port, Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filters">
              {user?.role !== "deliveryboy" && createdParcels.length > 0 && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSelectAllCreated}
                  style={{
                    marginRight: "0.75rem",
                    fontSize: "0.75rem",
                    padding: "0.35rem 0.75rem",
                  }}
                >
                  {selectedParcelIds.length === createdParcels.length
                    ? "Deselect All"
                    : `Select All Created (${createdParcels.length})`}
                </button>
              )}
              <span>Total: {parcels.length}</span>
            </div>
          </div>

          <div className="status-cards-row">
            {statusCards.map((card) => (
              <div
                key={card.value}
                className={`status-filter-card glass-card ${statusFilter === card.value ? "active" : ""}`}
                onClick={() => setStatusFilter(card.value)}
                style={{ "--highlight-color": card.color }}
              >
                <div
                  className="status-icon-wrapper"
                  style={{ background: card.color + "20", color: card.color }}
                >
                  {card.icon}
                </div>
                <div className="status-info">
                  <h3>{statusCounts[card.value] || 0}</h3>
                  <span>{card.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="data-table glass-card">
            <table>
              <thead>
                <tr>
                  {user?.role !== "deliveryboy" && (
                    <th style={{ width: "40px" }}></th>
                  )}
                  <th>Parcel ID</th>
                  <th>Pickup Location</th>
                  <th>Coordinates</th>
                  <th>Destination</th>
                  <th>Weight</th>
                  <th>Status</th>
                  {user?.role !== "deliveryboy" && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredParcels.map((parcel) => {
                  const isCreated = parcel.status === "CREATED";
                  const isSelected = selectedParcelIds.includes(parcel._id);
                  return (
                    <tr
                      key={parcel._id}
                      className={isSelected ? "row-selected" : ""}
                    >
                      {user?.role !== "deliveryboy" && (
                        <td data-label="Select">
                          {isCreated ? (
                            <div
                              className={`parcel-checkbox ${isSelected ? "checked" : ""}`}
                              onClick={() =>
                                handleToggleParcelSelect(parcel._id)
                              }
                            >
                              {isSelected && <CheckCircle size={14} />}
                            </div>
                          ) : (
                            <div className="parcel-checkbox disabled"></div>
                          )}
                        </td>
                      )}
                      <td data-label="Parcel ID">
                        <div className="id-cell">
                          <Package size={16} />
                          {parcel.parcelId}
                        </div>
                      </td>
                      <td data-label="Pickup Location">
                        <div className="addr-cell">
                          {parcel.pickupLocationName || "Manual Entry"}
                        </div>
                      </td>
                      <td data-label="Coordinates">
                        {parcel.latitude.toFixed(4)},{" "}
                        {parcel.longitude.toFixed(4)}
                      </td>
                      <td data-label="Destination">
                        <div className="dest-cell">
                          {parcel.assignedWarehouse?.name && (
                            <span className="dest-name">
                              {parcel.assignedWarehouse.name}
                            </span>
                          )}
                          <span className="dest-code">
                            {parcel.destinationPort}
                          </span>
                        </div>
                      </td>
                      <td data-label="Weight">{parcel.weight} kg</td>
                      <td data-label="Status">
                        <span
                          className={`status-pill ${parcel.status.toLowerCase()}`}
                        >
                          {parcel.status}
                        </span>
                      </td>
                      {user?.role !== "deliveryboy" && (
                        <td data-label="Actions">
                          <div className="action-cell">
                            <button
                              className="icon-btn edit"
                              onClick={() => handleEdit(parcel)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="icon-btn delete"
                              onClick={() => handleDelete(parcel)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {parcels.length === 0 && (
                  <tr>
                    <td
                      colSpan={user?.role !== "deliveryboy" ? 8 : 6}
                      className="empty-row"
                    >
                      No parcels registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Floating Action Bar for Route Optimization */}
          <AnimatePresence>
            {selectedParcelIds.length > 0 && user?.role !== "deliveryboy" && (
              <motion.div
                className="optimize-action-bar glass-card"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
              >
                <div className="action-bar-info">
                  <Zap size={18} className="action-bar-icon" />
                  <span>
                    <strong>{selectedParcelIds.length}</strong> parcel
                    {selectedParcelIds.length > 1 ? "s" : ""} selected for
                    optimization
                  </span>
                </div>
                <div className="action-bar-buttons">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedParcelIds([])}
                  >
                    <X size={14} /> Clear
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenOptimize}
                  >
                    <Navigation size={14} /> Optimize Route
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Route Optimization Modal */}
      <AnimatePresence>
        {showOptimizeModal && (
          <motion.div
            className="optimize-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseOptimizeModal}
          >
            <motion.div
              className="optimize-modal glass-card"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  <Navigation size={20} /> Route Optimization
                </h2>
                <button className="icon-btn" onClick={handleCloseOptimizeModal}>
                  <X size={20} />
                </button>
              </div>

              {!optimizedResult ? (
                <div className="modal-body">
                  <div className="modal-info-card">
                    <h3>Selected Parcels</h3>
                    <div className="selected-parcels-list">
                      {parcels
                        .filter((p) => selectedParcelIds.includes(p._id))
                        .map((p) => (
                          <div key={p._id} className="selected-parcel-chip">
                            <Package size={12} />
                            <span>{p.parcelId}</span>
                            <span className="chip-meta">{p.weight}kg</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <button
                    className={`btn btn-primary full-width ${optimizing ? "loading" : ""}`}
                    onClick={handleRunOptimization}
                    disabled={optimizing}
                  >
                    {optimizing ? (
                      <>
                        <span className="btn-spinner"></span> Calculating
                        Optimal Route...
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> Run Optimization
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="modal-body">
                  <div className="modal-info-card">
                    <h3>Optimization Result</h3>
                    <div className="result-metrics">
                      <div className="result-metric">
                        <Navigation2 size={16} />
                        <span>{optimizedResult.metrics.totalDistance}</span>
                      </div>
                      <div className="result-metric">
                        <Clock size={16} />
                        <span>{optimizedResult.metrics.totalTime}</span>
                      </div>
                      <div className="result-metric">
                        <Truck size={16} />
                        <span>{optimizedResult.metrics.estimatedFuelCost}</span>
                      </div>
                    </div>
                  </div>

                  <div className="modal-info-card">
                    <h3>Optimal Sequence</h3>
                    <div className="opt-sequence-list">
                      <div className="opt-seq-item warehouse-item">
                        <div className="opt-seq-idx">🏠</div>
                        <div>
                          <strong>Warehouse</strong>
                          <br />
                          <small>Start point</small>
                        </div>
                      </div>
                      {optimizedResult.route.optimizedSequence?.map(
                        (step, i) => (
                          <div key={i} className="opt-seq-item">
                            <div className="opt-seq-idx">{i + 1}</div>
                            <div>
                              <strong>{step.parcelId}</strong>
                              <br />
                              <small style={{ color: "var(--text-muted)" }}>
                                {step.pickupLocationName}
                              </small>
                            </div>
                            <span className="opt-seq-time">
                              {Math.floor(step.arrivalTime / 60)} min
                            </span>
                          </div>
                        ),
                      )}
                      <div className="opt-seq-item warehouse-item">
                        <div className="opt-seq-idx">🏠</div>
                        <div>
                          <strong>Warehouse</strong>
                          <br />
                          <small>Return</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-info-card">
                    <h3>
                      <Truck size={16} /> Assign Driver
                    </h3>
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                      <option value="">-- Select a Driver --</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.vehicleNumber}){" "}
                          {d.isAvailable ? "✅" : "🔴 Busy"}{" "}
                          {d.onDuty ? "" : "(Off Duty)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn btn-primary full-width"
                    onClick={handleAssignDriver}
                    disabled={!selectedDriver || assigning}
                  >
                    {assigning ? "Assigning..." : "Lock & Assign Route"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* === Status Filter Cards === */
        
        .status-cards-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .status-filter-card {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            padding: 1.25rem;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(255, 255, 255, 0.03);
            position: relative;
            overflow: hidden;
        }

        .status-filter-card:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.06);
            border-color: var(--highlight-color);
        }

        .status-filter-card.active {
            background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03));
            border-color: var(--highlight-color);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .status-filter-card.active::before {
            content: '';
            position: absolute;
            left: 0; 
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--highlight-color);
        }

        .status-icon-wrapper {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: transform 0.3s ease;
        }

        .status-filter-card:hover .status-icon-wrapper,
        .status-filter-card.active .status-icon-wrapper {
            transform: scale(1.1);
        }

        .status-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .status-info h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            line-height: 1;
        }

        .status-info span {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .management-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          position: relative;
        }

        .full-width-input {
          grid-column: 1 / -1;
          position: relative;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper input {
          width: 100%;
          padding-right: 3rem;
        }

        .spinner {
          position: absolute;
          right: 1rem;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .search-results-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          margin-top: 0.5rem;
          max-height: 250px;
          overflow-y: auto;
          padding: 0.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
        }

        .search-result-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.85rem;
        }

        .search-result-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--primary);
        }

        .search-result-item span { line-height: 1.4; }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.85rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          color: white;
          outline: none;
          transition: var(--transition);
        }

        input:focus {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem 1.5rem;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          width: 300px;
          max-width: 100%;
        }

        .search-bar input {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.9rem;
          width: 100%;
        }

        .filters {
          display: flex;
          align-items: center;
        }

        .data-table {
          padding: 0;
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          padding: 1.25rem 1.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
        }

        td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        tr.row-selected td {
          background: rgba(37, 99, 235, 0.08);
        }

        .id-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: var(--primary);
        }

        .action-cell {
          display: flex;
          gap: 0.5rem;
        }

        .addr-cell {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .dest-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dest-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text);
        }

        .dest-code {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .status-pill {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-pill.created {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .status-pill.assigned_to_route {
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }
        .status-pill.picked_up {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }
        .status-pill.multiple_pickups {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
        }
        .status-pill.on_way_to_warehouse {
          background: rgba(251, 146, 60, 0.15);
          color: #fb923c;
        }
        .status-pill.arrived_at_warehouse {
          background: rgba(14, 165, 233, 0.1);
          color: #38bdf8;
        }
        .status-pill.delivered {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }
        .status-pill.pickup_in_progress {
          background: rgba(234, 179, 8, 0.1);
          color: #facc15;
        }

        .icon-btn {
          background: none;
          border: none;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
          color: var(--text-muted);
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .icon-btn.delete:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-row {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
          font-style: italic;
        }

        select {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          outline: none;
          cursor: pointer;
        }

        select option {
          background: var(--bg-card);
          color: black;
          padding: 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        select option:hover {
          background: var(--primary);
          color: white;
        }

        /* === Parcel Checkbox === */
        .parcel-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: transparent;
        }

        .parcel-checkbox:hover {
          border-color: var(--primary);
          background: rgba(37, 99, 235, 0.1);
        }

        .parcel-checkbox.checked {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .parcel-checkbox.disabled {
          opacity: 0.15;
          cursor: not-allowed;
        }

        /* === Floating Optimize Action Bar === */
        .optimize-action-bar {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          padding: 0.75rem 1.5rem;
          min-width: min(480px, calc(100vw - 2rem));
          max-width: calc(100vw - 2rem);
          z-index: 500;
          border: 1px solid var(--primary-glow);
          box-shadow: 0 8px 32px rgba(37, 99, 235, 0.25);
        }

        .action-bar-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
        }

        .action-bar-icon {
          color: var(--primary);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .action-bar-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-sm {
          padding: 0.4rem 0.85rem !important;
          font-size: 0.8rem !important;
        }

        .full-width {
          width: 100%;
          justify-content: center;
        }

        /* === Optimization Modal === */
        .optimize-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .optimize-modal {
          width: 520px;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid var(--primary-glow);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          margin: 0;
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .modal-info-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          padding: 1rem;
          border: 1px solid var(--border-color);
        }

        .modal-info-card h3 {
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
        }

        .selected-parcels-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .selected-parcel-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.7rem;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid var(--primary-glow);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
        }

        .chip-meta {
          opacity: 0.6;
          font-size: 0.7rem;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        .result-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .result-metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
        }

        .opt-sequence-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .opt-seq-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          position: relative;
        }

        .opt-seq-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 1.15rem;
          top: 2rem;
          width: 2px;
          height: 0.4rem;
          background: var(--border-color);
        }

        .opt-seq-idx {
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

        .warehouse-item .opt-seq-idx {
          border: none;
          background: none;
        }

        .opt-seq-time {
          margin-left: auto;
          font-size: 0.7rem;
          background: rgba(37, 99, 235, 0.15);
          color: var(--primary);
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        /* --- RESPONSIVE ADJUSTMENTS --- */
        @media (max-width: 1200px) {
          .status-cards-row {
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }
        }

        @media (max-width: 1024px) {
          .status-cards-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
          .management-page {
            gap: 1.5rem;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          /* Switch to mobile view styles early for tablet */
          table, thead, tbody, th, td, tr {
            display: block;
          }
          thead tr {
            display: none;
          }
          tbody tr {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            margin-bottom: 1rem;
            padding: 1rem;
            background: var(--bg-card);
            position: relative;
            box-shadow: var(--shadow-sm);
          }
          td {
            border: none !important;
            padding: 0.5rem 0 !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
          }
          td:last-child {
            border-bottom: none !important;
          }
          td::before {
            content: attr(data-label);
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 700;
          }
          td > div, td > span {
            text-align: right;
            justify-content: flex-end;
          }
          .action-cell {
            padding-top: 0.5rem !important;
          }
          .addr-cell {
            max-width: 250px;
            white-space: normal;
          }
        }

        @media (max-width: 768px) {
          .management-page { padding: 0; }
          .page-header { gap: 1rem; }
          .page-header .btn { width: 100%; justify-content: center; }
          .table-header { flex-direction: column; align-items: stretch; gap: 0.75rem; padding: 1rem; }
          .search-bar { width: 100%; }
          .form-grid { grid-template-columns: 1fr; }
          .optimize-modal { width: 95%; margin: 1rem; }
          .optimize-action-bar { bottom: 5rem; width: calc(100vw - 2rem); flex-direction: column; gap: 0.75rem; padding: 1rem; }
          .action-bar-buttons { width: 100%; justify-content: space-between; }
          .status-icon-wrapper { width: 40px; height: 40px; }
          .status-info h3 { font-size: 1.25rem; }
        }

        @media (max-width: 480px) {
          .status-cards-row { grid-template-columns: 1fr; gap: 0.75rem; }
          .result-metrics { grid-template-columns: 1fr; }
        }
      `}</style>
    </motion.div>
  );
};

export default Parcels;
