import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

export const parcelService = {
  getAll: (params) => api.get("/parcels", { params }),
  getPending: (params) => api.get("/parcels/pending/list", { params }),
  getById: (id) => api.get(`/parcels/${id}`),
  create: (data) => api.post("/parcels", data),
  update: (id, data) => api.put(`/parcels/${id}`, data),
  delete: (id) => api.delete(`/parcels/${id}`),
};

export const routeService = {
  getAll: (params) => api.get("/routes", { params }),
  getById: (id) => api.get(`/routes/${id}`),
  optimize: (data) => api.post("/routes/optimize", data),
  distribute: (data) => api.post("/routes/distribute", data),
  assignDriver: (id, driverId) =>
    api.put(`/routes/${id}/assign-driver`, { driverId }),
  complete: (id) => api.put(`/routes/${id}/complete`),
  recalculate: (id) => api.put(`/routes/${id}/recalculate`),
  delete: (id) => api.delete(`/routes/${id}`),
};

export const warehouseService = {
  getAll: () => api.get("/warehouses"),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post("/warehouses", data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
};

export const driverService = {
  getAll: (params) => api.get("/drivers", { params }),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post("/drivers", data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  updateLocation: (id, data) => api.put(`/drivers/${id}/location`, data),
  toggleDuty: (id) => api.put(`/drivers/${id}/toggle-duty`),
  delete: (id) => api.delete(`/drivers/${id}`),
};

export const userService = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export default api;
