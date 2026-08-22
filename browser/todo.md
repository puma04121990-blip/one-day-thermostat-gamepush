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
- [ ] Run browser/Core CI, merge through GitHub and checkpoint the playable browser version.
