// Game Constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const GRAVITY = 0.6;
const MOVE_SPEED = 5;
const JUMP_POWER = -12;
const TILE_SIZE = 40;

// Game State
let gameState = {
    currentLevel: 0,
    jumpsUsed: 0,
    timeElapsed: 0,
    isGameOver: false,
    levelComplete: false,
    transitioning: false,
    player: null,
    platforms: [],
    buttons: [],
    doors: [],
    movingBlocks: [],
    exit: null,
    keys: {}
};

// Player Object
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velX = 0;
        this.velY = 0;
        this.canJump = false;
        this.facing = 1; // 1 = right, -1 = left
    }

    update() {
        if (gameState.transitioning || gameState.isGameOver) return;

        // Horizontal movement
        this.velX = 0;
        if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
            this.velX = -MOVE_SPEED;
            this.facing = -1;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
            this.velX = MOVE_SPEED;
            this.facing = 1;
        }

        // Apply gravity
        this.velY += GRAVITY;
        if (this.velY > 15) this.velY = 15;

        // Update position
        this.x += this.velX;
        this.y += this.velY;

        // Collision with platforms
        this.canJump = false;
        for (let platform of gameState.platforms) {
            if (this.checkCollision(platform)) {
                this.handlePlatformCollision(platform);
            }
        }

        // Collision with moving blocks
        for (let block of gameState.movingBlocks) {
            if (this.checkCollision(block)) {
                this.handlePlatformCollision(block);
            }
        }

        // Collision with closed doors (they block like walls)
        for (let door of gameState.doors) {
            if (!door.isOpen && this.checkCollision(door)) {
                this.handlePlatformCollision(door);
            }
        }

        // Check button collisions
        for (let button of gameState.buttons) {
            if (this.checkCollision(button) && !button.pressed) {
                button.press();
            }
        }

        // Check exit collision
        if (gameState.exit && this.checkCollision(gameState.exit)) {
            gameState.levelComplete = true;
        }

        // Wrap around screen (left-right)
        if (this.x + this.width < 0) this.x = CANVAS.width;
        if (this.x > CANVAS.width) this.x = -this.width;

        // Fall off screen — respawn
        if (this.y > CANVAS.height + 50) {
            this.reset();
        }
    }

    checkCollision(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    handlePlatformCollision(platform) {
        const overlapTop = this.y + this.height - platform.y;
        const overlapBottom = platform.y + platform.height - this.y;
        const overlapLeft = this.x + this.width - platform.x;
        const overlapRight = platform.x + platform.width - this.x;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapY < minOverlapX) {
            if (overlapTop < overlapBottom) {
                this.y = platform.y - this.height;
                this.velY = 0;
                this.canJump = true;
            } else {
                this.y = platform.y + platform.height;
                this.velY = 0;
            }
        } else {
            if (overlapLeft < overlapRight) {
                this.x = platform.x - this.width;
            } else {
                this.x = platform.x + platform.width;
            }
            this.velX = 0;
        }
    }

    jump() {
        if (this.canJump && !gameState.transitioning && !gameState.isGameOver) {
            this.velY = JUMP_POWER;
            this.canJump = false;
            gameState.jumpsUsed++;
            playSound('jump');
        }
    }

    reset() {
        const level = LEVELS[gameState.currentLevel];
        this.x = level.playerStart.x;
        this.y = level.playerStart.y;
        this.velX = 0;
        this.velY = 0;
        this.canJump = false;
    }

    draw() {
        // Body
        CTX.fillStyle = '#ff6b6b';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Highlight
        CTX.fillStyle = '#ff8a8a';
        CTX.fillRect(this.x + 2, this.y + 2, this.width - 4, 6);
        // Eyes
        const eyeOffsetX = this.facing === 1 ? 0 : -4;
        CTX.fillStyle = '#fff';
        CTX.fillRect(this.x + 8 + eyeOffsetX, this.y + 10, 7, 7);
        CTX.fillRect(this.x + 18 + eyeOffsetX, this.y + 10, 7, 7);
        CTX.fillStyle = '#000';
        const pupilOffset = this.facing === 1 ? 3 : 0;
        CTX.fillRect(this.x + 8 + eyeOffsetX + pupilOffset, this.y + 12, 4, 4);
        CTX.fillRect(this.x + 18 + eyeOffsetX + pupilOffset, this.y + 12, 4, 4);
    }
}

// Platform Object
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        CTX.fillStyle = '#4a9eff';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Top highlight
        CTX.fillStyle = '#6ab8ff';
        CTX.fillRect(this.x, this.y, this.width, 4);
        // Border
        CTX.strokeStyle = '#2a7acc';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Button Object
