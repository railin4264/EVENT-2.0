// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { consumeOAuthIntent, rememberOAuthIntent } from "./oauth-state";

const state = "a".repeat(64);
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
const remember = (redirect = "/events/123") =>
  rememberOAuthIntent("google", { state, mode: "login", redirect });

it("keeps the intended event and consumes the callback only once", () => {
  remember();
  expect(consumeOAuthIntent("google", state).redirect).toBe("/events/123");
  expect(() => consumeOAuthIntent("google", state)).toThrow();
});
it("rejects callbacks from another tab or provider", () => {
  expect(() => consumeOAuthIntent("google", state)).toThrow();
  remember();
  expect(() => consumeOAuthIntent("facebook", state)).toThrow();
  expect(consumeOAuthIntent("google", state).mode).toBe("login");
});
it("rejects a mismatched state and removes it", () => {
  remember();
  expect(() => consumeOAuthIntent("google", "b".repeat(64))).toThrow();
  expect(sessionStorage.getItem("eventnow:oauth:google")).toBeNull();
});
it("rejects expired or corrupted saved intents", () => {
  vi.spyOn(Date, "now").mockReturnValue(1000000);
  remember();
  vi.mocked(Date.now).mockReturnValue(1600001);
  expect(() => consumeOAuthIntent("google", state)).toThrow();
  sessionStorage.setItem("eventnow:oauth:google", "{invalid");
  expect(() => consumeOAuthIntent("google", state)).toThrow();
});
it("blocks external redirects and malformed provider state", () => {
  remember("https://attacker.example");
  expect(consumeOAuthIntent("google", state).redirect).toBe("/events");
  expect(() =>
    rememberOAuthIntent("google", { state: "", mode: "login", redirect: "/" }),
  ).toThrow();
});
