# Accessibility and device validation — blackout / replay tranche

> Blackout accessibility source: `docs/source/ONE_DAY_THERMOSTAT_COMPLETE_PROJECT_DOCUMENTATION.md`, lines 5269–5308. The source requires a coarse orienting map, non-flashing reserve cells, one focus sensor, up to three relevant actions, captions, and no sound-only critical information.

## Browser validation completed

| Check | Evidence | Result |
|---|---|---|
| Blackout HUD orientation | `?demo=blackout` renders `RESERVE MODE`, phase, grid-offline explanation, coarse map and five text-backed cells. | Pass in desktop browser preview. |
| Action constraint | UI exposes only `FOCUS SENSE`, `LOCK ROUTE`, `PULSE SHUNT`; simulation rejects duplicates, actions beyond three and reserve actions outside triage/dark baseline. | Covered by deterministic tests. |
| Non-strobe meaning | Reserve cells use static amber/matte states; Canvas uses static coarse lines and a focus ray. Caption text carries all critical meaning. | Pass by CSS/Canvas inspection. |
| Keyboard and semantic labels | Native buttons/select remain focusable; CSS `:focus-visible` outline is active; reserve readout has an accessible label; HUD has `aria-live`. | Pass by code and browser preview inspection. |
| Responsive layout | Blackout demo captured at desktop 1280×720 and mobile 390×844. HUD, select and three actions wrap without horizontal clipping; mobile action targets are at least 44 CSS px. | Pass in browser viewport preview. |
| Runtime health | Browser console/network tail after the demo had no matching errors, duplicate-key warnings, framebuffer errors or 4xx/5xx results. | Pass for preview session. |

## Scope that remains unverified

Browser viewport emulation is not a physical device. The project cannot claim real touch latency, installed-browser behavior, screen-reader output, low-power mode or throttled mobile network performance without access to a physical device.

## Physical-device test protocol

Use a real Android or iOS device and open the published project or development preview. Record device, OS, browser, orientation, network type and result for each line.

| Step | Expected result | Result field |
|---|---|---|
| Portrait, normal browser zoom | Onboarding and `?demo=blackout` show no horizontal clipping. | Pass / fail + notes |
| Tap reserve select and each action | Controls have a comfortable hit target; focus changes consume one cell; duplicate action remains disabled. | Pass / fail + notes |
| Screen reader (TalkBack or VoiceOver) | Reads reserve quantity, current phase, focus select, action name/cost/effect and disabled state. | Pass / fail + transcript issue |
| Reduced motion and low-sensory | Meaning and available actions remain; no flashing or audio-only instruction. | Pass / fail + notes |
| Slow or unstable network | HTML shell and status panel remain understandable; Phaser/cutaway delay is communicated; no interaction repeats a game instance. | Pass / fail + notes |
| Rotation during blackout | HUD retains orientation and no authoritative action is duplicated. | Pass / fail + notes |

## Deterministic replay check

The Archive offers JSON export and an isolated `ПРОВЕРИТЬ ПОВТОР` action. It starts from the recorded seed, applies only accepted commands at their fixed tick and compares the final authoritative snapshot. The log has no player identifier and never overwrites localStorage during verification.
