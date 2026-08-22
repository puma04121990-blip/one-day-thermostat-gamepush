# Runtime fix checklist

- [x] Verify why `ThermostatScene.init()` does not receive `simulation` before `create()`.
- [x] Start the scene only after Phaser boot and pass data through the supported scene lifecycle.
- [x] Prefer Canvas renderer when WebGL framebuffer support is unavailable or unreliable.
- [x] Add a regression test or deterministic guard for scene startup data.
- [x] Run browser tests, TypeScript check, production build and visual preview.
- [x] Sync the fix to the protected GitHub workflow and save a new WebDev checkpoint.

## Firmware and modifier browser port

- [x] Compare browser state against legacy firmware/modifier safety contract.
- [x] Add a typed catalog and non-mutating selection preview to `ThermostatSimulation`.
- [x] Commit a valid selection only at the next fixed tick and persist it locally.
- [x] Add a player-facing configuration sheet with labelled benefit, cost and keyboard fallback.
- [x] Cover unknown IDs, preview non-mutation, stale rejection, tick commit and save restore in Vitest.
- [x] Run browser/Core CI, merge through GitHub and checkpoint the playable browser version.

## Local-first achievements browser port

- [x] Compare legacy achievement triggers, Archive contract and pending platform tag semantics.
- [x] Add a typed achievement catalog, local unlock state and persisted pending mirror tags.
- [x] Trigger achievements only from authoritative fixed-tick state without gameplay advantage.
- [x] Add an accessible achievement strip and Archive review with keyboard fallback.
- [x] Cover idempotent unlock, pending queue persistence and recoverable-day triggers in Vitest.
- [x] Document the future GamePush browser mirror boundary without committing credentials or fabricating SDK calls.
- [ ] Run browser/Core CI, merge through GitHub and checkpoint the playable browser version.

## Service follow-up and end-of-day browser port

- [x] Compare legacy material-only service task and end-of-day review contract against browser state.
- [x] Add typed service task catalog, queued bounded recovery and persisted task status.
- [x] Create recoverable Archive/end-of-day outcome independent of player success score.
- [x] Add a labelled service review sheet with buttons and keyboard fallback.
- [x] Cover task materialization, bounded recovery, save restore and day review in Vitest.
- [ ] Run browser/Core CI, merge through GitHub and checkpoint the playable browser version.
