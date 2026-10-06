// ============================================================
//  BOOTY — Pirate Platform Puzzle (2026 remake)
//  Pure HTML5 Canvas · Pixel-art style · 10 levels
// ============================================================

const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const W = CANVAS.width;   // 800
const H = CANVAS.height;  // 560

// Physics
const GRAVITY    = 0.55;
const MOVE_SPEED = 4;
const JUMP_POWER = -11;
const CLIMB_SPEED = 3;

// Palette (retro Spectrum-ish)
const PAL = {
    bg:        '#1a0a2e',
    wood:      '#8b5e34',
    woodDark:  '#5c3a1e',
    woodLight: '#b07840',
    rope:      '#c9a033',
    metal:     '#6a6a8a',
    water:     '#1a3a5c',
    skin:      '#e8b87a',
    shirt:     '#cc2222',
    pants:     '#3344aa',
    hat:       '#222',
    coin:      '#ffd700',
    coinDark:  '#cc9900',
    key:       '#7ec8e3',
    door:      '#5c3a1e',
    doorMetal: '#888',
    exit:      '#4ade80',
    button:    '#fbbf24',
    buttonOn:  '#4ade80',
    danger:    '#cc2222',
    text:      '#c9a033',
    white:     '#fff',
    black:     '#000',
};

// ============================================================
//  SPRITE DRAWING (procedural pixel art)
// ============================================================

function drawPixelRect(x, y, w, h, color) {
    CTX.fillStyle = color;
    CTX.fillRect(Math.floor(x), Math.floor(y), w, h);
}

// Pirate character (16x24 scaled to 28x38)
function drawPirate(x, y, facing, frame) {
    const s = 2; // pixel scale
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const bobY = Math.sin(frame * 0.3) * (Math.abs(facing) === 1 ? 1 : 0);

    // Shadow
    CTX.fillStyle = 'rgba(0,0,0,0.3)';
    CTX.fillRect(fx + 2, fy + 36, 24, 4);

    // Legs (animate when moving)
    const legOffset = Math.sin(frame * 0.5) * 3 * (facing !== 0 ? 1 : 0);
    drawPixelRect(fx + 6,  fy + 28 + bobY + legOffset, 6*s, 5*s, PAL.pants);
    drawPixelRect(fx + 16, fy + 28 + bobY - legOffset, 6*s, 5*s, PAL.pants);
    // Boots
    drawPixelRect(fx + 4,  fy + 34 + bobY + legOffset, 4*s, 3*s, PAL.woodDark);
    drawPixelRect(fx + 14, fy + 34 + bobY - legOffset, 4*s, 3*s, PAL.woodDark);

    // Body
    drawPixelRect(fx + 4, fy + 14 + bobY, 10*s, 7*s, PAL.shirt);
    // Belt
    drawPixelRect(fx + 4, fy + 26 + bobY, 10*s, s, PAL.rope);

    // Arms
    const armSwing = Math.sin(frame * 0.5) * 4 * (facing !== 0 ? 1 : 0);
    drawPixelRect(fx,      fy + 16 + bobY + armSwing, 2*s, 6*s, PAL.skin);
    drawPixelRect(fx + 24, fy + 16 + bobY - armSwing, 2*s, 6*s, PAL.skin);

    // Head
    drawPixelRect(fx + 6, fy + 2 + bobY, 8*s, 6*s, PAL.skin);

    // Hat (tricorn)
    drawPixelRect(fx + 2, fy - 2 + bobY, 12*s, 3*s, PAL.hat);
    drawPixelRect(fx + 6, fy - 5 + bobY, 8*s, 3*s, PAL.hat);
    // Hat trim
    drawPixelRect(fx + 2, fy + 1 + bobY, 12*s, s, PAL.rope);

    // Eyes
    const eyeX = facing >= 0 ? 2 : -2;
    drawPixelRect(fx + 10 + eyeX, fy + 6 + bobY, s, 2*s, PAL.white);
    drawPixelRect(fx + 16 + eyeX, fy + 6 + bobY, s, 2*s, PAL.white);
    drawPixelRect(fx + 10 + eyeX + (facing > 0 ? 1 : 0), fy + 7 + bobY, s, s, PAL.black);
    drawPixelRect(fx + 16 + eyeX + (facing > 0 ? 1 : 0), fy + 7 + bobY, s, s, PAL.black);

    // Eyepatch (right eye)
    if (facing >= 0) {
        drawPixelRect(fx + 15 + eyeX, fy + 5 + bobY, 4, 5, PAL.black);
        // strap
        CTX.strokeStyle = PAL.black;
        CTX.lineWidth = 1;
        CTX.beginPath();
        CTX.moveTo(fx + 17 + eyeX, fy + 5 + bobY);
        CTX.lineTo(fx + 20, fy - 1 + bobY);
        CTX.stroke();
    }
}