class Button {
    constructor(x, y, targetDoor) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.pressed = false;
        this.targetDoor = targetDoor;
    }

    press() {
        this.pressed = true;
        if (this.targetDoor) {
            this.targetDoor.open();
        }
        playSound('button');
    }

    draw() {
        CTX.fillStyle = this.pressed ? '#4ade80' : '#fbbf24';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        CTX.strokeStyle = this.pressed ? '#22c55e' : '#d97706';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x, this.y, this.width, this.height);
        // Icon
        CTX.fillStyle = '#000';
        CTX.font = '14px monospace';
        CTX.fillText(this.pressed ? '✓' : '!', this.x + 7, this.y + 18);
    }
}

// Door Object
class Door {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isOpen = false;
    }

    open() {
        this.isOpen = true;
    }

    draw() {
        if (!this.isOpen) {
            CTX.fillStyle = '#7c3aed';
            CTX.fillRect(this.x, this.y, this.width, this.height);
            // Cross pattern
            CTX.strokeStyle = '#5b21b6';
            CTX.lineWidth = 2;
            CTX.strokeRect(this.x, this.y, this.width, this.height);
            CTX.beginPath();
            CTX.moveTo(this.x, this.y);
            CTX.lineTo(this.x + this.width, this.y + this.height);
            CTX.moveTo(this.x + this.width, this.y);
            CTX.lineTo(this.x, this.y + this.height);
            CTX.stroke();
        }
    }
}

// Moving Block Object
class MovingBlock {
    constructor(x, y, width, height, startX, endX, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.startX = startX;
        this.endX = endX;
        this.speed = speed;
        this.direction = 1;
    }

    update() {
        this.x += this.speed * this.direction;
        if (this.x <= this.startX || this.x + this.width >= this.endX + this.width) {
            this.direction *= -1;
        }
    }

