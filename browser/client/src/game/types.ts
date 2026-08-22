export type EventPhase = "prologue" | "warning" | "active" | "aftermath" | "complete";

export type RouteKind = "careful" | "direct";
export type SensorLayer = "heat" | "air" | "vibration" | "moisture" | "network" | "surface" | "memory";
export type DiagnosticStatus = "stable" | "elevated" | "strained" | "warning" | "protective";

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

export interface AchievementDefinition { id: string; title: string; description: string; trigger: "archive" | "review" | "service" | "policy"; triggerKey: string; }
export interface UnlockedAchievement { id: string; unlockedTick: number; }
export interface AchievementState { unlocked: UnlockedAchievement[]; pendingPlatformTags: string[]; }

export interface RouteOption { id: RouteKind; title: string; label: string; benefit: string; cost: string; keyHint: string; }
export interface JournalEntry { tick: number; title: string; body: string; tone: "trace" | "route" | "archive" | "configuration" | "service" | "achievement" | "policy" | "event" | "tutorial" | "stewardship" | "feedback"; }
export interface SensorReading { source: string; change: string; causes: string[]; forecast: string; caption: string; }
export interface DiagnosticState { layer: SensorLayer; source: string; change: string; causes: string[]; forecast: string; status: DiagnosticStatus; caption: string; }
export interface ResidentBoundaryCard { id: string; materialSignature: string; context: string; adaptation: string; playerScope: string; never: string; }
export interface ScenarioDefinition { id: string; title: string; trace: string; caption: string; archive: string; careful: RouteOption; direct: RouteOption; carefulResult: string; directResult: string; foreshadows: string[]; cooldownFamily: string; boundary: ResidentBoundaryCard; readings: Record<SensorLayer, SensorReading>; }
export interface ScenarioState { id: string; foreshadows: string[]; cooldownFamily: string; }
export interface PolicyDefinition { id: string; title: string; when: string; if: string; then: string; until: string; price: string; scenarioId: string; }
export interface PolicyPreview { status: "valid" | "blocked" | "selected"; policyId: string; title: string; when: string; if: string; then: string; until: string; price: string; reason?: string; alternative?: string; staleAtTick: number; }
export interface ActivePolicy { id: string; startedTick: number; untilTick: number; }
export interface PolicyState { active: ActivePolicy[]; pending?: PolicyPreview; log: Array<{ tick: number; id: string; title: string; state: "active" | "ended" | "blocked" }>; }

export type ClimateEventState = "dormant" | "foreshadow" | "warning" | "active" | "stabilized" | "aftermath";
export type EmergencyAction = "safe" | "direct";
export interface ClimateEventDefinition { id: string; familyId: string; title: string; scenarioId: string; foreshadows: [string, string]; reason: string; safe: RouteOption; direct: RouteOption; safeOutcome: string; directOutcome: string; cooldownTicks: number; }
export interface ClimateEventInstance { id: string; familyId: string; seed: number; state: ClimateEventState; startedTick?: number; foreshadowsObserved: string[]; selectedAction?: EmergencyAction; cooldownUntilTick: number; blockedReason?: string; }

export type TutorialBeatId = "observe_heat" | "read_vibration" | "compare_routes" | "remember_consequence" | "complete";
export interface TutorialState { current: TutorialBeatId; completed: TutorialBeatId[]; hintsShown: TutorialBeatId[]; }
export interface StewardshipRecognition { id: string; tick: number; title: string; reason: string; }
export interface StewardshipState { recognitions: StewardshipRecognition[]; repeatGate: string[]; }
export type FeedbackConsent = "undecided" | "accepted" | "declined";
export type FeedbackTopic = "cause" | "cost" | "accessibility";
export interface LocalFeedbackEntry { tick: number; topic: FeedbackTopic; understanding: "clear" | "unclear"; }
export interface LocalFeedbackState { consent: FeedbackConsent; entries: LocalFeedbackEntry[]; }

export type BlackoutPhase = "inactive" | "grid_warning" | "failover" | "reserve_triage" | "dark_baseline" | "grid_return" | "afterglow";
export type ReserveFocusSensor = "surface" | "vibration" | "moisture";
export type ReserveActionId = "focus_sense" | "lock_route" | "pulse_shunt";
export type GridReturnStep = "listen" | "stabilize" | "reintroduce" | "observe" | "afterglow";
export interface BlackoutState {
  phase: BlackoutPhase;
  reserveCells: number;
  foreshadows: [string, string];
  startedTick?: number;
  phaseStartedTick?: number;
  focusedSensor?: ReserveFocusSensor;
  usedActions: ReserveActionId[];
  returnStep?: GridReturnStep;
  passivePreparation: boolean;
}

export type ReplayCommand =
  | { tick: number; kind: "start" }
  | { tick: number; kind: "route"; route: RouteKind }
  | { tick: number; kind: "sensor"; layer: SensorLayer }
  | { tick: number; kind: "configuration"; id: string; channel: ConfigurationChannel }
  | { tick: number; kind: "policy"; id: string }
  | { tick: number; kind: "service"; taskId: string }
  | { tick: number; kind: "reserve"; action: ReserveActionId; focus?: ReserveFocusSensor }
  | { tick: number; kind: "feedback_consent"; consent: FeedbackConsent }
  | { tick: number; kind: "feedback"; topic: FeedbackTopic; understanding: "clear" | "unclear" };
export interface ReplayState { version: 1; commands: ReplayCommand[]; }
export interface ReplayRecord { version: 1; schemaVersion: number; contentVersion: string; scenarioSeed: number; finalTick: number; commands: ReplayCommand[]; }

export interface GameState {
  schemaVersion: number;
  contentVersion: string;
  started: boolean;
  phase: EventPhase;
  chainIndex: number;
  tick: number;
  scenarioSeed: number;
  chainTitle: string;
  trace: string;
  caption: string;
  options: RouteOption[];
  archive: JournalEntry[];
  unresolved: string[];
  configuration: ConfigurationState;
  service: ServiceState;
  achievements: AchievementState;
  metrics: { air: number; moisture: number; surface: number; branch: number; network: number; wear: number; rhythm: number; reserve: number; };
  sensorLayer: SensorLayer;
  diagnostic: DiagnosticState;
  scenario: ScenarioState;
  boundaries: ResidentBoundaryCard[];
  policy: PolicyState;
  event: ClimateEventInstance;
  tutorial: TutorialState;
  stewardship: StewardshipState;
  feedback: LocalFeedbackState;
  blackout: BlackoutState;
  replay: ReplayState;
  dayComplete: boolean;
}