// Wooden platform with plank texture
function drawWoodPlatform(x, y, w, h) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    // Main wood
    CTX.fillStyle = PAL.wood;
    CTX.fillRect(fx, fy, w, h);

    // Plank lines
    CTX.strokeStyle = PAL.woodDark;
    CTX.lineWidth = 1;
    const plankW = 40;
    for (let px = fx; px < fx + w; px += plankW) {
        CTX.beginPath();
        CTX.moveTo(px, fy);
        CTX.lineTo(px, fy + h);
        CTX.stroke();
    }

    // Top highlight
    CTX.fillStyle = PAL.woodLight;
    CTX.fillRect(fx, fy, w, 3);

    // Wood grain dots
    CTX.fillStyle = PAL.woodDark;
    for (let gx = fx + 8; gx < fx + w - 8; gx += plankW) {
        const gy = fy + h / 2 + Math.sin(gx * 0.5) * 3;
        CTX.fillRect(gx, gy, 3, 2);
        CTX.fillRect(gx + 12, gy - 4, 2, 2);
    }

    // Bottom shadow
    CTX.fillStyle = 'rgba(0,0,0,0.3)';
    CTX.fillRect(fx, fy + h - 2, w, 2);

    // Nails at edges
    CTX.fillStyle = PAL.metal;
    CTX.fillRect(fx + 3, fy + 4, 3, 3);
    CTX.fillRect(fx + w - 6, fy + 4, 3, 3);
}

// Coin collectible
function drawCoin(x, y, frame) {
    const pulse = Math.sin(frame * 0.08) * 2;
    const scaleX = Math.abs(Math.cos(frame * 0.06));
    const cx = Math.floor(x + 10);
    const cy = Math.floor(y + 10 + pulse);

    CTX.save();
    CTX.translate(cx, cy);
    CTX.scale(scaleX, 1);

    // Outer
    CTX.fillStyle = PAL.coin;
    CTX.beginPath();
    CTX.arc(0, 0, 9, 0, Math.PI * 2);
    CTX.fill();

    // Inner
    CTX.fillStyle = PAL.coinDark;
    CTX.beginPath();
    CTX.arc(0, 0, 6, 0, Math.PI * 2);
    CTX.fill();

    // $ sign
    if (scaleX > 0.3) {
        CTX.fillStyle = PAL.coin;
        CTX.font = 'bold 10px monospace';
        CTX.textAlign = 'center';
        CTX.textBaseline = 'middle';
        CTX.fillText('$', 0, 1);
    }

    CTX.restore();
}

// Button/switch
function drawSwitch(x, y, w, h, pressed) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    // Base plate
    CTX.fillStyle = PAL.metal;
    CTX.fillRect(fx, fy + h - 8, w, 8);

    // Lever
    CTX.fillStyle = pressed ? PAL.buttonOn : PAL.button;
    if (pressed) {
        CTX.fillRect(fx + 2, fy + h - 14, w - 4, 8);
    } else {
        CTX.fillRect(fx + 4, fy, w - 8, h - 6);
    }

    // Highlight
    CTX.fillStyle = pressed ? '#6eff9e' : '#ffe066';
    CTX.fillRect(fx + 6, pressed ? fy + h - 12 : fy + 2, w - 12, 3);
}

