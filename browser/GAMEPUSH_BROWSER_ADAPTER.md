# GamePush browser adapter — activation gate

Browser Edition already owns its day, Archive and achievements locally. `GamePushBrowserAdapter` is intentionally an **inert boundary** until a real GamePush test project is ready. It has no dependency on an SDK package, no project ID, public token, secret or guessed global method.

## What the adapter guarantees

| Step | Contract |
|---|---|
| Local unlock | Fixed-tick simulation saves `unlocked` and `pendingPlatformTags` first. |
| Disabled browser | Adapter dispatches nothing and never clears local tags. |
| Verified client | An injected `VerifiedGamePushClient` receives one pending ID at a time. |
| Acknowledgement | The tag is removed only if `unlockAchievement(id)` resolves `true`. |
| Failure | A rejection, false result or missing SDK leaves the tag in local save for retry. |

## Inputs required to enable real integration

1. A GamePush **test project** created in the control panel.
2. The deployed preview/test domain added to GamePush **Allowed origins** and marked as a test site.
3. The official browser SDK loading and initialization instructions for that project, plus the exact achievement IDs configured in GamePush.
4. A test matrix confirming init, player lifecycle, pause/resume, local save mirror and achievement acknowledgement.

Only then should a separate, reviewed bootstrap implement `VerifiedGamePushClient` with confirmed SDK calls. Keep any project-specific settings in local secrets/environment configuration; never commit them.
