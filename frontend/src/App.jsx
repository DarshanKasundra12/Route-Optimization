import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import RouteOptimization from "./pages/RouteOptimization";
import Parcels from "./pages/Parcels";
import Drivers from "./pages/Drivers";
import Warehouses from "./pages/Warehouses";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LiveTracking from "./pages/LiveTracking";
import VehicleProfile from "./pages/VehicleProfile";
import Users from "./pages/Users";
import ManageRoutes from "./pages/Routes";
import DriverRoute from "./pages/DriverRoute";
import Distributor from "./pages/Distributor";

const Layout = () => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes (Accessible by Admin and DeliveryBoy) */}
          <Route element={<ProtectedRoute roles={["admin", "deliveryboy"]} />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/parcels" element={<Parcels />} />
              <Route path="/tracking" element={<LiveTracking />} />
              <Route path="/my-route" element={<DriverRoute />} />
              <Route path="/profile" element={<VehicleProfile />} />
              <Route path="/manage-routes" element={<ManageRoutes />} />
            </Route>
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route element={<Layout />}>
              <Route path="/optimize" element={<RouteOptimization />} />
              <Route path="/distributor" element={<Distributor />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
