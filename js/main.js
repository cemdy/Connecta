// =============================================================
// main.js — Entry point, event listeners, game loop
// =============================================================

(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    Game.init(canvas);

    // Apply initial translations
    UI.applyTranslations();

    // ---- BUTTON HANDLERS ----
    document.getElementById('btn-home').addEventListener('click', () => {
        Audio.click();
        Game.stop();
        UI.showMenu();
    });

    // ---- GAME LOOP ----
    let lastTime = 0;
    function loop(timestamp) {
        const time = timestamp / 1000;
        const dt = Math.min(time - lastTime, 0.05);
        lastTime = time;

        Game.render(time, dt);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // ---- RESIZE ----
    window.addEventListener('resize', () => {
        Game.resize();
    });

    // ---- POINTER EVENTS (mouse + touch) ----
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    canvas.addEventListener('mousedown', e => {
        const p = getPos(e);
        Game.onPointerDown(p.x, p.y);
    });
    canvas.addEventListener('mousemove', e => {
        const p = getPos(e);
        Game.onPointerMove(p.x, p.y);
    });
    canvas.addEventListener('mouseup', () => Game.onPointerUp());
    canvas.addEventListener('mouseleave', () => Game.onPointerUp());

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const p = getPos(e);
        Game.onPointerDown(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const p = getPos(e);
        Game.onPointerMove(p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        Game.onPointerUp();
    }, { passive: false });
    canvas.addEventListener('touchcancel', () => Game.onPointerUp());

    // ---- BUTTON HANDLERS ----
    document.getElementById('btn-start').addEventListener('click', () => {
        Audio.resume();
        Audio.click();
        Game.startLevel(0);
    });

    document.getElementById('btn-levels').addEventListener('click', () => {
        Audio.resume();
        Audio.click();
        UI.showLevelSelect();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        Audio.click();
        UI.showSettings();
    });

    document.getElementById('btn-shop').addEventListener('click', () => {
        Audio.click();
        UI.showShop();
    });

    document.getElementById('btn-shop-back').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    document.getElementById('btn-settings-back').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
        Audio.click();
        const next = Game.getCurrentLevel() + 1;
        if (next < Game.getLevelCount()) {
            Game.startLevel(next);
        }
    });

    document.getElementById('btn-complete-menu').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    document.getElementById('btn-replay-complete').addEventListener('click', () => {
        Audio.click();
        Game.startLevel(Game.getCurrentLevel());
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
        Audio.click();
        Game.startLevel(Game.getCurrentLevel());
    });

    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    document.getElementById('btn-allcomplete-menu').addEventListener('click', () => {
        Audio.click();
        UI.showMenu();
    });

    // ---- LANGUAGE BUTTONS ----
    document.querySelectorAll('.btn-lang').forEach(btn => {
        btn.addEventListener('click', () => {
            Audio.click();
            I18n.setLang(btn.dataset.lang);
            UI.applyTranslations();
        });
    });

    // ---- INITIAL STATE ----
    UI.applyTheme(Game.getActiveTheme());
    UI.updateMenuStars();
    UI.showMenu();
})();
