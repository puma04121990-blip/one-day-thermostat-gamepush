# Browser-first structure

```text
React controls ──intent──> ThermostatSimulation ──immutable snapshot──> React overlays
                                  │                         └──────────> Phaser scene
                                  ├─ Sensor/Diagnostic catalog
                                  ├─ Event Director + fair scenario contract
                                  ├─ Resident boundary cards
                                  ├─ Policy/Governor evaluator
                                  ├─ Archive/recognition/recovery
                                  └─ Versioned local save
```

## Ownership rules

`ThermostatSimulation` owns all state that can change an event, route, policy, recognition, ending or resident-context result. Typed catalogs own stable authored definitions. React owns dialog visibility and accessibility preferences only. Phaser renders snapshots and never resolves gameplay. Local storage persists a versioned DTO. The future GamePush adapter may acknowledge local tags only after verified platform success.

## Browser adaptation

The source package’s Unity components map to pure TypeScript state/services, typed content definitions and Canvas presentation. Shader-specific instructions remain visual reference; no GPU artifact may decide a route, event, reward or resident outcome.
