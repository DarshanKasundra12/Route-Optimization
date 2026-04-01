import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  LayoutPanelLeft,
  Box,
  ShieldCheck,
  Zap,
} from "lucide-react";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "deliveryboy",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoginTab, setIsLoginTab] = useState(false); // Register tab active
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
      );
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check your inputs.",
      );
    }
  };

  return (
    <div className="split-auth-container">
      {/* Left Side: Branding & Info */}
      <div className="auth-hero-section">
        <div className="hero-gradient-orb" />
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-brand"
          >
            <div className="hero-logo">
              <LayoutPanelLeft size={48} color="#fff" />
            </div>
            <h1 className="hero-title">
              Join the
              <br />
              Force
            </h1>
            <p className="hero-subtitle">
              Scale your delivery business with the world's most advanced route
              optimization engine.
            </p>
          </motion.div>

          <div className="hero-features">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="feature-item"
            >
              <div className="feature-icon">
                <Zap size={20} />
              </div>
              <div className="feature-text">
                <h3>Rapid Onboarding</h3>
                <p>Get your delivery team running in minutes.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="feature-item"
            >
              <div className="feature-icon">
                <Box size={20} />
              </div>
              <div className="feature-text">
                <h3>Flexible Assignments</h3>
                <p>Dynamically re-route parcels on the fly.</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="feature-item"
            >
              <div className="feature-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="feature-text">
                <h3>Live Analytics</h3>
                <p>Insights that help you save fuel and time.</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="hero-footer">
          <p>© 2026 Route Optimization Inc. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="auth-form-section">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="form-wrapper"
        >
          <div className="mobile-brand-header">
            <LayoutPanelLeft size={32} />
            <h2>Route Optimization</h2>
          </div>

          <div className="auth-card">
            <div className="tab-switcher">
              <button
                className={`tab-btn ${isLoginTab ? "active" : ""}`}
                onClick={() => {
                  setIsLoginTab(true);
                  navigate("/login");
                }}
              >
                Login
              </button>
              <button
                className={`tab-btn ${!isLoginTab ? "active" : ""}`}
                onClick={() => {
                  setIsLoginTab(false);
                  navigate("/register");
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <h2 className="form-greeting">Create Account</h2>
              <p className="form-subtext">Start your journey with us today.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="error-alert"
                >
                  {error}
                </motion.div>
              )}

              <div className="input-group">
                <label>FULL NAME</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="input-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="input-group">
                <label>PASSWORD</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="show-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>SELECT ROLE</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="custom-select"
                >
                  <option value="deliveryboy">Delivery Boy</option>
                  {/* <option value="admin">Admin</option> */}
                </select>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                style={{ marginTop: "1rem" }}
              >
                Register for Dashboard
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <style>{`
        .split-auth-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          background-color: #0c0d10;
          color: #fff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Hero Section (Left) */
        .auth-hero-section {
          flex: 1.2;
          position: relative;
          background: #0f172a;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 4rem;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 1024px) {
          .auth-hero-section { display: none; }
          .auth-form-section { flex: 1; }
        }

        .hero-gradient-orb {
          position: absolute;
          top: -20%;
          left: -10%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
          filter: blur(80px);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 600px;
        }

        .hero-logo {
          width: 80px;
          height: 80px;
          background: #1e293b;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.04em;
          background: linear-gradient(to bottom right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 3.5rem;
        }

        .hero-features {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .feature-item {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .feature-text h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #f1f5f9;
        }

        .feature-text p {
          font-size: 0.875rem;
          color: #64748b;
        }

        .hero-footer {
          position: absolute;
          bottom: 3rem;
          left: 4rem;
          color: #475569;
          font-size: 0.875rem;
        }

        /* Form Section (Right) */
        .auth-form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #0c0d10;
        }

        .form-wrapper {
          width: 100%;
          max-width: 440px;
        }

        .mobile-brand-header {
          display: none;
          text-align: center;
          margin-bottom: 2rem;
        }
        
        @media (max-width: 1024px) {
          .mobile-brand-header { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .mobile-brand-header h2 { font-size: 1.5rem; font-weight: 700; }
        }

        .auth-card {
          background: #14171c;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .tab-switcher {
          display: flex;
          background: #1e2229;
          padding: 5px;
          border-radius: 14px;
          margin-bottom: 2.5rem;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tab-btn.active {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-greeting {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .form-subtext {
          color: #94a3b8;
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .input-group input, .custom-select {
          width: 100%;
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 1rem;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s;
          outline: none;
        }

        .input-group input:focus, .custom-select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .custom-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
          cursor: pointer;
        }

        .custom-select option {
          background-color: #0c0d10;
          color: #fff;
        }

        .password-input-wrapper { position: relative; }

        .show-password-btn {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
        }

        .login-submit-btn {
          width: 100%;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 1.1rem;
          font-weight: 700;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.3);
          margin-top: 1rem;
        }

        .login-submit-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(37, 99, 235, 0.4);
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          text-align: center;
        }

        @media (max-width: 480px) {
          .form-wrapper { padding: 0.5rem; }
          .auth-card { padding: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

export default Register;
