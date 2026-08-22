// Design: Тихая технография — every service task names a material component and one bounded recovery; residents are never targets.
import type { ServiceTask } from "./types";

type ServiceTemplate = Omit<ServiceTask, "createdTick" | "completedTick" | "resolved">;

const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  "cost.branch_26_resonance": { id: "service.branch_26.resonance", componentId: "component.branch_26", reasonId: "cost.branch_26_resonance", trace: "Резонанс ветви 26", action: "Сбалансировать ветвь", outcome: "Ветвь 26 получила bounded recovery." },
  "cost.kitchen_queue": { id: "service.kitchen_drain.queue", componentId: "component.kitchen_drain", reasonId: "cost.kitchen_queue", trace: "Очередь кухонного контура", action: "Очистить окно дренажа", outcome: "Окно дренажа снова разделяет материальный ритм." },
  "cost.second_network_peak": { id: "service.network_main.peak", componentId: "component.network_main", reasonId: "cost.second_network_peak", trace: "Второй peak сети", action: "Вернуть сеть по этапам", outcome: "Сетевой возврат разбит на восстанавливаемые этапы." }
};

export function serviceTemplateFor(reasonId: string) { return SERVICE_TEMPLATES[reasonId]; }

export function createServiceTask(reasonId: string, tick: number): ServiceTask | undefined {
  const template = serviceTemplateFor(reasonId);
  return template ? { ...template, createdTick: tick, resolved: false } : undefined;
}
