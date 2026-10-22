// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuthStore } from "./authStore";

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
vi.mock("@/lib/performance/apiCache", () => ({ apiCache: { clear: vi.fn() } }));
vi.mock("@/stores/chatStore", () => ({ useChatStore: { setState: vi.fn() } }));
beforeEach(() => {
  // Node 25 exposes its experimental localStorage before jsdom installs one.
  // Tests use a browser-shaped store, independently of that host feature.
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
  });
  useAuthStore.getState().logout();
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

it("accepts the callback response and persists only the app session", async () => {
  api.post.mockResolvedValue({
    data: { user: { id: "viewer", username: "viewer" }, token: "app-access" },
  });
  await useAuthStore.getState().loginOAuth("google", "code", "state");
  expect(api.post).toHaveBeenCalledWith("/oauth/google/callback", {
    code: "code",
    state: "state",
  });
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
  expect(sessionStorage.getItem("auth-token")).toBe("app-access");
});
it("a second factor challenge never becomes an authenticated session", async () => {
  api.post.mockResolvedValue({
    data: { requiresTwoFactor: true, tempToken: "temporary" },
  });
  await expect(
    useAuthStore.getState().loginOAuth("google", "code", "state"),
  ).rejects.toMatchObject({ requiresTwoFactor: true, tempToken: "temporary" });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(sessionStorage.getItem("auth-token")).toBeNull();
  expect(sessionStorage.getItem("auth-storage")).not.toContain("temporary");
});
it("does not retain a previous session after a failed account switch", async () => {
  sessionStorage.setItem("auth-token", "previous-user");
  api.post.mockRejectedValue(new Error("Provider unavailable"));
  await expect(
    useAuthStore.getState().loginOAuth("google", "code", "state"),
  ).rejects.toThrow();
  expect(useAuthStore.getState().user).toBeNull();
  expect(sessionStorage.getItem("auth-token")).toBeNull();
});
