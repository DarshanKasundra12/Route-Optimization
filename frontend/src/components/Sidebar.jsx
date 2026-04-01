import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Package,
  Map as MapIcon,
  Navigation,
  Truck,
  Warehouse,
  Users as UsersIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";

import { driverService } from "../services/api";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = React.useState(null);
  const [loadingStatus, setLoadingStatus] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === "deliveryboy") {
      fetchDriverInfo();
    }
  }, [user]);

  const fetchDriverInfo = async () => {
    try {
      const userId = user._id || user.id;
      console.log("Fetching driver info for user:", userId);
      const res = await driverService.getAll({ user: userId });
      if (res.data.data && res.data.data.length > 0) {
        setDriverInfo(res.data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  const handleDutyToggle = async () => {
    if (!driverInfo) return;

    try {
      setLoadingStatus(true);
      const res = await driverService.toggleDuty(driverInfo._id);

      // Update local state
      setDriverInfo((prev) => ({
        ...prev,
        onDuty: res.data.data.onDuty,
        isAvailable: res.data.data.isAvailable,
      }));
    } catch (error) {
      console.error("Error toggling duty:", error);
      alert("Failed to update status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const allMenuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/",
      roles: ["admin", "deliveryboy"],
    },
    {
      name: "Parcels",
      icon: <Package size={20} />,
      path: "/parcels",
      roles: ["admin", "deliveryboy"],
    },
    {
      name: "Route Optimization",
      icon: <Navigation size={20} />,
      path: "/optimize",
      roles: ["admin"],
    },
    {
      name: "Distributor",
      icon: <Truck size={20} />,
      path: "/distributor",
      roles: ["admin"],
    },
    {
      name: "Live Tracking",
      icon: <MapIcon size={20} />,
      path: "/tracking",
      roles: ["admin"],
    },
    {
      name: "Optimized Route",
      icon: <Navigation size={20} />,
      path: "/my-route",
      roles: ["deliveryboy"],
    },
    {
      name: "Drivers",
      icon: <Truck size={20} />,
      path: "/drivers",
      roles: ["admin"],
    },
    {
      name: "Warehouses",
      icon: <Warehouse size={20} />,
      path: "/warehouses",
      roles: ["admin"],
    },
    {
      name: "Manage Users",
      icon: <UsersIcon size={20} />,
      path: "/users",
      roles: ["admin"],
    },
    {
      name: "Manage Routes",
      icon: <Navigation size={20} />,
      path: "/manage-routes",
      roles: ["admin", "deliveryboy"],
    },
    {
      name: "My Vehicle",
      icon: <Truck size={20} />,
      path: "/profile",
      roles: ["deliveryboy"],
    },
  ];

  const menuItems = allMenuItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-container">
          <Link to="/" className="sidebar-brand-link">
            <img src="/BrowserLogo.png" alt="Logo" className="logo-img" />
          </Link>
        </div>
      </div>
      <Link to="/" className="sidebar-brand-link">
        <h1 className="logo-name">Route Optimization</h1>
      </Link>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            end={item.path === "/"}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
            <ChevronRight className="nav-arrow" size={14} />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user?.role === "deliveryboy" && driverInfo && (
          <div className="duty-toggle-container">
            {/* <button
              className={`duty-btn ${driverInfo.onDuty ? "stop-btn" : "start-btn"}`}
              onClick={handleDutyToggle}
              disabled={loadingStatus}
            >
              {loadingStatus ? (
                <span className="loading-dots">Updating...</span>
              ) : (
                <>
                  {driverInfo.onDuty ? (
                    <LogOut size={16} className="rotate-180" />
                  ) : (
                    <UsersIcon size={16} />
                  )}
                  {driverInfo.onDuty ? "Stop Duty" : "Start Duty"}
                </>
              )}
            </button> */}
          </div>
        )}

        <div className="user-profile">
          <div className="user-avatar">{user?.name?.charAt(0) || "U"}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-role">{user?.role || "Guest"}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-brand-link {
          text-decoration: none;
          display: block;
        }

        .sidebar-logo {
          padding: 2rem 2rem 0.5rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .logo-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .logo-img {
          width: 200px;
          height: auto;
          max-height: 120px;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .logo-name {
          font-size: 1.25rem;
          color: var(--text-main);
          font-weight: 700;
          letter-spacing: 0.5px;
          text-align: center;
          margin: 0rem 1rem 2rem 1rem;
          text-shadow: 0 12px 9px rgb(255 255 255 / 55%);
        }

        .sidebar-logo span {
          color: var(--primary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          transition: var(--transition);
          position: relative;
        }

        .nav-item:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          color: black;
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .nav-icon {
          margin-right: 1rem;
          display: flex;
          align-items: center;
        }

        .nav-text {
          flex: 1;
          font-weight: 500;
        }

        .nav-arrow {
          opacity: 0;
          transition: var(--transition);
        }

        .nav-item:hover .nav-arrow {
          opacity: 1;
          transform: translateX(4px);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .duty-toggle-container {
          width: 100%;
        }

        .duty-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .start-btn {
          background: var(--secondary);
          color: var(--primary);
        }
        .start-btn:hover {
          background: var(--primary); /* emerald-600 */
          color: var(--secondary);
        }

        .stop-btn {
          background: var(--primary);
          color: var(--secondary);
        }
        .stop-btn:hover {
          background: var(--secondary); /* red-600 */
          color: var(--primary);
        }

        .duty-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .rotate-180 {
          transform: rotate(180deg);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--secondary);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          margin-left: auto;
          border-radius: 4px;
          transition: var(--transition);
          margin-top: auto;
        }

        .logout-btn:hover {
          color: var(--danger);
          background: rgba(220, 38, 38, 0.1);
        }

        /* --- RESPONSIVE SIDEBAR --- */
        @media (max-width: 1024px) {
          .sidebar {
            width: 80px;
            padding: 0;
          }
          .logo-name, .nav-text, .nav-arrow, .user-info, .duty-btn span {
            display: none;
          }
          .sidebar-logo {
            padding: 1.5rem 0;
          }
          .logo-img {
            max-width: 45px;
          }
          .sidebar-nav {
            padding: 0 0.5rem;
            align-items: center;
          }
          .nav-item {
            width: 50px;
            height: 50px;
            justify-content: center;
            padding: 0;
            margin: 0 auto;
          }
          .nav-icon {
            margin-right: 0;
          }
          .sidebar-footer {
            padding: 1rem 0.5rem;
            align-items: center;
          }
          .user-profile {
            flex-direction: column;
            gap: 0.5rem;
          }
          .user-avatar {
            width: 36px;
            height: 36px;
          }
          .logout-btn {
            margin-left: 0;
            margin-top: 0.25rem;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: 70px;
            bottom: 0;
            top: auto;
            flex-direction: row;
            border-right: none;
            border-top: 1px solid var(--border-color);
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            z-index: 1000;
          }
          .sidebar-logo, .sidebar-footer {
            display: none;
          }
          .sidebar-nav {
            flex-direction: row;
            width: 100%;
            padding: 0;
            height: 100%;
            align-items: center;
            justify-content: space-around;
            overflow-x: auto;
          }
          .nav-item {
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            padding: 0 0.5rem;
            flex: 1;
            height: 100%;
            border-radius: 0;
            position: relative;
          }
          .nav-item.active {
            box-shadow: none;
            background: transparent;
            color: var(--primary);
          }
          .nav-item.active::after {
            content: '';
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            background: var(--primary);
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
          }
          .nav-icon {
            margin-right: 0;
          }
          .nav-text {
            display: block;
            font-size: 0.65rem;
            text-align: center;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
