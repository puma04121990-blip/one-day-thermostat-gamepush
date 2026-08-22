import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, migrateSavedState, SAVE_SCHEMA_VERSION } from "./ContentContract";
import { ThermostatSimulation } from "./ThermostatSimulation";

describe("content-version save fallback", () => {
  it("migrates a legacy save and replaces disappeared authored IDs with canonical safe defaults", () => {
    const legacy = new ThermostatSimulation().snapshot() as unknown as Record<string, unknown>;
    delete legacy.schemaVersion;
    delete legacy.contentVersion;
    legacy.configuration = { firmwareId: "firmware.removed", sensorModifierId: "modifier.early_contour", routeModifierId: "modifier.removed", log: [] };
    legacy.service = { tasks: [{ id: "service.removed", resolved: false }], unresolvedReasons: ["cost.removed"], credits: 0, review: { available: false } };
    legacy.achievements = { unlocked: [{ id: "achievement.removed", unlockedTick: 2 }], pendingPlatformTags: ["achievement.removed"] };
    const result = migrateSavedState(legacy);
    expect(result?.state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(result?.state.contentVersion).toBe(CONTENT_VERSION);
    expect(result?.state.configuration.firmwareId).toBe("firmware.surface_memory");
    expect(result?.state.configuration.routeModifierId).toBe("modifier.soft_open");
    expect(result?.state.service.tasks).toHaveLength(0);
    expect(result?.state.achievements.unlocked).toHaveLength(0);
    expect(result?.notes.length).toBeGreaterThan(0);
  });

  it("rejects a future save schema instead of attempting unsafe migration", () => {
    const future = new ThermostatSimulation().snapshot() as unknown as Record<string, unknown>;
    future.schemaVersion = SAVE_SCHEMA_VERSION + 1;
    expect(migrateSavedState(future)).toBeUndefined();
  });
});
