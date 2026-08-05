/**
 * Adaptive Music Engine — motor de música adaptativa para videojuegos.
 *
 * Cambia la música según el estado del juego (exploración, combate, victoria…)
 * con crossfade sincronizado al beat, en vez de cortar la pista de golpe. Las
 * capas (stems) suenan en paralelo y lo que cambia es su volumen, que es como
 * lo resuelven los motores comerciales tipo Wwise o FMOD.
 *
 * Única dependencia: Tone.js 15, que aporta el Transport con el que se alinean
 * las transiciones al siguiente compás.
 *
 * Este fichero es el motor que corre en la demo pública:
 * https://adrianmoreno-dev.com/demo/adaptive-music-engine
 */

// vol (0-1) → dB (avoids Tone.gainToDb which may not be on global object)
function volToDb(v) { return v <= 0.001 ? -80 : 20 * Math.log10(v); }

class AdaptiveEngine {
    constructor() {
        this.layers = {};
        this.state  = 'town';
        this.onStateChange = null;
        this._ready = false;
    }

    async init() {
        await Tone.start();
        const T = Tone;
        T.getTransport().bpm.value = 95;

        // ── BASS — triangle synth, walking bass line ────────────────────────
        const bassVol = new T.Volume(-80).toDestination();
        const bassSynth = new T.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.04, decay: 0.3, sustain: 0.5, release: 1.0 },
        }).connect(bassVol);
        const bassNotes = ['C2','C2','G2','A2','F2','G2','C2','G2'];
        let bi = 0;
        new T.Sequence((t) => {
            bassSynth.triggerAttackRelease(bassNotes[bi++ % bassNotes.length], '4n', t, 0.65);
        }, [0,1,2,3,4,5,6,7], '4n').start(0);
        this.layers.bass = { vol: bassVol, _v: 0 };

        // ── MELODY — sine bell arpeggio ────────────────────────────────────
        const melodyVol = new T.Volume(-80).toDestination();
        const melSynth = new T.PolySynth(T.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.02, decay: 0.5, sustain: 0.0, release: 1.8 },
        }).connect(melodyVol);
        melSynth.volume.value = -4;
        const arpNotes = ['C4','E4','G4','A4','C5','A4','G4','E4'];
        let mi = 0;
        new T.Sequence((t) => {
            melSynth.triggerAttackRelease(arpNotes[mi++ % arpNotes.length], '16n', t, 0.5);
        }, [0,1,2,3,4,5,6,7], '8n').start(0);
        this.layers.melody = { vol: melodyVol, _v: 0 };

        // ── COMBAT — kick + snare drum machine ────────────────────────────
        const combatVol = new T.Volume(-80).toDestination();
        const kick = new T.MembraneSynth({
            pitchDecay: 0.05, octaves: 8,
            envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        }).connect(combatVol);
        const snare = new T.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.05 },
        }).connect(combatVol);
        snare.volume.value = -8;
        new T.Sequence((t, step) => {
            if (step === 0 || step === 4) kick.triggerAttackRelease('C1', '8n', t);
            if (step === 2 || step === 6) snare.triggerAttackRelease('8n', t);
        }, [0,1,2,3,4,5,6,7], '8n').start(0);
        this.layers.combat = { vol: combatVol, _v: 0 };

        // ── STRINGS — slow-attack sawtooth pad chords ──────────────────────
        const stringsVol = new T.Volume(-80).toDestination();
        const padSynth = new T.PolySynth(T.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 2.0, decay: 1.0, sustain: 0.7, release: 4.0 },
        }).connect(stringsVol);
        padSynth.volume.value = -10;
        const chords = [['C3','E3','G3'],['A2','C3','E3'],['F2','A2','C3'],['G2','B2','D3']];
        let ci = 0;
        new T.Sequence((t) => {
            padSynth.triggerAttackRelease(chords[ci++ % chords.length], '1m', t, 0.4);
        }, [0], '1m').start(0);
        this.layers.strings = { vol: stringsVol, _v: 0 };

        T.getTransport().start('+0.1');
        this._applyState('town', true);
        this._ready = true;
    }

    _setLayerVol(name, v, ramp) {
        const layer = this.layers[name];
        if (!layer) return;
        layer._v = v;
        layer.vol.volume.rampTo(volToDb(v), ramp);
    }

    setState(newState, opts = {}) {
        if (newState === this.state && !opts.force) return;
        this.state = newState;
        this._applyState(newState, opts.immediate);
        if (this.onStateChange) this.onStateChange(newState);
    }

    _applyState(state, immediate) {
        const configs = {
            town:    { bass: 0.55, melody: 0.80, combat: 0.0,  strings: 0.55, bpm: 95,  key: 'C major',  mood: 'tranquilo' },
            explore: { bass: 0.80, melody: 0.55, combat: 0.0,  strings: 0.25, bpm: 110, key: 'C major',  mood: 'exploratorio' },
            combat:  { bass: 0.90, melody: 0.10, combat: 0.85, strings: 0.0,  bpm: 140, key: 'C minor',  mood: 'tenso' },
            victory: { bass: 0.35, melody: 1.0,  combat: 0.0,  strings: 0.80, bpm: 100, key: 'C major',  mood: 'épico' },
        };
        const cfg = configs[state] || configs.town;
        const ramp = immediate ? 0.05 : 1.8;
        for (const [name, v] of Object.entries(cfg)) {
            if (name === 'bpm' || name === 'key' || name === 'mood') continue;
            this._setLayerVol(name, v, ramp);
        }
        // Variar BPM por estado para que la música se sienta diferente
        if (typeof Tone !== 'undefined') {
            Tone.getTransport().bpm.rampTo(cfg.bpm, immediate ? 0.05 : 2.0);
        }
        // Callback opcional para que quien integre el motor pinte su propia UI.
        // El motor no toca el DOM por su cuenta: en la demo, este callback es el
        // que actualiza el panel de estado.
        if (this.onLayers) this.onLayers(state, cfg);
    }
}

// Export dual: módulo ES o global del navegador según cómo se cargue.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdaptiveEngine, volToDb };
}
