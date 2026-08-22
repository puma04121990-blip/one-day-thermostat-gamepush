// Design: Тихая технография — achievements record recoverable stewardship facts; they never unlock power, rank people or change simulation outcomes.
import type { AchievementDefinition, AchievementState, GameState } from "./types";

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  { id: "achievement.threshold_route", title: "Карта порога", description: "Материальный след порога сохранён в Archive.", trigger: "archive", triggerKey: "Порог" },
  { id: "achievement.quiet_route", title: "Тихий дренаж", description: "Для коридора выбран разделённый, бережный маршрут.", trigger: "archive", triggerKey: "Тихий дренаж" },
  { id: "achievement.day_gathered", title: "День собран", description: "День завершён с восстанавливаемым baseline и без открытых задач.", trigger: "review", triggerKey: "review.day.stewardship_complete" },
  { id: "achievement.branch_rebalanced", title: "Ветвь возвращена", description: "Резонанс ветви 26 получил bounded material recovery.", trigger: "service", triggerKey: "service.branch_26.resonance" }
] as const;

export const EMPTY_ACHIEVEMENTS: AchievementState = { unlocked: [], pendingPlatformTags: [] };

export function achievementDefinition(id: string) { return ACHIEVEMENT_CATALOG.find((definition) => definition.id === id); }
export function isKnownAchievementId(id: string) { return Boolean(achievementDefinition(id)); }

export function isAchievementTriggered(state: GameState, definition: AchievementDefinition) {
  if (definition.trigger === "archive") return state.archive.some((entry) => entry.title === definition.triggerKey);
  if (definition.trigger === "review") return state.service.review.available && state.service.review.key === definition.triggerKey;
  return state.service.tasks.some((task) => task.id === definition.triggerKey && task.resolved);
}
