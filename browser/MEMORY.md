# Implementation memory

- Browser stack: React 19 + Phaser 3 Canvas renderer; Phaser bundle is lazy-loaded after explicit start.
- Authoritative tick: 200 ms; incoming browser delta capped at 250 ms; React/Phaser are presentation only.
- Existing playable scope: three material chains, configuration preview/next-tick commit, service recovery, Archive, local achievements and versioned save fallback.
- Existing source assets remain hosted in `/manus-storage`; do not commit art binaries to the web app tree.
- Master source package is preserved under `docs/source`; Canon and GDD outrank decks and archive notes.
- GamePush is deliberately inert until Project ID, allowed origin, official browser bootstrap and achievement IDs arrive through a safe channel.
