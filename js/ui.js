// =============================================================
// ui.js — UI screens, HUD, overlays — with i18n support
// =============================================================

const UI = (() => {
    // DOM elements
    const $ = id => document.getElementById(id);

    // Apply translations to all elements with data-i18n attribute
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = I18n.t(key);
        });
        // Update active language button
        document.querySelectorAll('.btn-lang').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === I18n.getLang());
        });
    }

    function updateHUD(lives, time, level, score) {
        // Lives
        const heartsEl = $('hud-lives');
        if (heartsEl) {
            let html = '';
            for (let i = 0; i < 3; i++) {
                html += `<span class="heart ${i < lives ? 'alive' : 'dead'}">${i < lives ? '❤️' : '🖤'}</span>`;
            }
            heartsEl.innerHTML = html;
        }

        // Timer
        const timerEl = $('hud-timer');
        if (timerEl) {
            const mins = Math.floor(time / 60);
            const secs = time % 60;
            timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            timerEl.className = 'hud-timer' + (time <= 10 ? ' danger' : time <= 20 ? ' warning' : '');
        }

        // Level
        const levelEl = $('hud-level');
        if (levelEl) {
            levelEl.textContent = `${I18n.t('level')} ${level}`;
        }

        // Score
        const scoreEl = $('hud-score');
        if (scoreEl) {
            scoreEl.textContent = `⭐ ${score || 0}`;
        }
    }

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = $(id);
        if (el) el.classList.add('active');
    }

    function hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        $('hud').classList.add('visible');
    }

    function showMenu() {
        $('hud').classList.remove('visible');
        showScreen('menu-screen');
        Game.setState('menu');
        updateMenuStars();
    }

    function showSettings() {
        $('hud').classList.remove('visible');
        showScreen('settings-screen');
    }

    function showLevelSelect() {
        const grid = $('level-grid');
        const unlocked = Game.getUnlockedLevels();
        const total = Game.getLevelCount();
        let html = '';
        for (let i = 0; i < total; i++) {
            const isUnlocked = i < unlocked;
            const stars = Game.getLevelStars(i);
            let starsHtml = '';
            if (isUnlocked && stars > 0) {
                for (let s = 0; s < 3; s++) {
                    starsHtml += `<span class="level-star ${s < stars ? 'earned' : ''}">\u2605</span>`;
                }
            }
            html += `<button class="level-btn ${isUnlocked ? 'unlocked' : 'locked'}" 
                       data-level="${i}" ${!isUnlocked ? 'disabled' : ''}>
                       <span class="level-num">${isUnlocked ? i + 1 : '\uD83D\uDD12'}</span>
                       ${starsHtml ? `<div class="level-stars">${starsHtml}</div>` : ''}
                     </button>`;
        }
        grid.innerHTML = html;

        // Add click handlers
        grid.querySelectorAll('.level-btn.unlocked').forEach(btn => {
            btn.addEventListener('click', () => {
                Audio.click();
                const lvl = parseInt(btn.dataset.level);
                Game.startLevel(lvl);
            });
        });

        $('hud').classList.remove('visible');
        showScreen('level-screen');
    }

    function showLevelComplete(level, timeLeft, score, pairCount) {
        $('complete-level').textContent = I18n.t('levelComplete', { n: level });
        $('complete-time').textContent = I18n.t('timeLeft', { n: timeLeft });
        $('complete-score').textContent = I18n.t('score', { n: score || 0 });

        const starsEl = $('complete-stars');

        // Calculate stars based on percentage of max possible score
        const maxScore = (pairCount || 3) * 100; // Default to 3 if unknown (shouldn't happen)
        let stars = 1;
        if (score >= maxScore * 0.80) stars = 3;
        else if (score >= maxScore * 0.50) stars = 2;

        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = 'star' + (i < stars ? ' earned' : '');
            span.textContent = '★';
            span.style.animationDelay = `${i * 0.2}s`;
            starsEl.appendChild(span);
        }

        showScreen('complete-screen');
    }

    function showGameOver(level) {
        $('gameover-level').textContent = `${I18n.t('level')} ${level}`;
        showScreen('gameover-screen');
    }

    function showAllComplete() {
        showScreen('allcomplete-screen');
    }

    // ---- THEME DEFINITIONS ----
    const THEMES = {
        default: {
            bg: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 40%, #1b0a2a 100%)',
            accent1: '#8338ec',
            accent2: '#00b4d8',
            border: 'rgba(255, 80, 80, 0.6)',
            borderGlow: 'rgba(255, 60, 60, 0.5)',
            gridColor: 'rgba(255,255,255,0.03)',
            emoji: '🎨',
            shapeColors: null, // use default ShapeColors
            trail: null, // no special trail
        },
        fire: {
            bg: 'linear-gradient(135deg, #1a0a00 0%, #2a0d00 40%, #2a1500 100%)',
            accent1: '#ff4500',
            accent2: '#ff8c00',
            border: 'rgba(255, 120, 0, 0.7)',
            borderGlow: 'rgba(255, 80, 0, 0.6)',
            gridColor: 'rgba(255, 100, 0, 0.04)',
            emoji: '🔥',
            shapeColors: {
                circle: { fill: '#ff2d00', glow: '#ff4500' },
                square: { fill: '#ff6600', glow: '#ff8800' },
                triangle: { fill: '#ffaa00', glow: '#ffcc00' },
                star: { fill: '#ff0044', glow: '#ff3366' },
                hexagon: { fill: '#ff8c00', glow: '#ffaa33' },
                diamond: { fill: '#cc3300', glow: '#ee5500' },
            },
            trail: {
                colors: ['#ff4500', '#ff6600', '#ffaa00', '#ff2200', '#ffcc00'],
                sizeMin: 2, sizeMax: 5,
                speed: 1.5, // upward drift speed
                spread: 12,
                lifetime: 0.6,
                glow: '#ff4500',
                glowBlur: 15,
            },
        },
        water: {
            bg: 'linear-gradient(135deg, #000a1a 0%, #001a2e 40%, #002040 100%)',
            accent1: '#0077b6',
            accent2: '#00d4ff',
            border: 'rgba(0, 180, 255, 0.6)',
            borderGlow: 'rgba(0, 140, 255, 0.5)',
            gridColor: 'rgba(0, 180, 255, 0.04)',
            emoji: '💧',
            shapeColors: {
                circle: { fill: '#0099ff', glow: '#00bbff' },
                square: { fill: '#00cccc', glow: '#00eeee' },
                triangle: { fill: '#3399ff', glow: '#55bbff' },
                star: { fill: '#0066cc', glow: '#0088ee' },
                hexagon: { fill: '#00ddaa', glow: '#00ffcc' },
                diamond: { fill: '#0055aa', glow: '#0077cc' },
            },
            trail: {
                colors: ['#00bbff', '#00ddff', '#88ddff', '#0099cc', '#aaeeff'],
                sizeMin: 2, sizeMax: 6,
                speed: 0.8, // slow float
                spread: 15,
                lifetime: 0.8,
                glow: '#00bbff',
                glowBlur: 12,
            },
        },
        earth: {
            bg: 'linear-gradient(135deg, #0a1a00 0%, #1a2a0d 40%, #2a2a00 100%)',
            accent1: '#6b8e23',
            accent2: '#daa520',
            border: 'rgba(180, 160, 60, 0.6)',
            borderGlow: 'rgba(140, 120, 30, 0.5)',
            gridColor: 'rgba(180, 160, 60, 0.04)',
            emoji: '🌍',
            shapeColors: {
                circle: { fill: '#8fce00', glow: '#aaee22' },
                square: { fill: '#daa520', glow: '#eebb44' },
                triangle: { fill: '#cc8800', glow: '#ddaa22' },
                star: { fill: '#228b22', glow: '#33aa33' },
                hexagon: { fill: '#b8860b', glow: '#ccaa33' },
                diamond: { fill: '#6b8e23', glow: '#88aa44' },
            },
            trail: {
                colors: ['#8fce00', '#daa520', '#228b22', '#b8860b', '#ccaa33'],
                sizeMin: 1, sizeMax: 4,
                speed: 1.0,
                spread: 10,
                lifetime: 0.7,
                glow: '#8fce00',
                glowBlur: 10,
            },
        },
        air: {
            bg: 'linear-gradient(135deg, #0a0a20 0%, #152040 40%, #1a2545 100%)',
            accent1: '#a8dadc',
            accent2: '#e0f0ff',
            border: 'rgba(168, 218, 220, 0.5)',
            borderGlow: 'rgba(168, 218, 220, 0.4)',
            gridColor: 'rgba(200, 230, 255, 0.04)',
            emoji: '💨',
            shapeColors: {
                circle: { fill: '#a8dadc', glow: '#c8eaec' },
                square: { fill: '#b8e0e0', glow: '#d8f0f0' },
                triangle: { fill: '#e0f0ff', glow: '#ffffff' },
                star: { fill: '#88ccdd', glow: '#aaddee' },
                hexagon: { fill: '#c0e8ff', glow: '#e0f8ff' },
                diamond: { fill: '#90d0e0', glow: '#b0e0f0' },
            },
            trail: {
                colors: ['#d0eeff', '#e8f4ff', '#ffffff', '#a8dadc', '#c0e8ff'],
                sizeMin: 1, sizeMax: 3,
                speed: 2.5, // fast wisps
                spread: 18,
                lifetime: 0.4,
                glow: '#c0e8ff',
                glowBlur: 8,
            },
        },
    };

    function updateMenuStars() {
        const el = $('menu-stars');
        if (el) el.textContent = `★ ${Game.getAvailableStars()}`;
    }

    function applyTheme(themeId) {
        const theme = THEMES[themeId] || THEMES.default;
        document.body.style.background = theme.bg;
        document.body.style.backgroundAttachment = 'fixed';
        document.documentElement.style.setProperty('--theme-accent1', theme.accent1);
        document.documentElement.style.setProperty('--theme-accent2', theme.accent2);
        document.documentElement.style.setProperty('--theme-border', theme.border);
        document.documentElement.style.setProperty('--theme-border-glow', theme.borderGlow);
        document.documentElement.style.setProperty('--theme-grid', theme.gridColor);
    }

    function showShop() {
        const grid = $('shop-grid');
        const available = Game.getAvailableStars();
        const owned = Game.getOwnedThemes();
        const active = Game.getActiveTheme();

        $('shop-stars').textContent = `★ ${available}`;

        let html = '';
        const themeIds = ['default', 'fire', 'water', 'earth', 'air'];
        themeIds.forEach(id => {
            const theme = THEMES[id];
            const isOwned = owned.includes(id);
            const isActive = active === id;
            const price = id === 'default' ? 0 : 50;

            let btnClass = 'btn ';
            let btnText = '';
            let btnDisabled = '';

            if (isActive) {
                btnClass += 'btn-equipped';
                btnText = I18n.t('shopEquipped');
                btnDisabled = 'disabled';
            } else if (isOwned) {
                btnClass += 'btn-success';
                btnText = I18n.t('shopOwned');
            } else if (available >= price) {
                btnClass += 'btn-primary';
                btnText = `${I18n.t('shopBuy')} (${price} ★)`;
            } else {
                btnClass += 'btn-locked';
                btnText = `${price} ★`;
                btnDisabled = 'disabled';
            }

            html += `
                <div class="shop-card" style="border-color: ${theme.accent1}">
                    <div class="shop-card-preview" style="background: ${theme.bg}">
                        <span class="shop-card-emoji">${theme.emoji}</span>
                    </div>
                    <div class="shop-card-name">${I18n.t('theme_' + id)}</div>
                    <button class="${btnClass} shop-buy-btn" data-theme="${id}" ${btnDisabled}>
                        ${btnText}
                    </button>
                </div>`;
        });

        grid.innerHTML = html;

        // Attach click handlers
        grid.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                Audio.click();
                const themeId = btn.dataset.theme;
                const isOwned = Game.getOwnedThemes().includes(themeId);

                if (isOwned) {
                    Game.setActiveTheme(themeId);
                } else {
                    const success = Game.buyTheme(themeId);
                    if (!success) return;
                }

                applyTheme(Game.getActiveTheme());
                showShop(); // Refresh shop UI
                updateMenuStars();
            });
        });

        $('hud').classList.remove('visible');
        showScreen('shop-screen');
    }

    function getThemeData() {
        return THEMES;
    }

    return {
        updateHUD,
        showScreen,
        hideAllScreens,
        showMenu,
        showSettings,
        showLevelSelect,
        showLevelComplete,
        showGameOver,
        showAllComplete,
        applyTranslations,
        showShop,
        updateMenuStars,
        applyTheme,
        getThemeData,
    };
})();