// Door / gate
function drawGate(x, y, w, h, open) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    if (open) {
        // Just the frame
        CTX.strokeStyle = PAL.doorMetal;
        CTX.lineWidth = 2;
        CTX.strokeRect(fx, fy, w, h);
        CTX.setLineDash([4, 4]);
        CTX.strokeRect(fx + 2, fy + 2, w - 4, h - 4);
        CTX.setLineDash([]);
        return;
    }

    // Solid door
    CTX.fillStyle = PAL.door;
    CTX.fillRect(fx, fy, w, h);

    // Iron bars
    CTX.fillStyle = PAL.doorMetal;
    const barSpacing = Math.max(8, Math.floor(w / 4));
    for (let bx = fx + barSpacing; bx < fx + w; bx += barSpacing) {
        CTX.fillRect(bx - 1, fy, 3, h);
    }

    // Horizontal bar
    CTX.fillRect(fx, fy + Math.floor(h / 3), w, 3);
    CTX.fillRect(fx, fy + Math.floor(h * 2 / 3), w, 3);

    // Lock
    CTX.fillStyle = PAL.rope;
    CTX.fillRect(fx + w / 2 - 4, fy + h / 2 - 4, 8, 8);
    CTX.fillStyle = PAL.black;
    CTX.fillRect(fx + w / 2 - 1, fy + h / 2, 3, 4);

    // Frame
    CTX.strokeStyle = PAL.doorMetal;
    CTX.lineWidth = 2;
    CTX.strokeRect(fx, fy, w, h);
}

// Moving platform (raft style)
function drawRaft(x, y, w, h) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    // Logs
    CTX.fillStyle = PAL.woodLight;
    CTX.fillRect(fx, fy, w, h);

    // Log separators
    CTX.fillStyle = PAL.woodDark;
    for (let ly = fy; ly < fy + h; ly += 8) {
        CTX.fillRect(fx, ly, w, 1);
    }

    // Rope binding
    CTX.fillStyle = PAL.rope;
    CTX.fillRect(fx + 4, fy, 3, h);
    CTX.fillRect(fx + w - 7, fy, 3, h);

    // Edge
    CTX.strokeStyle = PAL.woodDark;
    CTX.lineWidth = 1;
    CTX.strokeRect(fx, fy, w, h);
}

