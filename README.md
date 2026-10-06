# Booty - Platform Puzzle Game

A web-based platform puzzle game inspired by Booty (1984). Navigate through 10 progressively challenging levels using precise jumps, buttons, doors, and moving platforms.

## 🎮 Features

- **10 Levels** with progressive difficulty
- **Smooth Physics** with gravity and collision detection
- **Puzzle Mechanics**:
  - Buttons & doors
  - Moving platforms
  - Platform timing challenges
  - Multi-button puzzles
- **Clean Pixel Art** aesthetic
- **Sound Effects** (Web Audio API)
- **Mobile-Friendly** controls (keyboard support)
- **Easy Level Editor** - JSON-based level structure

## 🕹️ Controls

| Action | Key |
|--------|-----|
| Move Left | `A` or `←` |
| Move Right | `D` or `→` |
| Jump | `SPACE` or `W` |
| Restart Level | `R` or Click Button |

## 📂 Project Structure

```
booty-game/
├── index.html          # Main HTML file
├── game.js             # Game engine & logic
├── README.md           # This file
└── docs/
    └── LEVEL_EDITOR.md # Level creation guide
```

## 🚀 Deploy to GitHub Pages

1. **Create a GitHub repository** (e.g., `booty-game`)
2. **Clone the repo locally**:
   ```bash
   git clone https://github.com/yourusername/booty-game.git
   cd booty-game
   ```
3. **Add these files**:
   - `index.html`
   - `game.js`
   - `README.md`

4. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit: Booty game"
   git push origin main
   ```

5. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Select "main" branch as source
   - Save

6. **Access your game**:
   ```
   https://yourusername.github.io/booty-game/
   ```

## 📊 Level System

Levels are defined in the `LEVELS` array in `game.js`. Each level is a JSON object:

```javascript
{
    name: 'Level Name',
    playerStart: { x: 50, y: 450 },
    platforms: [
        { x: 0, y: 550, width: 800, height: 50 }
    ],
    buttons: [
        { x: 420, y: 420, targetDoor: 'door1' }
    ],
    doors: [
        { x: 300, y: 350, width: 60, height: 80, id: 'door1' }
    ],
    movingBlocks: [
        { x: 300, y: 300, width: 80, height: 30, startX: 250, endX: 550, speed: 2 }
    ],
    exit: { x: 700, y: 350 }
}
```

### Adding a New Level

Edit `game.js` and add a new object to the `LEVELS` array:

1. **Player Start Position** - Where the player spawns
2. **Platforms** - Static platforms (x, y, width, height)
3. **Moving Blocks** - Platforms that move (x, y, width, height, startX, endX, speed)
4. **Buttons** - Pressure plates (x, y, targetDoor: 'doorId')
5. **Doors** - Barriers that open when button pressed (x, y, width, height, id)
6. **Exit** - Goal position (x, y)

### Level Design Tips

- **Difficulty Progression**: Levels 1-2 basic, 3-5 intermediate, 6-8 advanced, 9-10 expert
- **Canvas Size**: 800x600 pixels
- **Timing**: Test with multiple attempts to balance difficulty
- **Moving Block Speed**: 1-3 range (higher = faster)
- **Spacing**: Ensure platforms are reachable with JUMP_POWER (-12)

## 🎨 Customization

Edit `game.js` constants:

```javascript
const GRAVITY = 0.6;        // Gravity strength
const MOVE_SPEED = 5;       // Player horizontal speed
const JUMP_POWER = -12;     // Jump force (negative = up)
const TILE_SIZE = 40;       // Grid size for rendering
```

Edit `index.html` styles:

```css
canvas {
    border: 3px solid #4a9eff;      /* Border color */
    background: #0a0a0a;            /* Canvas background */
}
```

## 📝 Difficulty Breakdown

- **Level 1-2**: Learn basic jumps and movement
- **Level 3-5**: Introduction to buttons, doors, and moving platforms
- **Level 6-8**: Combination puzzles requiring precise timing
- **Level 9-10**: Expert challenges with multiple moving platforms and buttons

## 🔧 Technical Details

- **Game Engine**: Vanilla JavaScript (no frameworks)
- **Rendering**: HTML5 Canvas 2D
- **Physics**: Custom collision detection
- **Audio**: Web Audio API for sound effects
- **Performance**: ~60 FPS on modern browsers

## 🐛 Known Limitations

- No save/resume (single session only)
- No mobile touch controls (keyboard/arrows only)
- Canvas requires focus for keyboard input

## 📈 Future Enhancements

- [ ] Level progression save/load
- [ ] Custom level sharing
- [ ] Mobile touch controls
- [ ] Leaderboard system
- [ ] Additional level editor UI
- [ ] Sprite animations
- [ ] Background music

## 📄 License

Free to use and modify. Inspired by Booty (1984).

---

**Made with ❤️ for 8-bit nostalgia**
