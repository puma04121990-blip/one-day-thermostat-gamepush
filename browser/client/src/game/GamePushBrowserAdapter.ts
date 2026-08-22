// GamePush browser bridge stays inert until a real test project provides an injected, verified SDK client.
// Local save always precedes dispatch; this module contains no credentials, project IDs or guessed global SDK calls.
import { ThermostatSimulation } from "./ThermostatSimulation";

export type GamePushReadiness = "disabled" | "ready";

export interface VerifiedGamePushClient {
  readonly readiness: "ready";
  unlockAchievement(achievementId: string): Promise<boolean>;
  saveProgress?(payload: string): Promise<boolean>;
}

export class GamePushBrowserAdapter {
  public readonly readiness: GamePushReadiness;
  public constructor(private readonly client?: VerifiedGamePushClient) { this.readiness = client ? "ready" : "disabled"; }

  /**
   * Acknowledges a tag only after the injected client resolves true. A rejected or missing platform never erases local progress.
   */
  public async flushPendingAchievements(simulation: ThermostatSimulation) {
    if (!this.client) return { dispatched: 0, pending: simulation.snapshot().achievements.pendingPlatformTags.length };
    let dispatched = 0;
    for (const achievementId of [...simulation.snapshot().achievements.pendingPlatformTags]) {
      if (await this.client.unlockAchievement(achievementId) && simulation.markPlatformAchievementSynced(achievementId)) dispatched += 1;
    }
    return { dispatched, pending: simulation.snapshot().achievements.pendingPlatformTags.length };
  }
}
