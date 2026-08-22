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
});
