// Design: Тихая технография — дом и его материальные маршруты являются главным интерфейсом.
export type EventPhase = "prologue" | "warning" | "active" | "aftermath" | "complete";

export type RouteKind = "careful" | "direct";

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
  tone: "trace" | "route" | "archive";
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
  metrics: {
    air: number;
    moisture: number;
    surface: number;
    branch: number;
  };
  dayComplete: boolean;
}
