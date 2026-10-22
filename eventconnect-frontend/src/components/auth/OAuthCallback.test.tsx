// @vitest-environment jsdom
import React, { StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import OAuthCallback from "./OAuthCallback";
import { rememberOAuthIntent } from "@/lib/auth/oauth-state";

const mocks = vi.hoisted(() => ({
  provider: "google",
  query: new URLSearchParams(),
  replace: vi.fn(),
  loginOAuth: vi.fn(),
  login: vi.fn(),
  validateToken: vi.fn(),
  link: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ provider: mocks.provider }),
  useSearchParams: () => mocks.query,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    loginOAuth: mocks.loginOAuth,
    login: mocks.login,
    validateToken: mocks.validateToken,
    isAuthenticated: false,
  }),
}));
vi.mock("@/lib/api/oauth", () => ({
  oauthService: { linkAccount: mocks.link },
}));
const state = "a".repeat(64);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.provider = "google";
  mocks.query = new URLSearchParams({ code: "one-use-code", state });
  mocks.loginOAuth.mockResolvedValue(undefined);
  mocks.login.mockResolvedValue(undefined);
  rememberOAuthIntent("google", {
    state,
    mode: "login",
    redirect: "/events/123",
  });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it("exchanges once in StrictMode and returns to the intended event", async () => {
  render(
    <StrictMode>
      <OAuthCallback />
    </StrictMode>,
  );
  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith("/events/123"),
  );
  expect(mocks.loginOAuth).toHaveBeenCalledTimes(1);
  expect(mocks.loginOAuth).toHaveBeenCalledWith(
    "google",
    "one-use-code",
    state,
  );
});
it("does not contact the API for an unsolicited callback", async () => {
  sessionStorage.clear();
  render(<OAuthCallback />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(mocks.loginOAuth).not.toHaveBeenCalled();
});
it("handles cancellation without exchanging a code", async () => {
  mocks.query = new URLSearchParams({ state, error: "access_denied" });
  render(<OAuthCallback />);
  expect(await screen.findByText(/Cancelaste el acceso/)).toBeTruthy();
  expect(mocks.loginOAuth).not.toHaveBeenCalled();
});
it("completes the existing second factor flow before navigating", async () => {
  mocks.loginOAuth.mockRejectedValue({
    requiresTwoFactor: true,
    tempToken: "short-lived-challenge",
  });
  render(<OAuthCallback />);
  const input = await screen.findByLabelText("Código de seis dígitos");
  expect(mocks.replace).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "123456" } });
  fireEvent.submit(input.closest("form")!);
  await waitFor(() =>
    expect(mocks.replace).toHaveBeenCalledWith("/events/123"),
  );
  expect(mocks.login).toHaveBeenCalledWith({
    email: "",
    password: "",
    tempToken: "short-lived-challenge",
    code: "123456",
  });
});
it("shows a recovery path after an API failure", async () => {
  mocks.loginOAuth.mockRejectedValue(new Error("Servicio no disponible"));
  render(<OAuthCallback />);
  expect(await screen.findByText("Servicio no disponible")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Volver al inicio de sesión" })
      .getAttribute("href"),
  ).toBe("/login");
  expect(mocks.replace).not.toHaveBeenCalled();
});
