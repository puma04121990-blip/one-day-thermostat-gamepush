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

  it("adds canonical master sensor, diagnostic, boundary and policy state to a legacy browser save", () => {
    const legacy = new ThermostatSimulation().snapshot() as unknown as Record<string, unknown>;
    legacy.schemaVersion = 2;
    delete legacy.sensorLayer;
    delete legacy.diagnostic;
    delete legacy.scenario;
    delete legacy.boundaries;
    delete legacy.policy;
    const migration = migrateSavedState(legacy);
    expect(migration?.state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migration?.state.sensorLayer).toBe("heat");
    expect(migration?.state.diagnostic.layer).toBe("heat");
    expect(migration?.state.boundaries[0]?.never).toContain("Не диагностировать");
    expect(migration?.state.policy.active).toEqual([]);
  });

  it("adds deterministic event, tutorial, stewardship and consent-first feedback defaults to a schema 3 save", () => {
    const legacy = new ThermostatSimulation().snapshot() as unknown as Record<string, unknown>;
    legacy.schemaVersion = 3;
    delete legacy.scenarioSeed;
    delete legacy.event;
    delete legacy.tutorial;
    delete legacy.stewardship;
    delete legacy.feedback;
    const migration = migrateSavedState(legacy);
    expect(migration?.state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migration?.state.scenarioSeed).toBe(104729);
    expect(migration?.state.event.state).toBe("dormant");
    expect(migration?.state.tutorial.current).toBe("observe_heat");
    expect(migration?.state.stewardship.recognitions).toEqual([]);
    expect(migration?.state.feedback).toEqual({ consent: "undecided", entries: [] });
  });

  it("adds safe blackout and replay defaults to a schema 4 save and constrains malformed reserve data", () => {
    const legacy = new ThermostatSimulation().snapshot() as unknown as Record<string, unknown>;
    legacy.schemaVersion = 4;
    delete legacy.blackout;
    delete legacy.replay;
    const defaults = migrateSavedState(legacy);
    expect(defaults?.state.blackout).toMatchObject({ phase: "inactive", reserveCells: 5, usedActions: [] });
    expect(defaults?.state.replay).toEqual({ version: 1, commands: [] });

    legacy.blackout = { phase: "dark_baseline", reserveCells: 99, usedActions: ["lock_route", "lock_route", "unknown"], focusedSensor: "unknown" };
    legacy.replay = { commands: [{ tick: 2, kind: "route", route: "careful" }, { tick: -1, kind: "unknown" }] };
    const normalized = migrateSavedState(legacy);
    expect(normalized?.state.blackout.reserveCells).toBe(5);
    expect(normalized?.state.blackout.usedActions).toEqual(["lock_route"]);
    expect(normalized?.state.blackout.focusedSensor).toBeUndefined();
    expect(normalized?.state.replay.commands).toEqual([{ tick: 2, kind: "route", route: "careful" }]);
  });
});
