import type { ClimateEventDefinition, GameState, RouteOption } from "./types";

const option = (id: "careful" | "direct", title: string, label: string, benefit: string, cost: string, keyHint: string): RouteOption => ({ id, title, label, benefit, cost, keyHint });

export const CLIMATE_EVENTS: readonly ClimateEventDefinition[] = [
  {
    id: "event.branch_26_quiet",
    familyId: "branch-26-emergency",
    title: "Ветвь 26 просит тишины",
    scenarioId: "scenario.arcady_threshold",
    foreshadows: ["Вибрация ветви 26 дробится до резкого перепада.", "Preview показывает краткую пульсацию у входного маршрута."],
    reason: "Пороговый фронт и накопленная нагрузка ветви пересеклись. Контур ограничивает риск, а не наказывает игрока.",
    safe: option("careful", "Safe-flow и буфер", "Тихая стабилизация", "сохранить обход и окно recovery", "порог вернётся медленнее", "Q"),
    direct: option("direct", "Карантин и шунт", "Быстрая отсечка", "быстро защитить ветвь от нового пика", "входной маршрут сузится до service window", "E"),
    safeOutcome: "Ветвь перешла на тихий обход. Порог восстанавливается медленнее, но окно recovery осталось видимым.",
    directOutcome: "Ветвь получила безопасную отсечку и короткий шунт. Входной маршрут сузился до service window, без hard fail.",
    cooldownTicks: 60
  }
] as const;

export function climateEventDefinition(id: string) { return CLIMATE_EVENTS.find((event) => event.id === id); }

export function isBranchEmergencyEligible(state: GameState) {
  return state.scenario.id === "scenario.arcady_threshold"
    && state.phase === "warning"
    && state.metrics.branch >= .42
    && state.tutorial.completed.includes("read_vibration")
    && state.event.cooldownUntilTick <= state.tick
    && state.event.state === "dormant";
}
