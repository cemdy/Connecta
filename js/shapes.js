// =============================================================
// shapes.js — Shape definitions, drawing, colors, obstacles
//             + Cage indicator, color utilities, new obstacle types
// =============================================================

// ---- COLOR UTILITIES ----
function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function darkenColor(hex, amount) {
    const [h, s, l] = hexToHSL(hex);
    return hslToHex(h, Math.min(100, s + 10), Math.max(0, l - amount));
}

// ---- SHAPE TYPES & COLORS ----
const ShapeTypes = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    TRIANGLE: 'triangle',
    STAR: 'star',
    HEXAGON: 'hexagon',
    DIAMOND: 'diamond',
};

const ShapeColors = {
    [ShapeTypes.CIRCLE]: { fill: '#ff006e', glow: '#ff006e', name: 'Pembe' },
    [ShapeTypes.SQUARE]: { fill: '#00b4d8', glow: '#00b4d8', name: 'Mavi' },
    [ShapeTypes.TRIANGLE]: { fill: '#ffbe0b', glow: '#ffbe0b', name: 'Sarı' },
    [ShapeTypes.STAR]: { fill: '#8338ec', glow: '#8338ec', name: 'Mor' },
    [ShapeTypes.HEXAGON]: { fill: '#06d6a0', glow: '#06d6a0', name: 'Yeşil' },
    [ShapeTypes.DIAMOND]: { fill: '#fb5607', glow: '#fb5607', name: 'Turuncu' },
};

// Line colors: darker versions of shape fills
const LINE_COLORS = {};
Object.keys(ShapeColors).forEach(key => {
    LINE_COLORS[key] = darkenColor(ShapeColors[key].fill, 15);
});

// Ordered list for pair→color mapping
const LINE_COLOR_LIST = Object.values(LINE_COLORS);
const SHAPE_TYPE_LIST = Object.values(ShapeTypes);

class Shape {
    constructor(type, x, y, size, pairId) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size;
        this.pairId = pairId;
        this.connected = false;
        this.color = ShapeColors[type];
        this.lineColor = darkenColor(this.color.fill, 15);

