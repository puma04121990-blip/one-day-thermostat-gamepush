import type { GameState, PolicyDefinition, PolicyPreview } from "./types";

export const POLICY_CATALOG: readonly PolicyDefinition[] = [
  { id: "policy.moisture_window", title: "Сухой интервал", when: "серебряный остаток держится после спада воздуха", if: "дренажный маршрут свободен и нет активного service commit", then: "разделить влагу и воздух на короткий интервал", until: "влажный остаток вернулся к читаемому baseline", price: "маршрут идёт медленнее и не ускоряет кухонный ритм", scenarioId: "scenario.lera_kitchen" },
  { id: "policy.staged_return", title: "Поэтапный возврат", when: "ночной контур собирает второй пик", if: "ветвь доступна для recovery и нет прямого импульса в очереди", then: "вернуть сегменты в заранее видимом порядке", until: "ветвь вышла из дробного паттерна", price: "отклик спокойнее и дольше; немедленного снятия пика нет", scenarioId: "scenario.quiet_cycle" }
] as const;

export function policyDefinition(id: string) { return POLICY_CATALOG.find((policy) => policy.id === id); }
export function isKnownPolicyId(id: string) { return Boolean(policyDefinition(id)); }

export function previewPolicy(state: GameState, id: string): PolicyPreview {
  const policy = policyDefinition(id);
  if (!policy) return { status: "blocked", policyId: id, title: "Неизвестное правило", when: "Правило отсутствует в безопасном каталоге.", if: "Проверка не выполняется.", then: "Действие не будет поставлено в очередь.", until: "Нет stop condition.", price: "Выбери видимое правило.", reason: "Неизвестный ID не может изменить день.", alternative: "Выбери правило из каталога.", staleAtTick: state.tick + 1 };
  if (state.policy.active.some((active) => active.id === id) || state.policy.pending?.policyId === id) return { status: "selected", policyId: id, title: policy.title, when: policy.when, if: policy.if, then: policy.then, until: policy.until, price: policy.price, reason: "Это правило уже активно или ожидает следующего тика.", staleAtTick: state.tick + 1 };
  if (state.scenario.id !== policy.scenarioId) return { status: "blocked", policyId: id, title: policy.title, when: policy.when, if: policy.if, then: policy.then, until: policy.until, price: policy.price, reason: "Контекст текущей сцены не подтверждает это правило.", alternative: "Сначала дочитай два предвестника текущего сценария.", staleAtTick: state.tick + 1 };
  if (state.phase !== "warning") return { status: "blocked", policyId: id, title: policy.title, when: policy.when, if: policy.if, then: policy.then, until: policy.until, price: policy.price, reason: "Policy доступна только до commit маршрута, когда цена ещё видима.", alternative: "Дождись фазы решения или выбери маршрут вручную.", staleAtTick: state.tick + 1 };
  return { status: "valid", policyId: id, title: policy.title, when: policy.when, if: policy.if, then: policy.then, until: policy.until, price: policy.price, staleAtTick: state.tick + 1 };
}
