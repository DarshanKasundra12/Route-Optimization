import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Activity,
  Plus,
  Minus,
  Locate,
  X,
  Grid as HubIcon,
  BarChart2,
  Navigation,
  Trash2,
  Edit,
  UserPlus,
} from "lucide-react";
import { routeService, driverService, warehouseService } from "../services/api";
import MapView from "../components/MapView";
import { useAuth } from "../context/AuthContext";

const Routes = () => {
  const { user } = useAuth();
  const mapRef = React.useRef(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMapActive, setIsMapActive] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [expandedLegId, setExpandedLegId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  useEffect(() => {
    if (expandedRouteId) {
      const r = routes.find((route) => route._id === expandedRouteId);
      if (r) {
        console.log("Selected Route Details:", r);
        console.log("Navigation Steps:", r.navigationSteps);
        if (r.navigationSteps && r.navigationSteps.length > 0) {
          console.log("First Leg Steps:", r.navigationSteps[0].steps);
        }
      }
    }
  }, [expandedRouteId, routes]);

  const [drivers, setDrivers] = useState([]);

  const [warehouses, setWarehouses] = useState([]);
  const [hoveredParcelId, setHoveredParcelId] = useState(null);

  useEffect(() => {
    fetchRoutes();
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    try {
      const [driversRes] = await Promise.all([driverService.getAll()]);
      setDrivers(driversRes.data.data || []);
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await routeService.getAll();
      let allRoutes = res.data.data || [];

      if (user?.role === "deliveryboy") {
        const userId = user._id || user.id;
        try {
          const driverRes = await driverService.getAll({ user: userId });
          if (driverRes.data.data && driverRes.data.data.length > 0) {
            const assignedDriverId = driverRes.data.data[0]._id;
            allRoutes = allRoutes.filter(
              (r) =>
                r.assignedDriver && r.assignedDriver._id === assignedDriverId,
            );
          } else {
            allRoutes = [];
          }
        } catch (err) {
          console.error("Error fetching driver relation:", err);
          allRoutes = [];
        }
      }

      setRoutes(allRoutes);
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedRouteId(expandedRouteId === id ? null : id);
    setExpandedLegId(null); // Reset leg expansion on route toggle
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.resetView();
    }
  };

  const handleOptimize = async () => {
    if (selectedRoute) {
      try {
        setLoading(true);
        console.log("Recalculating route:", selectedRoute._id);
        await routeService.recalculate(selectedRoute._id);
        await fetchRoutes();
      } catch (error) {
        console.error("Recalculation error:", error);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        await routeService.optimize({});
        await fetchRoutes();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteRoute = async (routeId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this route?")) {
      try {
        setLoading(true);
        await routeService.delete(routeId);
        await fetchRoutes();
      } catch (error) {
        console.error("Error deleting route:", error);
        const errorMsg =
          error.response?.data?.message || "Failed to delete route.";
        alert(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredRoutes = routes.filter(
    (route) =>
      route.routeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.assignedDriver?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  // Mock stats for the circles in the filter bar
  const stats = {
    completed: routes.filter((r) => r.status === "COMPLETED").length,
    inProgress: routes.filter((r) => r.status === "IN_PROGRESS").length,
    pending: routes.filter(
      (r) => r.status === "PENDING" || r.status === "ASSIGNED",
    ).length,
  };

  const selectedRoute = routes.find((r) => r._id === expandedRouteId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`routes-page-new ${isMapActive ? "map-active" : ""}`}
    >
      {/* Header */}
      {/* <header className="hub-header">
        <div className="header-left">
          <div className="brand-box">
            <div className="brand-logo-sq">
              <HubIcon size={20} color="#fff" />
            </div>
            <h1 className="brand-text">
              Logic<span>Hub</span>
            </h1>
          </div>
          <nav className="header-nav">
            <button className="nav-tab active">Route Matrix</button>
            <button className="nav-tab">Fleet Status</button>
            <button className="nav-tab">Optimization Logs</button>
          </nav>
        </div>

        <div className="header-right">
          <div className="director-info">
            <span className="mode-label">Strategy Mode</span>
            <span className="director-name">Regional Director: Alex Vane</span>
          </div>
          <div className="user-avatar-sq">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuALHdCnYTt5OeSWfqFM-TkPo9m5vI1Ni_2qaun4RibMFtr3pGoS75SvTlhQXA-_pMB9D0yxWczJxrnF5S3o3_KqKnKrIaKHtFOwRSNo3hDBDFYZQAxxtXI996ILJXlIFpiy_haDuRSn7PnsDjQnCLTicDyRtaKQDit6lp0wAhwvQvHvCwjUXioeixYWvS4-b0AMhTOnTTSfejn_-yOptu_qx_cwNpofyinGbaksAS-0VA4gpIt9zhjK14R-HiWd_Z_oEvRqs--jLShP"
              alt="User"
            />
          </div>
        </div>
      </header> */}

      {/* Main Content Area */}
      <main className="hub-main scroll-hidden">
        <div className="hub-content-inner">
          {/* Sub Header / Filters */}
          <div className="filter-bar-hub">
            <div className="filter-left">
              <div className="filter-search">
                <Search size={14} color="#666" />
                <input
                  type="text"
                  placeholder="Filter Matrix..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {user?.role === "admin" && (
                <>
                  <div className="v-divider"></div>
                  <button className="bulk-action">
                    <CheckSquare size={14} />
                    Bulk Action (0)
                  </button>
                </>
              )}
            </div>
            <div className="filter-right">
              <button
                className={`strategic-toggle-bar ${isMapActive ? "active" : ""}`}
                onClick={() => setIsMapActive(!isMapActive)}
              >
                <MapIcon size={14} />
                <span>Strategic View</span>
              </button>
              <div className="v-divider"></div>
              <div className="status-stacks">
                <div className="stack-circle completed">{stats.completed}</div>
                <div className="stack-circle in-progress">
                  {stats.inProgress}
                </div>
                <div className="stack-circle pending">{stats.pending}</div>
              </div>
              {user?.role === "admin" && (
                <button className="batch-btn" onClick={() => handleOptimize()}>
                  Run Batch Optimization
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="matrix-table-container custom-scrollbar">
            {loading ? (
              <div className="loading-state-hub">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="spinner-hub"
                />
                <p>Synchronizing Matrix Data...</p>
              </div>
            ) : (
              <table className="matrix-table">
                <thead>
                  <tr>
                    {user?.role !== "deliveryboy" && (
                      <th className="w-12">
                        <input type="checkbox" className="custom-check" />
                      </th>
                    )}
                    <th>Route ID</th>
                    <th>Primary Driver</th>
                    <th>Load Factor</th>
                    <th>Efficiency Score</th>
                    <th>ETA Delta</th>
                    <th>Stops</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((route) => (
                    <React.Fragment key={route._id}>
                      <tr
                        className={`matrix-row ${expandedRouteId === route._id ? "active-row" : ""}`}
                        onClick={() => toggleExpand(route._id)}
                      >
                        {user?.role !== "deliveryboy" && (
                          <td>
                            <input type="checkbox" className="custom-check" />
                          </td>
                        )}
                        <td data-label="Route ID">
                          <span className="route-id">
                            {route.routeId || route._id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Primary Driver">
                          <div className="driver-cell">
                            <span
                              className={`driver-status-dot ${route.assignedDriver ? "active" : ""}`}
                            ></span>
                            <span className="driver-name-hub">
                              {route.assignedDriver?.name || "Unassigned"}
                            </span>
                          </div>
                        </td>
                        <td data-label="Load Factor">
                          <div className="load-bar-bg">
                            <div
                              className="load-bar-fill"
                              style={{
                                width: `${Math.min(100, (route.parcels?.length || 0) * 10)}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                        <td
                          data-label="Efficiency Score"
                          className="efficiency-cell"
                        >
                          {Math.min(
                            99.4,
                            85 + (route.parcels?.length || 0) * 1.5,
                          ).toFixed(1)}
                          %
                        </td>
                        <td data-label="ETA" className="eta-cell">
                          {(route.totalTime / 3600).toFixed(1)}h{" "}
                          <span className="eta-sub">Est.</span>
                        </td>
                        <td data-label="Stops">
                          {route.parcels?.length} Stops
                        </td>
                        <td data-label="Actions" className="text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Only allow delete if route is not IN_PROGRESS/ASSIGNED (based on user request, admin can delete COMPLETED routes) */}
                            {user?.role === "admin" &&
                              route.status !== "IN_PROGRESS" && (
                                <button
                                  className="action-icon-btn delete"
                                  title="Delete Route"
                                  onClick={(e) =>
                                    handleDeleteRoute(route._id, e)
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            {/* Placeholder for Edit or other actions */}
                            {/* <button className="action-icon-btn edit" title="Edit Route">
                               <Edit size={16} />
                             </button> */}

                            <button
                              className="expand-btn"
                              onClick={() => toggleExpand(route._id)}
                            >
                              {expandedRouteId === route._id ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      <AnimatePresence>
                        {expandedRouteId === route._id && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="expand-content-row"
                          >
                            <td colSpan="8" className="p-0">
                              <div
                                className={`sequence-container custom-scrollbar ${isMobile || route.optimizedSequence?.length > 2 ? "tablet-vertical-seq" : ""}`}
                              >
                                <div className="sequence-label">
                                  Delivery Sequence
                                </div>
                                <div className="sequence-timeline">
                                  {/* Starting Point (Depot) */}
                                  <div className="stop-node">
                                    <div className="node-dot completed"></div>
                                    <div className="node-line"></div>
                                    <div className="stop-card">
                                      <p className="stop-time">START • DEPOT</p>
                                      <p className="stop-name">
                                        {route.warehouse?.name ||
                                          "Warehouse Base"}
                                      </p>
                                      <div className="stop-badge-row">
                                        <span className="stop-badge picked">
                                          ORIGIN
                                        </span>
                                        <span className="stop-skus">
                                          Route Start
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Optimized Sequence Stops */}
                                  {route.optimizedSequence?.map((stop, idx) => {
                                    const parcel = route.parcels?.find(
                                      (p) =>
                                        p.parcelId === stop.parcelId ||
                                        p._id === stop.parcelId,
                                    );
                                    const isPickedUp = [
                                      "PICKED_UP",
                                      "MULTIPLE_PICKUPS",
                                      "ON_WAY_TO_WAREHOUSE",
                                      "ARRIVED_AT_WAREHOUSE",
                                      "DELIVERED",
                                    ].includes(parcel?.status);
                                    const isActive =
                                      route.status === "IN_PROGRESS" &&
                                      parcel?.status === "PICKUP_IN_PROGRESS";

                                    return (
                                      <div className="stop-node" key={idx}>
                                        <div
                                          className={`node-dot ${isPickedUp ? "completed" : isActive ? "active pulse" : "future"}`}
                                        ></div>
                                        <div className="node-line"></div>
                                        <div
                                          className={`stop-card ${isPickedUp ? "picked-up" : isActive ? "active" : "future"}`}
                                        >
                                          <p
                                            className={`stop-time ${isActive ? "current" : ""}`}
                                          >
                                            STOP{" "}
                                            {String(idx + 1).padStart(2, "0")} •{" "}
                                            {(
                                              stop.travelTimeFromPrevious / 60
                                            ).toFixed(0)}
                                            m
                                          </p>
                                          <p className="stop-name">
                                            {stop.pickupLocationName ||
                                              `Stop ${idx + 1}`}
                                          </p>
                                          <div className="stop-badge-row">
                                            <span
                                              className={`stop-badge ${isPickedUp ? "picked" : isActive ? "progress" : "scheduled"}`}
                                            >
                                              {(
                                                stop.distanceFromPrevious / 1000
                                              ).toFixed(1)}{" "}
                                              km
                                            </span>
                                            <span
                                              className={`stop-skus ${isActive ? "highlight" : ""}`}
                                            >
                                              {parcel?.status || "PENDING"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Terminal */}
                                  <div className="stop-node last">
                                    <div
                                      className={`node-dot ${route.status === "COMPLETED" ? "completed" : "future"}`}
                                    ></div>
                                    <div
                                      className={`stop-card ${route.status === "COMPLETED" ? "" : "future"}`}
                                    >
                                      <p className="stop-time">TERMINAL</p>
                                      <p className="stop-name">
                                        Return to Base
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Navigation Steps Panel */}
                              {route.navigationSteps?.length > 0 && (
                                <div className="nav-steps-panel">
                                  <div className="nav-steps-header">
                                    <Navigation size={14} />
                                    <span>
                                      Tactical Navigation Instructions (Legs:{" "}
                                      {route.navigationSteps.length})
                                    </span>
                                  </div>
                                  <div
                                    className={`legs-container custom-scrollbar ${isMobile || route.navigationSteps?.length > 3 ? "tablet-vertical-legs" : ""}`}
                                  >
                                    {route.navigationSteps.map((leg, lIdx) => {
                                      const legId = `${route._id}-${lIdx}`;
                                      const isExpandable =
                                        isMobile ||
                                        route.navigationSteps.length > 3;
                                      const isExpanded =
                                        !isExpandable ||
                                        expandedLegId === legId;

                                      return (
                                        <div
                                          className={`leg-block ${isExpanded ? "expanded" : ""}`}
                                          key={lIdx}
                                          onClick={() => {
                                            if (isExpandable) {
                                              setExpandedLegId(
                                                expandedLegId === legId
                                                  ? null
                                                  : legId,
                                              );
                                            }
                                          }}
                                          style={{
                                            cursor: isExpandable
                                              ? "pointer"
                                              : "default",
                                            transition: "all 0.3s ease",
                                          }}
                                        >
                                          <div
                                            className="leg-info"
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              borderBottom: isExpanded
                                                ? "1px solid var(--hub-border)"
                                                : "none",
                                              marginBottom: isExpanded
                                                ? "0.75rem"
                                                : "0",
                                            }}
                                          >
                                            <span>
                                              LEG {lIdx + 1}:{" "}
                                              {(leg.distance / 1000).toFixed(2)}{" "}
                                              km
                                            </span>
                                            {isExpandable &&
                                              (isExpanded ? (
                                                <ChevronUp size={14} />
                                              ) : (
                                                <ChevronDown size={14} />
                                              ))}
                                          </div>

                                          <AnimatePresence initial={false}>
                                            {isExpanded && (
                                              <motion.div
                                                initial={
                                                  isExpandable
                                                    ? { opacity: 0, height: 0 }
                                                    : false
                                                }
                                                animate={{
                                                  opacity: 1,
                                                  height: "auto",
                                                }}
                                                exit={
                                                  isExpandable
                                                    ? { opacity: 0, height: 0 }
                                                    : false
                                                }
                                                className="steps-list"
                                              >
                                                {leg.steps.map((step, sIdx) => (
                                                  <div
                                                    className="step-item"
                                                    key={sIdx}
                                                  >
                                                    <span className="step-num">
                                                      {sIdx + 1}
                                                    </span>
                                                    <span className="step-text">
                                                      {
                                                        step.maneuver
                                                          ?.instruction
                                                      }
                                                    </span>
                                                  </div>
                                                ))}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Map Overlay Section */}
        <div className={`map-overlay-hub ${isMapActive ? "visible" : ""}`}>
          <button
            className="map-close-btn"
            onClick={() => setIsMapActive(false)}
          >
            <X size={20} />
          </button>

          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: "400px",
              position: "relative",
            }}
          >
            <MapView
              ref={mapRef}
              drivers={drivers}
              warehouses={warehouses}
              warehouse={
                selectedRoute?.warehouse ||
                (warehouses.length > 0 ? warehouses[0] : null)
              }
              parcels={selectedRoute?.parcels || []}
              routePolyline={selectedRoute?.routePolyline}
              returnRoutePolyline={selectedRoute?.returnRoutePolyline}
              optimizedSequence={selectedRoute?.optimizedSequence}
              fitBoundsKey={selectedRoute ? selectedRoute._id : "overview"}
              activeParcelId={hoveredParcelId}
            />
          </div>

          <div className="strategic-insight-hub">
            <div className="insight-card glass-blur">
              <div className="insight-header">
                <div className="insight-icon-sq">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <h4 className="insight-label">
                    {selectedRoute
                      ? `Route #${selectedRoute.routeId}`
                      : "Strategic Insight"}
                  </h4>
                  <p className="insight-value">
                    {selectedRoute
                      ? selectedRoute.assignedDriver?.name || "Unassigned"
                      : "Operational Overview"}
                  </p>
                </div>
              </div>
              <div className="insight-stats">
                {selectedRoute ? (
                  <>
                    <div className="ins-row">
                      <span>Total Distance</span>
                      <span>
                        {(selectedRoute.totalDistance / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="ins-row">
                      <span>Estimated Duration</span>
                      <span>
                        {Math.floor(selectedRoute.totalTime / 3600)}h{" "}
                        {Math.floor((selectedRoute.totalTime % 3600) / 60)}m
                      </span>
                    </div>
                    <div className="ins-row">
                      <span>Stops Activity</span>
                      <span>{selectedRoute.parcels?.length} Deliveries</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ins-row">
                      <span>Active Routes</span>
                      <span>
                        {
                          routes.filter((r) => r.status === "IN_PROGRESS")
                            .length
                        }{" "}
                        Units
                      </span>
                    </div>
                    <div className="ins-row">
                      <span>Fleet Load Factor</span>
                      <span>
                        {(() => {
                          const activeRoutes = routes.filter((r) =>
                            ["IN_PROGRESS", "ASSIGNED"].includes(r.status),
                          );
                          const totalWeight = activeRoutes.reduce(
                            (sum, r) =>
                              sum +
                              (r.parcels?.reduce(
                                (pSum, p) => pSum + (p.weight || 0),
                                0,
                              ) || 0),
                            0,
                          );
                          const capacity = activeRoutes.length * 1000; // 1000kg per vehicle
                          return capacity > 0
                            ? ((totalWeight / capacity) * 100).toFixed(1)
                            : "0.0";
                        })()}
                        % Aggregate
                      </span>
                    </div>
                  </>
                )}

                {/* Optimized Sequence List */}
                {selectedRoute &&
                  selectedRoute.optimizedSequence?.length > 0 && (
                    <div className="insight-sequence-list custom-scrollbar">
                      <div className="seq-header">
                        OPTIMIZED SEQUENCE (
                        {selectedRoute.optimizedSequence.length})
                      </div>
                      {selectedRoute.optimizedSequence.map((stop, idx) => {
                        const parcel = selectedRoute.parcels?.find(
                          (p) =>
                            p.parcelId === stop.parcelId ||
                            p._id === stop.parcelId,
                        );
                        const isHovered =
                          hoveredParcelId === (parcel?._id || stop.parcelId);

                        return (
                          <div
                            className={`seq-row ${isHovered ? "hovered" : ""}`}
                            key={idx}
                            onMouseEnter={() =>
                              setHoveredParcelId(parcel?._id || stop.parcelId)
                            }
                            onMouseLeave={() => setHoveredParcelId(null)}
                          >
                            <span
                              className={`seq-num ${isHovered ? "active" : ""}`}
                            >
                              {idx + 1}
                            </span>
                            <div className="seq-info">
                              <span
                                className="seq-name"
                                title={stop.pickupLocationName}
                              >
                                {stop.pickupLocationName || `Stop ${idx + 1}`}
                              </span>
                              <span className="seq-meta">
                                ID:{" "}
                                {stop.parcelId
                                  ?.toString()
                                  .slice(-4)
                                  .toUpperCase()}{" "}
                                •{" "}
                                {(stop.distanceFromPrevious / 1000).toFixed(
                                  1,
                                )}{" "}
                                km
                              </span>
                              <span
                                className={`seq-status ${parcel?.status?.toLowerCase()}`}
                              >
                                {parcel?.status?.replace(/_/g, " ") ||
                                  "PENDING"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                {user?.role === "admin" && (
                  <button
                    className="apply-reroute-btn"
                    onClick={handleOptimize}
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : selectedRoute
                        ? "Recalculate Path"
                        : "Optimize Fleet"}
                  </button>
                )}
              </div>
            </div>

            <div className="map-controls-hub">
              <button className="map-btn" onClick={handleZoomIn}>
                <Plus size={14} />
              </button>
              <button className="map-btn" onClick={handleZoomOut}>
                <Minus size={14} />
              </button>
              <button className="map-btn active" onClick={handleResetView}>
                <Locate size={14} />
              </button>
            </div>
          </div>

          <div className="map-legend-hub">
            <div className="legend-item">
              <span className="leg-marker warehouse"></span> Hub
            </div>
            <div className="legend-item">
              <span className="leg-marker parcel"></span> Stop
            </div>
            <div className="legend-separator"></div>
            <div className="legend-item">
              <span className="leg-line completed"></span> Done
            </div>
            <div className="legend-item">
              <span className="leg-line active"></span> Active
            </div>
            <div className="legend-item">
              <span className="leg-line pending"></span> Planned
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="hub-footer">
        <div className="status-group">
          <span className="status-pill">
            <span className="dot-green"></span> Matrix Status: Synced
          </span>
          {/* <span className="status-pill">
            <Activity size={12} /> Server Latency:{" "}
            {Math.floor(Math.random() * 20 + 10)}ms
          </span> */}
        </div>
        <div className="footer-right">
          <span className="last-opt">
            Last Optimization: {new Date().toLocaleTimeString()}
          </span>
          {/* <span className="docs-link">Documentation & API</span> */}
        </div>
      </footer>

      <style>{`
        .routes-page-new {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(90deg, #000000, #424e63, #6d727a, #424e63, #000000);
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
          width: 100%;
          max-width: 100%;
        }

        /* Variables mapped from design */
        :root {
          --hub-primary: #135bec;
          --hub-bg: #080808;
          --hub-card: #121212;
          --hub-border: #222222;
          --hub-header: #1a1a1a;
        }

        /* Header */
        .hub-header {
          height: 64px;
          border-bottom: 1px solid var(--hub-border);
          padding: 0 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--hub-bg);
          z-index: 50;
        }

        .header-left { display: flex; align-items: center; gap: 2rem; }
        
        .brand-box { display: flex; align-items: center; gap: 0.5rem; }
        .brand-logo-sq {
          width: 32px;
          height: 32px;
          background: var(--hub-primary);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-text {
          font-size: 1.125rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          font-style: italic;
          text-transform: uppercase;
        }
        .brand-text span { color: var(--hub-primary); }

        .header-nav {
          display: flex;
          background: var(--hub-card);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--hub-border);
        }
        .nav-tab {
          padding: 6px 1rem;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          color: #71717a;
          cursor: pointer;
          transition: 0.2s;
          background: transparent;
        }
        .nav-tab.active { background: var(--hub-primary); color: white; }
        .nav-tab:hover:not(.active) { color: white; }

        .header-right { display: flex; align-items: center; gap: 1.5rem; }
        .director-info { display: flex; flex-direction: column; align-items: flex-end; }
        .mode-label { font-size: 10px; color: var(--hub-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
        .director-name { font-size: 12px; color: #a1a1aa; font-weight: 500; }

        .strategic-toggle {
          background: white;
          color: black;
          padding: 8px 1rem;
          border-radius: 100px;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: 0.2s transform;
        }
        .strategic-toggle:hover { transform: scale(1.05); }

        .user-avatar-sq {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgba(19, 91, 236, 0.3);
          overflow: hidden;
        }
        .user-avatar-sq img { width: 100%; height: 100%; object-fit: cover; }

        /* Main Content */
        .hub-main { 
          flex: 1; 
          overflow-y: auto; 
          overflow-x: hidden; 
          position: relative; 
          min-width: 0; 
        }
        .hub-content-inner { display: flex; flex-direction: column; height: 100%; min-width: 0; }

        /* Filter Bar */
        .filter-bar-hub {
          padding: 1rem;
          border-bottom: 1px solid var(--hub-border);
          background: rgba(26, 26, 26, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .filter-left { display: flex; align-items: center; gap: 0.75rem; }
        .filter-search {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--hub-card);
          border: 1px solid var(--hub-border);
          padding: 6px 0.75rem;
          border-radius: 4px;
        }
        .filter-search input {
          background: transparent; border: none; color: white; font-size: 12px; outline: none; width: 180px;
        }
        .v-divider { width: 1px; height: 24px; background: var(--hub-border); }
        .bulk-action {
          display: flex; align-items: center; gap: 0.5rem;
          background: transparent; border: none; color: #a1a1aa;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .bulk-action:hover { color: white; }

        .filter-right { display: flex; align-items: center; gap: 1rem; }
        .status-stacks { display: flex; margin-right: 0.5rem; }
        .stack-circle {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700;
          margin-left: -8px;
        }
        .stack-circle.completed { background: rgba(16, 185, 129, 0.2); color: #10b981; border-color: rgba(16, 185, 129, 0.5); }
        .stack-circle.in-progress { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: rgba(245, 158, 11, 0.5); }
        .stack-circle.pending { background: rgba(19, 91, 236, 0.2); color: var(--hub-primary); border-color: rgba(19, 91, 236, 0.5); }

        .batch-btn {
          background: rgba(19, 91, 236, 0.1);
          border: 1px solid rgba(19, 91, 236, 0.5);
          color: var(--hub-primary);
          padding: 8px 1rem;
          border-radius: 4px;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          cursor: pointer; transition: 0.2s;
        }
        .batch-btn:hover { background: var(--hub-primary); color: white; }

        /* Matrix Table */
        .matrix-table-container { flex: 1; overflow-y: auto; overflow-x: hidden; }
        .matrix-table { width: 100%; border-collapse: collapse; }
        .matrix-table thead th {
          position: sticky; top: 0;
          background: var(--hub-header);
          padding: 1rem; text-align: left;
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.2em; color: #71717a;
          border-bottom: 1px solid var(--hub-border);
          z-index: 5;
        }
        .matrix-table td { padding: 1rem; font-size: 13px; border-bottom: 1px solid var(--hub-border); }

        .matrix-row { cursor: pointer; transition: 0.2s; background: rgba(18, 18, 18, 0.3); }
        .matrix-row:hover { background: rgba(18, 18, 18, 0.5); }
        .matrix-row.active-row { border-left: 4px solid var(--hub-primary); background: rgba(18, 18, 18, 0.8); }

        .route-id-cell { font-family: monospace; color: #ffffff; font-weight: 700; }
        .driver-cell { display: flex; align-items: center; gap: 0.5rem; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #52525b; }
        .status-dot.completed { background: #10b981; }
        .status-dot.in_progress { background: #f59e0b; }
        .status-dot.pending { background: #3b82f6; }

        .load-bar-bg { width: 96px; height: 6px; background: #1a1a1a; border-radius: 100px; overflow: hidden; }
        .load-bar-fill { height: 100%; background: var(--hub-primary); }
        .score-cell { color: #10b981; font-weight: 700; }
        .eta-cell { color: #a1a1aa; font-family: monospace; }
        .eta-sub { font-size: 10px; text-transform: uppercase; color: #52525b; margin-left: 4px; }

        .expand-btn { background: transparent; border: none; color: #71717a; cursor: pointer; }
        .expand-btn:hover { color: white; }

        /* Expand Content */
        .expand-content-row { background: rgba(0, 0, 0, 0.4); }
        .sequence-container { padding: 1.5rem; display: flex; gap: 2rem; overflow-x: auto; }
        .sequence-label {
          writing-mode: vertical-lr; transform: rotate(180deg);
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #71717a; text-align: center;
        }

        .sequence-timeline { display: flex; align-items: flex-start; gap: 0.5rem; padding-top: 0.5rem; }
        .stop-node { position: relative; width: 192px; flex-shrink: 0; }
        .node-dot {
          width: 12px; height: 12px; border-radius: 50%; background: #10b981;
          position: relative; z-index: 5; outline: 4px solid var(--hub-bg);
          margin-bottom: 1rem;
        }
        .node-dot.active { width: 16px; height: 16px; background: var(--hub-primary); margin-left: -2px; }
        .node-dot.future { background: #262626; }
        .node-dot.pulse { ring: 4px solid rgba(19, 91, 236, 0.2); animation: hubPulse 2s infinite; }

        @keyframes hubPulse { 
          0% { box-shadow: 0 0 0 0 rgba(19, 91, 236, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(19, 91, 236, 0); }
          100% { box-shadow: 0 0 0 0 rgba(19, 91, 236, 0); }
        }

        .node-line {
          position: absolute; top: 6px; left: 6px; width: 100%; height: 2px;
          background: var(--hub-border); z-index: 1;
        }
        .stop-node.last .node-line { display: none; }

        .stop-card {
          background: #12121212; border: 1px solid #12121212;
          padding: 12px; border-radius: 8px; width: 100%;
          overflow: hidden; min-width: 0;
        }
        .stop-card.active { 
          background: var(--hub-primary); border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 24px rgba(19, 91, 236, 0.2);
        }
        .stop-card.future { opacity: 0.6; }
        
        .stop-time { font-size: 10px; font-weight: 700; color: #71717a; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .stop-time.current { color: rgba(255, 255, 255, 0.7); }
        .stop-name { font-size: 12px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block; }

        .stop-badge-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .stop-badge { font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
        .stop-badge.picked { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stop-badge.dropped { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stop-badge.progress { background: white; color: var(--hub-primary); }
        .stop-badge.scheduled { background: rgba(255, 255, 255, 0.05); color: #a1a1aa; }
        
        .stop-skus { font-size: 10px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .stop-skus.highlight { color: rgba(255, 255, 255, 0.7); }

        /* Map Overlay */
        .map-overlay-hub {
          position: absolute; inset: 0; background: var(--hub-bg);
          z-index: 100; opacity: 0; pointer-events: none;
          transition: 0.6s cubic-bezier(0.77, 0, 0.175, 1);
          clip-path: circle(0% at 90% 10%);
          display: flex; flex-direction: column;
        }
        .map-overlay-hub.visible { opacity: 1; pointer-events: auto; clip-path: circle(150% at 90% 10%); }

        .map-close-btn {
          position: absolute; top: 1.5rem; right: 1.5rem;
          width: 48px; height: 48px; border-radius: 50%;
          background: white; color: black; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 110; transition: 0.3s transform;
        }
        .map-close-btn:hover { transform: rotate(90deg); }

        .map-bg-placeholder { position: absolute; inset: 0; grayscale: 1; opacity: 0.4; pointer-events: none; }
        .map-bg-placeholder img { width: 100%; height: 100%; object-fit: cover; }

        .map-svg-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

        .strategic-insight-hub {
          position: absolute; bottom: 2.5rem; left: 2.5rem;
          display: flex; flex-direction: column; gap: 1rem;
          z-index: 105;
        }

        .insight-card {
          background: rgba(18, 18, 18, 0.5);
    backdrop-filter: blur(5px);
    border: 2px solid #12121290;
    padding: 1.5rem;
    border-radius: 16px;
    width: 340px;
    max-height: 600px;
    overflow-y: auto;
        }
        .insight-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .insight-icon-sq {
          width: 40px; height: 40px; background: rgba(19, 91, 236, 0.2);
          border-radius: 4px; display: flex; align-items: center; justify-content: center;
          color: var(--hub-primary);
        }
        .insight-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--hub-primary); }
        .insight-value { font-size: 1.125rem; font-weight: 700; color: white; }

        .insight-stats { display: flex; flex-direction: column; gap: 0.75rem; }
        .ins-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; }
        .ins-row span:first-child { color: #71717a; }
        .apply-reroute-btn {
          margin-top: 0.75rem;
          padding: 10px;
          border-radius: 4px;
          background: #ffffff00;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: 0.2s;
        }
        .apply-reroute-btn:hover { background: white; color: black; }

        .insight-sequence-list {
          margin-top: 1rem;
          max-height: 500px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .seq-header {
          font-size: 9px;
          font-weight: 800;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
          padding-left: 4px;
        }
        .seq-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 4px;
        }
        .seq-row:hover, .seq-row.hovered {
          background: rgba(255, 255, 255, 0.08);
        }
        .seq-row:last-child { border-bottom: none; }
        .seq-num {
          font-size: 9px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
          transition: 0.2s;
        }
        .seq-num.active {
          background: var(--hub-primary);
          color: white;
        }
        .seq-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
        }
        .seq-name {
          font-size: 11px;
          font-weight: 600;
          color: #e4e4e7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .seq-meta {
          font-size: 9px;
          color: #71717a;
          margin-bottom: 2px;
        }
        .seq-status {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          display: inline-block;
          margin-top: 2px;
        }
        .seq-status.delivered { color: #10b981; }
        .seq-status.picked_up { color: #3b82f6; }
        .seq-status.pending { color: #f59e0b; }
        .seq-status.failed { color: #ef4444; }

        .map-controls-hub { display: flex; gap: 0.5rem; }
        .map-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: #12121290; border: 1px solid #12121290;
          color: #a1a1aa; display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .map-btn:hover { background: #262626; color: white; }
        .map-btn.active { color: var(--hub-primary); }

        .map-legend-hub {
          position: absolute; bottom: 2.5rem; right: 2.5rem;
          background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px);
          padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex; align-items: center; gap: 1.5rem;
          z-index: 105;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .legend-item { display: flex; align-items: center; gap: 0.6rem; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; }
        .legend-separator { width: 1px; height: 16px; background: rgba(255,255,255,0.1); }
        
        /* Markers */
        .leg-marker { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.5); display: inline-block; }
        .leg-marker.warehouse { background: #3b82f6; border: 2px solid white; }
        .leg-marker.parcel { background: #f59e0b; border: 1.5px solid white; }
        
        /* Lines */
        .leg-line { width: 24px; height: 4px; border-radius: 2px; display: inline-block; }
        .leg-line.completed { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
        .leg-line.active { background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.5); }
        .leg-line.pending { background: rgba(255, 255, 255, 0.3); border: 1px dashed rgba(255, 255, 255, 0.5); }

        /* Footer */
        .hub-footer {
          height: 40px; border-top: 1px solid var(--hub-border);
          padding: 0 1.5rem; display: flex; align-items: center;
          justify-content: space-between; font-size: 10px;
          font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.2em; color: #52525b;
        }
        .status-group { display: flex; align-items: center; gap: 1.5rem; }
        .status-pill { display: flex; align-items: center; gap: 0.5rem; }
        .dot-green { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
        .footer-right { display: flex; gap: 1.5rem; }
        .last-opt { color: #000000; }
        .docs-link { color: white; cursor: pointer; transition: 0.2s; }
        .docs-link:hover { color: var(--hub-primary); }

        /* Custom Checkbox */
        .custom-check {
          background: transparent; border: 1px solid var(--hub-border); border-radius: 3px;
          color: var(--hub-primary); cursor: pointer;
        }
        .custom-check:focus { ring: 2px solid var(--hub-primary); }

        /* Scrollbars */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--hub-bg); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

        .scroll-hidden { overflow: hidden; }

        .loading-state-hub {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 1.5rem;
          color: #71717a;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .spinner-hub {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(19, 91, 236, 0.1);
          border-top-color: var(--hub-primary);
          border-radius: 50%;
        }

        .nav-steps-panel {
          padding: 1.5rem;
          border-top: 1px solid var(--hub-border);
          background: rgba(0, 0, 0, 0.2);
        }
        .nav-steps-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--hub-primary);
          margin-bottom: 1rem;
        }
        .legs-container {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          padding-bottom: 1rem;
        }
        .leg-block {
          min-width: auto;
          background: var(--hub-card);
          border: 1px solid var(--hub-border);
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s ease;
        }
        .leg-block:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .leg-info {
          font-size: 10px;
          font-weight: 900;
          color: #71717a;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
        }
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .step-item {
          display: flex;
          gap: 0.75rem;
          font-size: 12px;
          color: #a1a1aa;
        }
        .step-num {
          color: var(--hub-primary);
          font-weight: 800;
          font-family: monospace;
        }
        .step-text { line-height: 1.4; }
        .strategic-toggle-bar {
          display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgb(255 255 255 / 7%);
    border: 1.5px solid #000000;
    padding: 6px 12px;
    border-radius: 10px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    transition: 0.2s;
        }
        .strategic-toggle-bar:hover { background: #ffffff12;
    color: #000000; }
        .strategic-toggle-bar.active { background: var(--hub-primary); color: white; border-color: var(--hub-primary); }

        .stop-card.picked-up {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }
        .stop-card.picked-up .stop-name { color: #10b981; }

        .active-trace {
          filter: drop-shadow(0 0 8px rgba(19, 91, 236, 0.4));
        }
        .insight-details {
          display: flex;
          gap: 1.5rem;
          margin-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 1rem;
        }
        .insight-details .i-metric {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .insight-details .i-metric span {
          font-size: 10px;
          color: #71717a;
          text-transform: uppercase;
          font-weight: 800;
        }
        .insight-details .i-metric strong {
          font-size: 16px;
          color: white;
          font-family: monospace;
        }

        .action-icon-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #bdc3c7;
            padding: 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .action-icon-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            transform: translateY(-1px);
        }
        .action-icon-btn.delete:hover {
            background: rgba(220, 38, 38, 0.2);
            border-color: rgba(220, 38, 38, 0.3);
            color: #f87171;
        }

        /* --- RESPONSIVNESS --- */
        @media (max-width: 1024px) {
          .matrix-table-container {
            padding-bottom: 1rem;
          }
          .filter-bar-hub {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          .filter-left, .filter-right {
            width: 100%;
            justify-content: space-between;
          }
          .header-nav {
            display: none;
          }
          .header-right {
            gap: 0.75rem;
          }
          .director-info {
            display: none;
          }
          .insight-card {
            width: 280px;
          }
          .map-legend-hub {
            gap: 0.75rem;
            padding: 0.75rem 1rem;
          }
          
          /* Transform Matrix Table into Cards */
          .matrix-table, .matrix-table thead, .matrix-table tbody, .matrix-table th, .matrix-table td, .matrix-table tr {
            display: block;
          }
          .matrix-table thead tr {
            display: none;
          }
          .matrix-table tr.matrix-row {
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            margin-bottom: 1rem;
            background: rgba(255, 255, 255, 0.02);
            padding: 0.5rem;
          }
          .matrix-table tr.matrix-row:hover {
            background: rgba(255, 255, 255, 0.04);
            transform: none;
            box-shadow: none;
          }
          .matrix-table td {
            border: none;
            padding: 0.5rem 1rem !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .matrix-table td::before {
            content: attr(data-label);
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
            margin-right: 1rem;
            text-align: left;
          }
          .expand-content-row td {
            padding: 0 !important;
            display: block;
          }
        }

        /* Conditional Vertical Stack on Tablet & Laptop (>3 items) */
        .sequence-container.tablet-vertical-seq {
          padding: 1rem;
          display: block;
          overflow: visible;
        }
        .tablet-vertical-seq .sequence-timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .tablet-vertical-seq .stop-node {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          min-height: 80px;
        }
        .tablet-vertical-seq .node-dot {
          margin-right: 1rem;
          margin-top: 24px;
          margin-bottom: 0;
          flex-shrink: 0;
          z-index: 5;
        }
        .tablet-vertical-seq .node-dot.active {
          margin-left: -2px;
          margin-top: 22px;
        }
        .tablet-vertical-seq .node-line {
          width: 2px;
          height: 100%;
          left: 5px;
          top: 36px;
          z-index: 1;
        }
        .tablet-vertical-seq .stop-card {
          flex: 1;
          margin-bottom: 1rem;
        }
        .tablet-vertical-seq .stop-node:last-child .stop-card {
          margin-bottom: 0;
        }
        .tablet-vertical-seq .sequence-label {
          display: none;
        }

        .tablet-vertical-legs.legs-container {
          gap: 1rem;
          flex-direction: column;
          overflow-x: visible;
        }
        .tablet-vertical-legs .leg-block {
          min-width: auto;
          width: 100%;
        }

        @media (max-width: 768px) {
          .routes-page-new {
            height: auto;
            overflow-y: auto;
            overflow-x: hidden;
          }
          /* Header */
          .hub-header {
            height: auto;
            padding: 0.75rem 1rem;
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          .header-left {
            gap: 0.75rem;
            width: 100%;
            justify-content: space-between;
          }
          .brand-text {
            font-size: 0.9rem;
          }
          .strategic-toggle {
            padding: 6px 0.75rem;
            font-size: 11px;
          }
          .user-avatar-sq {
            width: 32px;
            height: 32px;
          }

          /* Filter bar */
          .filter-bar-hub {
            padding: 0.75rem;
          }
          .filter-search {
            width: 100%;
          }
          .filter-search input {
            width: 100%;
          }
          .filter-left {
            flex-wrap: wrap;
          }
          .v-divider { display: none; }
          .status-stacks { display: none; }

          /* Main content & Table */
          .hub-main {
            padding: 0;
          }
          .hub-content-inner {
            height: auto;
          }
          .sequence-container {
            margin: 0;
            background: transparent;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Sequence timeline (vertical stack in expanded row) */
          .sequence-container {
            padding: 1rem;
            display: block;
            overflow: visible;
          }
          .sequence-timeline {
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .stop-node {
            width: 100%;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            min-height: 80px;
          }
          .node-dot {
            margin-right: 1rem;
            margin-top: 24px;
            margin-bottom: 0;
            flex-shrink: 0;
            z-index: 5;
          }
          .node-dot.active {
            margin-left: -2px;
            margin-top: 22px;
          }
          .node-line {
            width: 2px;
            height: 100%;
            left: 5px;
            top: 36px;
            z-index: 1;
          }
          .stop-card {
            flex: 1;
            margin-bottom: 1rem;
          }
          .stop-node:last-child .stop-card {
            margin-bottom: 0;
          }
          .sequence-label {
            display: none;
          }

          /* Map Overlay */
          .map-overlay-hub {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border: none;
            clip-path: none;
            z-index: 9999;
          }
          .map-overlay-hub.visible {
            clip-path: none;
          }
          .map-close-btn {
            top: 1rem;
            right: 1rem;
            width: 40px;
            height: 40px;
          }

          /* Map insight panel */
          .strategic-insight-hub {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            padding: 0;
          }
          .insight-card {
            width: 100%;
            border-radius: 16px 16px 0 0;
            max-height: 45vh;
            overflow-y: auto;
          }
          .insight-sequence-list {
            max-height: 200px;
          }

          /* Map legend */
          .map-legend-hub {
            position: fixed;
            bottom: auto;
            top: 1rem;
            left: 1rem;
            right: auto;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 8px;
            z-index: 10000;
          }
          .legend-item {
            font-size: 8px;
            gap: 0.3rem;
          }

          /* Map controls */
          .map-controls-hub {
            position: fixed;
            top: 1rem;
            right: 4rem;
            z-index: 10000;
          }

          /* Footer */
          .hub-footer {
            height: auto;
            padding: 0.5rem 1rem;
            flex-direction: column;
            gap: 0.25rem;
            text-align: center;
          }
          .footer-right {
            justify-content: center;
          }

          /* Navigation steps panel */
          .nav-steps-panel {
            padding: 1rem;
          }
          .legs-container {
            gap: 1rem;
            flex-direction: column;
            overflow-x: visible;
          }
          .leg-block {
            min-width: auto;
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .hub-header {
            padding: 0.5rem 0.75rem;
          }
          .brand-logo-sq {
            width: 28px;
            height: 28px;
          }
          .brand-text {
            font-size: 0.8rem;
          }
          .strategic-toggle span {
            display: none;
          }
          .batch-btn {
            padding: 6px 0.75rem;
            font-size: 10px;
          }
          .stop-node {
            width: 140px;
          }
          .stop-card {
            padding: 8px;
          }
          .stop-name {
            font-size: 11px;
          }
          .insight-card {
            padding: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Routes;
