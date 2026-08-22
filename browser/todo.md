# Runtime fix checklist

## Master documentation, full implementation and presentation package

- [x] Extract and inventory every authoritative requirement, appendix and presentation claim from the supplied master Markdown and PDFs.
- [x] Produce a traceability matrix that classifies requirements as implemented, browser-adapted, deferred, external-platform dependent or contradictory.
- [x] Update the browser-first canon/decision log where Unity-only source instructions must be adapted without changing player-facing principles.
- [x] Implement the highest-priority missing playable content systems with deterministic fixed-tick state, local-first saves and accessible HTML controls.
- [ ] Add authored tutorial, crisis, resident-boundary and replayability content only where it fits the browser vertical slice without fabricating player data.
- [ ] Add regression coverage for each new authoritative state transition, migration path and content fallback.
- [ ] Prepare a concise, evidence-based publisher/investor presentation from the implemented browser state and supplied pitch sources.
- [ ] Generate the requested presentation deliverables only after the content outline and claims are verified.
- [ ] Run local tests, browser checks, protected GitHub PR CI, merge and checkpoint the integrated project.

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

## React duplicate-key runtime fix

- [x] Locate every service trace list keyed by human-readable text.
- [x] Replace the repeated text key with a stable unique key derived from item ID/index.
- [x] Verify the direct-route duplicate trace case produces no browser console key warning.
- [ ] Run tests, TypeScript, production build and merge the fix through GitHub.

## Browser performance, content compatibility and GamePush preparation

- [x] Measure current production chunk sizes and identify initial-load dependencies.
- [x] Split Phaser and nonessential sheets so initial UI loads before gameplay engine and heavy panels.
- [x] Verify lazy UI paths retain keyboard accessibility and never duplicate Phaser instances.
- [x] Add a content schema/version contract to saves with deterministic migration and safe fallback when authored IDs disappear.
- [x] Cover old save, future save and missing content ID paths in Vitest.
- [x] Add a local-first GamePush browser adapter interface with disabled/default implementation and no committed credentials.
- [x] Document the exact test-project inputs needed before real SDK dispatch can be enabled.
- [x] Run performance build analysis, browser tests, Browser/Core CI and checkpoint the optimized version.

## Lazy engine progress, mobile loading and GamePush test project

- [x] Inspect the current lazy Phaser mount lifecycle and define loading/readiness states.
- [x] Add a visible labelled progress indicator that works with reduced motion and keyboard flow.
- [x] Verify mobile onboarding, top controls and 44px touch target size in responsive browser preview.
- [ ] Perform interactive route/configuration/service-sheet validation on a physical mobile device.
- [x] Measure mobile initial/after-start network payloads and record findings.
- [x] Confirm that project-specific GamePush parameters are absent and preserve the inert local-first adapter.
- [ ] Connect the verified GamePush test client after Project ID, allowed origin, browser bootstrap and achievement IDs are supplied through a safe channel.
- [ ] Run tests, Browser/Core CI and checkpoint the mobile-ready version.

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
