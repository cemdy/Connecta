// =============================================================
// game.js — Core game engine
//   Features: boundary walls, cage mechanic + prerequisite reset,
//   continuous collision (spinners/lasers vs drawn path),
//   self-crossing prevention, dark mode (fog+memory merged),
//   speed mode, score system, darker line colors
// =============================================================

const Game = (() => {
    let canvas, ctx;
    let gameArea = { x: 0, y: 0, w: 0, h: 0 };

    // State
    let shapes = [];
    let obstacles = [];
    let lasers = [];
    let spinners = [];
    let connections = [];
    let currentPath = [];
    let drawingFrom = null;
    let isDrawing = false;
    let lives = 3;
    let timeLeft = 60;
    let timerInterval = null;
    let currentLevel = 0;
    let pairCount = 0;
    let connectedPairs = 0;
    let state = 'menu';
    let levelMessage = null;
    let levelMessageTimer = 0;
    let shakeTimer = 0;
    let particles = [];
    let unlockedLevels = 1;
    let gameTime = 0;

    // Level modes
    let levelMode = 'normal'; // normal | dark | speed
    let darkActive = false; // true when drawing in dark mode (shapes hidden)
    let fogCenter = { x: 0, y: 0 }; // cursor position for dark/reveal circle

    // Score system
    let levelScore = 0;
    let trailParticles = []; // theme trail effect particles

    // Load / save
    let levelStars = {}; // { 0: 3, 1: 2, ... } level index -> best stars
    let ownedThemes = ['default']; // themes the player owns
    let activeTheme = 'default';

    function loadProgress() {
        try {
            const s = localStorage.getItem('shapeMatchProgress');
            if (s) {
                const data = JSON.parse(s);
                unlockedLevels = data.unlockedLevels || 1;
                levelStars = data.levelStars || {};
                ownedThemes = data.ownedThemes || ['default'];
                activeTheme = data.activeTheme || 'default';
            }
        } catch (e) { }
    }
    function saveProgress() {
        try {
            localStorage.setItem('shapeMatchProgress', JSON.stringify({
                unlockedLevels, levelStars, ownedThemes, activeTheme
            }));
        } catch (e) { }
    }

    function getTotalStars() {
        let total = 0;
        for (const k in levelStars) total += levelStars[k];
        return total;
    }

    function getSpentStars() {
        // Each purchased theme (except default) costs 50
        return (ownedThemes.length - 1) * 50;
    }

    function getAvailableStars() {
        return getTotalStars() - getSpentStars();
    }

    function buyTheme(themeId) {
        if (ownedThemes.includes(themeId)) return false;
        if (getAvailableStars() < 50) return false;
        ownedThemes.push(themeId);
        activeTheme = themeId;
        saveProgress();
        return true;
    }

    function setActiveTheme(themeId) {
        if (!ownedThemes.includes(themeId)) return false;
        activeTheme = themeId;
        saveProgress();
        return true;
    }

    function resetProgress() {
        unlockedLevels = 1;
        levelStars = {};
        ownedThemes = ['default'];
        activeTheme = 'default';
        saveProgress();
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        loadProgress();

        resize();
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cw = rect.width, ch = rect.height;
        const hudHeight = 70, padding = 20;
        const availW = cw - padding * 2;
        const availH = ch - hudHeight - padding * 2;
        const side = Math.min(availW, availH);

        gameArea = {
            x: (cw - side) / 2,
            y: hudHeight + (availH - side) / 2 + padding,
            w: side, h: side,
        };

        if (state === 'playing') reloadLevel();
    }

    function startLevel(levelIdx) {
        currentLevel = levelIdx;
        const data = Levels.get(levelIdx, gameArea);
        if (!data) return;

        shapes = data.shapes;
        obstacles = data.obstacles;
        lasers = data.lasers || [];
        spinners = data.spinners || [];
        connections = [];
        currentPath = [];
        drawingFrom = null;
        isDrawing = false;
        connectedPairs = 0;
        lives = 3;
        timeLeft = data.timeLimit || 60;
        state = 'playing';
        particles = [];
        trailParticles = [];
        shakeTimer = 0;
        pairCount = data.pairCount;
        levelMode = data.mode || 'normal';
        darkActive = false;
        levelScore = 0;

        // Apply theme colors to shapes
        const themeData = UI.getThemeData()[activeTheme];
        if (themeData && themeData.shapeColors) {
            shapes.forEach(s => {
                const tc = themeData.shapeColors[s.type];
                if (tc) {
                    s.color = { fill: tc.fill, glow: tc.glow };
                    s.lineColor = darkenColor(tc.fill, 15);
                }
            });
        } else {
            // Reset to defaults
            shapes.forEach(s => {
                s.color = ShapeColors[s.type];
                s.lineColor = darkenColor(s.color.fill, 15);
            });
        }

        if (data.message) {
            // Translate the message key
            levelMessage = I18n.t(data.message, data.messageParams);
            levelMessageTimer = 2.5;
        } else {
            levelMessage = `${I18n.t('level')} ${levelIdx + 1}`;
            levelMessageTimer = 1.5;
        }

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (state !== 'playing') return;
            timeLeft--;
            UI.updateHUD(lives, timeLeft, currentLevel + 1, levelScore);
            if (timeLeft <= 0) gameOver();
        }, 1000);

        UI.updateHUD(lives, timeLeft, currentLevel + 1);
        UI.hideAllScreens();
    }

    function reloadLevel() {
        const data = Levels.get(currentLevel, gameArea);
        if (!data) return;
        const connSet = new Set();
        shapes.forEach(s => { if (s.connected) connSet.add(s.type + '_' + s.pairId); });
        shapes = data.shapes;
        obstacles = data.obstacles;
        lasers = data.lasers || [];
        spinners = data.spinners || [];
        pairCount = data.pairCount;
        shapes.forEach(s => {
            if (connSet.has(s.type + '_' + s.pairId)) s.connected = true;
        });
        connections = [];
        connectedPairs = connSet.size;

        // Re-apply theme colors
        const themeData = UI.getThemeData()[activeTheme];
        if (themeData && themeData.shapeColors) {
            shapes.forEach(s => {
                const tc = themeData.shapeColors[s.type];
                if (tc) {
                    s.color = { fill: tc.fill, glow: tc.glow };
                    s.lineColor = darkenColor(tc.fill, 15);
                }
            });
        }
    }

    function gameOver() {
        state = 'gameOver';
        clearInterval(timerInterval);
        Audio.gameOver();
        UI.showGameOver(currentLevel + 1);
    }

    function levelComplete() {
        state = 'levelComplete';
        clearInterval(timerInterval);
        Audio.levelComplete();

        // Calculate stars
        const maxScore = (pairCount || 3) * 100;
        let stars = 1;
        if (levelScore >= maxScore * 0.80) stars = 3;
        else if (levelScore >= maxScore * 0.50) stars = 2;

        // Save best stars
        const prev = levelStars[currentLevel] || 0;
        if (stars > prev) levelStars[currentLevel] = stars;

        if (currentLevel + 1 >= Levels.count) {
            state = 'allComplete';
            UI.showAllComplete();
        } else {
            if (currentLevel + 2 > unlockedLevels) {
                unlockedLevels = currentLevel + 2;
            }
        }
        saveProgress();
        spawnCelebration();
        UI.showLevelComplete(currentLevel + 1, timeLeft, levelScore, pairCount);
    }

    function loseLife() {
        lives--;
        shakeTimer = 0.3;
        Audio.hit();
        spawnHitParticles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null);
        UI.updateHUD(lives, timeLeft, currentLevel + 1);
        currentPath = [];
        drawingFrom = null;
        isDrawing = false;
        darkActive = false; // memoryActive was replaced by darkActive
        if (lives <= 0) gameOver();
    }

    function stop() {
        state = 'menu';
        clearInterval(timerInterval);
        UI.hideAllScreens();
    }

    // ---- CAGE MECHANIC ----

    function onPairConnected(pairId) {
        shapes.forEach(s => {
            if (s.caged && s.cageUnlockPairId === pairId) {
                s.caged = false;
                s.cageFreeTimer = s.cageFreeMax;
                s.cageJustFreed = true;
                Audio.unlock();
            }
        });
    }

    function updateCages(dt) {
        shapes.forEach(s => {
            if (!s.caged && s.cageFreeTimer > 0 && !s.connected) {
                s.cageFreeTimer -= dt;
                if (s.cageFreeTimer <= 0) {
                    // Re-cage! AND reset the prerequisite pair
                    s.caged = true;
                    s.cageFreeTimer = -1;
                    s.cageJustFreed = false;
                    resetPairConnection(s.cageUnlockPairId);
                    Audio.hit();
                    shakeTimer = 0.15;
                }
            }
        });
    }

    function resetPairConnection(pairId) {
        // Find shapes with this pairId and disconnect them
        let wasConnected = false;
        shapes.forEach(s => {
            if (s.pairId === pairId && s.connected) {
                s.connected = false;
                wasConnected = true;
            }
        });
        // Remove connection path
        connections = connections.filter(c => c.pairId !== pairId);
        // Only decrement if pair was actually connected
        if (wasConnected) {
            connectedPairs = Math.max(0, connectedPairs - 1);
        }
        UI.updateHUD(lives, timeLeft, currentLevel + 1, levelScore);
    }

    // ---- BOUNDARY CHECK ----

    function isOutsideGameArea(x, y) {
        return x < gameArea.x || x > gameArea.x + gameArea.w ||
            y < gameArea.y || y > gameArea.y + gameArea.h;
    }

    function segmentExitsGameArea(x1, y1, x2, y2) {
        if (isOutsideGameArea(x2, y2)) return true;
        const ga = gameArea;
        const l = ga.x, t = ga.y, r = ga.x + ga.w, b = ga.y + ga.h;
        if (_globalSegmentsIntersect(x1, y1, x2, y2, l, t, l, b)) return true;
        if (_globalSegmentsIntersect(x1, y1, x2, y2, r, t, r, b)) return true;
        if (_globalSegmentsIntersect(x1, y1, x2, y2, l, t, r, t)) return true;
        if (_globalSegmentsIntersect(x1, y1, x2, y2, l, b, r, b)) return true;
        return false;
    }

    // ---- CONTINUOUS COLLISION (moving obstacles vs drawn path) ----

    function checkPathAgainstMovingObstacles() {
        if (!isDrawing || currentPath.length < 2) return;
        // Check each segment of currentPath against spinners and active lasers
        for (let i = 1; i < currentPath.length; i++) {
            const p1 = currentPath[i - 1], p2 = currentPath[i];
            for (const sp of spinners) {
                if (sp.intersectsSegment(p1.x, p1.y, p2.x, p2.y)) {
                    loseLife();
                    return;
                }
            }
            for (const la of lasers) {
                if (la.intersectsSegment(p1.x, p1.y, p2.x, p2.y)) {
                    loseLife();
                    return;
                }
            }
        }
    }

    // ---- SELF-CROSSING CHECK ----

    function pathSelfCrosses(newX, newY) {
        if (currentPath.length < 3) return false;
        const last = currentPath[currentPath.length - 1];
        // Check new segment against all previous segments (except last 2 which are adjacent)
        for (let i = 1; i < currentPath.length - 2; i++) {
            const p1 = currentPath[i - 1], p2 = currentPath[i];
            if (_globalSegmentsIntersect(last.x, last.y, newX, newY, p1.x, p1.y, p2.x, p2.y)) {
                return true;
            }
        }
        return false;
    }

    // ---- DRAWING & COLLISION ----

    function onPointerDown(x, y) {
        if (state !== 'playing') return;
        Audio.resume();

        for (const s of shapes) {
            if (!s.connected && !s.caged && s.containsPoint(x, y)) {
                isDrawing = true;
                drawingFrom = s;
                leftOriginShape = false; // track if we left the starting shape
                currentPath = [{ x: s.x, y: s.y }];
                Audio.drawStart();

                // Dark mode: activate hiding
                if (levelMode === 'dark') {
                    darkActive = true;
                }
                return;
            }
        }
    }

    function onPointerMove(x, y) {
        if (!isDrawing || state !== 'playing') return;

        // Update fog center
        fogCenter = { x, y };

        const last = currentPath[currentPath.length - 1];
        const dx = x - last.x, dy = y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) return;

        // 1) Boundary wall
        if (segmentExitsGameArea(last.x, last.y, x, y)) {
            loseLife(); return;
        }

        // 2) Self-crossing check
        if (pathSelfCrosses(x, y)) {
            loseLife(); return;
        }

        // 3) Obstacle collision
        for (const obs of obstacles) {
            if (obs.intersectsSegment(last.x, last.y, x, y)) {
                loseLife(); return;
            }
        }

        // 4) Laser collision
        for (const laser of lasers) {
            if (laser.intersectsSegment(last.x, last.y, x, y)) {
                loseLife(); return;
            }
        }

        // 5) Spinner collision
        for (const spinner of spinners) {
            if (spinner.intersectsSegment(last.x, last.y, x, y)) {
                loseLife(); return;
            }
        }

        // 6) Self-shape collision (can't re-enter own starting shape)
        if (drawingFrom && !drawingFrom.containsPoint(x, y)) {
            leftOriginShape = true;
        }
        if (leftOriginShape && drawingFrom && segmentIntersectsCircle(last.x, last.y, x, y, drawingFrom.x, drawingFrom.y, drawingFrom.size * 0.8)) {
            loseLife(); return;
        }

        // 7) Other shape collision (not our matching pair)
        for (const s of shapes) {
            if (s === drawingFrom) continue;
            if (s.pairId === drawingFrom.pairId && s.type === drawingFrom.type) continue;
            if (segmentIntersectsCircle(last.x, last.y, x, y, s.x, s.y, s.size * 0.8)) {
                loseLife(); return;
            }
        }

        // 8) Existing connection collision
        for (const conn of connections) {
            for (let i = 1; i < conn.path.length; i++) {
                const p1 = conn.path[i - 1], p2 = conn.path[i];
                if (_globalSegmentsIntersect(last.x, last.y, x, y, p1.x, p1.y, p2.x, p2.y)) {
                    loseLife(); return;
                }
            }
        }

        currentPath.push({ x, y });

        // Check if reached matching shape
        for (const s of shapes) {
            if (s === drawingFrom) continue;
            if (s.pairId === drawingFrom.pairId && s.type === drawingFrom.type && !s.connected && !s.caged) {
                if (s.containsPoint(x, y)) {
                    // SUCCESS — calculate score based on path length
                    currentPath.push({ x: s.x, y: s.y });
                    const pathLen = calcPathLength(currentPath);
                    const optDist = Math.sqrt(
                        (drawingFrom.x - s.x) ** 2 + (drawingFrom.y - s.y) ** 2
                    );
                    const ratio = optDist > 0 ? pathLen / optDist : 1;
                    // ratio=1 → 100pts, ratio=2 → 70pts (very lenient)
                    const pts = Math.round(Math.max(10, Math.min(100, 100 - (ratio - 1) * 30)));
                    levelScore += pts;
                    // Show floating score
                    spawnScorePopup(s.x, s.y, pts);

                    connections.push({
                        path: [...currentPath],
                        pairId: drawingFrom.pairId,
                        color: drawingFrom.lineColor,
                    });
                    drawingFrom.connected = true;
                    s.connected = true;
                    connectedPairs++;
                    isDrawing = false;
                    drawingFrom = null;
                    currentPath = [];
                    darkActive = false;
                    Audio.connect();
                    onPairConnected(s.pairId);
                    UI.updateHUD(lives, timeLeft, currentLevel + 1, levelScore);
                    if (connectedPairs >= pairCount) levelComplete();
                    return;
                }
            }
        }
    }

    function onPointerUp() {
        if (!isDrawing) return;
        currentPath = [];
        drawingFrom = null;
        isDrawing = false;
        darkActive = false;
    }

    // Score helpers
    let leftOriginShape = false;
    let scorePopups = [];

    function calcPathLength(path) {
        let len = 0;
        for (let i = 1; i < path.length; i++) {
            len += Math.sqrt((path[i].x - path[i - 1].x) ** 2 + (path[i].y - path[i - 1].y) ** 2);
        }
        return len;
    }

    function spawnScorePopup(x, y, pts) {
        scorePopups.push({ x, y, pts, life: 1.2, maxLife: 1.2 });
    }

    // Segment-circle
    function segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        const ddx = x2 - x1, ddy = y2 - y1;
        const fx = x1 - cx, fy = y1 - cy;
        const a = ddx * ddx + ddy * ddy;
        const b = 2 * (fx * ddx + fy * ddy);
        const c = fx * fx + fy * fy - r * r;
        let disc = b * b - 4 * a * c;
        if (disc < 0) return false;
        disc = Math.sqrt(disc);
        const t1 = (-b - disc) / (2 * a);
        const t2 = (-b + disc) / (2 * a);
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
    }

    // ---- PARTICLES ----

    function spawnCelebration() {
        const cx = gameArea.x + gameArea.w / 2, cy = gameArea.y + gameArea.h / 2;
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 250;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 100,
                life: 1.5 + Math.random(), maxLife: 1.5 + Math.random(),
                color: LINE_COLOR_LIST[Math.floor(Math.random() * LINE_COLOR_LIST.length)],
                size: 3 + Math.random() * 5,
            });
        }
    }

    function spawnHitParticles(point) {
        if (!point) return;
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            particles.push({
                x: point.x, y: point.y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.5, maxLife: 0.5 + Math.random() * 0.5,
                color: '#ff4444', size: 2 + Math.random() * 3,
            });
        }
    }

    // ---- RENDER ----

    function render(time, dt) {
        gameTime = time;
        const cw = canvas.getBoundingClientRect().width;
        const ch = canvas.getBoundingClientRect().height;
        ctx.clearRect(0, 0, cw, ch);

        if (state === 'menu') return;
        if (state !== 'playing' && state !== 'levelComplete' && state !== 'allComplete' && state !== 'gameOver') return;

        // Update logic
        if (state === 'playing') {
            updateCages(dt);
            // Continuous collision: moving obstacles vs current drawn path
            checkPathAgainstMovingObstacles();
        }

        // Shake
        let shakeX = 0, shakeY = 0;
        if (shakeTimer > 0) {
            shakeTimer -= dt;
            shakeX = (Math.random() - 0.5) * 12;
            shakeY = (Math.random() - 0.5) * 12;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Game area background + boundary wall
        drawGameAreaBg(time);

        // Obstacles
        obstacles.forEach(o => o.draw(ctx, time));

        // Lasers
        lasers.forEach(l => l.draw(ctx, time));

        // Spinners
        spinners.forEach(s => s.draw(ctx, time));

        // Completed connections
        connections.forEach(conn => drawPath(conn.path, conn.color, 4, 0.8, false));

        // Current drawing path
        if (isDrawing && currentPath.length > 1 && drawingFrom) {
            drawPath(currentPath, drawingFrom.lineColor, 3, 0.6, true);
        }

        // ---- DARK MODE: unified fog + memory ----
        const isDark = (levelMode === 'dark');
        const darkDrawing = (isDark && darkActive && isDrawing && drawingFrom);
        const revealRadius = Math.min(gameArea.w, gameArea.h) * 0.18;
        const cursorX = fogCenter.x;
        const cursorY = fogCenter.y;

        // Draw shapes
        shapes.forEach(s => {
            if (darkDrawing && !s.connected) {
                // Only show shapes within reveal radius
                const dx = s.x - cursorX, dy = s.y - cursorY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > revealRadius) return;
                const fadeAlpha = 1 - (dist / revealRadius) * 0.5;
                ctx.save();
                ctx.globalAlpha = fadeAlpha;
                s.draw(ctx, time, false);
                ctx.restore();
            } else if (isDark && darkActive && !s.connected) {
                return; // hidden
            } else {
                s.draw(ctx, time, false);
            }
        });

        // Draw dark mode reveal circle
        if (darkDrawing) {
            ctx.save();
            const revealColor = drawingFrom.color.fill;
            const rr = parseInt(revealColor.slice(1, 3), 16);
            const rg = parseInt(revealColor.slice(3, 5), 16);
            const rb = parseInt(revealColor.slice(5, 7), 16);
            ctx.strokeStyle = revealColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3 + Math.sin(gameTime * 4) * 0.1;
            ctx.shadowColor = revealColor;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(cursorX, cursorY, revealRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.shadowBlur = 0;
            const grad = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, revealRadius);
            grad.addColorStop(0, `rgba(${rr},${rg},${rb},0.1)`);
            grad.addColorStop(0.7, `rgba(${rr},${rg},${rb},0.03)`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cursorX, cursorY, revealRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Score popups
        scorePopups.forEach(p => {
            p.life -= dt;
            if (p.life <= 0) return;
            const progress = 1 - p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.fillStyle = p.pts >= 80 ? '#00ff88' : p.pts >= 40 ? '#ffbe0b' : '#ff6b6b';
            ctx.font = `bold ${14 + progress * 8}px 'Outfit', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 5;
            ctx.fillText(`+${p.pts}`, p.x, p.y - progress * 40);
            ctx.restore();
        });
        scorePopups = scorePopups.filter(p => p.life > 0);

        // Drawing source highlight
        if (isDrawing && drawingFrom) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(drawingFrom.x, drawingFrom.y, drawingFrom.size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // DARK mode overlay (fog effect — always on in dark mode)
        if (isDark && state === 'playing') {
            drawDarkOverlay(cw, ch);
        }

        // Particles
        updateAndDrawParticles(dt);

        // Theme trail particles
        updateAndDrawTrailParticles(dt);

        // Level message
        if (levelMessageTimer > 0 && levelMessage) {
            levelMessageTimer -= dt;
            const alpha = Math.min(1, levelMessageTimer / 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.min(32, cw * 0.055)}px 'Outfit', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText(levelMessage, cw / 2, gameArea.y + gameArea.h / 2);
            ctx.restore();
        }

        // Mode indicator
        if (state === 'playing' && levelMode !== 'normal') {
            drawModeIndicator(cw);
        }
    }

    function drawDarkOverlay(cw, ch) {
        // Unified dark overlay: fog + shape-hiding
        ctx.save();
        ctx.fillStyle = 'rgba(5, 5, 20, 0.88)';
        ctx.fillRect(0, 0, cw, ch);

        const radius = Math.min(gameArea.w, gameArea.h) * 0.18;
        const cx = isDrawing ? fogCenter.x : cw / 2;
        const cy = isDrawing ? fogCenter.y : ch / 2;

        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);

        // When not drawing, show shapes as faint dots to help memorize
        if (!isDrawing) {
            ctx.globalCompositeOperation = 'destination-out';
            shapes.forEach(s => {
                if (!s.connected) {
                    const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2.5);
                    sg.addColorStop(0, 'rgba(0,0,0,0.7)');
                    sg.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = sg;
                    ctx.fillRect(s.x - s.size * 3, s.y - s.size * 3, s.size * 6, s.size * 6);
                }
            });
        }

        ctx.restore();
    }

    function drawModeIndicator(cw) {
        const labels = {
            dark: I18n.t('darkMode'),
            speed: I18n.t('speedMode'),
        };
        const label = labels[levelMode];
        if (!label) return;

        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(gameTime * 3) * 0.2;
        ctx.fillStyle = levelMode === 'speed' ? '#ffbe0b' : '#8338ec';
        ctx.font = `bold 12px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cw / 2, gameArea.y - 6);
        ctx.restore();
    }

    function drawGameAreaBg(time) {
        const ga = gameArea;
        ctx.save();

        // Read theme colors from CSS variables
        const cs = getComputedStyle(document.documentElement);
        const gridColor = cs.getPropertyValue('--theme-grid').trim() || 'rgba(255,255,255,0.03)';
        const borderColor = cs.getPropertyValue('--theme-border').trim() || 'rgba(255, 80, 80, 0.6)';
        const borderGlow = cs.getPropertyValue('--theme-border-glow').trim() || 'rgba(255, 60, 60, 0.5)';

        // Subtle grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const step = 30;
        for (let x = ga.x; x <= ga.x + ga.w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, ga.y); ctx.lineTo(x, ga.y + ga.h); ctx.stroke();
        }
        for (let y = ga.y; y <= ga.y + ga.h; y += step) {
            ctx.beginPath(); ctx.moveTo(ga.x, y); ctx.lineTo(ga.x + ga.w, y); ctx.stroke();
        }

        // Boundary wall
        const pulse = Math.sin(time * 3) * 0.15;
        ctx.shadowColor = borderGlow;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(ga.x, ga.y, ga.w, ga.h);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 150, 150, ${0.25 + pulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(ga.x + 1.5, ga.y + 1.5, ga.w - 3, ga.h - 3);

        // Corner dots
        ctx.fillStyle = `rgba(255, 100, 100, ${0.8 + pulse})`;
        ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 8;
        [[ga.x, ga.y], [ga.x + ga.w, ga.y], [ga.x, ga.y + ga.h], [ga.x + ga.w, ga.y + ga.h]].forEach(([cx, cy]) => {
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();
    }

    function drawPath(path, color, width, alpha, emitTrail) {
        if (path.length < 2) return;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Get theme trail config
        const themeData = UI.getThemeData()[activeTheme];
        const trail = themeData ? themeData.trail : null;

        if (trail) {
            // Themed glow on line
            ctx.strokeStyle = color;
            ctx.lineWidth = width + 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = trail.glow;
            ctx.shadowBlur = trail.glowBlur;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
            ctx.stroke();

            // Inner bright line
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.3;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
            ctx.stroke();
        } else {
            // Default rendering
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
            ctx.stroke();
        }

        ctx.restore();

        // Emit trail particles along the path (only when actively drawing)
        if (trail && emitTrail && path.length >= 2) {
            // Emit from a few points along the last segments
            const emitCount = Math.min(3, path.length - 1);
            for (let e = 0; e < emitCount; e++) {
                const idx = path.length - 1 - e;
                if (idx < 0) break;
                if (Math.random() > 0.4) continue; // not every frame
                const p = path[idx];
                const tc = trail.colors[Math.floor(Math.random() * trail.colors.length)];
                const size = trail.sizeMin + Math.random() * (trail.sizeMax - trail.sizeMin);
                trailParticles.push({
                    x: p.x + (Math.random() - 0.5) * trail.spread,
                    y: p.y + (Math.random() - 0.5) * trail.spread,
                    vx: (Math.random() - 0.5) * trail.speed * 30,
                    vy: -Math.random() * trail.speed * 40,
                    size,
                    color: tc,
                    life: trail.lifetime,
                    maxLife: trail.lifetime,
                    glow: trail.glow,
                    glowBlur: trail.glowBlur,
                });
            }
        }
    }

    function updateAndDrawTrailParticles(dt) {
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            const p = trailParticles[i];
            p.life -= dt;
            if (p.life <= 0) { trailParticles.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.glow;
            ctx.shadowBlur = p.glowBlur * alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function updateAndDrawParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vy += 200 * dt; p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    return {
        init, resize, startLevel, stop, render,
        onPointerDown, onPointerMove, onPointerUp,
        getState: () => state,
        setState: (s) => { state = s; },
        getCurrentLevel() { return currentLevel; },
        getUnlockedLevels() { return unlockedLevels; },
        getLevelCount() { return Levels.count; },
        getLevelStars(idx) { return levelStars[idx] || 0; },
        getGameArea() { return gameArea; },
        // Shop API
        getTotalStars,
        getAvailableStars,
        buyTheme,
        setActiveTheme,
        getActiveTheme() { return activeTheme; },
        getOwnedThemes() { return [...ownedThemes]; },
        resetProgress,
    };
})();
