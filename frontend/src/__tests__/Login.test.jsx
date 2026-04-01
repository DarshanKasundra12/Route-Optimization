// import React from "react";
// import { render, screen } from "@testing-library/react";
// import { describe, it, expect, vi } from "vitest";
// import "@testing-library/jest-dom";
// import { MemoryRouter } from "react-router-dom";
// import Login from "../pages/Login";

// /* ✅ Mock Auth hook */
// vi.mock("../context/AuthContext", () => ({
//   useAuth: () => ({
//     login: vi.fn(),
//   }),
// }));

// describe("Login Page", () => {
//   it("renders login button", () => {
//     render(
//       <MemoryRouter>
//         <Login />
//       </MemoryRouter>,
//     );

//     const button = screen.getByRole("button", { name: /sign in/i });
//     expect(button).toBeInTheDocument();
//   });
// });
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

/* ================= MOCKS ================= */

const mockLogin = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

/* ============== RENDER HELPER ============== */

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

/* ============== TEST SUITE ============== */

describe("Login Page (Production QA)", () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  /* ---------- UI Render Test ---------- */
  it("should render login form elements", () => {
    renderLogin();

    expect(
      screen.getByRole("heading", { name: /welcome back/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  /* ---------- Successful Login ---------- */
  it("should call login when valid credentials are submitted", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "123456");

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  /* ---------- Empty Validation ---------- */
  it("should not call login if fields are empty", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).not.toHaveBeenCalled();
  });
});
