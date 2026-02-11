// =============================================================
// audio.js — Simple Web Audio API sound effects (no files needed)
// =============================================================

const Audio = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return ctx;
    }

    function play(freq, type, duration, volume = 0.15) {
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime);
            gain.gain.setValueAtTime(volume, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + duration);
        } catch (e) { /* ignore audio errors */ }
    }

    function playSequence(notes, interval) {
        notes.forEach((n, i) => {
            setTimeout(() => play(n.freq, n.type || 'sine', n.dur || 0.15, n.vol || 0.12), i * interval);
        });
    }

    return {
        // Successfully connected two shapes
        connect() {
            playSequence([
                { freq: 523, dur: 0.1 },
                { freq: 659, dur: 0.1 },
                { freq: 784, dur: 0.2 },
            ], 80);
        },

        // Hit an obstacle — lose a life
        hit() {
            playSequence([
                { freq: 200, type: 'sawtooth', dur: 0.15, vol: 0.1 },
                { freq: 150, type: 'sawtooth', dur: 0.2, vol: 0.08 },
            ], 100);
        },

        // Level completed
        levelComplete() {
            playSequence([
                { freq: 523, dur: 0.12 },
                { freq: 659, dur: 0.12 },
                { freq: 784, dur: 0.12 },
                { freq: 1047, dur: 0.3 },
            ], 120);
        },

        // Game over
        gameOver() {
            playSequence([
                { freq: 392, type: 'triangle', dur: 0.2 },
                { freq: 330, type: 'triangle', dur: 0.2 },
                { freq: 262, type: 'triangle', dur: 0.4 },
            ], 200);
        },

        // Cage unlock
        unlock() {
            playSequence([
                { freq: 440, dur: 0.08 },
                { freq: 660, dur: 0.08 },
                { freq: 880, dur: 0.15 },
            ], 70);
        },

        // Button click
        click() {
            play(880, 'sine', 0.06, 0.08);
        },

        // Start drawing
        drawStart() {
            play(440, 'sine', 0.05, 0.05);
        },

        // Resume audio context (must be called after user gesture)
        resume() {
            try { getCtx().resume(); } catch (e) { }
        }
    };
})();