        // Cage mechanic
        this.caged = false;
        this.cageUnlockPairId = -1;
        this.cageUnlockType = null;      // type of shape that unlocks this
        this.cageFreeTimer = -1;
        this.cageFreeMax = 5;
        this.cageJustFreed = false;
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.size * 1.3;
    }

    getBoundingCircle() {
        return { cx: this.x, cy: this.y, r: this.size };
    }

    draw(ctx, time, hiddenMode) {
        ctx.save();

        // If caged, draw cage first
        if (this.caged) {
            this._drawCage(ctx, time);
        }

        // Hidden mode (memory mechanic): completely invisible
        if (hiddenMode && !this.connected) {
            ctx.restore();
            return;
        }

        // If caged, draw dimmed
        if (this.caged) {
            ctx.globalAlpha = 0.35;
        }

        // If freed but timer running, pulse urgently
        if (this.cageFreeTimer > 0 && !this.caged && !this.connected) {
            const urgency = 1 - (this.cageFreeTimer / this.cageFreeMax);
            ctx.globalAlpha = 0.6 + Math.sin(time * (6 + urgency * 10)) * 0.3;
        }

        const pulseScale = 1 + Math.sin(time * 3 + this.pairId) * 0.04;
        ctx.translate(this.x, this.y);
        ctx.scale(pulseScale, pulseScale);

        ctx.shadowColor = this.color.glow;
        ctx.shadowBlur = this.connected ? 25 : 15;
        ctx.fillStyle = this.color.fill;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        this._drawShape(ctx);

        // Connected checkmark
        if (this.connected) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const s = this.size * 0.35;
            ctx.moveTo(-s * 0.5, 0);
            ctx.lineTo(-s * 0.1, s * 0.4);
            ctx.lineTo(s * 0.5, -s * 0.3);
            ctx.stroke();
        }

        ctx.restore();

        // Free timer bar
        if (this.cageFreeTimer > 0 && !this.caged && !this.connected) {
            this._drawFreeTimerBar(ctx);
        }
    }

    _drawShape(ctx) {
        switch (this.type) {
            case ShapeTypes.CIRCLE: this._drawCircle(ctx); break;
            case ShapeTypes.SQUARE: this._drawSquare(ctx); break;
            case ShapeTypes.TRIANGLE: this._drawTriangle(ctx); break;
            case ShapeTypes.STAR: this._drawStar(ctx); break;
            case ShapeTypes.HEXAGON: this._drawHexagon(ctx); break;
            case ShapeTypes.DIAMOND: this._drawDiamond(ctx); break;
        }
    }

    _drawCage(ctx, time) {
        ctx.save();
        const s = this.size * 1.8;
        const blink = Math.sin(time * 4) * 0.15;

        ctx.strokeStyle = `rgba(255, 80, 80, ${0.6 + blink})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeRect(this.x - s, this.y - s, s * 2, s * 2);

        // Lock icon
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255, 80, 80, ${0.7 + blink})`;
        ctx.font = `${this.size * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('🔒', this.x, this.y - s - 2);

        // Draw indicator: small version of the shape type that unlocks this
        if (this.cageUnlockType) {
            this._drawUnlockIndicator(ctx, time);
        }

        ctx.restore();
    }

    _drawUnlockIndicator(ctx, time) {
        const indicatorSize = this.size * 0.35;
        const ix = this.x + this.size * 1.8 + indicatorSize + 4;
        const iy = this.y - this.size * 1.8 + indicatorSize;

        ctx.save();
        ctx.translate(ix, iy);
        ctx.globalAlpha = 0.7 + Math.sin(time * 3) * 0.2;

        // Background circle
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, indicatorSize + 4, 0, Math.PI * 2);
        ctx.fill();

        // Arrow pointing left
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-indicatorSize - 8, 0);
        ctx.lineTo(-indicatorSize - 2, 0);
        ctx.moveTo(-indicatorSize - 6, -3);
        ctx.lineTo(-indicatorSize - 8, 0);
        ctx.lineTo(-indicatorSize - 6, 3);
        ctx.stroke();

        // Draw mini shape
        const unlockColor = ShapeColors[this.cageUnlockType];
        if (unlockColor) {
            ctx.fillStyle = unlockColor.fill;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = unlockColor.glow;
            ctx.shadowBlur = 4;

            const tmpShape = new Shape(this.cageUnlockType, 0, 0, indicatorSize, 0);
            tmpShape._drawShape(ctx);
        }

        ctx.restore();
    }

    _drawFreeTimerBar(ctx) {
        ctx.save();
        const barW = this.size * 2.2;
        const barH = 4;
        const bx = this.x - barW / 2;
        const by = this.y - this.size * 1.6;
        const ratio = Math.max(0, this.cageFreeTimer / this.cageFreeMax);

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(bx, by, barW, barH);

        const r = Math.floor(255 * (1 - ratio));
        const g = Math.floor(255 * ratio);
        ctx.fillStyle = `rgb(${r}, ${g}, 80)`;
        ctx.fillRect(bx, by, barW * ratio, barH);
        ctx.restore();
    }

    _drawCircle(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    }

    _drawSquare(ctx) {
        const s = this.size * 0.85;
        const r = s * 0.2;
        ctx.beginPath();
        ctx.moveTo(-s + r, -s); ctx.lineTo(s - r, -s);
        ctx.quadraticCurveTo(s, -s, s, -s + r); ctx.lineTo(s, s - r);
        ctx.quadraticCurveTo(s, s, s - r, s); ctx.lineTo(-s + r, s);
        ctx.quadraticCurveTo(-s, s, -s, s - r); ctx.lineTo(-s, -s + r);
        ctx.quadraticCurveTo(-s, -s, -s + r, -s);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    _drawTriangle(ctx) {
        const s = this.size * 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.866, s * 0.5); ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    _drawStar(ctx) {
        const outer = this.size, inner = this.size * 0.45;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    _drawHexagon(ctx) {
        const s = this.size;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = Math.cos(angle) * s, y = Math.sin(angle) * s;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    _drawDiamond(ctx) {
        const sx = this.size * 0.7, sy = this.size;
        ctx.beginPath();
        ctx.moveTo(0, -sy); ctx.lineTo(sx, 0); ctx.lineTo(0, sy); ctx.lineTo(-sx, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
}

// ---- OBSTACLE (rectangular block) ----
class Obstacle {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }

    draw(ctx, time) {
        ctx.save();
        const alpha = 0.7 + Math.sin(time * 2) * 0.05;
        ctx.shadowColor = 'rgba(255, 50, 50, 0.3)';
        ctx.shadowBlur = 10;

        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.w, this.y + this.h);
        grad.addColorStop(0, `rgba(60, 60, 80, ${alpha})`);
        grad.addColorStop(1, `rgba(40, 40, 60, ${alpha})`);
        ctx.fillStyle = grad;

        const r = 6;
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y); ctx.lineTo(this.x + this.w - r, this.y);
        ctx.quadraticCurveTo(this.x + this.w, this.y, this.x + this.w, this.y + r);
        ctx.lineTo(this.x + this.w, this.y + this.h - r);
        ctx.quadraticCurveTo(this.x + this.w, this.y + this.h, this.x + this.w - r, this.y + this.h);
        ctx.lineTo(this.x + r, this.y + this.h);
        ctx.quadraticCurveTo(this.x, this.y + this.h, this.x, this.y + this.h - r);
        ctx.lineTo(this.x, this.y + r);
        ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = 'rgba(255, 80, 80, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Danger stripes
        ctx.save(); ctx.clip();
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.15)';
        ctx.lineWidth = 3;
        const step = 12;
        for (let i = -this.h; i < this.w + this.h; i += step) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i - this.h, this.y + this.h);
            ctx.stroke();
        }
        ctx.restore(); ctx.restore();
    }

    intersectsSegment(x1, y1, x2, y2) {
        const pad = 2;
        return _lineIntersectsRect(x1, y1, x2, y2,
            this.x - pad, this.y - pad, this.x + this.w + pad, this.y + this.h + pad);
    }

    containsPoint(px, py) {
        return px >= this.x - 2 && px <= this.x + this.w + 2 &&
            py >= this.y - 2 && py <= this.y + this.h + 2;
    }

    // Bounding box for overlap checks
    getBounds() {
        return { left: this.x, top: this.y, right: this.x + this.w, bottom: this.y + this.h };
    }
}

// ---- LASER OBSTACLE ----
class LaserObstacle {
    constructor(x1, y1, x2, y2, blinkSpeed) {
        this.x1 = x1; this.y1 = y1;
        this.x2 = x2; this.y2 = y2;
        this.blinkSpeed = blinkSpeed || 0;
        this.active = true;
    }

    update(time) {
        if (this.blinkSpeed > 0) {
            this.active = Math.sin(time * this.blinkSpeed) > -0.3;
        }
    }

    draw(ctx, time) {
        this.update(time);
        ctx.save();
        if (!this.active) {
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1); ctx.lineTo(this.x2, this.y2);
            ctx.stroke(); ctx.restore(); return;
        }

        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1); ctx.lineTo(this.x2, this.y2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 180, 180, 0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1); ctx.lineTo(this.x2, this.y2);
        ctx.stroke();

        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(this.x1, this.y1, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x2, this.y2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    intersectsSegment(x1, y1, x2, y2) {
        if (!this.active) return false;
        return _globalSegmentsIntersect(x1, y1, x2, y2, this.x1, this.y1, this.x2, this.y2);
    }

    containsPoint(px, py) {
        if (!this.active) return false;
        return _pointDistToSegment(px, py, this.x1, this.y1, this.x2, this.y2) < 6;
    }
}

// ---- SPINNER OBSTACLE ----
class SpinnerObstacle {
    constructor(cx, cy, length, speed) {
        this.cx = cx; this.cy = cy;
        this.length = length;
        this.speed = speed || 1;
        this.angle = 0;
        this.ex1 = cx; this.ey1 = cy;
        this.ex2 = cx; this.ey2 = cy;
    }

    update(time) {
        this.angle = time * this.speed;
        const half = this.length / 2;
        this.ex1 = this.cx + Math.cos(this.angle) * half;
        this.ey1 = this.cy + Math.sin(this.angle) * half;
        this.ex2 = this.cx - Math.cos(this.angle) * half;
        this.ey2 = this.cy - Math.sin(this.angle) * half;
    }

    draw(ctx, time) {
        this.update(time);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 150, 50, 0.9)';
        ctx.shadowColor = 'rgba(255, 150, 50, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 150, 50, 0.85)';
        ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.ex1, this.ey1); ctx.lineTo(this.ex2, this.ey2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 220, 150, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.ex1, this.ey1); ctx.lineTo(this.ex2, this.ey2);
        ctx.stroke();
        ctx.restore();
    }

    intersectsSegment(x1, y1, x2, y2) {
        // Use a thick check (treat spinner as having width)
        return _segmentDistToSegment(x1, y1, x2, y2, this.ex1, this.ey1, this.ex2, this.ey2) < 5;
    }

    containsPoint(px, py) {
        return _pointDistToSegment(px, py, this.ex1, this.ey1, this.ex2, this.ey2) < 6;
    }
}

// ---- GLOBAL GEOMETRY HELPERS ----
function _globalSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d1 = _gcross(x3, y3, x4, y4, x1, y1);
    const d2 = _gcross(x3, y3, x4, y4, x2, y2);
    const d3 = _gcross(x1, y1, x2, y2, x3, y3);
    const d4 = _gcross(x1, y1, x2, y2, x4, y4);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return false;
}

function _gcross(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function _pointDistToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function _segmentDistToSegment(ax, ay, bx, by, cx, cy, dx, dy) {
    // Approximate: check endpoints and midpoints
    const mid1x = (ax + bx) / 2, mid1y = (ay + by) / 2;
    const mid2x = (cx + dx) / 2, mid2y = (cy + dy) / 2;
    let minDist = _pointDistToSegment(ax, ay, cx, cy, dx, dy);
    minDist = Math.min(minDist, _pointDistToSegment(bx, by, cx, cy, dx, dy));
    minDist = Math.min(minDist, _pointDistToSegment(mid1x, mid1y, cx, cy, dx, dy));
    minDist = Math.min(minDist, _pointDistToSegment(cx, cy, ax, ay, bx, by));
    minDist = Math.min(minDist, _pointDistToSegment(dx, dy, ax, ay, bx, by));
    minDist = Math.min(minDist, _pointDistToSegment(mid2x, mid2y, ax, ay, bx, by));
    if (_globalSegmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return minDist;
}

function _lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom) {
    if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true;
    if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true;
    if (_globalSegmentsIntersect(x1, y1, x2, y2, left, top, right, top)) return true;
    if (_globalSegmentsIntersect(x1, y1, x2, y2, right, top, right, bottom)) return true;
    if (_globalSegmentsIntersect(x1, y1, x2, y2, left, bottom, right, bottom)) return true;
    if (_globalSegmentsIntersect(x1, y1, x2, y2, left, top, left, bottom)) return true;
    return false;
}
