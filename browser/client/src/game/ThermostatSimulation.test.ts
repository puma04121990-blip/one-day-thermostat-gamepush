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

  it("switches semantic sensor diagnostics without allowing presentation to mutate the scenario", () => {
    const simulation = new ThermostatSimulation();
    const before = simulation.snapshot();
    expect(simulation.selectSensor("network")).toBe(true);
    const after = simulation.snapshot();
    expect(after.sensorLayer).toBe("network");
    expect(after.diagnostic.layer).toBe("network");
    expect(after.diagnostic.causes).toHaveLength(2);
    expect(after.scenario.id).toBe(before.scenario.id);
    expect(simulation.selectSensor("unknown" as "heat")).toBe(false);
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
    expect(aftermath.archive.some((entry) => entry.title === "Порог")).toBe(true);
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

  it("materializes one material-only service task and applies bounded recovery once", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    simulation.chooseRoute("direct");
    advanceTicks(simulation, 1);
    const offered = simulation.snapshot();
    const task = offered.service.tasks[0];
    expect(task.id).toBe("service.branch_26.resonance");
    expect(task.componentId).toBe("component.branch_26");
    expect(task.resolved).toBe(false);
    const branchBefore = offered.metrics.branch;
    expect(simulation.queueServiceRecovery(task.id)).toBe(true);
    advanceTicks(simulation, 1);
    const recovered = simulation.snapshot();
    expect(recovered.service.tasks[0].resolved).toBe(true);
    expect(recovered.service.credits).toBe(1);
    expect(recovered.metrics.branch).toBeLessThan(branchBefore);
    expect(simulation.queueServiceRecovery(task.id)).toBe(false);
    const restored = new ThermostatSimulation();
    expect(restored.snapshot().service.tasks[0].resolved).toBe(true);
  });

  it("offers a stewardship review after a careful complete day without an open service task", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    for (let chain = 0; chain < 3; chain += 1) {
      advanceTicks(simulation, 7);
      simulation.chooseRoute("careful");
      advanceTicks(simulation, 14);
    }
    const complete = simulation.snapshot();
    expect(complete.dayComplete).toBe(true);
    expect(complete.service.tasks).toHaveLength(0);
    expect(complete.service.review.key).toBe("review.day.stewardship_complete");
  });

  it("keeps an open material task visible in review after a direct complete day without hard failure", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    for (let chain = 0; chain < 3; chain += 1) {
      advanceTicks(simulation, 7);
      simulation.chooseRoute("direct");
      advanceTicks(simulation, 14);
    }
    const complete = simulation.snapshot();
    expect(complete.dayComplete).toBe(true);
    expect(complete.service.tasks.filter((task) => !task.resolved)).toHaveLength(3);
    expect(complete.service.review.key).toBe("review.day.service_follow_up_open");
  });

  it("unlocks archive and service achievements locally once, persists pending platform tags and permits a safe acknowledgement", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    simulation.chooseRoute("direct");
    advanceTicks(simulation, 6);
    let state = simulation.snapshot();
    expect(state.achievements.unlocked.map((entry) => entry.id)).toContain("achievement.threshold_route");
    const task = state.service.tasks[0];
    simulation.queueServiceRecovery(task.id);
    advanceTicks(simulation, 1);
    state = simulation.snapshot();
    expect(state.achievements.unlocked.map((entry) => entry.id)).toContain("achievement.branch_rebalanced");
    expect(state.achievements.pendingPlatformTags).toContain("achievement.branch_rebalanced");
    advanceTicks(simulation, 2);
    expect(simulation.snapshot().achievements.unlocked.filter((entry) => entry.id === "achievement.branch_rebalanced")).toHaveLength(1);
    const restored = new ThermostatSimulation();
    expect(restored.snapshot().achievements.pendingPlatformTags).toContain("achievement.threshold_route");
    expect(restored.markPlatformAchievementSynced("achievement.threshold_route")).toBe(true);
    expect(restored.markPlatformAchievementSynced("achievement.threshold_route")).toBe(false);
  });

  it("unlocks the quiet route achievement only after its authoritative route fact appears", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    simulation.chooseRoute("careful");
    advanceTicks(simulation, 14);
    advanceTicks(simulation, 7);
    simulation.chooseRoute("careful");
    expect(simulation.snapshot().achievements.unlocked.map((entry) => entry.id)).not.toContain("achievement.quiet_route");
    advanceTicks(simulation, 1);
    expect(simulation.snapshot().achievements.unlocked.map((entry) => entry.id)).toContain("achievement.quiet_route");
  });

  it("activates a valid bounded policy only at the next tick and records its stop condition", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    simulation.chooseRoute("careful");
    advanceTicks(simulation, 14);
    advanceTicks(simulation, 7);
    const preview = simulation.previewPolicy("policy.moisture_window");
    expect(preview.status).toBe("valid");
    expect(simulation.queuePolicy(preview)).toBe(true);
    expect(simulation.snapshot().policy.active).toHaveLength(0);
    advanceTicks(simulation, 1);
    expect(simulation.snapshot().policy.active.map((entry) => entry.id)).toContain("policy.moisture_window");
    expect(simulation.snapshot().achievements.unlocked.map((entry) => entry.id)).toContain("achievement.policy_window");
    advanceTicks(simulation, 6);
    const state = simulation.snapshot();
    expect(state.policy.active).toHaveLength(0);
    expect(state.policy.log.at(-1)?.state).toBe("ended");
    expect(state.archive.some((entry) => entry.tone === "policy" && entry.title.includes("stop condition"))).toBe(true);
  });

  it("blocks a policy outside its authored scenario before it can enter the command queue", () => {
    const simulation = new ThermostatSimulation();
    simulation.start();
    advanceTicks(simulation, 7);
    const preview = simulation.previewPolicy("policy.staged_return");
    expect(preview.status).toBe("blocked");
    expect(preview.reason).toContain("Контекст");
    expect(simulation.queuePolicy(preview)).toBe(false);
    expect(simulation.snapshot().policy.pending).toBeUndefined();
  });
});
