import { vi } from "vitest";

vi.spyOn(console, "error").mockImplementation((...report: unknown[]) => {
  throw new Error(report.map(String).join(" "));
});
