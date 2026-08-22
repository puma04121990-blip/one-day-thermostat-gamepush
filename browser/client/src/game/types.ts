// Design: Тихая технография — дом и его материальные маршруты являются главным интерфейсом.
export type EventPhase = "prologue" | "warning" | "active" | "aftermath" | "complete";

export type RouteKind = "careful" | "direct";

export type ConfigurationChannel = "firmware" | "sensor" | "route";

export type ConfigurationStatus = "valid" | "blocked" | "selected";

export interface ConfigurationDefinition {
  id: string;
  channel: ConfigurationChannel;
  title: string;
  effect: string;
  tradeoff: string;
}

export interface ConfigurationPreview {
  status: ConfigurationStatus;
  selectionId: string;
  channel: ConfigurationChannel;
  title: string;
  effect: string;
  tradeoff: string;
  alternative?: string;
  staleAtTick: number;
}

export interface ConfigurationState {
  firmwareId: string;
  sensorModifierId: string;
  routeModifierId: string;
  pending?: ConfigurationPreview;
  log: Array<{ tick: number; id: string; title: string }>;
}

export interface RouteOption {
  id: RouteKind;
  title: string;
  label: string;
  benefit: string;
  cost: string;
  keyHint: string;
}

export interface JournalEntry {
  tick: number;
  title: string;
  body: string;
  tone: "trace" | "route" | "archive" | "configuration";
}

export interface GameState {
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
  metrics: {
    air: number;
    moisture: number;
    surface: number;
    branch: number;
  };
  dayComplete: boolean;
}
