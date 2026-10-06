// Game Constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const GRAVITY = 0.6;
const FRICTION = 0.9;
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
        this.isJumping = false;
        this.canJump = false;
        this.jumpCount = 0;
    }

    update() {
        // Horizontal movement
        this.velX = 0;
        if (gameState.keys['ArrowLeft'] || gameState.keys['a']) this.velX = -MOVE_SPEED;
        if (gameState.keys['ArrowRight'] || gameState.keys['d']) this.velX = MOVE_SPEED;

        // Apply gravity
        this.velY += GRAVITY;
        if (this.velY > 15) this.velY = 15; // Terminal velocity

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

        // Check button collisions
        for (let button of gameState.buttons) {
            if (this.checkCollision(button) && !button.pressed) {
                button.press();
            }
        }

        // Check exit collision
        if (this.checkCollision(gameState.exit)) {
            gameState.levelComplete = true;
        }

        // Wrap around screen (left-right)
        if (this.x + this.width < 0) this.x = CANVAS.width;
        if (this.x > CANVAS.width) this.x = -this.width;

        // Fall off screen
        if (this.y > CANVAS.height) {
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
            // Vertical collision
            if (overlapTop < overlapBottom) {
                this.y = platform.y - this.height;
                this.velY = 0;
                this.canJump = true;
                this.jumpCount = 0;
            } else {
                this.y = platform.y + platform.height;
                this.velY = 0;
            }
        } else {
            // Horizontal collision
            if (overlapLeft < overlapRight) {
                this.x = platform.x - this.width;
            } else {
                this.x = platform.x + platform.width;
            }
            this.velX = 0;
        }
    }

    jump() {
        if (this.canJump) {
            this.velY = JUMP_POWER;
            this.canJump = false;
            this.jumpCount++;
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
        this.isJumping = false;
        this.canJump = false;
        this.jumpCount = 0;
    }

    draw() {
        CTX.fillStyle = '#ff6b6b';
        CTX.fillRect(this.x, this.y, this.width, this.height);
        // Eyes
        CTX.fillStyle = '#000';
        CTX.fillRect(this.x + 8, this.y + 8, 6, 6);
        CTX.fillRect(this.x + 16, this.y + 8, 6, 6);
    }
}

