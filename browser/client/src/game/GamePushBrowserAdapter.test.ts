import { describe, expect, it } from "vitest";
import { GamePushBrowserAdapter } from "./GamePushBrowserAdapter";
import { ThermostatSimulation } from "./ThermostatSimulation";

const advance = (simulation: ThermostatSimulation, ticks: number) => { for (let index = 0; index < ticks; index += 1) simulation.advance(200); };

describe("GamePush browser adapter boundary", () => {
  it("never removes local pending tags while disabled", async () => {
    const simulation = new ThermostatSimulation(); simulation.reset(); simulation.start(); advance(simulation, 7); simulation.chooseRoute("direct"); advance(simulation, 6);
    const adapter = new GamePushBrowserAdapter();
    expect((await adapter.flushPendingAchievements(simulation)).dispatched).toBe(0);
    expect(simulation.snapshot().achievements.pendingPlatformTags).toContain("achievement.threshold_route");
  });

  it("acknowledges only IDs accepted by an injected verified client", async () => {
    const simulation = new ThermostatSimulation(); simulation.reset(); simulation.start(); advance(simulation, 7); simulation.chooseRoute("direct"); advance(simulation, 6);
    const adapter = new GamePushBrowserAdapter({ readiness: "ready", unlockAchievement: async (id) => id === "achievement.threshold_route" });
    expect((await adapter.flushPendingAchievements(simulation)).dispatched).toBe(1);
    expect(simulation.snapshot().achievements.pendingPlatformTags).not.toContain("achievement.threshold_route");
  });
});
