export type EventPhase = "prologue" | "warning" | "active" | "aftermath" | "complete";

export type RouteKind = "careful" | "direct";

export type ConfigurationChannel = "firmware" | "sensor" | "route";
export type ConfigurationStatus = "valid" | "blocked" | "selected";

export interface ConfigurationDefinition { id: string; channel: ConfigurationChannel; title: string; effect: string; tradeoff: string; }
export interface ConfigurationPreview { status: ConfigurationStatus; selectionId: string; channel: ConfigurationChannel; title: string; effect: string; tradeoff: string; alternative?: string; staleAtTick: number; }
export interface ConfigurationState { firmwareId: string; sensorModifierId: string; routeModifierId: string; pending?: ConfigurationPreview; log: Array<{ tick: number; id: string; title: string }>; }

export interface ServiceTask {
  id: string;
  componentId: "component.branch_26" | "component.kitchen_drain" | "component.network_main";
  reasonId: string;
  trace: string;
  action: string;
  outcome: string;
  createdTick: number;
  completedTick?: number;
  resolved: boolean;
}

export interface EndOfDayReview { available: boolean; key?: "review.day.stewardship_complete" | "review.day.service_follow_up_open"; text?: string; }
export interface ServiceState { tasks: ServiceTask[]; unresolvedReasons: string[]; pendingTaskId?: string; credits: number; review: EndOfDayReview; }

export interface AchievementDefinition { id: string; title: string; description: string; trigger: "archive" | "review" | "service"; triggerKey: string; }
export interface UnlockedAchievement { id: string; unlockedTick: number; }
export interface AchievementState { unlocked: UnlockedAchievement[]; pendingPlatformTags: string[]; }

export interface RouteOption { id: RouteKind; title: string; label: string; benefit: string; cost: string; keyHint: string; }
export interface JournalEntry { tick: number; title: string; body: string; tone: "trace" | "route" | "archive" | "configuration" | "service" | "achievement"; }

export interface GameState {
  schemaVersion: number;
  contentVersion: string;
  started: boolean;
  phase: EventPhase;
  chainIndex: number;
  tick: number;
  chainTitle: string;
  trace: string;
  caption: string;
  options: RouteOption[];
  archive: JournalEntry[];
  unresolved: string[];
  configuration: ConfigurationState;
  service: ServiceState;
  achievements: AchievementState;
  metrics: { air: number; moisture: number; surface: number; branch: number; };
  dayComplete: boolean;
}
