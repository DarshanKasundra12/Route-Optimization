import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";

/* ================= MOCK AUTH ================= */

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}));

/* ================= RENDER HELPER ================= */

const renderAuthFlow = () =>
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );

/* ================= TEST SUITE ================= */

describe("Auth Flow (Register → Login)", () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockRegister.mockClear();
  });

  it("should register user then allow login", async () => {
    const user = userEvent.setup();
    renderAuthFlow();

    /* ---------- REGISTER ---------- */

    await user.type(screen.getByLabelText(/name/i), "Darshan");
    await user.type(screen.getByLabelText(/email/i), "darshan@test.com");
    await user.type(screen.getByLabelText(/password/i), "123456");

    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(mockRegister).toHaveBeenCalledTimes(1);

    /* ---------- LOGIN ---------- */

    await user.type(screen.getByLabelText(/email/i), "darshan@test.com");
    await user.type(screen.getByLabelText(/password/i), "123456");

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