// Platform Object
class Platform {
    constructor(x, y, width, height, type = 'static') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    draw() {
        CTX.fillStyle = '#4a9eff';
        CTX.fillRect(this.x, this.y, this.width, this.height);
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
        CTX.strokeStyle = '#000';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x, this.y, this.width, this.height);
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
            CTX.strokeStyle = '#5b21b6';
            CTX.lineWidth = 2;
            CTX.strokeRect(this.x, this.y, this.width, this.height);
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
        if (this.x <= this.startX || this.x >= this.endX) {
            this.direction *= -1;
        }
    }

    draw() {
        CTX.fillStyle = '#f97316';
        CTX.fillRect(this.x, this.y, this.width, this.height);
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
        this.width = 30;
        this.height = 30;
        this.pulse = 0;
    }

    update() {
        this.pulse = (this.pulse + 0.1) % (Math.PI * 2);
    }

    draw() {
        const scale = 1 + Math.sin(this.pulse) * 0.2;
        CTX.save();
        CTX.translate(this.x + this.width / 2, this.y + this.height / 2);
        CTX.scale(scale, scale);
        CTX.fillStyle = '#4ade80';
        CTX.fillText('⭐', -8, 8);
        CTX.restore();
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
        exit: { x: 700, y: 350 }
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
            { x: 420, y: 420, targetDoor: 'door1' }
        ],
        doors: [
            { x: 300, y: 350, width: 60, height: 80, id: 'door1' }
        ],
        exit: { x: 710, y: 150 }
    },
    {
        name: 'Moving Platform',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 100, height: 30 },
            { x: 350, y: 400, width: 100, height: 30 },
            { x: 600, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 300, y: 300, width: 80, height: 30, startX: 250, endX: 550, speed: 2 }
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
            { x: 210, y: 340, targetDoor: 'door1' },
            { x: 510, y: 290, targetDoor: 'door2' }
        ],
        doors: [
            { x: 400, y: 380, width: 60, height: 80, id: 'door1' },
            { x: 650, y: 200, width: 60, height: 80, id: 'door2' }
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
        ],
        movingBlocks: [
            { x: 400, y: 300, width: 80, height: 30, startX: 350, endX: 650, speed: 2 }
        ],
        buttons: [
            { x: 280, y: 340, targetDoor: 'door1' }
        ],
        doors: [
            { x: 680, y: 380, width: 60, height: 80, id: 'door1' }
        ],
        platforms2: [
            { x: 700, y: 320, width: 80, height: 30 },
            { x: 700, y: 240, width: 80, height: 30 },
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
        ],
        buttons: [
            { x: 210, y: 320, targetDoor: 'door1' }
        ],
        doors: [
            { x: 480, y: 350, width: 60, height: 100, id: 'door1' }
        ],
        movingBlocks: [
            { x: 550, y: 250, width: 80, height: 30, startX: 500, endX: 700, speed: 1.5 }
        ],
        exit: { x: 730, y: 200 }
    },
    {
        name: 'Master Timing',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 80, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 400, width: 70, height: 30, startX: 250, endX: 550, speed: 2.5 },
            { x: 600, y: 350, width: 70, height: 30, startX: 550, endX: 750, speed: 2 }
        ],
        buttons: [
            { x: 130, y: 420, targetDoor: 'door1' },
            { x: 630, y: 290, targetDoor: 'door2' }
        ],
        doors: [
            { x: 350, y: 330, width: 60, height: 60, id: 'door1' },
            { x: 400, y: 250, width: 60, height: 60, id: 'door2' }
        ],
        exit: { x: 420, y: 190 }
    },
    {
        name: 'Chaotic Challenge',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 100, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 380, width: 80, height: 30, startX: 200, endX: 450, speed: 2 },
            { x: 500, y: 320, width: 80, height: 30, startX: 400, endX: 700, speed: 2.5 },
            { x: 350, y: 200, width: 80, height: 30, startX: 250, endX: 550, speed: 3 }
        ],
        buttons: [
            { x: 130, y: 420, targetDoor: 'door1' }
        ],
        doors: [
            { x: 200, y: 290, width: 60, height: 80, id: 'door1' }
        ],
        exit: { x: 380, y: 140 }
    },
    {
        name: 'Impossible Dream',
        playerStart: { x: 50, y: 450 },
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 },
            { x: 80, y: 480, width: 100, height: 30 },
        ],
        movingBlocks: [
            { x: 250, y: 400, width: 70, height: 30, startX: 200, endX: 500, speed: 3 },
            { x: 550, y: 320, width: 70, height: 30, startX: 500, endX: 750, speed: 2.5 },
            { x: 300, y: 200, width: 70, height: 30, startX: 250, endX: 500, speed: 3.5 },
            { x: 600, y: 180, width: 70, height: 30, startX: 550, endX: 750, speed: 2 }
        ],
        buttons: [
            { x: 110, y: 420, targetDoor: 'door1' },
            { x: 280, y: 340, targetDoor: 'door2' },
            { x: 630, y: 260, targetDoor: 'door3' }
        ],
        doors: [
            { x: 400, y: 330, width: 50, height: 60, id: 'door1' },
            { x: 550, y: 250, width: 50, height: 60, id: 'door2' },
            { x: 350, y: 120, width: 50, height: 60, id: 'door3' }
        ],
        exit: { x: 370, y: 50 }
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
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    if (type === 'jump') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'button') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'levelUp') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
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
    gameState.timeElapsed = 0;

    // Load platforms
    for (let p of levelData.platforms) {
        gameState.platforms.push(new Platform(p.x, p.y, p.width, p.height));
    }

    // Load platforms2 if exists
    if (levelData.platforms2) {
        for (let p of levelData.platforms2) {
            gameState.platforms.push(new Platform(p.x, p.y, p.width, p.height));
        }
    }

    // Load moving blocks
    if (levelData.movingBlocks) {
        for (let b of levelData.movingBlocks) {
            gameState.movingBlocks.push(new MovingBlock(b.x, b.y, b.width, b.height, b.startX, b.endX, b.speed));
        }
    }

    // Load doors first
    const doorMap = {};
    if (levelData.doors) {
        for (let d of levelData.doors) {
            const door = new Door(d.x, d.y, d.width, d.height);
            doorMap[d.id] = door;
            gameState.doors.push(door);
        }
    }

    // Load buttons with references to doors
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

    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('levelNum').textContent = gameState.currentLevel + 1;
    document.getElementById('jumpCount').textContent = gameState.jumpsUsed;
    document.getElementById('timeCount').textContent = gameState.timeElapsed;
}

// Game Loop
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    // Update time
    if (!gameState.levelComplete && !gameState.isGameOver) {
        gameState.timeElapsed += deltaTime;
    }

    // Update game state
    gameState.player.update();
    for (let block of gameState.movingBlocks) {
        block.update();
    }
    gameState.exit.update();

    // Check level complete
    if (gameState.levelComplete) {
        if (gameState.currentLevel < LEVELS.length - 1) {
            document.getElementById('message').textContent = 'Level Complete! 🎉';
            setTimeout(() => {
                gameState.currentLevel++;
                loadLevel(gameState.currentLevel);
                document.getElementById('message').textContent = '';
                playSound('levelUp');
            }, 1500);
        } else {
            document.getElementById('message').textContent = 'YOU BEAT THE GAME! 🏆';
            gameState.isGameOver = true;
        }
        gameState.levelComplete = false;
    }

    // Draw
    CTX.fillStyle = '#0a0a0a';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    // Draw grid (optional)
    CTX.strokeStyle = '#1a1a1a';
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

    // Draw level
    for (let platform of gameState.platforms) {
        platform.draw();
    }
    for (let block of gameState.movingBlocks) {
        block.draw();
    }
    for (let door of gameState.doors) {
        door.draw();
    }
    for (let button of gameState.buttons) {
        button.draw();
    }
    gameState.exit.draw();
    gameState.player.draw();

    updateUI();
    requestAnimationFrame(gameLoop);
}

// Input Handling
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        gameState.player.jump();
    }
    if (e.key === 'r' || e.key === 'R') {
        loadLevel(gameState.currentLevel);
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

document.getElementById('restartBtn').addEventListener('click', () => {
    loadLevel(gameState.currentLevel);
    document.getElementById('message').textContent = '';
});

// Initialize
window.addEventListener('click', initAudio);
document.addEventListener('touchstart', initAudio);

loadLevel(0);
gameLoop();
