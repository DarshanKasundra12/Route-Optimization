import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  TrendingUp,
  Clock,
  MapPin,
  AlertCircle,
  ArrowRight,
  // ArrowRight,
  Navigation2,
  CheckSquare,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  parcelService,
  routeService,
  warehouseService,
  driverService,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDeliveryBoy = user?.role === "deliveryboy";

  const [stats, setStats] = useState({
    totalParcels: 0,
    pendingParcels: 0,
    activeRoutes: 0,
    completedRoutes: 0,
  });
  const [recentParcels, setRecentParcels] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin specific state
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [allParcels, setAllParcels] = useState([]);

  // Delivery boy specific state
  const [myRoute, setMyRoute] = useState(null);
  const [myCompletedRoutes, setMyCompletedRoutes] = useState([]);
  const [myParcels, setMyParcels] = useState([]);
  const [hoveredParcelId, setHoveredParcelId] = useState(null);
  const [currentDriver, setCurrentDriver] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (isDeliveryBoy) {
        // Delivery boy: fetch their routes & parcels
        const [routesRes, parcelsRes, driversRes] = await Promise.all([
          routeService.getAll(),
          parcelService.getAll(),
          driverService.getAll(),
        ]);

        let routes = routesRes.data.data;
        let parcels = parcelsRes.data.data;
        const drivers = driversRes.data.data;

        let foundDriver = null;
        // Find current driver profile
        if (user) {
          foundDriver = drivers.find((d) => {
            const uId = typeof d.user === "object" ? d.user?._id : d.user;
            return uId === user._id || uId === user.id;
          });
          setCurrentDriver(foundDriver);

          if (foundDriver) {
            routes = routes.filter((r) => {
              const driverId = r.assignedDriver
                ? typeof r.assignedDriver === "object"
                  ? r.assignedDriver._id
                  : r.assignedDriver
                : typeof r.driver === "object"
                  ? r.driver?._id
                  : r.driver;
              return driverId === foundDriver._id;
            });

            const myRouteIds = routes.map((r) => r._id);
            parcels = parcels.filter((p) => {
              const routeId =
                typeof p.assignedRoute === "object"
                  ? p.assignedRoute?._id
                  : p.assignedRoute;
              return myRouteIds.includes(routeId);
            });
          } else {
            // If no driver profile found, likely not linked correctly
            routes = [];
            parcels = [];
          }
        }

        // Find active/assigned route
        const activeRoute = routes.find(
          (r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED",
        );

        if (activeRoute) {
          // Fetch full route details (with populated parcels)
          try {
            const fullRouteRes = await routeService.getById(activeRoute._id);
            const fullRoute = fullRouteRes.data.data;

            const routeParcels =
              fullRoute.parcels?.filter((p) => typeof p === "object") || [];

            const hasUndelivered = routeParcels.some(
              (parcel) => parcel.status !== "DELIVERED",
            );

            fullRoute.status = hasUndelivered ? "IN_PROGRESS" : "COMPLETED";
            setMyRoute(fullRoute);
            setWarehouse(fullRoute.warehouse);
            setMyParcels(routeParcels);
          } catch (err) {
            console.error("Error fetching full route:", err);
            setMyRoute(activeRoute);
            if (activeRoute.warehouse) setWarehouse(activeRoute.warehouse);
          }
        } else {
          setMyRoute(null);
          setMyParcels([]);
          // No active route - try to get warehouse from the most recent route
          if (routes.length > 0 && routes[0].warehouse) {
            setWarehouse(routes[0].warehouse);
          }
        }

        console.log("All parcels from API:", parcels);
        console.log("Driver ID:", foundDriver?._id);

        const completedRoutes = routes.filter((r) => r.status === "COMPLETED");
        setMyCompletedRoutes(completedRoutes);

        const total = parcels.length;

        const completed = parcels.filter(
          (p) => (p.status || "").toUpperCase() === "DELIVERED",
        ).length;
        console.log("Filtered driver parcels:", parcels);
        const pending = total - completed;

        setStats({
          totalParcels: total,
          pendingParcels: pending,
          activeRoutes: activeRoute ? 1 : 0,
          completedRoutes: completed,
        });

        setRecentParcels(parcels.slice(0, 5));
      } else {
        // Admin: original logic
        const [parcelsRes, routesRes, warehousesRes] = await Promise.all([
          parcelService.getAll(),
          routeService.getAll(),
          warehouseService.getAll(),
        ]);

        const parcels = parcelsRes.data.data;
        const routes = routesRes.data.data;
        const warehouses = warehousesRes.data.data;

        setStats({
          totalParcels: parcels.length,
          pendingParcels: parcels.filter(
            (p) => p.status === "ASSIGNED_TO_ROUTE" || p.status === "CREATED",
          ).length,
          activeRoutes: routes.filter(
            (r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED",
          ).length,
          completedRoutes: routes.filter((r) => r.status === "COMPLETED")
            .length,
        });

        setRecentParcels(parcels.slice(0, 5));
        setAllParcels(parcels);
        setAllWarehouses(warehouses);
        if (warehouses.length > 0) {
          setWarehouse(warehouses[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDuty = async () => {
    if (!currentDriver) return;
    try {
      // Assuming toggleDuty returns the updated driver in res.data.data
      const res = await driverService.toggleDuty(currentDriver._id);
      if (res.data?.data) {
        setCurrentDriver(res.data.data);
      } else {
        // Fallback if no data returned
        setCurrentDriver((prev) => ({ ...prev, onDuty: !prev.onDuty }));
      }
      // Optionally refresh dashboard data
      fetchDashboardData();
    } catch (err) {
      console.error("Error toggling duty:", err);
    }
  };

  const statCards = isDeliveryBoy
    ? [
        {
          label: "My Parcels",
          value: stats.totalParcels,
          icon: <Package />,
          color: "var(--primary)",
        },
        {
          label: "Pending Deliveries",
          value: stats.pendingParcels,
          icon: <AlertCircle />,
          color: "var(--warning)",
        },
        {
          label: "Active Routes",
          value: stats.activeRoutes,
          icon: <TrendingUp />,
          color: "var(--success)",
        },
        {
          label: "Completed",
          value: stats.completedRoutes,
          icon: <Clock />,
          color: "var(--info)",
        },
      ]
    : [
        {
          label: "Total Parcels",
          value: stats.totalParcels,
          icon: <Package />,
          color: "var(--primary)",
        },
        {
          label: "Pending Pickups",
          value: stats.pendingParcels,
          icon: <AlertCircle />,
          color: "var(--warning)",
        },
        {
          label: "Active Routes",
          value: stats.activeRoutes,
          icon: <TrendingUp />,
          color: "var(--success)",
        },
        {
          label: "Avg Travel Time",
          value: "24 min",
          icon: <Clock />,
          color: "var(--info)",
        },
      ];

  if (isDeliveryBoy) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="delivery-dashboard"
      >
        <header className="glass-card py-4 sm:h-20  border-b border-slate-700 flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-8 flex-shrink-0 z-10 sticky top-0 gap-4 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                My Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium hidden sm:block">
                Overview of today's logistics
              </p>
            </div>

            {/* Mobile Logout Button (Hidden on larger screens) */}
            <motion.button
              onClick={() => {
                if (logout) logout();
                navigate("/login");
              }}
              whileTap={{ scale: 0.95 }}
              className="sm:hidden flex items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
              title="Logout"
            >
              <LogOut size={20} />
            </motion.button>
          </div>

          <div className="flex flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
            <motion.button
              onClick={handleToggleDuty}
              whileHover={{
                scale: 1.05,
                boxShadow: currentDriver?.onDuty
                  ? "0 0 15px rgba(239, 68, 68, 0.5)"
                  : "0 0 15px rgba(34, 197, 94, 0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              className={`btn btn-primary ${
                currentDriver?.onDuty
                  ? "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30 border-red-400/20"
                  : "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/30 border-green-400/20"
              } text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all border whitespace-nowrap`}
            >
              <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>{currentDriver?.onDuty ? "Stop Duty" : "Start Duty"}</span>
            </motion.button>
            <motion.button
              onClick={() => navigate("/my-route")}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 20px rgba(59, 130, 246, 0.6)",
              }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
            >
              <Navigation2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>View My Route</span>
            </motion.button>
          </div>
        </header>
              
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "My Parcels",
                value: stats.totalParcels,
                icon: <Package size={28} />,
                color: "bg-blue-500",
              },
              {
                label: "Pending",
                value: stats.pendingParcels,
                icon: <AlertCircle size={28} />,
                color: "bg-amber-500",
              },
              {
                label: "Active Routes",
                value: stats.activeRoutes,
                icon: <TrendingUp size={28} />,
                color: "bg-emerald-500",
              },
              {
                label: "Completed",
                value: stats.completedRoutes,
                icon: <Clock size={28} />,
                color: "bg-cyan-500",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass-card p-6 rounded-2xl shadow-sm border border-slate-700/50 flex items-center gap-5 hover:shadow-blue-900/10 transition-all duration-300 group relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`}
                ></div>
                <div
                  className={`w-16 h-16 rounded-2xl ${stat.color} bg-opacity-20 text-${stat.color.replace("bg-", "")} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm`}
                >
                  <div className={`text-${stat.color.replace("bg-", "")}-400`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-4xl font-extrabold text-white tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                My Deliveries
              </h3>
              <motion.button
                whileHover={{ scale: 1.05, x: 5 }}
                onClick={() => navigate("/parcels")}
                className="text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-900/20 px-3 py-1.5 rounded-lg group"
              >
                View All{" "}
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {(myParcels.length > 0 ? myParcels : recentParcels)
                .slice(0, 4)
                .map((parcel, idx) => (
                  <motion.div
                    key={parcel._id || idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{
                      y: -5,
                      scale: 1.02,
                      boxShadow:
                        "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                    }}
                    className="glass-card p-5 rounded-2xl border border-slate-700 shadow-sm transition-all duration-300 group cursor-pointer relative overflow-hidden"
                    onMouseEnter={() => setHoveredParcelId(parcel._id)}
                    onMouseLeave={() => setHoveredParcelId(null)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-slate-700/30 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider shadow-sm ${
                          parcel.status === "DELIVERED"
                            ? "bg-green-900/40 text-green-300"
                            : parcel.status === "IN_TRANSIT"
                              ? "bg-blue-900/40 text-blue-300"
                              : "bg-amber-900/40 text-amber-300"
                        }`}
                      >
                        {parcel.status?.replace("_", " ") || "PENDING"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                        #{parcel.parcelId?.slice(-4).toUpperCase()}
                      </span>
                    </div>

                    <h4 className="font-bold text-white mb-1.5 text-lg group-hover:text-blue-400 transition-colors line-clamp-1">
                      {parcel.pickupLocationName || "Unknown Location"}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
                      <MapPin size={12} className="text-white" />
                      <span className="line-clamp-1">
                        {parcel.destinationPort}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-auto border-t border-slate-700/50 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-slate-400">
                          Stop
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.2, rotate: -45 }}
                        className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-400 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300"
                      >
                        <ArrowRight size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}

              <motion.div
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.98 }}
                className="glass-card p-5 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-full min-h-[160px] group"
                onClick={() => navigate("/parcels")}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 shadow-sm">
                  <Package
                    className="text-slate-400 transition-colors"
                    size={24}
                  />
                </div>
                <p className="font-bold text-slate-300 transition-colors">
                  View All Parcels
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Check full list & history
                </p>
              </motion.div>
            </div>
          </section>

          <section className="flex-1 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                Delivery Area
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-900/20 rounded-full border border-green-900/30 box-glow-green">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  Live Update
                </span>
              </div>
            </div>

            {myRoute ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-[550px] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700 relative map-container bg-slate-900"
              >
                <div className="w-full h-full relative z-0">
                  <MapView
                    warehouse={warehouse}
                    parcels={(myParcels.length > 0
                      ? myParcels
                      : recentParcels
                    ).filter(
                      (p) => (p.status || "").toUpperCase() !== "DELIVERED",
                    )}
                    highlightedParcelIds={myParcels
                      .filter(
                        (p) => (p.status || "").toUpperCase() !== "DELIVERED",
                      )
                      .map((p) => p._id)}
                    routePolyline={myRoute?.routePolyline || []}
                    returnRoutePolyline={myRoute?.returnRoutePolyline || []}
                    optimizedSequence={myRoute?.optimizedSequence || []}
                    activeParcelId={hoveredParcelId}
                    fitBoundsKey={myRoute?._id || "waiting"}
                  />
                </div>

                <div className="absolute top-5 left-5 bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-600 z-[1000] pointer-events-none flex items-center gap-2">
                  <Navigation2 size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-200">
                    Zone: {warehouse?.name || "Assigning..."}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card w-full h-[400px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckSquare size={40} className="text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  All Deliveries Completed!
                </h3>
                <p className="text-slate-400 max-w-md">
                  You have no active routes assigned. Great job on clearing your
                  queue! Check back later for new assignments.
                </p>
              </div>
            )}
          </section>

          {/* Route History Section */}
          {!myRoute && myCompletedRoutes.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                Route History
              </h3>
              <div className="glass-card rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-bold border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Route ID</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Stops</th>
                      <th className="px-6 py-4">Distance</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {myCompletedRoutes.map((route) => (
                      <tr
                        key={route._id}
                        className="hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                          #{route.routeId}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {new Date(route.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {route.parcels?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {(route.totalDistance / 1000).toFixed(1)} km
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-bold border border-green-900/50">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="dashboard-container"
    >
      <header className="dashboard-header">
        <div>
          <h1>Logistics Overview</h1>
          <p>Real-time optimization & route tracking dashboard</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/optimize")}
        >
          <TrendingUp size={18} />
          Optimize Now
        </button>
      </header>

      <section className="stats-grid">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -5 }}
            className="stat-card glass-card"
          >
            <div className="stat-icon" style={{ background: "black" }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="dashboard-grid">
        <div className="grid-left">
          <div className="content-card glass-card">
            <div className="card-header">
              <h2>Recent Pickups</h2>
              <button className="text-btn" onClick={() => navigate("/parcels")}>
                View All
              </button>
            </div>

            <div className="parcel-list">
              {recentParcels
                .filter((parcel) => parcel.status.toLowerCase() !== "delivered")
                .map((parcel) => (
                  <div
                    key={parcel._id}
                    className="parcel-item"
                    onMouseEnter={() => setHoveredParcelId(parcel._id)}
                    onMouseLeave={() => setHoveredParcelId(null)}
                  >
                    <div className="parcel-marker">
                      <MapPin size={16} />
                    </div>

                    <div className="parcel-details">
                      <span className="p-id">{parcel.parcelId}</span>
                      <span className="p-dest">
                        Port: {parcel.destinationPort}
                      </span>

                      <div className="hover-info">
                        <span>Pickup: {parcel.pickupLocationName}</span>
                        {warehouse && <span>Dest: {warehouse.name}</span>}
                      </div>
                    </div>

                    <div
                      className={`status-badge ${parcel.status.toLowerCase()}`}
                    >
                      {parcel.status}
                    </div>
                  </div>
                ))}

              {recentParcels.length === 0 && (
                <p className="empty-msg">No parcels found</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid-right">
          <div className="content-card glass-card map-card">
            <div className="card-header">
              <h2>Real Road Network</h2>
              <div className="live-indicator">
                <span className="dot"></span>
                Live Map
              </div>
            </div>
            <div className="map-preview">
              <MapView
                warehouses={allWarehouses}
                parcels={allParcels}
                activeParcelId={hoveredParcelId}
                fitBoundsKey={`${allWarehouses.length}-${allParcels.length}`}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .delivery-idx {
          width: 24px;
          height: 24px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: white;
        }

        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-header h1 {
          font-size: 2rem;
          margin-bottom: 0.25rem;
        }

        .dashboard-header p {
          color: var(--text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-info h3 {
          font-size: 1.5rem;
          margin-bottom: 0.15rem;
        }

        .stat-info p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.5rem;
        }

        .content-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: 100%;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h2 {
          font-size: 1.25rem;
        }

        .text-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
        }

        .parcel-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .parcel-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          gap: 1rem;
        }

        .parcel-marker {
          color: var(--primary);
        }

        .parcel-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .p-id {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .p-dest {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .status-badge.assigned_to_route {
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }

        .map-card {
          padding: 0;
          overflow: hidden;
        }

        .map-card .card-header {
          padding: 1.5rem;
        }

        .map-preview {
          flex: 1;
          min-height: 400px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--success);
        }

        .dot {
          width: 8px;
          height: 8px;
          background: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--success);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .empty-msg {
          text-align: center;
          color: var(--text-muted);
          padding: 2rem;
        }

        .parcel-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          background: var(--bg-card);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .parcel-item:hover {
          background: #0000002d;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55);
        }

        .parcel-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Hidden extra info */
        .hover-info {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.3s ease;
          font-size: 12px;
          color: #ffffff;
        }

        /* Show on hover */
        .parcel-item:hover .hover-info {
          max-height: 400px;
          opacity: 1;
          margin-top: 4px;
        }

        /* Status badge */
        .status-badge {
          margin-left: auto;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.created {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.assigned {
          background: #cce5ff;
          color: #004085;
        }

        .status-badge.out_for_delivery {
          background: #e2d9f3;
          color: #4b2e83;
        }

        /* MAP PATTERN BACKGROUND */
        .map-pattern {
            background-color: #0f172a;
            background-image: 
                linear-gradient(#1e293b 2px, transparent 2px),
                linear-gradient(90deg, #1e293b 2px, transparent 2px),
                linear-gradient(#1e293b 1px, transparent 1px),
                linear-gradient(90deg, #1e293b 1px, transparent 1px);
            background-size: 50px 50px, 50px 50px, 10px 10px, 10px 10px;
            background-position: -2px -2px, -2px -2px, -1px -1px, -1px -1px;
            opacity: 1;
        }

        /* AGGRESSIVE HOVER EFFECTS */
        // .glass-card {
        //    background: rgba(30, 41, 59, 0.7) !important;
        //    backdrop-filter: blur(20px) !important;
        //    border: 1px solid rgba(255, 255, 255, 0.05) !important;
        //    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        // }

        .delivery-dashboard-modern .bg-white, 
        .delivery-dashboard-modern .dark\:bg-slate-800 {
           transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .delivery-dashboard-modern .bg-white:hover, 
        .delivery-dashboard-modern .dark\:bg-slate-800:hover {
           transform: translateY(-8px) scale(1.02);
           box-shadow: 0 0 25px rgba(59, 130, 246, 0.4), inset 0 0 0 1px rgba(59, 130, 246, 0.5);
           z-index: 10;
        }

        /* NEON GLOW TEXT */
        .delivery-dashboard-modern h2, 
        .delivery-dashboard-modern h3,
        .delivery-dashboard-modern p.text-3xl {
           text-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
        }

        /* FLOATING ICONS */
        .floating-icon {
           animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
           0% { transform: translateY(0px); }
           50% { transform: translateY(-10px); }
           100% { transform: translateY(0px); }
        }

        /* STATUS BADGES */
        .status-badge.delivered {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: white !important;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
        }
        
        .status-badge.pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
          color: white !important;
          box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4);
        } 

        .status-badge.assigned, .status-badge.in_transit {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
          color: white !important;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
        }

        /* CUSTOM SCROLLBAR */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 10px;
        }
        
        /* BOX GLOW ANIMATION */
        .box-glow-green {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
            animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        /* Dashboard Responsive Adjustments */
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
          }
        }
        
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .map-preview {
            height: 400px;
          }
          .dashboard-header h1 {
            font-size: 1.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }
          .dashboard-header h1 {
            font-size: 1.5rem;
          }
          .map-preview {
            height: 350px;
          }
        }
        
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .map-preview {
            height: 280px;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;