    draw() {
        CTX.fillStyle = '#f97316';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Arrows to show it moves
        CTX.fillStyle = '#fbbf24';
        CTX.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
        CTX.strokeStyle = '#cc5500';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Exit Object
class Exit {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.pulse = 0;
    }

    update() {
        this.pulse = (this.pulse + 0.05) % (Math.PI * 2);
    }

    draw() {
        const glow = Math.sin(this.pulse) * 0.3 + 0.7;
        // Glow circle
        CTX.beginPath();
        CTX.arc(this.x + this.width / 2, this.y + this.height / 2, 20, 0, Math.PI * 2);
        CTX.fillStyle = `rgba(74, 222, 128, ${glow * 0.3})`;
        CTX.fill();
        // Star
        CTX.font = '28px serif';
        CTX.textAlign = 'center';
        CTX.textBaseline = 'middle';
        CTX.fillStyle = `rgba(255, 255, 100, ${glow})`;
        CTX.fillText('⭐', this.x + this.width / 2, this.y + this.height / 2);
        CTX.textAlign = 'start';
        CTX.textBaseline = 'alphabetic';
    }
}

// Level Definitions
const LEVELS = [
    {
        name: 'Getting Started',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 200, y: 480, width: 150, height: 30 },
            { x: 500, y: 400, width: 150, height: 30 },
        ],
        exit: { x: 600, y: 350 }
    },
    {
        name: 'Precision Jump',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 450, width: 100, height: 30 },
            { x: 250, y: 400, width: 100, height: 30 },
            { x: 400, y: 350, width: 100, height: 30 },
            { x: 550, y: 300, width: 100, height: 30 },
            { x: 700, y: 250, width: 80, height: 30 },
        ],
        exit: { x: 710, y: 200 }
    },
    {
        name: 'Button & Door',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 100, height: 30 },
            { x: 250, y: 400, width: 80, height: 30 },
            { x: 400, y: 480, width: 100, height: 30 },
            { x: 550, y: 300, width: 100, height: 30 },
            { x: 700, y: 200, width: 80, height: 30 },
        ],
        buttons: [
            { x: 420, y: 455, targetDoor: 'door1' }
        ],
        doors: [
            { x: 480, y: 250, width: 40, height: 50, id: 'door1' }
        ],
        exit: { x: 710, y: 150 }
    },
    {
        name: 'Moving Platform',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 100, height: 30 },
            { x: 600, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 300, y: 400, width: 80, height: 30, startX: 250, endX: 550, speed: 1.5 }
        ],
        exit: { x: 620, y: 430 }
    },
    {
        name: 'Two Buttons',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 50, y: 480, width: 80, height: 30 },
            { x: 180, y: 400, width: 80, height: 30 },
            { x: 320, y: 480, width: 80, height: 30 },
            { x: 500, y: 350, width: 80, height: 30 },
            { x: 700, y: 280, width: 80, height: 30 },
        ],
        buttons: [
            { x: 210, y: 375, targetDoor: 'door1' },
            { x: 510, y: 325, targetDoor: 'door2' }
        ],
        doors: [
            { x: 440, y: 300, width: 40, height: 50, id: 'door1' },
            { x: 650, y: 230, width: 40, height: 50, id: 'door2' }
        ],
        exit: { x: 710, y: 230 }
    },
    {
        name: 'Timing Challenge',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 80, y: 480, width: 120, height: 30 },
            { x: 250, y: 400, width: 80, height: 30 },
            { x: 700, y: 320, width: 80, height: 30 },
            { x: 700, y: 240, width: 80, height: 30 },
        ],
        movingBlocks: [
            { x: 400, y: 350, width: 80, height: 30, startX: 350, endX: 650, speed: 2 }
        ],
        buttons: [
            { x: 280, y: 375, targetDoor: 'door1' }
        ],
        doors: [
            { x: 680, y: 380, width: 40, height: 80, id: 'door1' }
        ],
        exit: { x: 710, y: 190 }
    },
    {
        name: 'Complex Puzzle',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 50, y: 480, width: 100, height: 30 },
            { x: 200, y: 380, width: 80, height: 30 },
            { x: 380, y: 480, width: 100, height: 30 },
            { x: 650, y: 300, width: 100, height: 30 },
        ],
        buttons: [
            { x: 210, y: 355, targetDoor: 'door1' }
        ],
        doors: [
            { x: 540, y: 250, width: 40, height: 80, id: 'door1' }
        ],
        movingBlocks: [
            { x: 480, y: 380, width: 80, height: 30, startX: 450, endX: 650, speed: 1.5 }
        ],
        exit: { x: 690, y: 250 }
    },
    {
        name: 'Master Timing',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 80, height: 30 },
            { x: 400, y: 300, width: 80, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 400, width: 70, height: 30, startX: 200, endX: 500, speed: 2 },
            { x: 550, y: 350, width: 70, height: 30, startX: 500, endX: 750, speed: 2 }
        ],
        buttons: [
            { x: 130, y: 455, targetDoor: 'door1' },
            { x: 420, y: 275, targetDoor: 'door2' }
        ],
        doors: [
            { x: 350, y: 340, width: 40, height: 60, id: 'door1' },
            { x: 550, y: 240, width: 40, height: 60, id: 'door2' }
        ],
        exit: { x: 570, y: 190 }
    },
    {
        name: 'Chaotic Challenge',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 400, width: 80, height: 30, startX: 200, endX: 450, speed: 1.8 },
            { x: 500, y: 320, width: 80, height: 30, startX: 400, endX: 700, speed: 2 },
            { x: 350, y: 200, width: 80, height: 30, startX: 250, endX: 550, speed: 2.5 }
        ],
        buttons: [
            { x: 130, y: 455, targetDoor: 'door1' }
        ],
        doors: [
            { x: 200, y: 290, width: 40, height: 60, id: 'door1' }
        ],
        exit: { x: 380, y: 150 }
    },
    {
        name: 'Impossible Dream',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 80, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 400, width: 70, height: 30, startX: 200, endX: 500, speed: 2.5 },
            { x: 550, y: 320, width: 70, height: 30, startX: 500, endX: 750, speed: 2 },
            { x: 300, y: 220, width: 70, height: 30, startX: 250, endX: 500, speed: 3 },
            { x: 600, y: 160, width: 70, height: 30, startX: 550, endX: 750, speed: 2 }
        ],
        buttons: [
            { x: 110, y: 455, targetDoor: 'door1' },
            { x: 280, y: 340, targetDoor: 'door2' },
            { x: 630, y: 260, targetDoor: 'door3' }
        ],
        doors: [
            { x: 400, y: 340, width: 40, height: 60, id: 'door1' },
            { x: 550, y: 260, width: 40, height: 60, id: 'door2' },
            { x: 350, y: 140, width: 40, height: 60, id: 'door3' }
        ],
        exit: { x: 370, y: 80 }
    }
];

// Sound System
let audioContext;
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioContext) return;
    try {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        if (type === 'jump') {
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'button') {
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'levelUp') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {
        // Ignore audio errors
    }
}

