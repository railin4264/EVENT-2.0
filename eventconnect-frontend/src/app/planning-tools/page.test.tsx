// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PlanningTools from "./page";

const mocks = vi.hoisted(() => ({ user: null as any, get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("@/stores/authStore", () => ({ useAuthStore: (selector: any) => selector({ user: mocks.user }) }));
vi.mock("@/lib/api/client", () => ({ apiClient: mocks }));
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  mocks.user = null;
  mocks.get.mockResolvedValue({ data: { success: true, data: [] } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lets guests search with an explicit time window and manual travel allowance", async () => {
  mocks.get.mockResolvedValue({ data: { success: true, data: [{ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Café y libros", date: "2026-11-20T23:00:00Z", endDate: "2026-11-21T00:00:00Z", city: "Santo Domingo" }] } });
  render(<PlanningTools />);
  fireEvent.change(screen.getByLabelText("Disponible desde"), { target: { value: "2026-11-20T18:00" } });
  fireEvent.change(screen.getByLabelText("Debo regresar antes de"), { target: { value: "2026-11-20T22:00" } });
  fireEvent.change(screen.getByLabelText("Minutos por trayecto"), { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar planes que encajan" }));
  expect((await screen.findByRole("link", { name: /Café y libros/ })).getAttribute("href")).toBe("/events/aaaaaaaaaaaaaaaaaaaaaaaa");
  expect(mocks.get).toHaveBeenCalledWith("/planning-tools/free-time", { params: { from: new Date('2026-11-20T18:00').toISOString(), until: new Date('2026-11-20T22:00').toISOString(), travelMinutes: 30, city: undefined } });
  expect(mocks.post).not.toHaveBeenCalled();
});

it("parses only on request and saves privately without publishing an event", async () => {
  mocks.user = { _id: "owner" };
  mocks.post.mockImplementation(async (path: string) => ({ data: { success: true, data: path.endsWith("parse") ? { fields: { title: "Coro de lectura" }, warnings: ["Revisa la fecha"] } : { _id: "draft", fields: { title: "Coro de lectura" } } } }));
  render(<PlanningTools />);
  fireEvent.change(screen.getByLabelText("Mensaje para revisar"), { target: { value: "Título: Coro de lectura" } });
  expect(mocks.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Preparar campos para revisar" }));
  await screen.findByText("Revisa la fecha");
  expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Coro de lectura");
  fireEvent.click(screen.getByRole("button", { name: "Guardar borrador privado" }));
  expect((await screen.findByRole("link", { name: /Revisar en creación/ })).getAttribute("href")).toBe("/events/create?draft=draft");
  expect(mocks.post.mock.calls.map((call) => call[0])).toEqual(["/planning-tools/parse", "/planning-tools/drafts"]);
});

it("discards a late private response after switching accounts", async () => {
  mocks.user = { _id: "first" };
  let finish!: (value: any) => void;
  mocks.get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const view = render(<PlanningTools />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/planning-tools/drafts"));
  mocks.user = { _id: "second" };
  view.rerender(<PlanningTools />);
  await act(async () => { finish({ data: { success: true, data: [{ _id: "private", fields: { title: "Private first account" } }] } }); });
  expect(screen.queryByText("Private first account")).toBeNull();
});
