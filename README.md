# Adaptive Music Engine

Motor de música adaptativa para videojuegos: la banda sonora cambia según lo que
ocurre en el juego (pueblo, exploración, combate…) con **crossfade sincronizado
al beat**, en lugar de cortar la pista de golpe.

El enfoque es el mismo que usan los motores comerciales tipo Wwise o FMOD: las
capas —bajo, melodía, combate, cuerdas— suenan en paralelo todo el rato y lo que
cambia es el volumen de cada una. La transición espera al siguiente compás, así
que nunca se rompe el ritmo.

**Licencia:** MIT (ver [LICENSE](LICENSE)) — uso libre, incluido comercial,
manteniendo el aviso de copyright. Sin garantía ni soporte incluidos.

## Demo en vivo

[adrianmoreno-dev.com/demo/adaptive-music-engine](https://adrianmoreno-dev.com/demo/adaptive-music-engine)
— mini-RPG en Phaser 3 donde la música reacciona a lo que hace el personaje.

## Estado del proyecto

Es un **motor de una sola clase** (`src/adaptive-engine.js`), el mismo que corre
en la demo enlazada arriba. **No está publicado como paquete npm**: se usa
copiando el fichero. Se dice explícitamente para que nadie pierda el tiempo
buscando un paquete que no existe.

## Uso

Requiere [Tone.js 15](https://tonejs.github.io/) cargado antes que el motor.

```html
<script src="https://cdn.jsdelivr.net/npm/tone@15/build/Tone.js"></script>
<script src="src/adaptive-engine.js"></script>
```

```javascript
const engine = new AdaptiveEngine();
await engine.init();                            // crea las capas y arranca el Transport
engine.setState('combat');                      // crossfade al siguiente compás
engine.setState('town', { immediate: true });   // sin esperar al beat
```

Con bundler o en Node:

```javascript
const { AdaptiveEngine } = require('./src/adaptive-engine.js');
```

### API

| Miembro | Qué hace |
|---|---|
| `await init()` | Inicializa Web Audio y crea las capas. Debe llamarse tras un gesto del usuario (requisito del navegador). |
| `setState(estado, opts)` | Cambia de estado. `opts.immediate` salta la espera al compás; `opts.force` reaplica el estado actual. |
| `onStateChange(estado)` | Callback opcional al cambiar de estado. |
| `onLayers(estado, cfg)` | Callback opcional con los volúmenes, BPM y tonalidad resultantes — para pintar tu propia UI. |

Estados incluidos: `town`, `explore`, `combat`, `victory`. Se editan en
`_applyState()`, donde cada uno define volúmenes por capa, BPM, tonalidad y
carácter.

## Cómo funciona

| Concepto | Implementación |
|---|---|
| Capas simultáneas | Cada stem es un canal de Tone.js con volumen propio |
| Transición al beat | `Tone.getTransport()` programa el cambio en el siguiente compás |
| Cambio de tempo | `bpm.rampTo(objetivo, 2s)` — el tempo acelera progresivamente |
| Volumen | `volToDb()` convierte 0-1 a decibelios (curva logarítmica) |

## Integración, datos y licencia

**Integración:** es una clase JavaScript sin backend. Se integra en cualquier
motor web (Phaser, PixiJS, Three.js o HTML plano) instanciándola y llamando a
`setState()` desde la lógica del juego. No hay API REST porque todo el
procesamiento de audio ocurre en el navegador del jugador. El motor no toca el
DOM: la UI se conecta con los callbacks `onStateChange` / `onLayers`.

**Datos:** el motor **no envía nada a ningún servidor**. Sin analítica, sin
cuentas, sin almacenamiento. Los ficheros de audio los sirve quien lo integre,
desde donde quiera.

**IA:** este proyecto **no usa ningún modelo de IA ni proveedor externo**. La
adaptación es lógica de mezcla determinista, no generación por IA.

**Self-hosting:** al ser un fichero estático se aloja en cualquier sitio (CDN,
servidor propio o dentro del bundle del juego). La única dependencia es Tone.js,
también MIT.

**Costes:** ninguno más allá del alojamiento de los ficheros de audio.

## Stack

- Web Audio API, a través de Tone.js 15
- Phaser 3.80 — sólo en la demo, no en el motor
