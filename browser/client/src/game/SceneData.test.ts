import { describe, expect, it } from "vitest";
import { isSceneData } from "./SceneData";
import { ThermostatSimulation } from "./ThermostatSimulation";

describe("Phaser scene startup data", () => {
  it("accepts the complete simulation payload and rejects an auto-start without payload", () => {
    expect(isSceneData(undefined)).toBe(false);
    expect(isSceneData({ simulation: new ThermostatSimulation() })).toBe(false);
    expect(isSceneData({ simulation: new ThermostatSimulation(), onState: () => {}, reducedMotion: false })).toBe(false);
    expect(isSceneData({ simulation: new ThermostatSimulation(), onState: () => {}, reducedMotion: false, onSceneReady: () => {} })).toBe(true);
  });
});
