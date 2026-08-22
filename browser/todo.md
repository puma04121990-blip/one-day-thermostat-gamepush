# Runtime fix checklist

- [x] Verify why `ThermostatScene.init()` does not receive `simulation` before `create()`.
- [x] Start the scene only after Phaser boot and pass data through the supported scene lifecycle.
- [x] Prefer Canvas renderer when WebGL framebuffer support is unavailable or unreliable.
- [x] Add a regression test or deterministic guard for scene startup data.
- [x] Run browser tests, TypeScript check, production build and visual preview.
- [ ] Sync the fix to the protected GitHub workflow and save a new WebDev checkpoint.