// Exit treasure chest
function drawTreasureChest(x, y, frame) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const glow = Math.sin(frame * 0.06) * 0.3 + 0.7;

    // Glow
    const grad = CTX.createRadialGradient(fx + 18, fy + 16, 2, fx + 18, fy + 16, 30);
    grad.addColorStop(0, `rgba(255, 215, 0, ${glow * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    CTX.fillStyle = grad;
    CTX.fillRect(fx - 15, fy - 15, 66, 66);

    // Chest body
    CTX.fillStyle = '#6b3a1e';
    CTX.fillRect(fx, fy + 12, 36, 22);

    // Chest lid
    CTX.fillStyle = '#8b5e34';
    CTX.beginPath();
    CTX.moveTo(fx - 2, fy + 14);
    CTX.lineTo(fx + 38, fy + 14);
    CTX.lineTo(fx + 36, fy + 2);
    CTX.quadraticCurveTo(fx + 18, fy - 6, fx, fy + 2);
    CTX.closePath();
    CTX.fill();

    // Metal bands
    CTX.fillStyle = PAL.rope;
    CTX.fillRect(fx + 2, fy + 14, 32, 3);
    CTX.fillRect(fx + 2, fy + 26, 32, 3);

    // Lock
    CTX.fillStyle = PAL.coin;
    CTX.fillRect(fx + 14, fy + 10, 8, 8);
    CTX.fillStyle = PAL.black;
    CTX.fillRect(fx + 17, fy + 14, 3, 4);

    // Sparkles
    CTX.fillStyle = `rgba(255, 255, 200, ${glow})`;
    const sparkles = [[fx - 5, fy - 3], [fx + 38, fy + 2], [fx + 18, fy - 8], [fx - 8, fy + 20], [fx + 42, fy + 18]];
    for (let sp of sparkles) {
        const sx = sp[0] + Math.sin(frame * 0.03 + sp[1]) * 3;
        const sy = sp[1] + Math.cos(frame * 0.04 + sp[0]) * 2;
        CTX.fillRect(sx, sy, 2, 2);
    }
}

// Ship background elements
function drawShipBackground() {
    // Dark background
    CTX.fillStyle = PAL.bg;
    CTX.fillRect(0, 0, W, H);

    // Wooden wall planks (vertical)
    CTX.fillStyle = '#120820';
    for (let x = 0; x < W; x += 60) {
        CTX.fillRect(x, 0, 1, H);
    }

    // Porthole decorations
    CTX.strokeStyle = '#2a1a3e';
    CTX.lineWidth = 2;
    const portholes = [[100, 60], [350, 40], [600, 70], [750, 50]];
    for (let [px, py] of portholes) {
        CTX.beginPath();
        CTX.arc(px, py, 18, 0, Math.PI * 2);
        CTX.stroke();
        // Glass
        CTX.fillStyle = 'rgba(30, 60, 100, 0.3)';
        CTX.fill();
        // Bolts
        CTX.fillStyle = '#2a1a3e';
        CTX.fillRect(px - 1, py - 20, 2, 4);
        CTX.fillRect(px - 1, py + 16, 2, 4);
        CTX.fillRect(px - 20, py - 1, 4, 2);
        CTX.fillRect(px + 16, py - 1, 4, 2);
    }

    // Ropes hanging
    CTX.strokeStyle = '#2a1a3e';
    CTX.lineWidth = 2;
    for (let rx = 50; rx < W; rx += 200) {
        CTX.beginPath();
        CTX.moveTo(rx, 0);
        const sag = 30 + Math.sin(rx * 0.01) * 15;
        CTX.quadraticCurveTo(rx + 40, sag, rx + 80, 0);
        CTX.stroke();
    }

    // Water line at bottom
    CTX.fillStyle = PAL.water;
    CTX.fillRect(0, H - 8, W, 8);
    // Waves
    CTX.fillStyle = '#2a5a8c';
    for (let wx = 0; wx < W; wx += 20) {
        const wy = H - 6 + Math.sin(wx * 0.1 + Date.now() * 0.002) * 2;
        CTX.fillRect(wx, wy, 12, 2);
    }
}

// Ladder
function drawLadder(x, y, h) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);

    // Side rails
    CTX.fillStyle = PAL.rope;
    CTX.fillRect(fx, fy, 3, h);
    CTX.fillRect(fx + 17, fy, 3, h);

    // Rungs
    CTX.fillStyle = PAL.woodLight;
    for (let ry = fy + 8; ry < fy + h; ry += 16) {
        CTX.fillRect(fx + 3, ry, 14, 4);
        // shadow
        CTX.fillStyle = PAL.woodDark;
        CTX.fillRect(fx + 3, ry + 3, 14, 1);
        CTX.fillStyle = PAL.woodLight;
    }
}


// ============================================================
//  GAME OBJECTS
// ============================================================

class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 28; this.height = 40;
        this.velX = 0; this.velY = 0;
        this.canJump = false;
        this.facing = 1;
        this.frame = 0;
        this.onLadder = false;
    }

    update() {
        if (game.transitioning || game.over) return;
        this.frame++;

        const left  = game.keys['ArrowLeft']  || game.keys['a'] || game.keys['A'];
        const right = game.keys['ArrowRight'] || game.keys['d'] || game.keys['D'];
        const up    = game.keys['ArrowUp']    || game.keys['w'] || game.keys['W'];
        const down  = game.keys['ArrowDown']  || game.keys['s'] || game.keys['S'];

        // Check if on a ladder
        this.onLadder = false;
        for (let lad of game.ladders) {
            if (this.x + this.width > lad.x && this.x < lad.x + 20 &&
                this.y + this.height > lad.y && this.y < lad.y + lad.h) {
                if (up || down) this.onLadder = true;
            }
        }

        if (this.onLadder) {
            this.velY = 0;
            if (up) this.velY = -CLIMB_SPEED;
            if (down) this.velY = CLIMB_SPEED;
            this.velX = 0;
            if (left) { this.velX = -MOVE_SPEED * 0.5; this.facing = -1; }
            if (right) { this.velX = MOVE_SPEED * 0.5; this.facing = 1; }
        } else {
            this.velX = 0;
            if (left)  { this.velX = -MOVE_SPEED; this.facing = -1; }
            if (right) { this.velX =  MOVE_SPEED; this.facing =  1; }
            this.velY += GRAVITY;
            if (this.velY > 14) this.velY = 14;
        }

        this.x += this.velX;
        this.y += this.velY;

        // Platform collision
        this.canJump = false;
        for (let p of game.platforms) {
            if (this.hits(p)) this.resolve(p);
        }
        for (let b of game.movers) {
            if (this.hits(b)) this.resolve(b);
        }
        for (let d of game.doors) {
            if (!d.isOpen && this.hits(d)) this.resolve(d);
        }

        if (this.onLadder) this.canJump = true;

        // Coins
        for (let i = game.coins.length - 1; i >= 0; i--) {
            const c = game.coins[i];
            if (this.hits(c)) {
                game.coins.splice(i, 1);
                game.coinsCollected++;
                playSound('coin');
            }
        }

        // Buttons
        for (let btn of game.buttons) {
            if (!btn.pressed && this.hits(btn)) btn.press();
        }

        // Exit
        if (game.exit && this.hits(game.exit)) {
            game.levelDone = true;
        }

        // Screen edges
        if (this.x + this.width < 0) this.x = W;
        if (this.x > W) this.x = -this.width;
        if (this.y > H + 50) this.respawn();
    }

    hits(r) {
        return this.x < r.x + r.width && this.x + this.width > r.x &&
               this.y < r.y + r.height && this.y + this.height > r.y;
    }

    resolve(obj) {
        const oT = this.y + this.height - obj.y;
        const oB = obj.y + obj.height - this.y;
        const oL = this.x + this.width - obj.x;
        const oR = obj.x + obj.width - this.x;
        const minX = Math.min(oL, oR);
        const minY = Math.min(oT, oB);

        if (minY < minX) {
            if (oT < oB) {
                this.y = obj.y - this.height;
                this.velY = 0;
                this.canJump = true;
            } else {
                this.y = obj.y + obj.height;
                this.velY = 0;
            }
        } else {
            if (oL < oR) this.x = obj.x - this.width;
            else this.x = obj.x + obj.width;
            this.velX = 0;
        }
    }

    jump() {
        if (this.canJump && !game.transitioning && !game.over) {
            this.velY = JUMP_POWER;
            this.canJump = false;
            this.onLadder = false;
            game.jumps++;
            playSound('jump');
        }
    }

    respawn() {
        const lvl = LEVELS[game.currentLevel];
        this.x = lvl.playerStart.x;
        this.y = lvl.playerStart.y;
        this.velX = 0; this.velY = 0;
        this.canJump = false;
    }

    draw() {
        drawPirate(this.x, this.y, this.facing, this.frame);
    }
}

class Mover {
    constructor(x, y, w, h, startX, endX, speed) {
        this.x = x; this.y = y;
        this.width = w; this.height = h;
        this.startX = startX; this.endX = endX;
        this.speed = speed; this.dir = 1;
    }
    update() {
        this.x += this.speed * this.dir;
        if (this.x <= this.startX || this.x + this.width >= this.endX + this.width) this.dir *= -1;
    }
    draw() { drawRaft(this.x, this.y, this.width, this.height); }
}

class GateObj {
    constructor(x, y, w, h) {
        this.x = x; this.y = y;
        this.width = w; this.height = h;
        this.isOpen = false;
    }
    open() { this.isOpen = true; }
    draw() { drawGate(this.x, this.y, this.width, this.height, this.isOpen); }
}

class SwitchObj {
    constructor(x, y, door) {
        this.x = x; this.y = y;
        this.width = 22; this.height = 22;
        this.pressed = false; this.door = door;
    }
    press() {
        this.pressed = true;
        if (this.door) this.door.open();
        playSound('button');
    }
    draw() { drawSwitch(this.x, this.y, this.width, this.height, this.pressed); }
}

class Coin {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 20; this.height = 20;
    }
    draw(frame) { drawCoin(this.x, this.y, frame); }
}

class ExitObj {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 36; this.height = 34;
    }
    draw(frame) { drawTreasureChest(this.x, this.y, frame); }
}


// ============================================================
//  LEVELS
// ============================================================

const LEVELS = [
    {
        name: 'THE LOWER DECK',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 150, y: 440, w: 140, h: 22 },
            { x: 400, y: 380, w: 140, h: 22 },
            { x: 620, y: 320, w: 140, h: 22 },
        ],
        coins: [
            { x: 200, y: 410 }, { x: 440, y: 350 }, { x: 660, y: 290 }
        ],
        exit: { x: 700, y: 270 }
    },
    {
        name: 'THE RIGGING',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 80, y: 430, w: 100, h: 22 },
            { x: 240, y: 370, w: 100, h: 22 },
            { x: 400, y: 310, w: 100, h: 22 },
            { x: 560, y: 250, w: 100, h: 22 },
            { x: 700, y: 190, w: 80, h: 22 },
        ],
        coins: [
            { x: 110, y: 400 }, { x: 270, y: 340 }, { x: 430, y: 280 },
            { x: 590, y: 220 }, { x: 720, y: 160 }
        ],
        exit: { x: 710, y: 146 }
    },
    {
        name: 'CAPTAIN\'S LOCK',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 100, y: 440, w: 120, h: 22 },
            { x: 300, y: 380, w: 100, h: 22 },
            { x: 500, y: 440, w: 120, h: 22 },
            { x: 600, y: 300, w: 120, h: 22 },
            { x: 700, y: 200, w: 80, h: 22 },
        ],
        buttons: [{ x: 530, y: 418, door: 'gate1' }],
        doors: [{ x: 560, y: 250, w: 30, h: 50, id: 'gate1' }],
        coins: [
            { x: 140, y: 410 }, { x: 340, y: 350 }, { x: 640, y: 270 }
        ],
        exit: { x: 714, y: 156 }
    },
    {
        name: 'DRIFTING CARGO',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 80, y: 440, w: 120, h: 22 },
            { x: 600, y: 400, w: 120, h: 22 },
        ],
        movers: [
            { x: 280, y: 380, w: 90, h: 24, sx: 240, ex: 520, spd: 1.5 }
        ],
        coins: [
            { x: 120, y: 410 }, { x: 360, y: 350 }, { x: 640, y: 370 }
        ],
        exit: { x: 640, y: 356 }
    },
    {
        name: 'DOUBLE LOCKS',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 60, y: 440, w: 100, h: 22 },
            { x: 200, y: 370, w: 100, h: 22 },
            { x: 360, y: 440, w: 100, h: 22 },
            { x: 520, y: 320, w: 100, h: 22 },
            { x: 700, y: 240, w: 80, h: 22 },
        ],
        buttons: [
            { x: 230, y: 348, door: 'gate1' },
            { x: 540, y: 298, door: 'gate2' }
        ],
        doors: [
            { x: 460, y: 270, w: 30, h: 50, id: 'gate1' },
            { x: 660, y: 190, w: 30, h: 50, id: 'gate2' }
        ],
        coins: [
            { x: 100, y: 410 }, { x: 390, y: 410 }, { x: 550, y: 290 }, { x: 720, y: 210 }
        ],
        exit: { x: 710, y: 196 }
    },
    {
        name: 'STORM TIMING',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 60, y: 440, w: 140, h: 22 },
            { x: 260, y: 380, w: 100, h: 22 },
            { x: 680, y: 300, w: 100, h: 22 },
            { x: 680, y: 210, w: 100, h: 22 },
        ],
        movers: [
            { x: 420, y: 330, w: 90, h: 24, sx: 380, ex: 630, spd: 2 }
        ],
        buttons: [{ x: 290, y: 358, door: 'gate1' }],
        doors: [{ x: 660, y: 350, w: 30, h: 80, id: 'gate1' }],
        ladders: [{ x: 720, y: 220, h: 80 }],
        coins: [
            { x: 100, y: 410 }, { x: 300, y: 350 }, { x: 710, y: 270 }, { x: 710, y: 180 }
        ],
        exit: { x: 710, y: 166 }
    },
    {
        name: 'HOLD PUZZLE',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 50, y: 440, w: 120, h: 22 },
            { x: 220, y: 360, w: 100, h: 22 },
            { x: 400, y: 440, w: 120, h: 22 },
            { x: 640, y: 280, w: 120, h: 22 },
        ],
        movers: [
            { x: 460, y: 360, w: 90, h: 24, sx: 420, ex: 620, spd: 1.5 }
        ],
        buttons: [{ x: 250, y: 338, door: 'gate1' }],
        doors: [{ x: 560, y: 230, w: 30, h: 50, id: 'gate1' }],
        coins: [
            { x: 80, y: 410 }, { x: 260, y: 330 }, { x: 440, y: 410 }, { x: 680, y: 250 }
        ],
        exit: { x: 680, y: 236 }
    },
    {
        name: 'CROW\'S NEST',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 80, y: 440, w: 100, h: 22 },
            { x: 400, y: 280, w: 100, h: 22 },
        ],
        movers: [
            { x: 240, y: 380, w: 80, h: 24, sx: 200, ex: 480, spd: 2 },
            { x: 540, y: 320, w: 80, h: 24, sx: 480, ex: 720, spd: 2 }
        ],
        buttons: [
            { x: 110, y: 418, door: 'gate1' },
            { x: 420, y: 258, door: 'gate2' }
        ],
        doors: [
            { x: 350, y: 320, w: 30, h: 60, id: 'gate1' },
            { x: 540, y: 220, w: 30, h: 60, id: 'gate2' }
        ],
        coins: [
            { x: 120, y: 410 }, { x: 340, y: 350 }, { x: 440, y: 250 }, { x: 600, y: 290 }
        ],
        exit: { x: 560, y: 176 }
    },
    {
        name: 'PIRATE GAUNTLET',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 80, y: 440, w: 120, h: 22 },
        ],
        movers: [
            { x: 260, y: 390, w: 80, h: 24, sx: 220, ex: 450, spd: 1.8 },
            { x: 480, y: 310, w: 80, h: 24, sx: 400, ex: 680, spd: 2 },
            { x: 340, y: 200, w: 80, h: 24, sx: 260, ex: 540, spd: 2.5 }
        ],
        buttons: [{ x: 120, y: 418, door: 'gate1' }],
        doors: [{ x: 220, y: 280, w: 30, h: 60, id: 'gate1' }],
        coins: [
            { x: 130, y: 410 }, { x: 350, y: 360 }, { x: 540, y: 280 }, { x: 400, y: 170 }
        ],
        exit: { x: 380, y: 156 }
    },
    {
        name: 'DAVY JONES\' LOCKER',
        playerStart: { x: 40, y: 440 },
        platforms: [
            { x: 0, y: 510, w: 800, h: 50 },
            { x: 60, y: 440, w: 120, h: 22 },
        ],
        movers: [
            { x: 240, y: 390, w: 70, h: 24, sx: 200, ex: 480, spd: 2.5 },
            { x: 520, y: 310, w: 70, h: 24, sx: 480, ex: 720, spd: 2 },
            { x: 300, y: 210, w: 70, h: 24, sx: 250, ex: 500, spd: 3 },
            { x: 580, y: 150, w: 70, h: 24, sx: 530, ex: 720, spd: 2 }
        ],
        buttons: [
            { x: 100, y: 418, door: 'gate1' },
            { x: 280, y: 330, door: 'gate2' },
            { x: 600, y: 250, door: 'gate3' }
        ],
        doors: [
            { x: 380, y: 330, w: 30, h: 60, id: 'gate1' },
            { x: 520, y: 250, w: 30, h: 60, id: 'gate2' },
            { x: 340, y: 140, w: 30, h: 60, id: 'gate3' }
        ],
        coins: [
            { x: 100, y: 410 }, { x: 310, y: 360 }, { x: 560, y: 280 },
            { x: 350, y: 180 }, { x: 620, y: 120 }
        ],
        exit: { x: 360, y: 80 }
    }
];


// ============================================================
//  AUDIO
// ============================================================

let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);

        switch (type) {
            case 'jump':
                o.type = 'square';
                o.frequency.setValueAtTime(300, t);
                o.frequency.exponentialRampToValueAtTime(600, t + 0.08);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                o.start(t); o.stop(t + 0.1);
                break;
            case 'coin':
                o.type = 'square';
                o.frequency.setValueAtTime(988, t);
                o.frequency.setValueAtTime(1319, t + 0.06);
                g.gain.setValueAtTime(0.1, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                o.start(t); o.stop(t + 0.15);
                break;
            case 'button':
                o.type = 'triangle';
                o.frequency.setValueAtTime(440, t);
                o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                o.start(t); o.stop(t + 0.15);
                break;
            case 'levelUp':
                o.type = 'square';
                o.frequency.setValueAtTime(523, t);
                o.frequency.setValueAtTime(659, t + 0.1);
                o.frequency.setValueAtTime(784, t + 0.2);
                o.frequency.setValueAtTime(1047, t + 0.3);
                g.gain.setValueAtTime(0.12, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
                o.start(t); o.stop(t + 0.45);
                break;
        }
    } catch (e) {}
}


// ============================================================
//  GAME ENGINE
// ============================================================

const game = {
    currentLevel: 0,
    jumps: 0,
    coinsCollected: 0,
    timeElapsed: 0,
    over: false,
    levelDone: false,
    transitioning: false,
    player: null,
    platforms: [],
    buttons: [],
    doors: [],
    movers: [],
    coins: [],
    ladders: [],
    exit: null,
    keys: {},
    frame: 0,
};

function loadLevel(n) {
    const L = LEVELS[n];
    game.platforms = [];
    game.buttons = [];
    game.doors = [];
    game.movers = [];
    game.coins = [];
    game.ladders = [];
    game.jumps = 0;
    game.coinsCollected = 0;
    game.timeElapsed = 0;
    game.levelDone = false;
    game.transitioning = false;
    game.over = false;

    // Platforms
    for (let p of L.platforms) {
        game.platforms.push({ x: p.x, y: p.y, width: p.w, height: p.h });
    }

    // Movers
    if (L.movers) {
        for (let m of L.movers) {
            game.movers.push(new Mover(m.x, m.y, m.w, m.h, m.sx, m.ex, m.spd));
        }
    }

    // Doors
    const doorMap = {};
    if (L.doors) {
        for (let d of L.doors) {
            const obj = new GateObj(d.x, d.y, d.w, d.h);
            doorMap[d.id] = obj;
            game.doors.push(obj);
        }
    }

    // Buttons
    if (L.buttons) {
        for (let b of L.buttons) {
            game.buttons.push(new SwitchObj(b.x, b.y, doorMap[b.door]));
        }
    }

    // Coins
    if (L.coins) {
        for (let c of L.coins) {
            game.coins.push(new Coin(c.x, c.y));
        }
    }

    // Ladders
    if (L.ladders) {
        for (let l of L.ladders) {
            game.ladders.push({ x: l.x, y: l.y, h: l.h });
        }
    }

    // Exit
    game.exit = new ExitObj(L.exit.x, L.exit.y);

    // Player
    game.player = new Player(L.playerStart.x, L.playerStart.y);

    document.getElementById('levelName').textContent = L.name;
    updateHUD();
}

function updateHUD() {
    document.getElementById('levelNum').textContent = game.currentLevel + 1;
    document.getElementById('coinCount').textContent = game.coinsCollected;
    document.getElementById('timeCount').textContent = Math.floor(game.timeElapsed);
}

function showMessage(text, duration) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.style.display = 'block';
    if (duration) {
        setTimeout(() => { el.style.display = 'none'; }, duration);
    }
}


// ============================================================
//  MAIN LOOP
// ============================================================

let lastT = 0;

function loop(ts) {
    if (!lastT) lastT = ts;
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    game.frame++;

    // Timer
    if (!game.transitioning && !game.over) {
        game.timeElapsed += dt;
    }

    // Update
    if (!game.transitioning) game.player.update();
    for (let m of game.movers) m.update();

    // Level complete
    if (game.levelDone && !game.transitioning) {
        game.transitioning = true;
        playSound('levelUp');

        if (game.currentLevel < LEVELS.length - 1) {
            showMessage('LEVEL COMPLETE!', 1800);
            setTimeout(() => {
                game.currentLevel++;
                loadLevel(game.currentLevel);
            }, 1800);
        } else {
            showMessage('☠ YE CONQUERED ALL LEVELS! ☠');
            game.over = true;
        }
    }

    // === RENDER ===
    drawShipBackground();

    // Ladders (behind platforms)
    for (let l of game.ladders) drawLadder(l.x, l.y, l.h);

    // Platforms
    for (let p of game.platforms) drawWoodPlatform(p.x, p.y, p.width, p.height);

    // Doors
    for (let d of game.doors) d.draw();

    // Movers
    for (let m of game.movers) m.draw();

    // Buttons
    for (let b of game.buttons) b.draw();

    // Coins
    for (let c of game.coins) c.draw(game.frame);

    // Exit
    game.exit.draw(game.frame);

    // Player
    game.player.draw();

    // Transition overlay
    if (game.transitioning) {
        CTX.fillStyle = 'rgba(0, 0, 0, 0.5)';
        CTX.fillRect(0, 0, W, H);
    }

    updateHUD();
    requestAnimationFrame(loop);
}


// ============================================================
//  INPUT
// ============================================================

document.addEventListener('keydown', (e) => {
    initAudio();
    game.keys[e.key] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (game.player) game.player.jump();
    }
    if (e.key === 'r' || e.key === 'R') {
        loadLevel(game.currentLevel);
        document.getElementById('message').style.display = 'none';
    }
});

document.addEventListener('keyup', (e) => { game.keys[e.key] = false; });

CANVAS.addEventListener('click', () => { initAudio(); CANVAS.focus(); });
CANVAS.setAttribute('tabindex', '0');


// ============================================================
//  START
// ============================================================

loadLevel(0);
showMessage(LEVELS[0].name, 2500);
requestAnimationFrame(loop);
