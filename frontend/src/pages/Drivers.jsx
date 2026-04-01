import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Bell,
  Grid,
  List,
  MoreHorizontal,
  MapPin,
  Clock,
  Battery,
  Shield,
  Activity,
  Phone,
  Mail,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Edit2,
} from "lucide-react";
import { driverService } from "../services/api";

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    phone: "",
    email: "",
    vehicleNumber: "",
    vehicleType: "VAN",
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await driverService.getAll();
      setDrivers(res.data.data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
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
      if (isEditing) {
        await driverService.update(currentDriverId, formData);
      } else {
        await driverService.create(formData);
      }
      resetForm();
      fetchDrivers();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving driver");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      employeeId: "",
      phone: "",
      email: "",
      vehicleNumber: "",
      vehicleType: "VAN",
    });
    setShowForm(false);
    setIsEditing(false);
    setCurrentDriverId(null);
  };

  const handleEdit = (driver) => {
    setFormData({
      name: driver.name,
      employeeId: driver.employeeId,
      phone: driver.phone,
      email: driver.email,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
    });
    setCurrentDriverId(driver._id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        await driverService.delete(id);
        fetchDrivers();
      } catch (error) {
        alert(error.response?.data?.message || "Error deleting driver");
      }
    }
  };

  // Filter logic
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    // Mock status filter logic for demonstration
    // In real app, check driver.status or derived status
    const matchesStatus = statusFilter === "all" ? true : true;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (driver) => {
    if (!driver.onDuty) return "offline"; // Grey
    if (driver.currentRoute) return "busy"; // Orange/Amber
    return "active"; // Emerald/Green
  };

  const getStatusText = (driver) => {
    if (!driver.onDuty) return "OFFLINE";
    if (driver.currentRoute) return "ON ROUTE";
    return "ACTIVE";
  };

  return (
    <div className="drivers-page">
      {/* Header Bar */}
      <header className="page-header">
        <div className="header-left">
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by name, ID, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-secondary">
            <Filter size={18} />
            <span>Filters</span>
          </button>
        </div>

        <div className="header-right">
          <button className="icon-btn">
            <Bell size={20} />
          </button>
          <div className="divider"></div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            <span>Onboard Driver</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="content-body custom-scrollbar">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="form-wrapper glass-card custom-scrollbar"
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {isEditing ? "Edit Driver Profile" : "Driver Onboarding"}
              </h1>
              <p className="text-muted text-sm">
                Update personal information and vehicle assignments.
              </p>
            </div>

            <div className="flex flex-col items-center mb-12">
              <div className="profile-img-group relative group">
                <div className="profile-img-container">
                  {/* Placeholder for now - can be replaced with real image URL if available */}
                  <div className="profile-initial">
                    {formData.name ? (
                      formData.name.charAt(0).toUpperCase()
                    ) : (
                      <User size={48} />
                    )}
                  </div>
                  <div className="overlay">
                    <User size={32} />
                  </div>
                </div>
                <button type="button" className="edit-img-btn">
                  <Edit2 size={14} />
                </button>
              </div>
              <p className="mt-4 text-[11px] font-bold text-muted uppercase tracking-widest">
                Employee ID: {formData.employeeId || "NEW-EMP"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <section className="form-section">
                <div className="section-header">
                  <User size={20} />
                  <h2 className="text-lg font-semibold">
                    Personal Information
                  </h2>
                </div>
                <div className="form-grid-2">
                  <div className="form-group col-span-2">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 (000) 000-0000"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  {!isEditing && (
                    <div className="form-group">
                      <label>Employee ID</label>
                      <input
                        type="text"
                        name="employeeId"
                        placeholder="e.g. DRV-701"
                        value={formData.employeeId}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}
                  {!isEditing && (
                    <div className="form-group">
                      <label>Password (for login)</label>
                      <input
                        type="password"
                        name="password"
                        placeholder="Create password"
                        value={formData.password || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Vehicle Details */}
              <section className="form-section">
                <div className="section-header">
                  <Truck size={20} />
                  <h2 className="text-lg font-semibold">Vehicle Details</h2>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Truck ID</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      placeholder="e.g. TRK-000"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                    >
                      <option value="VAN">Last Mile Van</option>
                      <option value="TRUCK">Heavy Duty Truck</option>
                      <option value="BIKE">Bike</option>
                      <option value="Refrigerated Trailer">
                        Refrigerated Trailer
                      </option>
                      <option value="Flatbed">Flatbed</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-4 pt-4 pb-12">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={resetForm}
                  // style={{
                  //   background: "var(--bg-main)",
                  //   border: "1px solid var(--border-color)",
                  //   color: "white",
                  //   borderRadius: "0.5rem",
                  //   padding: "0.75rem 1rem",
                  //   width: "100%",
                  //   fontSize: "0.9rem",
                  // }}
                  transition="all 0.2s"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  // style={{
                  //   background: "var(--bg-main)",
                  //   border: "1px solid var(--border-color)",
                  //   color: "white",
                  //   borderRadius: "0.5rem",
                  //   padding: "0.75rem 1rem",
                  //   width: "100%",
                  //   fontSize: "0.9rem",
                  // }}
                  transition="all 0.2s"
                >
                  {isEditing ? "Save Changes" : "Complete Onboarding"}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <>
            <div className="sub-header">
              <div>
                <h1>Driver Management</h1>
                <p>
                  Manage and assign routes to your fleet personnel in real-time.
                </p>
              </div>
              <div className="view-toggle">
                <button
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={16} /> Grid View
                </button>
                <button
                  className={viewMode === "list" ? "active" : ""}
                  onClick={() => setViewMode("list")}
                >
                  <List size={16} /> List View
                </button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="drivers-grid">
                <AnimatePresence>
                  {filteredDrivers.map((driver) => (
                    <motion.div
                      key={driver._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="driver-card glass-card group"
                    >
                      <div className="card-top">
                        <div className="avatar-container">
                          <div className="avatar">
                            {/* Placeholder for real image, using initials for now */}
                            {(driver.user?.name || driver.name)?.charAt(0)}
                          </div>
                          <div
                            className={`status-dot ${getStatusColor(driver)}`}
                            title={getStatusText(driver)}
                          ></div>
                        </div>
                        <div className="status-badge-container">
                          <span className="status-label">STATUS</span>
                          <div
                            className={`status-badge ${getStatusColor(driver)}`}
                          >
                            {getStatusText(driver)}
                          </div>
                        </div>
                      </div>

                      <div className="card-info">
                        <h3>{driver.user?.name || driver.name}</h3>
                        <p className="vehicle-detail">
                          <Truck size={12} />
                          {driver.vehicleType} • {driver.vehicleNumber}
                        </p>
                      </div>

                      <div className="stats-grid">
                        <div className="stat-box">
                          <span className="stat-label">EFFICIENCY</span>
                          <span className="stat-value">
                            {driver.efficiency || 0}%
                          </span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">DELIVERIES</span>
                          <span className="stat-value">
                            {driver.totalDeliveries || 0}
                          </span>
                        </div>
                      </div>

                      <div className="card-actions">
                        <button
                          className="assign-btn"
                          onClick={() => handleEdit(driver)}
                        >
                          <Activity size={16} />
                          Manage Driver
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredDrivers.length === 0 && (
                  <div className="no-results">
                    <Search size={48} />
                    <p>No drivers found matching your search.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="list-view glass-card">
                <table>
                  <thead>
                    <tr>
                      <th>Driver Info</th>
                      <th>Contact</th>
                      <th>Deliveries</th>
                      <th>Efficiency</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver._id}>
                        <td data-label="Driver Info">
                          <div
                            className="driver-info-cell"
                            style={{
                              display: "flex",
                              gap: "1rem",
                              alignItems: "center",
                            }}
                          >
                            <div className="avatar-sm">
                              {(driver.user?.name || driver.name)?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {driver.user?.name || driver.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {driver.vehicleType} • {driver.vehicleNumber}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Contact">
                          <div className="contact-cell">
                            <div>{driver.user?.email || driver.email}</div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                marginTop: "0.2rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Phone size={12} />
                              {driver.phone}
                            </div>
                          </div>
                        </td>
                        <td data-label="Deliveries">
                          {driver.totalDeliveries || 0}
                        </td>
                        <td data-label="Efficiency">
                          {driver.efficiency || 0}%
                        </td>
                        <td data-label="Status">
                          <div
                            className={`status-badge ${getStatusColor(driver)}`}
                          >
                            {getStatusText(driver)}
                          </div>
                        </td>
                        <td data-label="Action">
                          <button
                            onClick={() => handleEdit(driver)}
                            className="edit-driver-btn"
                          >
                            Edit Driver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* {!showForm && (
        <footer className="pagination-footer">
          <span>
            Showing {filteredDrivers.length} of {drivers.length} drivers
          </span>
          <div className="pagination-controls">
            <button className="page-btn">
              <ChevronLeft size={16} />
            </button>
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">3</button>
            <button className="page-btn">
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )} */}

      <style>{`
        /* Global Reset/Base */
        .drivers-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-main);
          overflow: hidden;
          color: var(--text-main);
          width: 100%;
          max-width: 100%;
        }

        /* Utility Classes */
        .text-center { text-align: center; }
        .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .tracking-tight { letter-spacing: -0.025em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .uppercase { text-transform: uppercase; }
        .text-muted { color: var(--text-muted); }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-10 { margin-bottom: 2.5rem; }
        .mb-12 { margin-bottom: 3rem; }
        .mt-4 { margin-top: 1rem; }
        .col-span-2 { grid-column: span 2; }
        
        /* Header */
        .page-header {
          min-height: 80px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: var(--bg-card);
          flex-shrink: 0;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-left, .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-container {
          position: relative;
          width: 100%;
          min-width: 320px;
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
          background: var(--bg-main);
          border: 1px solid transparent;
          padding: 0.6rem 1rem 0.6rem 2.8rem;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.9rem;
          transition: var(--transition);
        }

        .search-container input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
          outline: none;
        }
        
        .btn-secondary, .btn-primary, .icon-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: var(--transition);
          border: none;
          font-family: inherit;
        }

        .btn-secondary {
          padding: 0.6rem 1rem;
          background: var(--bg-main);
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.05); }

        .btn-primary {
          padding: 0.6rem 1.25rem;
          
         
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        

        .icon-btn {
          width: 40px;
          height: 40px;
          justify-content: center;
          background: transparent;
          color: var(--text-muted);
          border-radius: 50%;
        }
        .icon-btn:hover { color: var(--text-main); background: rgba(255, 255, 255, 0.05); }

        .divider {
          height: 32px;
          width: 1px;
          background: var(--border-color);
        }

        /* Content Body */
        .content-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          position: relative;
          min-width: 0;
        }
        
        /* Form Styling */
        .form-wrapper {
          background: var(--bg-card);
          padding: 3rem;
          border-radius: var(--radius-md);
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          border: 1px solid var(--border-color);
          position: relative;
        }

        .profile-img-group {
          position: relative;
          width: 8rem;
          height: 8rem;
        }

        .profile-img-container {
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          overflow: hidden;
          border: 4px solid var(--bg-card);
          box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
          background: var(--bg-main);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .profile-initial {
          font-size: 3rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        
        .profile-img-container .overlay {
           position: absolute;
           inset: 0;
           background: rgba(0,0,0,0.5);
           display: flex;
           align-items: center;
           justify-content: center;
           opacity: 0;
           transition: opacity 0.2s;
           cursor: pointer;
           color: white;
        }
        .profile-img-group:hover .overlay { opacity: 1; }

        .edit-img-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--primary);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: white;
          border: 4px solid var(--bg-card);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          z-index: 10;
        }
        .edit-img-btn:hover { background: #1d4ed8; }

        .form-section {
          background: rgba(255,255,255,0.02);
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          color: white;
        }
        .section-header svg { color: var(--text-muted); }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 768px) {
          .form-grid-2 { grid-template-columns: 1fr 1fr; }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .form-group input, .form-group select {
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          color: white;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          width: 100%;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        
        .form-group select { appearance: none; }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.3);
          outline: none;
        }

        /* Drivers Grid/List View (Restored) */
        .sub-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .drivers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .driver-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .glass-card {
            background: rgba(30, 41, 59, 0.4); 
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-md);
        }
        
        .card-top {
           display: flex; 
           justify-content: space-between; 
           align-items: flex-start; 
           margin-bottom: 1.5rem;
        }
        
        .avatar-container { position: relative; }
        .avatar {
           width: 64px; height: 64px; 
           border-radius: 50%; 
           background: linear-gradient(135deg, var(--bg-card), var(--bg-main));
           border: 2px solid rgba(37, 99, 235, 0.2);
           display: flex; align-items: center; justify-content: center;
           font-size: 1.5rem; font-weight: 700; color: var(--primary);
        }
        
        .status-dot {
           position: absolute; bottom: 0; right: 0;
           width: 16px; height: 16px; border-radius: 50%;
           border: 3px solid var(--bg-card);
        }
        .status-dot.active { background: var(--success); }
        .status-dot.busy { background: var(--warning); }
        .status-dot.offline { background: var(--text-muted); }
        
        .status-badge-container { text-align: right; }
        .status-label { display: block; font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.25rem; }
        .status-badge { 
           display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 4px;
           background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
        }
        .status-badge.active { color: var(--success); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
        .status-badge.busy { color: var(--warning); background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
        
        .card-info h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; }
        .vehicle-detail { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .stat-box { background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05); }
        .stat-label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.25rem; font-weight: 600; }
        .stat-value { font-size: 1.1rem; font-weight: 700; color: white; }
        
        .assign-btn { 
           width: 100%; padding: 0.75rem; background: transparent; border: 1px solid rgba(255,255,255,0.1);
           border-radius: var(--radius-sm); color: white; font-weight: 600; cursor: pointer;
           display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: var(--transition);
        }
        .assign-btn:hover { background: var(--bg-main); border-color: var(--primary); color: var(--primary); }

        /* Pagination Footer */
        .pagination-footer { 
           height: 60px; border-top: 1px solid var(--border-color);
           display: flex; align-items: center; justify-content: space-between; padding: 0 2rem;
           background: var(--bg-card); flex-shrink: 0;
        }
        .page-btn { 
           width: 32px; height: 32px; align-items: center; justify-content: center;
           background: transparent; border: none; color: var(--text-muted); cursor: pointer; border-radius: 4px;
        }
        .page-btn:hover, .page-btn.active { background: rgba(255,255,255,0.1); color: white; }

        /* List View */
        .list-view { width: 100%; overflow: hidden; }
        .list-view table { width: 100%; border-collapse: collapse; }
        .list-view th, .list-view td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
        .list-view th { color: var(--text-muted); font-weight: 600; font-size: 0.85rem; white-space: nowrap; }
.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-main);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--primary);
  margin: 0 8px; /* space outside */
}
        /* Close Button in form */
        .close-btn { 
           background: transparent; border: none; color: var(--text-muted); cursor: pointer; 
           padding: 0.5rem; border-radius: 50%; transition: color 0.2s;
        }
        .close-btn:hover { color: white; background: rgba(255,255,255,0.1); }
        
        .view-toggle { display: flex; background: var(--bg-card); padding: 4px; border-radius: 6px; border: 1px solid var(--border-color); }
        .view-toggle button {
             display: flex; align-items: center; gap: 6px; padding: 6px 12px;
             border: none; background: transparent; color: var(--text-muted);
             font-size: 0.75rem; font-weight: 600; border-radius: 4px; cursor: pointer;
        }
        .view-toggle button.active { background: var(--bg-sidebar); color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        
        .edit-driver-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          color: #ffffff;
          borderRadius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 6px;
          fontSize: 0.85rem;
          font-weight: 500;
        }
        .edit-driver-btn:hover {
          background: #1f1f1f;
          border-color: #ffffff;
          transform: translateY(-2px);
        }
        .edit-driver-btn:active {
          transform: scale(0.95);
        }

        /* --- RESPONSIVE CSS --- */
        @media (max-width: 1024px) {
          .page-header {
            padding: 0 1rem;
          }
          .search-container {
            min-width: 200px;
          }
          .drivers-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
          .list-view {
            overflow: visible;
          }
          .list-view table, .list-view thead, .list-view tbody, .list-view th, .list-view td, .list-view tr {
            display: block;
          }
          .list-view thead tr {
            display: none;
          }
          .list-view tr {
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            margin-bottom: 1rem;
            background: rgba(255, 255, 255, 0.02);
            padding: 0.5rem;
          }
          .list-view td {
            border: none;
            padding: 0.75rem 1rem !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
          }
          .list-view td::before {
            content: attr(data-label);
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
            margin-right: 1rem;
            text-align: left;
            flex-shrink: 0;
            margin-top: 0.25rem;
          }
          .list-view td[data-label="Driver Info"]::before,
          .list-view td[data-label="Contact"]::before {
            display: none;
          }

          .list-view td > div {
            text-align: right;
            flex: 1;
            word-break: break-word;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .driver-info-cell {
            flex-direction: column !important;
            text-align: center !important;
          }
          .contact-cell {
            align-items: center !important;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            height: auto;
            padding: 1rem;
            gap: 1rem;
            align-items: stretch;
          }
          .header-left, .header-right {
            width: 100%;
            justify-content: space-between;
          }
          .header-right {
            justify-content: flex-end;
          }
          .search-container {
            min-width: auto;
            flex: 1;
          }
          .sub-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          .form-wrapper {
            padding: 1.5rem;
          }
          .content-body {
            padding: 1rem;
          }
          .drivers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Drivers;
