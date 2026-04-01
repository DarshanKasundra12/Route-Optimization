import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, hover } from "framer-motion";
import {
  MapPin,
  Search,
  Plus,
  Activity,
  Package,
  Globe,
  X,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  LayoutDashboard,
} from "lucide-react";
import { warehouseService } from "../services/api";
import { geocodeAddress } from "../services/geocoding";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    latitude: "",
    longitude: "",
    address: "",
    capacity: 1000,
    type: "Distribution",
  });
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Geocoding State
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await warehouseService.getAll();
      setWarehouses(res.data.data);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
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
        await warehouseService.update(editingId, formData);
      } else {
        await warehouseService.create(formData);
      }
      resetForm();
      fetchWarehouses();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving warehouse");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      latitude: "",
      longitude: "",
      address: "",
      capacity: 1000,
      type: "Distribution",
    });
    setEditMode(false);
    setEditingId(null);
    setLocationQuery("");
    setShowModal(false);
    setSearchResults([]);
  };

  const handleEdit = (warehouse) => {
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      address: warehouse.address || "",
      capacity: warehouse.capacity || 1000,
      type: warehouse.type || "Distribution",
    });
    setEditingId(warehouse._id);
    setEditMode(true);
    setLocationQuery(warehouse.address || "");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this warehouse?")) {
      try {
        await warehouseService.delete(id);
        fetchWarehouses();
      } catch (error) {
        alert(error.response?.data?.message || "Error deleting warehouse");
      }
    }
  };

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

  // Helper component to auto-fit map bounds
  const MapBounds = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
      if (markers.length > 0) {
        // Build bounds from markers
        const bounds = new L.LatLngBounds(
          markers.map((m) => [m.latitude, m.longitude]),
        );

        // Invalidate size to ensure map renders correctly in its container
        // checking if map container has size
        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }, 200);
      }
    }, [markers, map]);
    return null;
  };

  const selectLocation = (result) => {
    setFormData((prev) => ({
      ...prev,
      latitude: result.lat,
      longitude: result.lon,
      address: result.display_name,
    }));
    setLocationQuery(result.display_name);
    setSearchResults([]);
  };

  // Helper for utilization color
  // Calculate dynamic stats
  const stats = React.useMemo(() => {
    const totalCapacity = warehouses.reduce(
      (sum, w) => sum + (Number(w.capacity) || 0),
      0,
    );
    const operatingHubs = warehouses.length;
    // simulating dynamic data since backend might not have these yet
    const activeShipments = Math.floor(totalCapacity * 0.0015) + 120;
    const globalOccupancy = Math.floor(Math.random() * 20) + 60; // 60-80% random

    return {
      totalCapacity,
      operatingHubs,
      activeShipments,
      globalOccupancy,
    };
  }, [warehouses]);

  return (
    <div className="warehouses-page">
      {/* Top Bar */}
      <header className="page-header">
        <div className="header-content">
          <nav className="breadcrumb">
            <span>Logistics</span>
            <Navigation size={12} />
            <span className="current">Warehouse Management</span>
          </nav>
          <h1>Distribution Hubs</h1>
        </div>

        <div className="header-actions">
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input type="text" placeholder="Search warehouses..." />
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            // onMouseEnter={(e) => {
            //   e.currentTarget.style.background =
            //     "linear-gradient(135deg, #2563eb, #000000)";
            // }}
            // onMouseLeave={(e) => {
            //   e.currentTarget.style.background =
            //     "linear-gradient(270deg, #2563eb82, #000000)";
            // }}
            // onMouseDown={(e) => {
            //   e.currentTarget.style.transform = "scale(0.97)";
            // }}
            // onMouseUp={(e) => {
            //   e.currentTarget.style.transform = "scale(1)";
            // }}
            style={{
              transition: "all 0.2s ease",
              // border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Plus size={15} />
            <span>Add Warehouse</span>
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="stats-section">
        <div className="stat-card">
          <p className="stat-label">Total Capacity</p>
          <p className="stat-value">
            {stats.totalCapacity.toLocaleString()}{" "}
            <span className="unit">m²</span>
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Shipments</p>
          <p className="stat-value">{stats.activeShipments.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Global Occupancy</p>
          <div className="stat-chart">
            <p className="stat-value">{stats.globalOccupancy}%</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.globalOccupancy}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Operating Hubs</p>
          <p className="stat-value">
            {stats.operatingHubs} <span className="unit-active">Active</span>
          </p>
        </div>
      </section>

      {/* Warehouse Grid */}
      <section className="warehouse-grid">
        {warehouses.map((warehouse) => {
          const capacity = Number(warehouse.capacity) || 0;
          const currentStock =
            warehouse.currentStock !== undefined
              ? Number(warehouse.currentStock)
              : Math.floor(capacity * 0.65);
          const utilization =
            capacity > 0 ? (currentStock / capacity) * 100 : 0;

          return (
            <motion.div
              key={warehouse._id}
              layout
              className="warehouse-card glass-card"
            >
              <div className="card-header relative">
                <div>
                  <h3 className="card-title">{warehouse.name}</h3>
                  <div className="location-info">
                    <MapPin size={10} />
                    {Number(warehouse.latitude).toFixed(4)}° N,{" "}
                    {Number(warehouse.longitude).toFixed(4)}° E
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* <div className="status-badge optimal h-fit">Optimal</div> */}
                  <div className="card-actions-header">
                    <button
                      className="icon-btn-sm edit"
                      onClick={() => handleEdit(warehouse)}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="icon-btn-sm delete"
                      onClick={() => handleDelete(warehouse._id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* <div className="card-body">
              <div className="utilization-section">
                <div className="util-header">
                  <span>Capacity Utilization</span>
                  <span className="text-highlight">
                  
                    {Math.round(
                      ((warehouse.capacity * 0.65) / warehouse.capacity) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="util-bar">
                  <div
                    className="util-fill"
                    style={{
                      width: `${Math.round(((warehouse.capacity * 0.65) / warehouse.capacity) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="metrics-grid">
                <div>
                  <p className="metric-label">Current Stock</p>
                  <p className="metric-value">
                    {(
                      warehouse.currentStock ||
                      Math.floor(warehouse.capacity * 0.65)
                    ).toLocaleString()}{" "}
                    <span className="unit">units</span>
                  </p>
                </div>
                <div>
                  {/* <p className="metric-label">Last Update</p>
                  <p className="metric-sub">
                    {warehouse.lastUpdate || "2m ago"}
                  </p> */}
              {/* </div>
              </div>
            </div> */}
              <div className="card-body">
                {/* <div className="utilization-section">
                  <div className="util-header">
                    <span>Capacity Utilization</span>
                    <span className="text-highlight">
                      {Math.round(utilization)}%
                    </span>
                  </div>

                  <div className="util-bar">
                    <div
                      className="util-fill"
                      style={{
                        width: `${Math.min(Math.round(utilization), 100)}%`,
                      }}
                    ></div>
                  </div>
                </div> */}

                <div className="metrics-grid">
                  <div>
                    <p className="metric-label">Current Stock</p>
                    <p className="metric-value">
                      {currentStock.toLocaleString()}{" "}
                      <span className="unit">units</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-image">
                <div className="map-view-mini">
                  <MapContainer
                    center={[warehouse.latitude, warehouse.longitude]}
                    zoom={13}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    dragging={false}
                    attributionControl={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker
                      position={[warehouse.latitude, warehouse.longitude]}
                    />
                  </MapContainer>
                </div>
                <div className="image-badge">Active Hub</div>
              </div>
            </motion.div>
          );
        })}

        {/* Add New Card (Empty State) */}
        <button
          className="add-card-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <div className="add-icon-circle">
            <Plus size={24} />
          </div>
          <p className="add-title">Register New Facility</p>
          <p className="add-desc">
            Set up geographic coordinates and stock parameters
          </p>
        </button>
      </section>

      {/* Global Logistics Heatmap Placeholder */}
      <section className="map-section">
        <h2 className="section-title">
          <Globe size={18} className="text-primary" />
          Network Distribution
        </h2>
        <div className="map-container glass-card">
          <MapContainer
            center={[20.5937, 78.9629]} // Default center (India) or can be dynamic
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBounds markers={warehouses} />
            {warehouses.map((warehouse) => (
              <Marker
                key={warehouse._id}
                position={[warehouse.latitude, warehouse.longitude]}
              >
                <Popup>
                  <strong>{warehouse.name}</strong> <br />
                  {warehouse.code}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-modal"
            >
              <div className="modal-header">
                <div>
                  <h2>
                    {editMode
                      ? "Update Warehouse Facility"
                      : "Add Warehouse Facility"}
                  </h2>
                  <p>Register a new distribution hub to the network.</p>
                </div>
                <button
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid">
                  <div className="col-span-2 form-group">
                    <label>Facility Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., East Coast Terminal - ET05"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Internal Code</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g. WH-01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Capacity (m²)</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      placeholder="50000"
                    />
                  </div>

                  <div className="col-span-2 form-group relative">
                    <label>Location Search</label>
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        placeholder="Search city..."
                        value={locationQuery}
                        onChange={(e) => handleLocationSearch(e.target.value)}
                      />
                      {searching && <div className="spinner"></div>}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="dropdown-results custom-scrollbar">
                        {searchResults.map((res, idx) => (
                          <div
                            key={idx}
                            className="result-item"
                            onClick={() => selectLocation(res)}
                          >
                            <MapPin size={12} /> {res.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="40.7128"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="-74.0060"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Hub Type</label>
                    <select
                      name="type"
                      value={formData.type || "Distribution"}
                      onChange={handleInputChange}
                    >
                      <option>Distribution</option>
                      <option>Storage Only</option>
                      <option>Transit Hub</option>
                      <option>Final Mile</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowModal(false)}
                    style={{ padding: "10px 20px", borderRadius: "10px"  }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: "10px 20px", borderRadius: "10px" }}
                  >
                    {editMode ? "Update" : "Initialize"} Warehouse
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
         .warehouses-page {
           display: flex;
           flex-direction: column;
           gap: 2.5rem;
           padding-bottom: 4rem;
         }
         
         /* Header */
         .page-header {
           display: flex;
           justify-content: space-between;
           align-items: flex-end;
           gap: 1rem;
           margin-bottom: 0.5rem;
         }
         
         .breadcrumb {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           font-size: 0.75rem;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           color: var(--text-muted);
           margin-bottom: 0.25rem;
           font-weight: 600;
         }
         
         .breadcrumb .current { color: var(--text-main); opacity: 0.8; }
         
         .page-header h1 {
            font-size: 1.8rem;
            font-weight: 700;
            letter-spacing: -0.02em;
         }
         
         .header-actions {
            display: flex;
            gap: 1rem;
         }
         
         .search-container {
            position: relative;
            width: 260px;
         }
         
         .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
         }
         
         .search-container input {
            width: 100%;
            padding: 0.6rem 1rem 0.6rem 2.5rem;
            background: var(--bg-card);
            border: 1px solid transparent;
         }
         
         /* Stats Section */
         .stats-section {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
         }
         
         .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            border-radius: var(--radius-sm);
         }
         
         .stat-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 0.5rem;
         }
         
         .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.02em;
         }
         
         .unit { font-size: 0.85rem; font-weight: 400; color: var(--text-muted); }
         .unit-active { font-size: 0.85rem; font-weight: 400; color: var(--text-muted); }
         
         .stat-chart {
            display: flex;
            align-items: flex-end;
            gap: 0.5rem;
         }
         
         .progress-bar {
            flex: 1;
            height: 6px;
            background: var(--bg-main);
            border-radius: 99px;
            margin-bottom: 0.5rem;
            overflow: hidden;
         }
         
         .progress-fill {
            height: 100%;
            background: var(--primary);
            border-radius: 99px;
         }
         
         /* Warehouse Grid */
         .warehouse-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
         }
         
         .warehouse-card {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
         }
         
         .warehouse-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: rgba(37, 99, 235, 0.2);
         }
         
         .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
         }
         
         .card-title {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
         }
         
         .location-info {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-family: monospace;
         }
         
         .status-badge {
            font-size: 0.6rem;
            font-weight: 700;
            text-transform: uppercase;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
            letter-spacing: 0.05em;
         }
         
         .card-body {
            display: flex;
            flex-direction: column;
            gap: 1rem;
         }
         
         .util-header {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
         }
         
         .text-highlight { color: var(--text-main); }
         
         .util-bar {
            width: 100%;
            height: 6px;
            background: var(--bg-main);
            border-radius: 99px;
            overflow: hidden;
         }
         
         .util-fill {
            height: 100%;
            background: var(--primary);
            border-radius: 99px;
         }
         
         .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
         }
         
         .metric-label {
            font-size: 0.65rem;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 0.25rem;
         }
         
         .metric-value { font-size: 1.25rem; font-weight: 700; }
         .metric-sub { font-size: 0.85rem; font-weight: 500; color: var(--text-muted); }
         
         .card-image {
            height: 200px;
            width: 100%;
            border-radius: var(--radius-sm);
            overflow: hidden;
            position: relative;
            background: var(--bg-main);
            border: 1px solid rgba(255,255,255,0.05);
         }
         
         .bg-pattern {
             width: 100%;
             height: 100%;
             background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
             background-size: 20px 20px;
             opacity: 0.5;
         }
         
         .image-badge {
            position: absolute;
            bottom: 12px;
            left: 12px;
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.1);
         }
         
         .card-actions {
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
         }
         
         .warehouse-card:hover .card-actions { opacity: 1; }
         
         .icon-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            border-radius: 4px;
            cursor: pointer;
         }
         .icon-btn.delete:hover { background: var(--danger); border-color: var(--danger); }
         
         .card-actions-header {
             display: flex;
             gap: 0.5rem;
         }

         .icon-btn-sm {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            color: var(--text-muted);
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border-color);
         }
         
         .icon-btn-sm:hover {
            color: var(--text-main);
            background: rgba(255,255,255,0.1);
         }
         
         .icon-btn-sm.edit:hover { color: var(--primary); border-color: var(--primary); }
         .icon-btn-sm.delete:hover { color: var(--danger); border-color: var(--danger); }

         .map-container {
            height: 00px;
            position: relative;
            overflow: hidden;
            background: var(--bg-card);
         }
         .add-card-btn {
            background: transparent;
            border: 2px dashed var(--border-color);
            border-radius: var(--radius-sm);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            cursor: pointer;
            transition: var(--transition);
            group: group;
            text-align: center;
            padding: 2rem;
         }
         
         .add-card-btn:hover {
            border-color: var(--primary-glow);
            background: rgba(37, 99, 235, 0.05);
         }
         
         .add-icon-circle {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            color: var(--text-muted);
            transition: var(--transition);
         }
         
         .add-card-btn:hover .add-icon-circle {
            background: var(--primary);
            color: white;
            transform: scale(1.1);
         }
         
         .add-title {
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
         }
         .add-card-btn:hover .add-title { color: var(--text-main); }
         
         .add-desc {
            font-size: 0.75rem;
            color: var(--text-muted);
            max-width: 180px;
         }
         
         /* Map Section */
         .map-section {
            margin-top: 1rem;
         }
         
         .section-title {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
         }
         
         .map-container {
            height: 600px;
            position: relative;
            overflow: hidden;
            background: var(--bg-card);
         }
         
         .map-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, var(--bg-main) 25%, transparent 25%, transparent 75%, var(--bg-main) 75%),
                        linear-gradient(45deg, var(--bg-main) 25%, transparent 25%, transparent 75%, var(--bg-main) 75%);
            background-size: 60px 60px;
            background-position: 0 0, 30px 30px;
            opacity: 0.1;
            position: relative;
         }
         
         /* Modal */
         .modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 50;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
         }
         
         .glass-modal {
            width: 100%;
            max-width: 550px;
            background: rgba(16, 22, 34, 0.95);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: var(--radius-md);
            padding: 2rem;
            box-shadow: var(--shadow-2xl);
         }
         
         .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
         }
         
         .modal-header h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; }
         .modal-header p { font-size: 0.9rem; color: var(--text-muted); }
         
         .close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
         .close-btn:hover { color: white; }
         
         .modal-form { display: flex; flex-direction: column; gap: 1.5rem; }
         
         .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
         }
         
         .col-span-2 { grid-column: span 2; }
         
         .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
         
         .form-group label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
         }
         
         .form-group input, .form-group select {
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border-color);
            padding: 0.75rem;
            border-radius: var(--radius-sm);
            color: white;
            font-size: 0.9rem;
            width: 100%;
         }
         
         .form-group input:focus, .form-group select:focus {
            border-color: var(--primary);
            outline: none;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
         }
         .form-group select option { background: var(--bg-card); }
         
         .modal-actions {
            display: flex;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
         }
         
         .btn-cancel, .btn-submit {
            flex: 1;
            padding: 0.75rem;
            border-radius: var(--radius-sm);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: var(--transition);
         }
         
         .btn-cancel {
            background: rgba(255,255,255,0.05);
            border: none;
            color: var(--text-muted);
         }
         .btn-cancel:hover { background: rgba(255,255,255,0.1); color: white; }
         
         .btn-submit {
            background: var(--primary);
            border: none;
            color: white;
         }
         .btn-submit:hover { filter: brightness(1.1); }
         
         /* Spinner and Dropdown for Search */
         .spinner {
             position: absolute;
             right: 12px;
             top: 50%;
             transform: translateY(-50%);
             width: 16px;
             height: 16px;
             border: 2px solid rgba(255,255,255,0.1);
             border-top-color: var(--primary);
             border-radius: 50%;
             animation: spin 1s linear infinite;
         }
         
         .search-input-wrapper { position: relative; }
         
         .dropdown-results {
             position: absolute;
             top: 100%;
             left: 0;
             right: 0;
             background: var(--bg-card);
             border: 1px solid var(--border-color);
             border-radius: var(--radius-sm);
             z-index: 10;
             max-height: 200px;
             overflow-y: auto;
             margin-top: 4px;
             box-shadow: var(--shadow-lg);
         }
         
         .result-item {
             padding: 0.75rem;
             display: flex;
             align-items: center;
             gap: 0.5rem;
             font-size: 0.85rem;
             cursor: pointer;
             border-bottom: 1px solid var(--border-color);
         }
         .result-item:last-child { border-bottom: none; }
         .result-item:hover { background: rgba(255,255,255,0.05); color: var(--primary); }
         
         @media (max-width: 1024px) {
             .stats-section { grid-template-columns: 1fr 1fr; }
         }
         @media (max-width: 768px) {
             .stats-section { grid-template-columns: 1fr; }
             .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
             .header-actions { width: 100%; justify-content: space-between; flex-direction: column; }
             .search-container { width: 100%; }
             .warehouse-grid { grid-template-columns: 1fr; }
             .add-card-btn { min-height: 200px; }
             .modal-form .col-span-2 { grid-column: span 1; }
             .form-grid { grid-template-columns: 1fr; }
             .glass-modal { width: 95%; max-height: 90vh; overflow-y: auto; overflow-x: hidden; padding: 1.5rem; }
             .map-section { display: none; }
         }
         
          .map-view-mini {
             width: 100%;
             height: 100%;
             z-index: 10;
          }
       `}</style>
    </div>
  );
};

export default Warehouses;
