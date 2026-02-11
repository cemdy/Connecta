// =============================================================
// levels.js — 30 Levels with balanced progressive difficulty
//   Mechanics: normal, dark (fog+memory merged), speed, cage, laser, spinner
//   Mobile-friendly: generous spacing, gradual difficulty curve
//   No overlapping obstacles, spinners don't clip blocks
// =============================================================

const Levels = (() => {
    const T = ShapeTypes;

    // Level definitions:
    // pairs: [{type, positions:[[x%,y%],[x%,y%]], cage?:{unlock:pairIdx, timer:sec}}]
    // obstacles: [{x%, y%, w%, h%}]
    // lasers: [{x1%,y1%,x2%,y2%, blink?:speed}]
    // spinners: [{cx%,cy%,len%,speed}]
    // mode: 'normal' | 'memory' | 'fog' | 'speed'
    // timeLimit: seconds (default 60)
    // shapeScale: multiplier for shape size (default 1.0)

    const definitions = [
        // ======== BÖLÜM 1: ÖĞRENME (1-4) ========

        // Level 1: Kolay giriş
        {
            pairs: [
                { type: T.CIRCLE, positions: [[25, 35], [75, 35]] },
                { type: T.SQUARE, positions: [[25, 65], [75, 65]] },
            ],
            obstacles: [],
            shapeScale: 1.3,
            message: 'msg_connect',
        },

        // Level 2: İlk engel tanışma
        {
            pairs: [
                { type: T.CIRCLE, positions: [[20, 30], [80, 70]] },
                { type: T.TRIANGLE, positions: [[80, 30], [20, 70]] },
            ],
            obstacles: [
                { x: 42, y: 42, w: 16, h: 16 },
            ],
            shapeScale: 1.2,
            message: 'msg_obstacles',
        },

        // Level 3: "The Detour" - Giant central block
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 50], [90, 50]] }, // Horizontal
                { type: T.SQUARE, positions: [[50, 10], [50, 90]] }, // Vertical
                { type: T.TRIANGLE, positions: [[20, 20], [80, 80]] }, // Diagonal
            ],
            obstacles: [
                { x: 30, y: 30, w: 40, h: 40 }, // Huge central block forcefields
            ],
            shapeScale: 1.1,
            message: 'msg_connect',
        },

        // Level 4: "Zig Zag" - Layered walls
        {
            pairs: [
                { type: T.STAR, positions: [[50, 10], [50, 90]] }, // Vertical through maze
                { type: T.HEXAGON, positions: [[10, 50], [90, 50]] }, // Horizontal
                { type: T.CIRCLE, positions: [[80, 20], [20, 80]] }, // Diagonal
            ],
            obstacles: [
                { x: 20, y: 33, w: 60, h: 5 }, // Upper bar
                { x: 20, y: 66, w: 60, h: 5 }, // Lower bar
            ],
            shapeScale: 1.1,
        },

        // ======== BÖLÜM 2: LAZER GİRİŞİ (5-7) ========

        // Level 5: "The Divider" - Static Laser Wall
        {
            pairs: [
                { type: T.CIRCLE, positions: [[20, 50], [80, 50]] }, // The Crosser (Must go around)
                { type: T.SQUARE, positions: [[25, 25], [25, 75]] }, // Left Guard
                { type: T.TRIANGLE, positions: [[75, 25], [75, 75]] }, // Right Guard
            ],
            obstacles: [],
            lasers: [
                { x1: 50, y1: 15, x2: 50, y2: 85 }, // Static central laser (The Divider)
            ],
            message: 'msg_laser',
        },

        // Level 6: "The Shredder" - Giant Fast Spinner
        {
            pairs: [
                { type: T.STAR, positions: [[10, 10], [90, 90]] },
                { type: T.HEXAGON, positions: [[90, 10], [10, 90]] },
                { type: T.CIRCLE, positions: [[50, 10], [50, 90]] },
                { type: T.SQUARE, positions: [[10, 50], [90, 50]] },
            ],
            obstacles: [],
            spinners: [
                { cx: 50, cy: 50, len: 35, speed: 2.5 }, // HUGE FAST SPINNER
            ],
            message: 'msg_spinner',
        },

        // Level 7: "Twin Turbines"
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 50], [90, 50]] }, // Left to Right through turbulence
                { type: T.SQUARE, positions: [[50, 10], [50, 90]] }, // Up to Down
                { type: T.DIAMOND, positions: [[20, 20], [80, 80]] }, // Diagonal
            ],
            obstacles: [],
            spinners: [
                { cx: 30, cy: 50, len: 22, speed: 1.5 },
                { cx: 70, cy: 50, len: 22, speed: -1.5 },
            ],
            message: 'msg_spinner',
        },

        // ======== BÖLÜM 3: DÖNEN ENGEL (8-9) ========

        // Level 8: "The Grate" - Horizontal Bars
        {
            pairs: [
                { type: T.CIRCLE, positions: [[20, 10], [80, 90]] }, // Cross (TL to BR)
                { type: T.SQUARE, positions: [[80, 10], [20, 90]] }, // Cross (TR to BL)
                { type: T.TRIANGLE, positions: [[50, 10], [50, 90]] }, // Vertical
            ],
            obstacles: [
                { x: 10, y: 33, w: 80, h: 5 }, // Top Bar (Gap at edges)
                { x: 10, y: 66, w: 80, h: 5 }, // Bottom Bar (Gap at edges)
            ],
            // No lasers
            message: 'msg_obstacles',
        },

        // Level 9: "The Heist" - Guarded Cage
        {
            pairs: [
                { type: T.HEXAGON, positions: [[15, 15], [85, 85]] }, // Outside pair
                {
                    type: T.STAR, positions: [[50, 50], [50, 15]], // Key inside danger zone
                    cage: { unlock: 0, timer: 8 }
                },
                { type: T.CIRCLE, positions: [[15, 85], [85, 15]] },
            ],
            obstacles: [
                { x: 35, y: 35, w: 30, h: 5 }, // Top wall
                { x: 35, y: 65, w: 30, h: 5 }, // Bottom wall
                { x: 35, y: 35, w: 5, h: 35 }, // Left wall
                // Right is open but guarded
            ],
            spinners: [
                { cx: 75, cy: 50, len: 20, speed: 2.0 }, // Guarding the entrance
            ],
            message: 'msg_cage',
        },

        // ======== BÖLÜM 4: HAPİS MEKANİĞİ (10-11) ========

        // Level 10: "Nightmare" - Dark + Spinner
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 10], [90, 90]] },
                { type: T.SQUARE, positions: [[90, 10], [10, 90]] },
                {
                    type: T.TRIANGLE, positions: [[50, 20], [50, 80]],
                    cage: { unlock: 0, timer: 10 }
                },
            ],
            obstacles: [],
            spinners: [
                { cx: 50, cy: 50, len: 35, speed: 1.5 }, // Giant hidden spinner
            ],
            mode: 'dark', // Memory mode
            message: 'msg_darkSpin',
        },

        // Level 11: "The Vault" - Layered Locking
        {
            pairs: [
                { type: T.STAR, positions: [[15, 10], [15, 90]] }, // Key 1 holder
                {
                    type: T.CIRCLE, positions: [[85, 10], [50, 50]], // Needs Key 1
                    cage: { unlock: 0, timer: 10 }
                },
                { type: T.HEXAGON, positions: [[10, 50], [90, 50]] }, // Key 2 holder
                {
                    type: T.DIAMOND, positions: [[50, 90], [85, 90]], // Needs Key 2
                    cage: { unlock: 2, timer: 10 }
                },
            ],
            obstacles: [
                { x: 30, y: 20, w: 40, h: 4 }, // Top barrier
                { x: 30, y: 80, w: 40, h: 4 }, // Bottom barrier
                { x: 20, y: 35, w: 4, h: 30 }, // Left barrier
                { x: 80, y: 35, w: 4, h: 30 }, // Right barrier
            ],
            message: 'msg_doubleCage',
        },

        // ======== BÖLÜM 5: HAFIZA MODU (12-13) ========

        // Level 12: "The Grid" - Memory Maze
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 10], [90, 90]] },
                { type: T.SQUARE, positions: [[90, 10], [10, 90]] },
                { type: T.TRIANGLE, positions: [[50, 15], [50, 85]] },
            ],
            obstacles: [
                { x: 30, y: 30, w: 10, h: 10 },
                { x: 60, y: 30, w: 10, h: 10 },
                { x: 30, y: 60, w: 10, h: 10 },
                { x: 60, y: 60, w: 10, h: 10 },
            ],
            mode: 'dark',
            shapeScale: 1.2,
            message: 'msg_dark',
        },

        // Level 13: "The Tunnel" - Three Channels
        {
            pairs: [
                { type: T.CIRCLE, positions: [[15, 15], [85, 85]] }, // BL to TR
                { type: T.SQUARE, positions: [[85, 15], [15, 85]] }, // BR to TL
                { type: T.STAR, positions: [[50, 10], [50, 90]] }, // Middle
            ],
            obstacles: [
                { x: 30, y: 10, w: 5, h: 80 }, // Left Wall
                { x: 65, y: 10, w: 5, h: 80 }, // Right Wall
            ],
            mode: 'dark',
            shapeScale: 1.1,
            message: 'msg_darkObs',
        },

        // ======== BÖLÜM 6: HIZ MODU (14) ========

        // Level 14: "X-Cross" - Speed Maze
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 50], [90, 50]] },
                { type: T.SQUARE, positions: [[50, 10], [50, 90]] },
                { type: T.TRIANGLE, positions: [[20, 20], [80, 80]] },
                { type: T.DIAMOND, positions: [[80, 20], [20, 80]] },
            ],
            obstacles: [
                { x: 20, y: 20, w: 15, h: 4 }, // TL arm
                { x: 65, y: 20, w: 15, h: 4 }, // TR arm
                { x: 20, y: 76, w: 15, h: 4 }, // BL arm
                { x: 65, y: 76, w: 15, h: 4 }, // BR arm
                { x: 45, y: 45, w: 10, h: 10 }, // Center
            ],
            mode: 'speed',
            timeLimit: 40,
            message: 'msg_speed',
            messageParams: { n: 40 },
        },

        // ======== BÖLÜM 7: SİS MODU (15-16) ========

        // Level 15: "Cloud City" - Foggy Blocks
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 10], [90, 10]] },
                { type: T.SQUARE, positions: [[10, 90], [90, 90]] },
                { type: T.TRIANGLE, positions: [[10, 50], [90, 50]] },
            ],
            obstacles: [
                { x: 25, y: 0, w: 5, h: 40 }, // Top Left Wall
                { x: 70, y: 0, w: 5, h: 40 }, // Top Right Wall
                { x: 25, y: 60, w: 5, h: 40 }, // Bottom Left Wall
                { x: 70, y: 60, w: 5, h: 40 }, // Bottom Right Wall
            ],
            mode: 'dark',
            shapeScale: 1.1,
            message: 'msg_dark',
        },

        // Level 16: Fog + obstacle
        {
            pairs: [
                { type: T.HEXAGON, positions: [[15, 20], [85, 80]] },
                { type: T.STAR, positions: [[85, 20], [15, 80]] },
                { type: T.CIRCLE, positions: [[15, 50], [85, 50]] },
                { type: T.DIAMOND, positions: [[50, 15], [50, 85]] },
            ],
            obstacles: [
                { x: 32, y: 32, w: 10, h: 10 },
                { x: 58, y: 58, w: 10, h: 10 },
            ],
            lasers: [
                { x1: 44, y1: 48, x2: 56, y2: 48, blink: 2 },
            ],
            mode: 'dark',
        },

        // ======== BÖLÜM 8: ZİNCİRLEME KİLİT (17) ========

        // Level 17: Cage chain
        {
            pairs: [
                { type: T.CIRCLE, positions: [[18, 18], [82, 82]] },
                {
                    type: T.SQUARE, positions: [[82, 18], [18, 82]],
                    cage: { unlock: 0, timer: 7 }
                },
                {
                    type: T.TRIANGLE, positions: [[18, 50], [82, 50]],
                    cage: { unlock: 1, timer: 6 }
                },
                {
                    type: T.STAR, positions: [[50, 18], [50, 82]],
                    cage: { unlock: 2, timer: 5 }
                },
            ],
            obstacles: [
                { x: 38, y: 33, w: 10, h: 8 },
                { x: 52, y: 59, w: 10, h: 8 },
            ],
            message: 'msg_chain',
        },

        // ======== BÖLÜM 9: KARISIK ZOR (18-19) ========

        // Level 18: Mixed — spinner + cage + laser
        {
            pairs: [
                { type: T.CIRCLE, positions: [[12, 15], [88, 85]] },
                { type: T.SQUARE, positions: [[88, 15], [12, 85]] },
                {
                    type: T.TRIANGLE, positions: [[50, 12], [50, 88]],
                    cage: { unlock: 0, timer: 6 }
                },
                { type: T.STAR, positions: [[12, 50], [88, 50]] },
                {
                    type: T.HEXAGON, positions: [[35, 35], [65, 65]],
                    cage: { unlock: 3, timer: 6 }
                },
            ],
            obstacles: [
                { x: 28, y: 25, w: 8, h: 8 },
                { x: 64, y: 67, w: 8, h: 8 },
            ],
            spinners: [
                { cx: 50, cy: 50, len: 18, speed: 1.3 },
            ],
            lasers: [
                { x1: 25, y1: 42, x2: 40, y2: 42, blink: 2.5 },
                { x1: 60, y1: 58, x2: 75, y2: 58, blink: 2.5 },
            ],
        },

        // Level 19: Hafıza + cage + spinner
        {
            pairs: [
                { type: T.CIRCLE, positions: [[15, 15], [85, 85]] },
                { type: T.SQUARE, positions: [[85, 15], [15, 85]] },
                { type: T.TRIANGLE, positions: [[15, 50], [85, 50]] },
                {
                    type: T.DIAMOND, positions: [[50, 15], [50, 85]],
                    cage: { unlock: 0, timer: 6 }
                },
            ],
            obstacles: [
                { x: 38, y: 38, w: 8, h: 8 },
                { x: 54, y: 54, w: 8, h: 8 },
            ],
            spinners: [
                { cx: 35, cy: 50, len: 16, speed: 1.0 },
            ],
            mode: 'dark',
            message: 'msg_memCage',
        },

        // ======== BÖLÜM 10: FİNAL (20) ========

        // Level 20: FINAL — karışık her şey
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 12], [90, 88]] },
                { type: T.SQUARE, positions: [[90, 12], [10, 88]] },
                { type: T.TRIANGLE, positions: [[10, 50], [90, 50]] },
                { type: T.STAR, positions: [[50, 10], [50, 90]] },
                {
                    type: T.HEXAGON, positions: [[30, 25], [70, 75]],
                    cage: { unlock: 0, timer: 6 }
                },
                {
                    type: T.DIAMOND, positions: [[70, 25], [30, 75]],
                    cage: { unlock: 1, timer: 6 }
                },
            ],
            obstacles: [
                { x: 25, y: 35, w: 8, h: 8 },
                { x: 67, y: 57, w: 8, h: 8 },
                { x: 44, y: 44, w: 12, h: 12 },
            ],
            spinners: [
                { cx: 30, cy: 65, len: 14, speed: 1.2 },
                { cx: 70, cy: 35, len: 14, speed: -1.0 },
            ],
            lasers: [
                { x1: 20, y1: 28, x2: 38, y2: 28, blink: 2 },
                { x1: 62, y1: 72, x2: 80, y2: 72, blink: 2 },
            ],
            message: 'msg_final20',
        },

        // ======== BÖLÜM 11: GELİŞMİŞ SİS (21-22) ========

        // Level 21: Fog + spinner
        {
            pairs: [
                { type: T.CIRCLE, positions: [[12, 15], [88, 85]] },
                { type: T.SQUARE, positions: [[88, 15], [12, 85]] },
                { type: T.TRIANGLE, positions: [[12, 50], [88, 50]] },
                { type: T.STAR, positions: [[50, 12], [50, 88]] },
            ],
            obstacles: [
                { x: 38, y: 38, w: 10, h: 10 },
            ],
            spinners: [
                { cx: 50, cy: 50, len: 20, speed: 1.0 },
            ],
            mode: 'dark',
            message: 'msg_darkSpin',
        },

        // Level 22: Fog + cage
        {
            pairs: [
                { type: T.HEXAGON, positions: [[15, 18], [85, 82]] },
                { type: T.DIAMOND, positions: [[85, 18], [15, 82]] },
                {
                    type: T.CIRCLE, positions: [[50, 15], [50, 85]],
                    cage: { unlock: 0, timer: 7 }
                },
                { type: T.STAR, positions: [[15, 50], [85, 50]] },
            ],
            obstacles: [
                { x: 35, y: 35, w: 8, h: 8 },
                { x: 57, y: 57, w: 8, h: 8 },
            ],
            mode: 'dark',
            message: 'msg_darkCage',
        },

        // ======== BÖLÜM 12: GELİŞMİŞ HIZ (23) ========

        // Level 23: Speed + laser
        {
            pairs: [
                { type: T.CIRCLE, positions: [[15, 20], [85, 80]] },
                { type: T.SQUARE, positions: [[85, 20], [15, 80]] },
                { type: T.TRIANGLE, positions: [[15, 50], [85, 50]] },
                { type: T.STAR, positions: [[50, 15], [50, 85]] },
                { type: T.HEXAGON, positions: [[35, 30], [65, 70]] },
            ],
            obstacles: [
                { x: 44, y: 44, w: 10, h: 10 },
            ],
            lasers: [
                { x1: 30, y1: 35, x2: 42, y2: 35, blink: 2 },
                { x1: 58, y1: 65, x2: 70, y2: 65, blink: 2 },
            ],
            mode: 'speed',
            timeLimit: 35,
            message: 'msg_speedLaser',
        },

        // ======== BÖLÜM 13: ÇİFT SPİNNER (24) ========

        // Level 24: Dual spinners + obstacles
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 12], [90, 88]] },
                { type: T.SQUARE, positions: [[90, 12], [10, 88]] },
                { type: T.TRIANGLE, positions: [[10, 50], [90, 50]] },
                { type: T.DIAMOND, positions: [[50, 10], [50, 90]] },
                { type: T.STAR, positions: [[30, 25], [70, 75]] },
            ],
            obstacles: [
                { x: 44, y: 44, w: 12, h: 12 },
            ],
            spinners: [
                { cx: 30, cy: 50, len: 18, speed: 1.3 },
                { cx: 70, cy: 50, len: 18, speed: -1.1 },
            ],
        },

        // ======== BÖLÜM 14: HAFIZA ZOR (25-26) ========

        // Level 25: Memory + 4 pairs + obstacles
        {
            pairs: [
                { type: T.CIRCLE, positions: [[15, 18], [85, 82]] },
                { type: T.SQUARE, positions: [[85, 18], [15, 82]] },
                { type: T.TRIANGLE, positions: [[15, 50], [85, 50]] },
                { type: T.DIAMOND, positions: [[50, 15], [50, 85]] },
            ],
            obstacles: [
                { x: 35, y: 30, w: 10, h: 10 },
                { x: 55, y: 60, w: 10, h: 10 },
            ],
            mode: 'dark',
            message: 'msg_dark4',
        },

        // Level 26: Memory + cage chain
        {
            pairs: [
                { type: T.CIRCLE, positions: [[18, 20], [82, 80]] },
                {
                    type: T.SQUARE, positions: [[82, 20], [18, 80]],
                    cage: { unlock: 0, timer: 7 }
                },
                {
                    type: T.TRIANGLE, positions: [[18, 50], [82, 50]],
                    cage: { unlock: 1, timer: 6 }
                },
            ],
            obstacles: [
                { x: 42, y: 42, w: 10, h: 10 },
            ],
            mode: 'dark',
            shapeScale: 1.1,
            message: 'msg_darkChain',
        },

        // ======== BÖLÜM 15: KARISIK KARMA (27-28) ========

        // Level 27: Cage + spinner + fog
        {
            pairs: [
                { type: T.CIRCLE, positions: [[12, 15], [88, 85]] },
                { type: T.SQUARE, positions: [[88, 15], [12, 85]] },
                { type: T.STAR, positions: [[12, 50], [88, 50]] },
                {
                    type: T.TRIANGLE, positions: [[50, 12], [50, 88]],
                    cage: { unlock: 2, timer: 6 }
                },
            ],
            obstacles: [
                { x: 35, y: 28, w: 8, h: 8 },
                { x: 57, y: 64, w: 8, h: 8 },
            ],
            spinners: [
                { cx: 50, cy: 50, len: 16, speed: 1.2 },
            ],
            mode: 'dark',
            message: 'msg_triple',
        },

        // Level 28: Speed + cage + spinner
        {
            pairs: [
                { type: T.HEXAGON, positions: [[15, 15], [85, 85]] },
                { type: T.DIAMOND, positions: [[85, 15], [15, 85]] },
                {
                    type: T.CIRCLE, positions: [[50, 15], [50, 85]],
                    cage: { unlock: 0, timer: 6 }
                },
                { type: T.STAR, positions: [[15, 50], [85, 50]] },
            ],
            obstacles: [
                { x: 40, y: 40, w: 8, h: 8 },
            ],
            spinners: [
                { cx: 50, cy: 55, len: 16, speed: 1.0 },
            ],
            mode: 'speed',
            timeLimit: 35,
            message: 'msg_speedCageSpin',
        },

        // ======== BÖLÜM 16: SON İKİ (29-30) ========

        // Level 29: Everything mixed — hard but fair
        {
            pairs: [
                { type: T.CIRCLE, positions: [[10, 10], [90, 90]] },
                { type: T.SQUARE, positions: [[90, 10], [10, 90]] },
                { type: T.TRIANGLE, positions: [[10, 50], [90, 50]] },
                { type: T.STAR, positions: [[50, 10], [50, 90]] },
                {
                    type: T.HEXAGON, positions: [[30, 25], [70, 75]],
                    cage: { unlock: 0, timer: 6 }
                },
            ],
            obstacles: [
                { x: 42, y: 42, w: 10, h: 10 },
                { x: 25, y: 30, w: 8, h: 8 },
                { x: 67, y: 62, w: 8, h: 8 },
            ],
            spinners: [
                { cx: 35, cy: 65, len: 14, speed: 1.3 },
                { cx: 65, cy: 35, len: 14, speed: -1.0 },
            ],
            lasers: [
                { x1: 22, y1: 45, x2: 38, y2: 45, blink: 2.5 },
                { x1: 62, y1: 55, x2: 78, y2: 55, blink: 2.5 },
            ],
        },

        // Level 30: ULTIMATE FINAL BOSS 🏆
        {
            pairs: [
                { type: T.CIRCLE, positions: [[8, 10], [92, 90]] },
                { type: T.SQUARE, positions: [[92, 10], [8, 90]] },
                { type: T.TRIANGLE, positions: [[8, 50], [92, 50]] },
                { type: T.STAR, positions: [[50, 8], [50, 92]] },
                {
                    type: T.HEXAGON, positions: [[28, 22], [72, 78]],
                    cage: { unlock: 0, timer: 6 }
                },
                {
                    type: T.DIAMOND, positions: [[72, 22], [28, 78]],
                    cage: { unlock: 1, timer: 5 }
                },
            ],
            obstacles: [
                { x: 42, y: 42, w: 10, h: 10 },
                { x: 20, y: 30, w: 6, h: 8 },
                { x: 74, y: 62, w: 6, h: 8 },
            ],
            spinners: [
                { cx: 30, cy: 60, len: 14, speed: 1.5 },
                { cx: 70, cy: 40, len: 14, speed: -1.3 },
            ],
            lasers: [
                { x1: 20, y1: 25, x2: 38, y2: 25, blink: 2 },
                { x1: 62, y1: 75, x2: 80, y2: 75, blink: 2 },
            ],
            message: 'msg_boss',
        },
    ];

    return {
        count: definitions.length,

        get(levelIndex, gameArea) {
            const def = definitions[levelIndex];
            if (!def) return null;

            const { x: gx, y: gy, w: gw, h: gh } = gameArea;
            const scale = def.shapeScale || 1.0;
            const shapeSize = Math.min(gw, gh) * 0.04 * scale;

            // Create shape pairs
            const shapes = [];
            const pairTypes = {}; // pairId → type mapping for cage indicator
            def.pairs.forEach((pair, i) => {
                pairTypes[i] = pair.type;
                pair.positions.forEach(pos => {
                    const shape = new Shape(
                        pair.type,
                        gx + (pos[0] / 100) * gw,
                        gy + (pos[1] / 100) * gh,
                        shapeSize, i
                    );
                    if (pair.cage) {
                        shape.caged = true;
                        shape.cageUnlockPairId = pair.cage.unlock;
                        shape.cageFreeMax = pair.cage.timer || 6;
                        shape.cageFreeTimer = -1;
                        // Set the unlock type indicator
                        shape.cageUnlockType = pairTypes[pair.cage.unlock] || null;
                    }
                    shapes.push(shape);
                });
            });

            // Create obstacles
            const obstacles = (def.obstacles || []).map(o => new Obstacle(
                gx + (o.x / 100) * gw, gy + (o.y / 100) * gh,
                (o.w / 100) * gw, (o.h / 100) * gh
            ));

            // Create lasers
            const lasers = (def.lasers || []).map(l => new LaserObstacle(
                gx + (l.x1 / 100) * gw, gy + (l.y1 / 100) * gh,
                gx + (l.x2 / 100) * gw, gy + (l.y2 / 100) * gh,
                l.blink || 0
            ));

            // Create spinners
            const spinners = (def.spinners || []).map(s => new SpinnerObstacle(
                gx + (s.cx / 100) * gw, gy + (s.cy / 100) * gh,
                (s.len / 100) * Math.min(gw, gh),
                s.speed || 1
            ));

            return {
                shapes, obstacles, lasers, spinners,
                pairCount: def.pairs.length,
                message: def.message || null,
                messageParams: def.messageParams || null,
                mode: def.mode || 'normal',
                timeLimit: def.timeLimit || 60,
            };
        },
    };
})();
