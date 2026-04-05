# Adaptive Music Engine

SDK JavaScript/TypeScript para música adaptativa en videojuegos indie. Demo interactiva con mini-RPG Phaser 3.

## Instalación

```bash
npm install @stemix/adaptive-music
```

## Uso mínimo (5 líneas)

```typescript
import { AdaptiveEngine } from '@stemix/adaptive-music';

const engine = new AdaptiveEngine({ config: './music-config.json' });
await engine.init();
engine.play();
engine.setState('combat'); // crossfade al próximo beat
```

## Demo

[adrianmoreno-dev.com/demo/adaptive-music-engine](https://adrianmoreno-dev.com/demo/adaptive-music-engine)

## Stack

- Web Audio API nativa
- Tone.js 15 Transport (beat-aware transitions)
- TypeScript 5.4 strict
- Phaser 3.80 (demo)
- tsup (ESM + CJS dual build)
