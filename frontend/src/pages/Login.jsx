import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, LayoutPanelLeft } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoginTab, setIsLoginTab] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(formData.email, formData.password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check credentials.",
      );
    }
  };

  return (
    <div className="login-container">
      <div className="login-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-wrapper"
      >
        <div className="brand-header">
          <div className="logo-icon">
            <LayoutPanelLeft size={32} color="#fff" />
          </div>
          <h1 className="brand-title">Route Optimization</h1>
          <p className="brand-subtitle">Enterprise Logistics Management</p>
        </div>

        <div className="login-card">
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
              <div className="label-row">
                <label>PASSWORD</label>
                <Link to="#" className="forgot-link">
                  FORGOT PASSWORD?
                </Link>
              </div>
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

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark" />
                Keep me signed in
              </label>
            </div>

            <button type="submit" className="login-submit-btn">
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </motion.div>

      <style>{`
        .login-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background-color: #0c0d10;
          color: #fff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, #1a2333 0%, #0c0d10 70%);
          z-index: 1;
        }

        .login-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .brand-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-icon {
          width: 56px;
          height: 56px;
          background: #1e2533;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .brand-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #fff;
          letter-spacing: -0.025em;
        }

        .brand-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          letter-spacing: 0.05em;
          text-transform: none;
        }

        .login-card {
          width: 100%;
          background: #14171c;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .tab-switcher {
          display: flex;
          background: #1e2229;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .tab-btn {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-group label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.1em;
        }

        .forgot-link {
          color: #2563eb;
          font-size: 0.65rem;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: 0.025em;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .input-group input {
          width: 100%;
          background: #0c0d10;
          border: 1px solid #2d333d;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          color: #fff;
          font-size: 0.95rem;
          transition: border-color 0.2s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 1px #2563eb;
        }

        .password-input-wrapper {
          position: relative;
        }

        .show-password-btn {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.5rem;
        }

        .show-password-btn:hover {
          color: #94a3b8;
        }

        .form-options {
          display: flex;
          align-items: center;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: #94a3b8;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-container input {
          display: none;
        }

        .checkmark {
          width: 18px;
          height: 18px;
          border: 1px solid #2d333d;
          border-radius: 5px;
          background: #0c0d10;
          position: relative;
          transition: all 0.2s;
        }

        .checkbox-container:hover .checkmark {
          border-color: #3b82f6;
        }

        .checkbox-container input:checked + .checkmark {
          background: #2563eb;
          border-color: #2563eb;
        }

        .checkbox-container input:checked + .checkmark:after {
          content: "";
          position: absolute;
          left: 6px;
          top: 3px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .login-submit-btn {
          width: 100%;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          margin-top: 0.5rem;
        }

        .login-submit-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
        }

        .login-submit-btn:active {
          transform: translateY(0);
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          text-align: center;
        }

        /* --- RESPONSIVE CSS --- */
        @media (max-width: 480px) {
          .login-wrapper {
            padding: 1rem;
          }
          .brand-title {
            font-size: 1.5rem;
          }
          .brand-header {
            margin-bottom: 1.5rem;
          }
          .login-card {
            padding: 1.25rem;
            border-radius: 14px;
          }
          .input-group input {
            padding: 0.75rem 0.85rem;
            font-size: 0.9rem;
          }
          .login-submit-btn {
            padding: 0.85rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