// Load Level
function loadLevel(levelNum) {
    const levelData = LEVELS[levelNum];
    gameState.platforms = [];
    gameState.buttons = [];
    gameState.doors = [];
    gameState.movingBlocks = [];
    gameState.jumpsUsed = 0;
    gameState.levelComplete = false;
    gameState.transitioning = false;
    gameState.timeElapsed = 0;

    // Load platforms
    for (let p of levelData.platforms) {
        gameState.platforms.push(new Platform(p.x, p.y, p.width, p.height));
    }

    // Load moving blocks
    if (levelData.movingBlocks) {
        for (let b of levelData.movingBlocks) {
            gameState.movingBlocks.push(new MovingBlock(b.x, b.y, b.width, b.height, b.startX, b.endX, b.speed));
        }
    }

    // Load doors first (so buttons can reference them)
    const doorMap = {};
    if (levelData.doors) {
        for (let d of levelData.doors) {
            const door = new Door(d.x, d.y, d.width, d.height);
            doorMap[d.id] = door;
            gameState.doors.push(door);
        }
    }

    // Load buttons
    if (levelData.buttons) {
        for (let b of levelData.buttons) {
            const button = new Button(b.x, b.y, doorMap[b.targetDoor]);
            gameState.buttons.push(button);
        }
    }

    // Load exit
    gameState.exit = new Exit(levelData.exit.x, levelData.exit.y);

    // Load player
    gameState.player = new Player(levelData.playerStart.x, levelData.playerStart.y);
    gameState.isGameOver = false;

    document.getElementById('message').textContent = levelData.name;
    setTimeout(() => {
        if (document.getElementById('message').textContent === levelData.name) {
            document.getElementById('message').textContent = '';
        }
    }, 2000);

    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('levelNum').textContent = gameState.currentLevel + 1;
    document.getElementById('jumpCount').textContent = gameState.jumpsUsed;
    document.getElementById('timeCount').textContent = Math.floor(gameState.timeElapsed);
}

// Draw background grid
function drawGrid() {
    CTX.strokeStyle = '#151515';
    CTX.lineWidth = 1;
    for (let x = 0; x < CANVAS.width; x += TILE_SIZE) {
        CTX.beginPath();
        CTX.moveTo(x, 0);
        CTX.lineTo(x, CANVAS.height);
        CTX.stroke();
    }
    for (let y = 0; y < CANVAS.height; y += TILE_SIZE) {
        CTX.beginPath();
        CTX.moveTo(0, y);
        CTX.lineTo(CANVAS.width, y);
        CTX.stroke();
    }
}

// Game Loop
let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Cap deltaTime to avoid huge jumps on tab switch
    const dt = Math.min(deltaTime, 0.05);

    // Update time
    if (!gameState.transitioning && !gameState.isGameOver) {
        gameState.timeElapsed += dt;
    }

    // Update game objects
    if (!gameState.transitioning) {
        gameState.player.update();
    }
    for (let block of gameState.movingBlocks) {
        block.update();
    }
    gameState.exit.update();

    // Check level complete
    if (gameState.levelComplete && !gameState.transitioning) {
        gameState.transitioning = true;
        playSound('levelUp');

        if (gameState.currentLevel < LEVELS.length - 1) {
            document.getElementById('message').textContent = 'Level Complete! 🎉';
            setTimeout(() => {
                gameState.currentLevel++;
                loadLevel(gameState.currentLevel);
            }, 1500);
        } else {
            document.getElementById('message').textContent = '🏆 YOU BEAT THE GAME! 🏆';
            gameState.isGameOver = true;
        }
    }

    // === DRAW ===
    CTX.fillStyle = '#0a0a0a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    drawGrid();

    // Draw level elements
    for (let platform of gameState.platforms) platform.draw();
    for (let door of gameState.doors) door.draw();
    for (let block of gameState.movingBlocks) block.draw();
    for (let button of gameState.buttons) button.draw();
    gameState.exit.draw();
    gameState.player.draw();

    // Level name overlay during transition
    if (gameState.transitioning) {
        CTX.fillStyle = 'rgba(0, 0, 0, 0.4)';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
        CTX.fillStyle = '#4ade80';
        CTX.font = 'bold 36px monospace';
        CTX.textAlign = 'center';
        CTX.fillText('Level Complete!', CANVAS.width / 2, CANVAS.height / 2);
        CTX.textAlign = 'start';
    }

    updateUI();
    requestAnimationFrame(gameLoop);
}

// Input Handling
document.addEventListener('keydown', (e) => {
    initAudio();
    gameState.keys[e.key] = true;

    if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (gameState.player) gameState.player.jump();
    }
    if (e.key === 'r' || e.key === 'R') {
        loadLevel(gameState.currentLevel);
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

document.getElementById('restartBtn').addEventListener('click', () => {
    initAudio();
    loadLevel(gameState.currentLevel);
});

// Prevent scrolling on space/arrows
window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

// Focus canvas on click
CANVAS.addEventListener('click', () => {
    initAudio();
    CANVAS.focus();
});
CANVAS.setAttribute('tabindex', '0');

// Start
loadLevel(0);
requestAnimationFrame(gameLoop);
