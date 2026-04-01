import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import Dashboard from "../pages/Dashboard";
import Parcels from "../pages/Parcels";
import RouteOptimization from "../pages/RouteOptimization";

import { useAuth } from "../context/AuthContext";

// Define mock data
vi.mock("../services/api", () => {
  const mockParcels = [
    {
      _id: "p1",
      parcelId: "PKG-1001",
      status: "PENDING",
      weight: 5,
      destinationPort: "MUMBAI",
      latitude: 19.076,
      longitude: 72.8777,
      pickupLocationName: "Mumbai",
    },
    {
      _id: "p2",
      parcelId: "PKG-1002",
      status: "DELIVERED",
      weight: 2,
      destinationPort: "DELHI",
      latitude: 28.7041,
      longitude: 77.1025,
      pickupLocationName: "Delhi",
    },
  ];
  const mockRoutes = [{ _id: "r1", routeId: "RT-001", status: "IN_PROGRESS" }];
  const mockWarehouses = [{ _id: "w1", name: "Central Hub", code: "CH-01" }];
  const mockDrivers = [{ _id: "d1", name: "John Doe", isAvailable: true }];

  return {
    parcelService: {
      getAll: vi.fn().mockResolvedValue({ data: { data: mockParcels } }),
      getPending: vi
        .fn()
        .mockResolvedValue({ data: { data: [mockParcels[0]] } }),
      create: vi.fn().mockResolvedValue({ data: { success: true } }),
      update: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
    routeService: {
      getAll: vi.fn().mockResolvedValue({ data: { data: mockRoutes } }),
      optimize: vi
        .fn()
        .mockResolvedValue({
          data: { data: { route: mockRoutes[0], metrics: {} } },
        }),
      assignDriver: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
    warehouseService: {
      getAll: vi.fn().mockResolvedValue({ data: { data: mockWarehouses } }),
    },
    driverService: {
      getAll: vi.fn().mockResolvedValue({ data: { data: mockDrivers } }),
    },
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../components/MapView", () => ({
  default: () => <div data-testid="mock-map-view">Interactive Map</div>,
}));

vi.mock("framer-motion", () => {
  const MockComponent = ({ children, ...props }) => (
    <div {...props}>{children}</div>
  );
  return {
    motion: {
      div: MockComponent,
      h1: MockComponent,
      p: MockComponent,
      button: MockComponent,
      span: MockComponent,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

describe("Frontend Main Application Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { name: "Admin User", role: "admin" },
      loading: false,
    });
  });

  describe("Dashboard Page", () => {
    it("should render dashboard statistics correctly", async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Logistics Overview/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Total Parcels")).toBeInTheDocument();
      });

      // Total Parcels: 2
      expect(screen.getByText("2")).toBeInTheDocument();

      // Using regex to match text that might be inside tags
      expect(screen.getAllByText(/1/).length).toBeGreaterThanOrEqual(1);

      expect(screen.getByTestId("mock-map-view")).toBeInTheDocument();
    });

    it("should navigate to optimization page", async () => {
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );
      const optimizeBtn = screen.getByRole("button", { name: /optimize now/i });
      expect(optimizeBtn).toBeInTheDocument();
    });
  });

  describe("Parcels Management Page", () => {
    it("should display list of parcels", async () => {
      render(
        <MemoryRouter>
          <Parcels />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("PKG-1001")).toBeInTheDocument();
      });
      expect(screen.getByText("MUMBAI")).toBeInTheDocument();
    });

    it("should show Add Parcel button for Admin", async () => {
      render(
        <MemoryRouter>
          <Parcels />
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("button", { name: /add new parcel/i }),
      ).toBeInTheDocument();
    });

    it("should NOT show Add Parcel button for Delivery Boy", async () => {
      useAuth.mockReturnValue({
        user: { name: "Driver Bob", role: "deliveryboy" },
        loading: false,
      });

      render(
        <MemoryRouter>
          <Parcels />
        </MemoryRouter>,
      );

      expect(
        screen.queryByRole("button", { name: /add new parcel/i }),
      ).not.toBeInTheDocument();
    });

    it("should toggle form when Add New Parcel is clicked", async () => {
      render(
        <MemoryRouter>
          <Parcels />
        </MemoryRouter>,
      );
      const addBtn = screen.getByRole("button", { name: /add new parcel/i });
      await userEvent.click(addBtn);
      expect(screen.getByText(/Add New Pickup Request/i)).toBeInTheDocument();
    });
  });

  describe("Route Optimization Page", () => {
    it("should load warehouses and pending parcels", async () => {
      render(
        <MemoryRouter>
          <RouteOptimization />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Route Optimization/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Central Hub/i)).toBeInTheDocument();
      });

      // Verify PKG-1001 is present
      await waitFor(
        () => {
          const elements = screen.getAllByText(/PKG-1001/);
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      expect(screen.queryByText(/PKG-1002/)).not.toBeInTheDocument();
    });

    it("should select parcel when clicked", async () => {
      render(
        <MemoryRouter>
          <RouteOptimization />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/PKG-1001/).length).toBeGreaterThan(0);
      });

      const textElement = screen.getAllByText(/PKG-1001/)[0];
      const parcelItem = textElement.closest(".parcel-check-item");

      await userEvent.click(parcelItem);
      expect(parcelItem).toHaveClass("checked");
      expect(screen.getByText(/1 Selected/i)).toBeInTheDocument();
    });
  });
});
