import { ThermostatSimulation } from "./ThermostatSimulation";
import type { GameState } from "./types";

export type SceneData = { simulation: ThermostatSimulation; onState: (state: GameState) => void; reducedMotion: boolean };

export function isSceneData(data: unknown): data is SceneData {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<SceneData>;
  return candidate.simulation instanceof ThermostatSimulation && typeof candidate.onState === "function" && typeof candidate.reducedMotion === "boolean";
}
