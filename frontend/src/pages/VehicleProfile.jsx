import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Save, AlertCircle } from "lucide-react";
import { driverService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const VehicleProfile = () => {
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "VAN",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchDriverProfile();
  }, [user]);

  const fetchDriverProfile = async () => {
    try {
      const userId = user._id || user.id;
      const res = await driverService.getAll({ user: userId });
      const myDriver = res.data.data?.[0];

      if (!myDriver) {
        // Fallback: try matching by email
        const allRes = await driverService.getAll();
        const fallback = allRes.data.data.find((d) => d.email === user.email);
        if (fallback) {
          setDriverProfile(fallback);
          setFormData({
            vehicleNumber:
              fallback.vehicleNumber === "PENDING"
                ? ""
                : fallback.vehicleNumber,
            vehicleType: fallback.vehicleType,
            phone: fallback.phone === "0000000000" ? "" : fallback.phone,
          });
        }
      } else {
        setDriverProfile(myDriver);
        setFormData({
          vehicleNumber:
            myDriver.vehicleNumber === "PENDING" ? "" : myDriver.vehicleNumber,
          vehicleType: myDriver.vehicleType,
          phone: myDriver.phone === "0000000000" ? "" : myDriver.phone,
        });
      }
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driverProfile) return;

    try {
      await driverService.update(driverProfile._id, {
        vehicleNumber: formData.vehicleNumber,
        vehicleType: formData.vehicleType,
        phone: formData.phone,
      });
      setMessage({
        type: "success",
        text: "Vehicle information updated successfully!",
      });
      fetchDriverProfile();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Error updating information",
      });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">Loading profile...</div>
    );
  }

  if (!driverProfile) {
    return (
      <div className="p-8 text-center text-red-400">
        <AlertCircle className="mx-auto mb-2" />
        Driver profile not found. Please contact admin.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="profile-page"
    >
      <header className="page-header">
        <div>
          <h1>My Vehicle & Profile</h1>
          <p>Manage your delivery vehicle information</p>
        </div>
      </header>

      <div className="form-container glass-card max-w-2xl">
        <form onSubmit={handleSubmit} className="premium-form">
          <h2>Vehicle Information</h2>

          {message.text && (
            <div className={`message-box ${message.type}`}>{message.text}</div>
          )}

          <div className="form-grid-single">
            <div className="form-group">
              <label>
                <Truck size={14} /> Vehicle Number
              </label>
              <input
                type="text"
                name="vehicleNumber"
                placeholder="e.g. GJ-01-AB-1234"
                value={formData.vehicleNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Truck size={14} /> Vehicle Type
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
              >
                <option value="BIKE">BIKE</option>
                <option value="VAN">VAN</option>
                <option value="TRUCK">TRUCK</option>
              </select>
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="tel"
                name="phone"
                placeholder="Your contact number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> Update Information
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .profile-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: center; /* Center the form */
        }
        .page-header {
          width: 100%;
        }
        .max-w-2xl {
          width: 100%;
          max-width: 600px;
        }
        .message-box {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .message-box.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .message-box.error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-grid-single {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
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
        input,
        select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          color: white;
          outline: none;
        }
        select option {
          background: var(--bg-card);
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        /* --- RESPONSIVE CSS --- */
        @media (max-width: 768px) {
          .form-container {
            padding: 1.25rem;
          }
          .form-actions {
            justify-content: stretch;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default VehicleProfile;
