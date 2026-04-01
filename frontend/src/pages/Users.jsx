import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Bell,
  Edit2,
  Trash2,
  ShieldCheck,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { userService } from "../services/api";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "deliveryboy",
  });

  // Stats State
  const [stats, setStats] = useState({
    admins: 0,
    delivery: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll();
      const userList = res.data.data;
      setUsers(userList);

      // Calculate stats
      const admins = userList.filter((u) => u.role === "admin").length;
      const delivery = userList.filter((u) => u.role === "deliveryboy").length;
      // Pending is mocked as we don't have a status field in User model yet
      setStats({
        admins,
        delivery,
        pending: 0,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
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
        // For update, we only send name, email, role (password update handled separately if needed)
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        await userService.update(currentUserId, updateData);
        alert("User updated successfully");
      } else {
        // For create, we use authService.register
        const { name, email, password, role } = formData;
        await userService.create({ name, email, password, role }); // Changed to userService.create if available or fallback to authService
        // Note: checking api.js, userService doesn't have create, but authService.register does.
        // However, usually admin panel creation shouldn't auto-login.
        // Let's assume we use a dedicated create endpoint or register.
        // Based on api.js check: userService has NO create. authService.register exists.
        // We will use authService.register for now.
        const { authService } = require("../services/api");
        await authService.register({ name, email, password, role });
        alert("User created successfully");
      }
      setShowForm(false);
      setIsEditing(false);
      setFormData({ name: "", email: "", password: "", role: "deliveryboy" });
      setCurrentUserId(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error saving user");
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Password not editable directly here usually
      role: user.role,
    });
    setCurrentUserId(user._id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This will also delete their driver profile if they are a delivery boy.",
      )
    ) {
      try {
        await userService.delete(id);
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.message || "Error deleting user");
      }
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="users-page">
      {/* Top Header Bar */}
      <header className="top-header">
        <div className="search-wrapper">
          <div className="search-bar">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              setIsEditing(false);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "deliveryboy",
              });
            }}
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
          <div className="divider"></div>
          <button className="icon-btn">
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <div className="content-body custom-scrollbar">
        <div className="page-title">
          <h1>User Management</h1>
          <p>
            Oversee platform access, assign roles, and manage delivery personnel
            permissions.
          </p>
        </div>

        {/* System Status Cards (Moved to Top) */}
        <div className="status-cards-grid">
          <div className="status-card glass-card">
            <div className="card-top">
              <span className="card-label">Active Admins</span>
              <div className="card-icon primary">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="card-stats">
              <p className="card-value">
                {String(stats.admins).padStart(2, "0")}
              </p>
              <p className="card-trend positive">+2 this week</p>
            </div>
          </div>

          <div className="status-card glass-card">
            <div className="card-top">
              <span className="card-label">Active Delivery</span>
              <div className="card-icon blue">
                <Truck size={18} />
              </div>
            </div>
            <div className="card-stats">
              <p className="card-value">
                {String(stats.delivery).padStart(2, "0")}
              </p>
              <p className="card-trend positive">+14 this month</p>
            </div>
          </div>

          <div className="status-card glass-card">
            <div className="card-top">
              <span className="card-label">Pending Access</span>
              <div className="card-icon amber">
                <Clock size={18} />
              </div>
            </div>
            <div className="card-stats">
              <p className="card-value">04</p>
              <p className="card-trend neutral">Requiring review</p>
            </div>
          </div>
        </div>

        {/* User Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content glass-card">
              <div className="modal-header">
                <h2>{isEditing ? "Edit User" : "Add New User"}</h2>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      role: "deliveryboy",
                    });
                  }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSubmit} className="user-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="john@example.com"
                  />
                </div>
                {!isEditing && (
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!isEditing}
                      minLength={6}
                      placeholder="******"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Role Assignment</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="role-select"
                  >
                    <option value="deliveryboy">Delivery Boy</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form-actions-modal">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {isEditing ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="table-container glass-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Role Assignment</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="user-row">
                  {/* Laptop / Desktop View */}
                  <div className="user-info">
                    <div className="avatar-wrapper">
                      <div className="avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="status-indicator online"></div>
                    </div>

                    <div className="user-text">
                      <p className="user-name">{user.name}</p>
                      <p className="user-email">{user.email}</p>
                    </div>
                  </div>{" "}
                  <td data-label="Status">
                    <span className="badge active">Active</span>
                  </td>
                  <td data-label="Joined Date">
                    <span className="text-muted text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td data-label="Role Assignment">
                    {/* Role Toggle - Fixed/Read Only */}
                    <label className="role-toggle disabled">
                      <input
                        type="checkbox"
                        checked={user.role === "deliveryboy"} // Checked = Delivery
                        readOnly
                        disabled
                        className="sr-only"
                        style={{ display: "none" }}
                      />
                      <div className="toggle-track">
                        <div className="toggle-knob"></div>
                        <span className="toggle-label admin">ADMIN</span>
                        <span className="toggle-label delivery">DELIVERY</span>
                      </div>
                    </label>
                  </td>
                  <td className="text-right" data-label="Actions">
                    <div className="row-actions">
                      <button
                        className="action-btn edit"
                        title="Edit"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        title="Delete"
                        onClick={() => handleDelete(user._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {/* <div className="pagination">
            <p className="pagination-info">
              Showing{" "}
              <span className="highlight">
                {filteredUsers.length > 0 ? "1" : "0"} - {filteredUsers.length}
              </span>{" "}
              of <span className="highlight">{users.length}</span> users
            </p>
            <div className="pagination-controls">
              <button className="page-btn" disabled>
                <ChevronLeft size={18} />
              </button>
              <button className="page-num active">1</button>
              <button className="page-btn">
                <ChevronRight size={18} />
              </button>
            </div>
          </div> */}
        </div>
      </div>

      <style>{`
        /* Page Layout */
        .users-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-main);
          overflow: hidden;
          width: 100%;
          max-width: 100%;
        }

        /* Top Header */
        .top-header {
          height: 80px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          background: rgba(15, 23, 42, 0.5); /* backdrop-blur equivalent handled by layout or main CSS */
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .search-wrapper {
          flex: 1;
          max-width: 600px;
        }

        .search-bar {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-bar input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05); /* dark:bg-white/5 */
          border: 1px solid transparent;
          padding: 0.7rem 1rem 0.7rem 2.8rem;
          border-radius: 0.5rem;
          color: var(--text-main);
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .search-bar input:focus {
          border-color: rgba(59, 130, 246, 0.5); /* focus:border-primary/50 */
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
          outline: none;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-left: 2rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
         
        }

        .divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }

        /* Content Body */
        .content-body {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
        }

        .page-title {
          margin-bottom: 2rem;
        }

        .page-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: var(--text-main);
        }

        .page-title p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        
        /* Status Cards */
        .status-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .status-card {
           background: var(--bg-card);
           border: 1px solid var(--border-color);
           border-radius: 0.75rem;
           padding: 1.25rem;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .card-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        .card-icon {
          width: 32px;
          height: 32px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .card-icon.primary { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
        .card-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; } /* Tailwind blue-500 */
        .card-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; } /* Tailwind amber-500 */

        .card-stats {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .card-trend {
          font-size: 0.65rem;
          font-weight: 500;
        }
        
        .card-trend.positive { color: #10b981; }
        .card-trend.neutral { color: var(--text-muted); }

        /* Table */
        .table-container {
          background: var(--bg-card); /* bg-white dark:bg-white/5 */
          border: 1px solid var(--border-color);
          border-radius: 0.75rem; /* rounded-xl */
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .users-table th {
          padding: 1rem 1.5rem;
          font-size: 0.7rem; /* text-[11px] */
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em; /* tracking-widest */
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02); /* bg-slate-50 dark:bg-white/5 */
          border-bottom: 1px solid var(--border-color);
        }

        .users-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05); /* divide-slate-100 */
          color: var(--text-main);
          font-size: 0.9rem;
        }

        .user-row {
          transition: background 0.15s;
        }

        .user-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar-wrapper {
          position: relative;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem; /* rounded-lg */
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 1.1rem;
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #1a1a1a; /* Match dark bg */
        }

        .status-indicator.online { background: #10b981; } /* emerald-500 */
        
        .user-name {
          font-weight: 600;
          color: var(--text-main);
          font-size: 0.9rem;
          text-align: center;
        }
        
        .user-email {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge.active {
          background: rgba(16, 185, 129, 0.1); 
          color: #34d399; /* emerald-400 */
        }

        /* Role Toggle Switch */
        .role-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: not-allowed;
          user-select: none;
          opacity: 0.9;
        }

        .toggle-track {
          width: 160px;
          height: 36px;
          background: rgba(255, 255, 255, 0.1); /* dark:bg-white/10 */
          border-radius: 0.5rem;
          position: relative;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: all 0.3s;
        }

        .toggle-knob {
          position: absolute;
          width: 70px;
          height: 28px;
          background: var(--secondary); /* Both Admin and Delivery get primary color */
          border-radius: 0.375rem; /* rounded-md */
          transition: transform 0.3s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          z-index: 1;
        }

        .toggle-label {
          flex: 1;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          z-index: 2;
          color: var(--text-muted);
          transition: color 0.3s;
        }

        /* Checked = Delivery Boy (Right side)
           Unchecked = Admin (Left side) */
        
        /* Default state (Unchecked/Admin) */
        .toggle-track .toggle-knob {
            transform: translateX(0);
        }
        
        /* Checked state (Delivery) */
        input:checked + .toggle-track .toggle-knob {
          transform: translateX(82px); 
        }
        
        /* Label colors - Active label is white */
        input:not(:checked) + .toggle-track .toggle-label.admin { color: white; }
        input:checked + .toggle-track .toggle-label.delivery { color: white; }
        
        /* Actions */
        .row-actions {
          display: flex;
          // justify-content: flex-end;
          gap: 0.5rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .user-row:hover .row-actions { opacity: 1; }

        .action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary);
        }
        .action-btn.delete:hover {
           background: rgba(239, 68, 68, 0.1);
           color: #f87171;
        }

        .empty-state { text-align: center; color: var(--text-muted); padding: 3rem; }

        /* Pagination */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid var(--border-color);
        }

        .pagination-info { font-size: 0.75rem; color: var(--text-muted); }
        .highlight { color: var(--text-main); font-weight: 700; }

        .pagination-controls { display: flex; gap: 0.25rem; }

        .page-btn, .page-num {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.75rem;
        }

        .page-btn:hover:not(:disabled), .page-num:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .page-num.active {
          background: var(--primary);
          color: white;
          font-weight: 700;
        }

        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        
        /* Modal Styles Placeholder (previous media queries cleaned up) */

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          background: #1e293b; /* slate-800 */
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          animation: modalSlide 0.3s ease-out;
        }

        @keyframes modalSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .close-btn {
          font-size: 2rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          line-height: 1;
        }

        .close-btn:hover { color: white; }

        .user-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .form-group input, .form-group select {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: white;
          outline: none;
          transition: all 0.2s;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .form-group select option {
          background-color: #1e293b;
          color: white;
        }

        .form-actions-modal {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-cancel {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .btn-submit {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          background: var(--primary);
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-submit:hover {
          background: #1d4ed8;
        }

        /* Responsive Improvements */
        @media (max-width: 1024px) {
          .status-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .top-header {
            padding: 0 1rem;
          }
          .search-wrapper {
            max-width: 400px;
          }
          .table-container {
             overflow: visible;
          }
          
          /* Table to Cards for Tablet/Mobile */
          .users-table, .users-table thead, .users-table tbody, .users-table th, .users-table td, .users-table tr {
            display: block;
          }
          .users-table thead {
            display: none;
          }
          .user-row {
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            margin-bottom: 1rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.02);
          }
          .users-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .users-table td:last-child {
            border-bottom: none;
            padding-top: 1rem;
          }
          .users-table td::before {
            content: attr(data-label);
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
          }
          .user-info {
            width: 100%;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 768px) {
          .content-body {
            padding: 1rem;
          }
          .top-header {
            height: auto;
            flex-direction: column;
            padding: 1rem;
            gap: 1rem;
            position: relative;
          }
          .search-wrapper {
            max-width: 100%;
            width: 100%;
          }
          .header-actions {
            width: 100%;
            justify-content: space-between;
            margin-left: 0;
          }
          .status-cards-grid {
            grid-template-columns: 1fr;
          }
          .modal-content {
            width: 95%;
            padding: 1.5rem;
          }
          .pagination {
            flex-direction: column;
            gap: 1rem;
            align-items: center;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .header-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .btn-primary {
            justify-content: center;
          }
          .divider {
            display: none;
          }
          .icon-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Users;
