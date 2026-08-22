import { describe, expect, it } from "vitest";
import { serviceTraceKey } from "./ServiceCatalog";

describe("service trace UI identity", () => {
  it("keeps duplicate visible trace text as distinct React-safe keys", () => {
    const trace = "порог восстановится медленнее; импульс ветви ограничен";
    expect(serviceTraceKey(trace, 0)).not.toBe(serviceTraceKey(trace, 1));
  });
});
