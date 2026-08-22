# Blackout / reserve and deterministic replay — browser design contract

> **Authoritative source:** `docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md`, appendix 22, lines 5151–5343. This browser slice is a fictional systems puzzle, not real-world electrical or emergency guidance.

## Browser vertical-slice boundary

The first browser blackout uses the dry threshold context: branch 26, surface reserve and a boundary buffer. It starts only after two readable foreshadows—an external/front trace and a network trace—and is never triggered by a single player error. The slice models the prescribed sequence: `grid_warning → failover → reserve_triage → dark_baseline → grid_return → afterglow`.[1]

| Contract | Browser adaptation | Explicit boundary |
|---|---|---|
| Five reserve cells | `reserveCells: 5`, each consumed only by one chosen material intervention | No real battery, electrical, repair or safety model. |
| Three useful actions | `FOCUS_SENSE`, `LOCK_ROUTE`, `PULSE_SHUNT`, each costing one cell | Beacon and broad climate variants remain authored-next. |
| Passive-first play | Surface, air boundary and material buffer remain available; active routes are blocked with explanation copy | No hidden timer, instant cure or all-on recovery. |
| One detailed sensor | Focus must be `surface`, `vibration` or `moisture`; changing focus consumes a cell | Coarse map/labels remain always available. |
| Staged return | `listen → stabilize → reintroduce → observe → afterglow` is fixed-tick state, not a simultaneous restart button | Full Grid Return allocator remains a future production system. |

## Deterministic replay contract

`ReplayRecord` contains a `scenarioSeed`, a schema/content marker and a monotonic list of constrained authoritative commands `{ tick, kind, payload }`. Replay starts from a clean state with that seed, advances only in 200 ms fixed steps and re-applies command records at their saved tick. A valid replay must produce an identical serialised `GameState`; an unknown command, impossible tick order or incompatible schema is rejected without mutating a live day.

| Invariant | Test evidence required |
|---|---|
| Same seed + same command log | Equal final snapshots. |
| Command ordering | Monotonic ticks; one route/reserve command has authoritative validation at execution time. |
| Save continuity | Restore preserves blackout phase, reserve cells, focus and replay log. |
| Invalid action | Does not spend a cell or alter phase. |
| Presentation boundary | React/Phaser may display or export replay data but cannot invent a replay command. |

## Accessibility and physical-device protocol

The blackout HUD must use text, pattern and shape together; no strobes, high-frequency alarms or sound-only meaning. In browser preview, validate keyboard tab order, focus visibility, semantic labels, reduced motion and mobile widths. A physical-device check remains a separate record: device/browser/OS, portrait/landscape, touch target operation, screen reader, low-power/network and result; no emulator result is labelled as hardware validation.[1]

## References

[1] `docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md`, lines 5151–5343 (Appendix 22: Full power loss mode).
