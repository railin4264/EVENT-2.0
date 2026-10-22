// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { ImportPlanDraft } from "./ImportPlanDraft";
const mocks = vi.hoisted(() => ({
  user: { _id: "owner" } as any,
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ user: mocks.user }),
}));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: mocks.get, post: mocks.post },
}));
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  mocks.user = { _id: "owner" };
  mocks.get.mockResolvedValue({
    data: {
      success: true,
      data: {
        fields: {
          title: "Borrador musical",
          timeZone: "America/Santo_Domingo",
        },
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("opening a private draft only reads and does not apply or publish", async () => {
  const apply = vi.fn();
  render(<ImportPlanDraft id="aaaaaaaaaaaaaaaaaaaaaaaa" onApply={apply} />);
  await screen.findByRole("button", { name: "Aplicar borrador revisado" });
  expect(mocks.get).toHaveBeenCalledWith(
    "/planning-tools/drafts/aaaaaaaaaaaaaaaaaaaaaaaa",
  );
  expect(apply).not.toHaveBeenCalled();
  expect(mocks.post).not.toHaveBeenCalled();
});
it("applying needs an explicit confirmation and preserves server draft", async () => {
  const apply = vi.fn(),
    confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<ImportPlanDraft id="aaaaaaaaaaaaaaaaaaaaaaaa" onApply={apply} />);
  const button = await screen.findByRole("button", {
    name: "Aplicar borrador revisado",
  });
  fireEvent.click(button);
  expect(apply).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(button);
  expect(apply).toHaveBeenCalledWith({
    title: "Borrador musical",
    timeZone: "America/Santo_Domingo",
  });
  expect(mocks.post).not.toHaveBeenCalled();
  confirm.mockRestore();
});
it("late draft responses cannot fill a different account", async () => {
  let resolve: any;
  mocks.get.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = render(
    <ImportPlanDraft id="aaaaaaaaaaaaaaaaaaaaaaaa" onApply={vi.fn()} />,
  );
  mocks.user = null;
  view.rerender(
    <ImportPlanDraft id="aaaaaaaaaaaaaaaaaaaaaaaa" onApply={vi.fn()} />,
  );
  resolve({
    data: { success: true, data: { fields: { title: "Old private title" } } },
  });
  await waitFor(() =>
    expect(screen.queryByText(/Old private title/)).toBeNull(),
  );
  expect(
    screen.queryByRole("button", { name: "Aplicar borrador revisado" }),
  ).toBeNull();
});
it("a rejected owner lookup exposes an error without an import button", async () => {
  mocks.get.mockRejectedValue(new Error("404"));
  render(<ImportPlanDraft id="aaaaaaaaaaaaaaaaaaaaaaaa" onApply={vi.fn()} />);
  await screen.findByRole("alert");
  expect(
    screen.queryByRole("button", { name: "Aplicar borrador revisado" }),
  ).toBeNull();
});
