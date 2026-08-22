import { beforeEach, describe, expect, it } from "vitest";
import { ThermostatSimulation } from "./ThermostatSimulation";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const advanceTicks = (simulation: ThermostatSimulation, count: number) => {
  for (let index = 0; index < count; index += 1) simulation.advance(200);
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });
});

describe("ThermostatSimulation", () => {
  it("shows two visible routes before accepting a player command", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    expect(simulation.snapshot().phase).toBe("prologue");
    advanceTicks(simulation, 7);
    const state = simulation.snapshot();
    expect(state.phase).toBe("warning");
    expect(state.options.map((option) => option.id)).toEqual(["careful", "direct"]);
  });

  it("keeps a direct route recoverable and records a material trace", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    simulation.chooseRoute("direct");
    advanceTicks(simulation, 6);
    const aftermath = simulation.snapshot();
    expect(aftermath.phase).toBe("aftermath");
    expect(aftermath.unresolved).toHaveLength(1);
    expect(aftermath.archive.at(-1)?.title).toBe("Порог");
    advanceTicks(simulation, 8);
    expect(simulation.snapshot().chainIndex).toBe(1);
    expect(simulation.snapshot().phase).toBe("prologue");
  });

  it("restores a locally saved day but safely ignores corrupt JSON", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 3);
    const restored = new ThermostatSimulation();
    expect(restored.snapshot().tick).toBe(3);
    localStorage.setItem("one-day-thermostat.phaser.save.v1", "not-json");
    const recovered = new ThermostatSimulation();
    expect(recovered.snapshot().tick).toBe(0);
    expect(recovered.snapshot().started).toBe(false);
  });

  it("previews configuration without mutation and commits a valid selection on the next fixed tick", () => {
    const simulation = new ThermostatSimulation();
    const before = simulation.snapshot();
    const preview = simulation.previewConfiguration("firmware.air_first", "firmware");
    expect(preview.status).toBe("valid");
    expect(simulation.snapshot().configuration.firmwareId).toBe(before.configuration.firmwareId);
    expect(simulation.queueConfiguration(preview)).toBe(true);
    expect(simulation.snapshot().configuration.firmwareId).toBe("firmware.surface_memory");
    simulation.start();
    advanceTicks(simulation, 1);
    const committed = simulation.snapshot();
    expect(committed.configuration.firmwareId).toBe("firmware.air_first");
    expect(committed.configuration.log.at(-1)?.id).toBe("firmware.air_first");
    expect(committed.archive.at(-1)?.tone).toBe("configuration");
  });

  it("blocks unknown configuration and restores a committed configuration from local save", () => {
    const simulation = new ThermostatSimulation();
    const unknown = simulation.previewConfiguration("firmware.unknown", "firmware");
    expect(unknown.status).toBe("blocked");
    expect(simulation.queueConfiguration(unknown)).toBe(false);
    const preview = simulation.previewConfiguration("modifier.direct_boost", "route");
    simulation.queueConfiguration(preview);
    simulation.start();
    advanceTicks(simulation, 1);
    const restored = new ThermostatSimulation();
    expect(restored.snapshot().configuration.routeModifierId).toBe("modifier.direct_boost");
  });

  it("rejects a stale preview without changing the active configuration", () => {
    const simulation = new ThermostatSimulation();
    const preview = simulation.previewConfiguration("firmware.air_first", "firmware");
    simulation.start();
    advanceTicks(simulation, 1);
    expect(simulation.queueConfiguration(preview)).toBe(false);
    expect(simulation.snapshot().configuration.firmwareId).toBe("firmware.surface_memory");
  });
});
