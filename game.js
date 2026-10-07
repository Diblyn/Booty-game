/* ============================================================
   BOOTY - a love letter to the 1984 classic
   Rendering, sound, input and game flow.
   Physics live in engine.js, holds in levels.js.
   ============================================================ */
(function () {
    'use strict';

    const E = window.BootyEngine;
    const LEVELS = window.BOOTY_LEVELS || BOOTY_LEVELS;
    const T = E.T, W = 256, H = 192, PLAY_H = E.ROWS * T; // 168
    const FONT = '"Press Start 2P", monospace';

    // ---------- canvases ----------
    const screen = document.getElementById('screen');
    const sctx = screen.getContext('2d');
    const buf = document.createElement('canvas');
    buf.width = W; buf.height = H;
    const bctx = buf.getContext('2d');
    let ctx = bctx; // swapped while painting the static layer
    let SC = 3;

    function resize() {
        const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const availH = window.innerHeight - (touch ? 150 : 16);
        let fit = Math.min(window.innerWidth / W, availH / H);
        if (fit >= 1 && !touch) fit = Math.floor(fit);             // crisp integer scale on desktop
        const dpr = window.devicePixelRatio || 1;
        SC = Math.min(6, Math.max(2, Math.round(fit * dpr)));     // internal resolution for sharp text
        screen.width = W * SC; screen.height = H * SC;
        screen.style.width = Math.floor(W * fit) + 'px'; screen.style.height = Math.floor(H * fit) + 'px';
        sctx.imageSmoothingEnabled = false;
        if (touch) document.body.style.alignItems = 'flex-start';
    }
    window.addEventListener('resize', resize);
    resize();

    // ---------- palette & sprites ----------
    const PAL = {
        k: '#000000', b: '#0000D7', B: '#2020FF', r: '#D70000', R: '#FF2020', m: '#D700D7', M: '#FF50FF',
        g: '#00D700', G: '#00FF00', c: '#00D7D7', C: '#00FFFF', y: '#D7D700', Y: '#FFFF00',
        w: '#D7D7D7', W: '#FFFFFF', n: '#7A3E12', N: '#B8672E', s: '#F2B27A', o: '#FF8C00',
        d: '#505050', l: '#A8A8A8',
    };
    const KEYCOL = [null, '#FFFF00', '#00FFFF', '#FF50FF', '#00FF00', '#FFFFFF', '#FF2020', '#FF8C00', '#5080FF', '#C07438'];

    function mk(rows, sub) {
        const c = document.createElement('canvas');
        c.width = rows[0].length; c.height = rows.length;
        const x = c.getContext('2d');
        rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i++) {
                let ch = row[i];
                if (ch === '.') continue;
                const col = (sub && sub[ch]) || PAL[ch];
                if (!col) continue;
                x.fillStyle = col; x.fillRect(i, j, 1, 1);
            }
        });
        return c;
    }
    function flip(src) {
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const x = c.getContext('2d');
        x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
        return c;
    }
    function tint(src, color) {
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const x = c.getContext('2d');
        x.drawImage(src, 0, 0);
        x.globalCompositeOperation = 'source-atop';
        x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
        return c;
    }
    function pair(rows, sub) { const a = mk(rows, sub); return [a, flip(a)]; } // [right, left]

    const HEAD = ['..RRRR..', '.RRRRRR.', '.nsssss.', '.nsssks.', '..ssss..',
                  '.WWWWWW.', 'sBBBBBBs', 'sWWWWWWs', 'sBBBBBBs', '.WWWWWW.', '.yyyyyy.'];
    const LEGS = {
        stand: ['.bbbbbb.', '.bb..bb.', '.bb..bb.', '.bb..bb.', 'kkk..kkk'],
        a:     ['.bbbbbb.', 'bbb..bbb', 'bb....bb', 'bb....bb', 'kk....kk'],
        b:     ['.bbbbbb.', '..bbbb..', '..bbbb..', '...bb...', '..kkkk..'],
        jump:  ['.bbbbbb.', 'bbb..bbb', 'kk....kk', '........', '........'],
    };
    const SPR = {
        pStand: pair(HEAD.concat(LEGS.stand)),
        pWalkA: pair(HEAD.concat(LEGS.a)),
        pWalkB: pair(HEAD.concat(LEGS.b)),
        pJump:  pair(['s.RRRR.s', 's.RRRR.s'].concat(HEAD.slice(2, 5), ['.WWWWWW.', '.BBBBBB.', '.WWWWWW.', '.BBBBBB.', '.WWWWWW.', '.yyyyyy.'], LEGS.jump)),
        pClimb: pair(['..RRRR..', '.RRRRRR.', '.nnnnnn.', '.nnnnnn.', '..nnnn..', 'sWWWWWW.', 'sBBBBBBs',
                      '.WWWWWWs', '.BBBBBB.', '.WWWWWW.', '.yyyyyy.', '.bbbbbb.', '.bb..bb.', '.bb..bb.', '.kk..bb.', '......kk']),
        pirateA: pair(['.RRRRR..', 'RRRRRRR.', '.ssssss.', '.skksks.', '.kkkkkk.', '..kkkk..', '.rWWWWr.', 'srWWWWrs',
                       'srWWWWrl', '.rWWWWrl', '.yyyyyyl', '.kkkkkk.', '.kk..kk.', '.kk..kk.', '.kk..nn.', 'kkk...n.']),
        pirateB: pair(['.RRRRR..', 'RRRRRRR.', '.ssssss.', '.skksks.', '.kkkkkk.', '..kkkk..', '.rWWWWr.', 'srWWWWrs',
                       'srWWWWrl', '.rWWWWrl', '.yyyyyyl', '.kkkkkk.', '..kkkk..', '..kk.k..', '..kk.n..', '.kkk.n..']),
        ratA: pair(['........', '........', '........', '........', '.....ll.', '..llllkl', 'dllllllM', 'd.l..l..']),
        ratB: pair(['........', '........', '........', '........', '.....ll.', '..llllkl', 'dllllllM', 'd..l..l.']),
        parA: pair(['G.G.....', '.GGG....', '..GGGRR.', '..GGRRkY', '...GGGG.', '...GG...', '..BB....', '.B......']),
        parB: pair(['........', '........', '..GGGRR.', 'GGGGRRkY', 'GG.GGGG.', '...GG...', '..BB....', '.B......']),
        booty: [
            mk(['........', '........', '.nNNNNn.', 'nNNNNNNn', 'nyyyyyyn', 'nNNYYNNn', 'nNNNNNNn', 'nnnnnnnn']),
            mk(['.YYYYYY.', '.YWYYYY.', '.yYYYYy.', '..yYYy..', '...YY...', '...YY...', '..YYYY..', '.yyyyyy.']),
            mk(['...nn...', '...GG...', '...GG...', '..GGGG..', '.GWGGGG.', '.GWyyGG.', '.GGyyGG.', '..GGGG..']),
            mk(['...ny...', '..nnn...', '...n....', '..NNNN..', '.NNYNNN.', '.NYYYNN.', '.NNYNNN.', '..NNNN..']),
            mk(['........', '..CCCC..', '.CWCCCC.', 'CCWCCCCC', '.CCCCCC.', '..CCCC..', '...CC...', '........']),
            mk(['........', '........', 'Y..Y..Y.', 'YY.Y.YY.', 'YYYYYYY.', 'YRYCYRY.', 'YYYYYYY.', '........']),
        ],
        bomb: mk(['......Y.', '.....R..', '....d...', '..kkkk..', '.kkWdkk.', '.kdkkkk.', '.kkkkkk.', '..kkkk..'], { k: '#202020' }),
        barrel: mk(['..nnnn..', '.NNNNNN.', '.llllll.', '.NNNNNN.', '.NNNNNN.', '.llllll.', '.NNNNNN.', '..nnnn..']),
        porthole: mk(['..llll..', '.lCbbbl.', 'lCbbbbbl', 'lbbbbbbl', 'lbbbbbbl', 'lbbbbbBl', '.lbbbBl.', '..llll..']),
        lantern: mk(['...dd...', '...dd...', '..dddd..', '..dYYd..', '..YooY..', '..dYYd..', '..dddd..', '........']),
        cannon: mk(['........', '........', '........', '.lllllkk', 'kkkkkkkk', '.rrrrr..', 'rNrrrNr.', '.N...N..'], { k: '#202020', l: '#707070' }),
        flag: mk(['lkkkkkkk', 'lkkWWWkk', 'lkkWkWkk', 'lkkWWWkk', 'lkWkkkWk', 'lkkWkWkk', 'lkWkkkWk', 'l.......']),
        life: mk(['..RR..', '.RRRR.', '.ssss.', 'WWWWWW', '.BBBB.', '.WWWW.', '.b..b.', '.k..k.']),
    };
    const KEY_ROWS = ['........', '........', '........', '.XX.....', 'X..XXXXX', 'X..X.X.X', '.XX.....', '........'];
    SPR.keys = KEYCOL.map(col => col ? mk(KEY_ROWS, { X: col }) : null);
    SPR.gold = mk(['..YYY.......', '.Y...Y......', 'Y..W..YYYYYY', 'Y.....YY.Y.Y', '.Y...Y......', '..YYY.......']);
    SPR.pDead = [tint(SPR.pStand[0], '#FFFFFF'), tint(SPR.pStand[0], '#FF2020')];

    const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
                 '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
    function digit(x, y, n, col) {
        const d = DIG[n]; ctx.fillStyle = col;
        for (let i = 0; i < 15; i++) if (d[i] === '1') ctx.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
    }

    // ---------- text (drawn crisp on the scaled screen) ----------
    let texts = [];
    function txt(s, x, y, col, opt) {
        texts.push({ s: String(s), x, y, col: col || '#FFFFFF', align: (opt && opt.align) || 'left', size: (opt && opt.size) || 1, shadow: opt && opt.shadow });
    }
    function center(s, y, col, opt) { txt(s, W / 2, y, col, Object.assign({ align: 'center' }, opt || {})); }
    function flushText() {
        sctx.textBaseline = 'top';
        for (const t of texts) {
            sctx.font = `${8 * t.size * SC}px ${FONT}`;
            sctx.textAlign = t.align;
            if (t.shadow) { sctx.fillStyle = t.shadow; sctx.fillText(t.s, (t.x + 1) * SC, (t.y + 1) * SC); }
            sctx.fillStyle = t.col;
            sctx.fillText(t.s, t.x * SC, t.y * SC);
        }
        texts = [];
    }
    function wrap(s, n) {
        const out = []; let line = '';
        for (const word of s.split(' ')) {
            if ((line + ' ' + word).trim().length > n) { out.push(line.trim()); line = word; }
            else line += ' ' + word;
        }
        if (line.trim()) out.push(line.trim());
        return out;
    }

    // ---------- audio ----------
    const Snd = (() => {
        let ac = null, master = null, musicGain = null, noise = null;
        let musicOn = true, nextNote = 0, step = 0, timer = null;
        try { musicOn = localStorage.getItem('booty-music') !== 'off'; } catch (e) {}

        function init() {
            if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
            try {
                ac = new (window.AudioContext || window.webkitAudioContext)();
                master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
                musicGain = ac.createGain(); musicGain.gain.value = musicOn ? 0.5 : 0; musicGain.connect(master);
                noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
                const d = noise.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                nextNote = ac.currentTime + 0.1;
                timer = setInterval(schedule, 25);
            } catch (e) { ac = null; }
        }

        function tone(f, t, dur, type, vol, f2, dest) {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'square';
            o.frequency.setValueAtTime(f, t);
            if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(dest || master);
            o.start(t); o.stop(t + dur + 0.02);
        }
        function hiss(t, dur, vol, freq) {
            const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
            s.buffer = noise; f.type = 'lowpass'; f.frequency.value = freq || 1200;
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
        }
        const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

        function play(name) {
            if (!ac) return;
            const t = ac.currentTime;
            switch (name) {
                case 'step': tone(180, t, 0.03, 'square', 0.03); break;
                case 'climb': tone(320, t, 0.03, 'triangle', 0.05); break;
                case 'jump': tone(220, t, 0.18, 'square', 0.08, 660); break;
                case 'land': tone(120, t, 0.05, 'triangle', 0.08); break;
                case 'booty': tone(988, t, 0.06, 'square', 0.07); tone(1319, t + 0.06, 0.1, 'square', 0.07); break;
                case 'key': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.05, 0.08, 'square', 0.07)); break;
                case 'door': tone(160, t, 0.15, 'square', 0.1, 80); tone(320, t + 0.12, 0.25, 'triangle', 0.1, 640); break;
                case 'locked': tone(90, t, 0.08, 'square', 0.06); break;
                case 'fuse': tone(1800, t, 0.03, 'square', 0.04); break;
                case 'boom': hiss(t, 0.7, 0.5, 900); tone(90, t, 0.5, 'triangle', 0.3, 30); break;
                case 'crumble': hiss(t, 0.15, 0.15, 2000); break;
                case 'die': tone(660, t, 0.6, 'square', 0.1, 60); hiss(t, 0.3, 0.1, 3000); break;
                case 'open': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.12, 'square', 0.07)); break;
                case 'clear': [523, 523, 784, 784, 880, 988, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.14, 'square', 0.08)); break;
                case 'life': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.1, 'triangle', 0.1)); break;
                case 'gold': [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'square', 0.08)); break;
                case 'tick': tone(1500, t, 0.02, 'square', 0.04); break;
                case 'enter': tone(180, t, 0.22, 'triangle', 0.12, 720); tone(360, t + 0.08, 0.2, 'square', 0.04, 1080); break;
            }
        }

        // "What Shall We Do with the Drunken Sailor" (traditional, public domain)
        const A4 = 69, G4 = 67, F4 = 65, E4 = 64, D4 = 62, C4 = 60, B4 = 71, C5 = 72, D5 = 74;
        const rhythm = [4, 2, 2, 4, 2, 2, 4, 4, 4, 4];
        const phrase = (n, tail) => rhythm.map((d, i) => [i < 7 ? n : tail[i - 7], d]);
        const MEL = [].concat(
            phrase(A4, [D4, F4, A4]), phrase(G4, [C4, E4, G4]), phrase(A4, [B4, C5, D5]),
            [[C5, 4], [A4, 4], [G4, 4], [E4, 4], [D4, 8], [0, 8]],
            [[A4, 8], [A4, 8], [A4, 4], [A4, 4], [D4, 4], [F4, 4]], [[G4, 8], [G4, 8], [G4, 4], [G4, 4], [C4, 4], [E4, 4]],
            [[A4, 8], [A4, 8], [A4, 4], [A4, 4], [B4, 4], [C5, 4]], [[D5, 4], [C5, 4], [A4, 4], [G4, 4], [E4, 4], [D4, 4], [D4, 8]]
        );
        const BASS = [50, 48, 50, 48, 50, 48, 50, 50, 50, 48, 50, 48, 50, 48, 50, 50];
        let melIdx = 0, melLeft = 0, bassStep = 0;
        const SIXTEENTH = 0.11;

        function schedule() {
            if (!ac) return;
            while (nextNote < ac.currentTime + 0.2) {
                if (melLeft <= 0) {
                    const [n, d] = MEL[melIdx % MEL.length];
                    if (n) tone(mtof(n + 12), nextNote, d * SIXTEENTH * 0.9, 'square', 0.035, null, musicGain);
                    melLeft = d; melIdx++;
                }
                if (step % 4 === 0) {
                    const root = BASS[Math.floor(bassStep / 4) % BASS.length];
                    const note = (bassStep % 2) ? root + 7 : root;
                    tone(mtof(note - 12), nextNote, SIXTEENTH * 3, 'triangle', 0.12, null, musicGain);
                    bassStep++;
                }
                melLeft--; step++;
                nextNote += SIXTEENTH;
            }
        }
        function toggleMusic() {
            musicOn = !musicOn;
            try { localStorage.setItem('booty-music', musicOn ? 'on' : 'off'); } catch (e) {}
            if (musicGain) musicGain.gain.value = musicOn ? 0.5 : 0;
            return musicOn;
        }
        return { init, play, toggleMusic, get musicOn() { return musicOn; } };
    })();

    // ---------- input ----------
    const held = { left: false, right: false, up: false, down: false };
    let jumpQueued = false;
    const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };

    window.addEventListener('keydown', e => {
        Snd.init();
        if (KEYMAP[e.code]) { held[KEYMAP[e.code]] = true; e.preventDefault(); }
        if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) press('jump'); }
        if (e.repeat) return;
        if (e.code === 'KeyM') { const on = Snd.toggleMusic(); flash(on ? 'MUSIC ON' : 'MUSIC OFF'); }
        if (e.code === 'KeyP' || e.code === 'Escape') press('pause');
        if (e.code === 'KeyR') press('restart');
        if (e.code === 'Tab' || e.code === 'KeyN') { e.preventDefault(); press('map'); }
        if (e.code === 'KeyC') press('continue');
        if (e.code === 'KeyQ') press('quit');
    });
    window.addEventListener('keyup', e => { if (KEYMAP[e.code]) held[KEYMAP[e.code]] = false; });
    window.addEventListener('blur', () => { for (const k in held) held[k] = false; });

    document.querySelectorAll('#touch button').forEach(b => {
        const k = b.dataset.k;
        const tap = k === 'jump' || k === 'map' || k === 'pause';
        const on = ev => { ev.preventDefault(); Snd.init(); b.classList.add('on'); if (tap) press(k); else held[k] = true; };
        const off = ev => { ev.preventDefault(); b.classList.remove('on'); if (!tap) held[k] = false; };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
        b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    screen.addEventListener('pointerdown', () => { Snd.init(); if (S.mode !== 'play') press('jump'); });

    // ---------- game state ----------
    const TOTAL = LEVELS.reduce((n, d) => n + d.map.join('').split('').filter(c => c === '$' || c === '!').length, 0);
    const GOLD_TIME = 45 * 60;
    const S = {
        mode: 'title', room: 0, lives: 5, score: 0, booty: 0, held: 0,
        worlds: null, w: null, p: null, entry: null, visited: [],
        staticLayer: null, staticDirty: true,
        gold: null, goldTime: 0,
        bombs: [], parts: [], floats: [], touchingKeys: new Set(),
        snap: null, timer: 0, invuln: 0, shake: 0, deathCause: '', msg: '', msgT: 0, banner: null,
        frame: 0, playFrames: 0, nextLife: 30, hi: 0, save: null, trans: null, prevUp: false,
    };
    try { S.save = JSON.parse(localStorage.getItem('booty-ship-save') || 'null'); S.hi = +(localStorage.getItem('booty-hi') || 0); } catch (e) {}

    function flash(m, t) { S.msg = m; S.msgT = t || 120; }

    function press(what) {
        switch (S.mode) {
            case 'title':
                if (what === 'jump') newGame();
                else if (what === 'continue' && S.save) restore(S.save, true);
                break;
            case 'intro':
                if (what === 'jump' && S.timer > 20) { S.mode = 'play'; S.timer = 0; welcome(); }
                break;
            case 'play':
                if (what === 'jump') jumpQueued = true;
                else if (what === 'pause') S.mode = 'paused';
                else if (what === 'map') S.mode = 'map';
                else if (what === 'restart') killPlayer('restart');
                break;
            case 'map':
                if (what === 'map' || what === 'pause' || what === 'jump') S.mode = 'play';
                break;
            case 'paused':
                if (what === 'pause' || what === 'jump') S.mode = 'play';
                else if (what === 'map') S.mode = 'map';
                else if (what === 'quit') S.mode = 'title';
                break;
            case 'gameover':
                if (what === 'jump' && S.timer > 40) restore(S.snap, false);
                else if (what === 'quit') S.mode = 'title';
                break;
            case 'win':
                if (what === 'jump' && S.timer > 90) S.mode = 'title';
                break;
        }
    }

    // ---------- the ship: holds, doors and saves ----------
    function bootyIn(w) { let n = 0; for (const ch of w.tiles) if (ch === '$' || ch === '!') n++; return n; }

    function tilesForSave(w) {
        const t = w.tiles.slice();
        for (const g of w.regrow) t[g.r * E.COLS + g.c] = '-';   // crumbled planks come back
        return t.join('');
    }

    function snapshot() {
        return {
            room: S.room, entry: S.entry, score: S.score, booty: S.booty, lives: S.lives, nextLife: S.nextLife,
            playFrames: S.playFrames, visited: S.visited.slice(), gold: S.gold, goldTime: S.goldTime,
            worlds: S.worlds.map(w => ({ tiles: tilesForSave(w), consumed: w.consumed, t: w.t })),
        };
    }

    function saveGame() {
        S.snap = snapshot();
        S.save = S.snap;
        try { localStorage.setItem('booty-ship-save', JSON.stringify(S.snap)); } catch (e) {}
    }

    function setRoom(room, entry) {
        S.room = room; S.w = S.worlds[room]; S.entry = entry;
        S.p = E.newPlayer(S.w, entry);
        S.held = 0; S.bombs = []; S.touchingKeys = new Set();
        S.invuln = 60; S.staticDirty = true; S.prevUp = true;
    }

    function newGame() {
        S.worlds = LEVELS.map(d => E.parseLevel(d));
        S.lives = 5; S.score = 0; S.booty = 0; S.nextLife = 30; S.playFrames = 0;
        S.visited = LEVELS.map(() => false); S.gold = null; S.goldTime = 0;
        S.parts = []; S.floats = []; S.banner = null; S.msgT = 0;
        setRoom(0, S.worlds[0].start);
        S.visited[0] = true;
        saveGame();
        S.mode = 'intro'; S.timer = 0;
    }

    function restore(snap, fromTitle) {
        S.worlds = LEVELS.map((d, i) => {
            const w = E.parseLevel(d), sw = snap.worlds[i];
            w.tiles = sw.tiles.split(''); w.consumed = sw.consumed || {}; E.setTime(w, sw.t || 0);
            return w;
        });
        S.score = snap.score; S.booty = snap.booty; S.nextLife = snap.nextLife || 30;
        S.lives = fromTitle ? Math.max(5, snap.lives || 5) : 5;
        S.playFrames = snap.playFrames || 0; S.visited = snap.visited.slice();
        S.gold = snap.gold; S.goldTime = snap.gold ? GOLD_TIME : 0;
        S.parts = []; S.floats = []; S.msgT = 0;
        setRoom(snap.room, snap.entry);
        S.snap = snap;
        S.mode = 'play'; S.timer = 0;
        S.banner = { title: `HOLD ${snap.room + 1}  ${LEVELS[snap.room].name}`, tip: '', t: 150 };
    }

    function welcome() {
        const d = LEVELS[S.room];
        S.banner = { title: `HOLD ${S.room + 1}  ${d.name}`, tip: d.tip, t: 330 };
    }

    function goThrough(door) {
        S.mode = 'trans'; S.timer = 0;
        S.trans = { to: door.to - 1, from: S.room };
        Snd.play('enter');
    }

    function finishTransition() {
        const { to, from } = S.trans;
        E.resetKeys(S.w);                                   // keys never leave their hold
        const dest = S.worlds[to];
        const arrival = dest.portals.find(d => d.to === from + 1 || d.from === from + 1);
        setRoom(to, { x: arrival.x, y: arrival.y });
        const first = !S.visited[to];
        S.visited[to] = true;
        const d = LEVELS[to];
        S.banner = { title: `HOLD ${to + 1}  ${d.name}`, tip: first ? d.tip : '', t: first ? 330 : 120 };
        if (S.gold && S.gold.room === to) S.banner.tip = 'THE GOLDEN KEY IS IN THIS HOLD!';
        saveGame();
    }

    // ---------- effects ----------
    function burst(x, y, cols, n, spd) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * (spd || 1);
            S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, life: 30 + Math.random() * 20, col: cols[i % cols.length] });
        }
    }
    function floater(x, y, s, col) { S.floats.push({ x, y, s, col: col || '#FFFF00', life: 50 }); }

    function addScore(n) {
        S.score += n;
        if (S.score > S.hi) { S.hi = S.score; try { localStorage.setItem('booty-hi', String(S.hi)); } catch (e) {} }
    }

    // ---------- gameplay ----------
    function killPlayer(cause) {
        if (S.mode !== 'play') return;
        S.p.dead = S.p.dead || cause;
        S.deathCause = cause;
        S.mode = 'dead'; S.timer = 0; S.shake = cause === 'restart' ? 0 : 10;
        Snd.play('die');
        burst(S.p.x + 4, S.p.y + 8, ['#FFFFFF', '#FF2020', '#FFFF00'], 24, 1.4);
    }

    function openDoor(n) {
        const w = S.w;
        let cx = 0, cy = 0, k = 0;
        for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] === String(n)) {
            w.tiles[i] = '.'; cx += (i % E.COLS) * T + 4; cy += Math.floor(i / E.COLS) * T + 4; k++;
        }
        w.consumed[String.fromCharCode(96 + n)] = true;
        if (k) burst(cx / k, cy / k, [KEYCOL[n], '#FFFFFF'], 20, 1);
        S.staticDirty = true;
        S.held = 0;
        addScore(100); floater(cx / k, cy / k - 8, '100', KEYCOL[n]);
        Snd.play('door');
    }

    function spawnGold() {
        // the golden key appears in this hold, on the treasure spot furthest from you
        const w = S.w, start = LEVELS[S.room].map;
        let best = null, bd = -1;
        for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
            const ch0 = start[r][c];
            if ((ch0 !== '$' && ch0 !== '!') || E.tileAt(w, c, r) !== '.') continue;
            const d = Math.abs(c * T - S.p.x) + Math.abs(r * T - S.p.y);
            if (d > bd) { bd = d; best = { c, r }; }
        }
        S.gold = { room: S.room, c: best.c, r: best.r };
        E.setTile(w, best.c, best.r, 'G');
        S.goldTime = GOLD_TIME;
    }

    function collect(c, r, ch) {
        const w = S.w;
        E.setTile(w, c, r, '.');
        S.booty++; addScore(50);
        floater(c * T + 4, r * T - 4, '50');
        burst(c * T + 4, r * T + 4, ['#FFFF00', '#FFFFFF'], 8, 0.7);
        Snd.play('booty');
        if (ch === '!') { S.bombs.push({ x: c * T, y: r * T, t: 60 }); flash('BOOBY TRAP! RUN!', 60); }
        if (S.booty >= S.nextLife) { S.lives++; S.nextLife += 30; Snd.play('life'); flash('EXTRA LIFE!'); }
        if (S.booty >= TOTAL) {
            spawnGold();
            S.banner = { title: `ALL ${TOTAL} PIECES FOUND!`, tip: 'THE GOLDEN KEY HAS APPEARED IN THIS HOLD. YOU HAVE 45 SECONDS!', t: 300 };
            Snd.play('gold');
        } else if (bootyIn(w) === 0) {
            addScore(500);
            flash(`HOLD ${S.room + 1} CLEARED! +500`, 150);
            Snd.play('clear');
        }
    }

    function handleEvents(ev) {
        const p = S.p, w = S.w;
        const nowKeys = new Set(), seen = new Set();
        for (const e of ev) {
            switch (e.type) {
                case 'jump': Snd.play('jump'); break;
                case 'land': Snd.play('land'); break;
                case 'crumble': Snd.play('crumble'); burst(e.c * T + 4, e.r * T + 2, [LEVELS[S.room].theme.crumble], 10, 0.6); break;
                case 'die': killPlayer(e.cause); break;
                case 'door':
                    if (S.held === e.n) openDoor(e.n);
                    else if (S.frame % 20 === 0) { Snd.play('locked'); if (!S.msgT) flash(S.held ? `KEY ${S.held} DOES NOT FIT DOOR ${e.n}` : `DOOR ${e.n} NEEDS KEY ${e.n}`, 70); }
                    break;
                case 'touch': {
                    const id = e.c + ',' + e.r;
                    if (seen.has(id)) break;
                    seen.add(id);
                    const ch = E.tileAt(w, e.c, e.r);
                    if (ch === '$' || ch === '!') collect(e.c, e.r, ch);
                    else if (ch >= 'a' && ch <= 'i') {
                        nowKeys.add(id);
                        if (!S.touchingKeys.has(id)) {
                            const n = ch.charCodeAt(0) - 96;
                            E.setTile(w, e.c, e.r, S.held ? String.fromCharCode(96 + S.held) : '.');
                            if (S.held) flash(`SWAPPED KEY ${S.held} FOR KEY ${n}`, 80); else flash(`GOT KEY ${n}`, 60);
                            S.held = n; addScore(10); Snd.play('key');
                        }
                    } else if (ch === 'G' && S.gold && S.mode === 'play') winGame();
                    break;
                }
            }
        }
        S.touchingKeys = nowKeys;
        if (p.walking && p.anim % 12 === 0) Snd.play('step');
        if (p.mode === 'ladder' && (held.up || held.down) && p.anim % 10 === 0) Snd.play('climb');
    }

    function winGame() {
        S.mode = 'win'; S.timer = 0;
        addScore(5000 + Math.floor(S.goldTime / 60) * 100);
        Snd.play('gold');
        try { localStorage.removeItem('booty-ship-save'); } catch (e) {}
        S.save = null;
    }

    function updateFx() {
        for (const q of S.parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.05; q.life--; }
        S.parts = S.parts.filter(q => q.life > 0);
        for (const f of S.floats) { f.y -= 0.4; f.life--; }
        S.floats = S.floats.filter(f => f.life > 0);
        if (S.shake > 0) S.shake--;
        if (S.msgT > 0) S.msgT--;
        if (S.banner && --S.banner.t <= 0) S.banner = null;
    }

    function update() {
        S.frame++;
        S.timer++;
        const m = S.mode;
        if (m === 'play' || m === 'dead') {
            E.stepWorld(S.w, S.p);
            E.stepEnemies(S.w);
        }
        if (m === 'play') {
            S.playFrames++;
            const inp = { left: held.left, right: held.right, up: held.up, down: held.down, jump: jumpQueued };
            jumpQueued = false;
            const upEdge = held.up && !S.prevUp;
            S.prevUp = held.up;
            const door = upEdge ? E.portalAt(S.w, S.p) : null;
            if (door && door.to) { goThrough(door); updateFx(); return; }
            if (door && !door.to && !S.msgT) flash('THIS DOOR ONLY OPENS FROM THE OTHER SIDE', 90);
            const ev = [];
            E.stepPlayer(S.w, S.p, inp, ev);
            handleEvents(ev);
            if (S.mode === 'play') {
                if (S.invuln > 0) S.invuln--;
                else if (!S.god) { const e = E.enemyHit(S.w, S.p); if (e) killPlayer(e.kind); }
            }
            for (const b of S.bombs) {
                b.t--;
                if (b.t > 0 && b.t % 8 === 0) Snd.play('fuse');
                if (b.t === 0) {
                    Snd.play('boom'); S.shake = 14;
                    burst(b.x + 4, b.y + 4, ['#FFFF00', '#FF8C00', '#FF2020', '#FFFFFF'], 40, 1.8);
                    const dx = (S.p.x + 4) - (b.x + 4), dy = (S.p.y + 8) - (b.y + 4);
                    if (dx * dx + dy * dy < 16 * 16 && S.mode === 'play' && !S.god) killPlayer('boom');
                }
            }
            S.bombs = S.bombs.filter(b => b.t > -20);
            if (S.gold && S.mode === 'play') {
                S.goldTime--;
                if (S.goldTime % 60 === 0 && S.goldTime <= 10 * 60) Snd.play('tick');
                if (S.goldTime <= 0) { S.goldTime = GOLD_TIME; killPlayer('time'); }
            }
        } else if (m === 'trans') {
            if (S.timer === 12) finishTransition();
            if (S.timer >= 24) { S.mode = 'play'; S.timer = 0; S.trans = null; }
        } else if (m === 'dead') {
            if (S.timer > 80) {
                S.lives--;
                if (S.lives <= 0) { S.mode = 'gameover'; S.timer = 0; }
                else {
                    E.resetKeys(S.w); S.held = 0; S.touchingKeys = new Set();
                    S.p = E.newPlayer(S.w, S.entry); S.invuln = 120; S.mode = 'play'; S.bombs = []; S.prevUp = true;
                }
            }
        }
        updateFx();
    }

    // ---------- drawing: tiles ----------
    function shade(hex, f) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
        return `rgb(${m(r)},${m(g)},${m(b)})`;
    }

    function drawFloorTile(x, y, th, c) {
        const g = ctx;
        g.fillStyle = th.floor; g.fillRect(x, y, 8, 4);
        g.fillStyle = th.floorHi; g.fillRect(x, y, 8, 1);
        g.fillStyle = th.floorLo; g.fillRect(x, y + 3, 8, 1);
        if (c % 2 === 0) g.fillRect(x, y + 1, 1, 2);
        const truss = [[0, 4], [1, 5], [2, 6], [3, 7], [7, 4], [6, 5], [5, 6], [4, 7]];
        for (const [i, j] of truss) g.fillRect(x + i, y + j, 1, 1);
    }

    function drawWallTile(x, y, th, c, r) {
        const g = ctx;
        g.fillStyle = th.wall; g.fillRect(x, y, 8, 8);
        g.fillStyle = th.wallHi; g.fillRect(x, y, 8, 1); g.fillRect(x, y + 4, 8, 1);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        const o = (r % 2) ? 2 : 6;
        g.fillRect(x + o, y + 1, 1, 3); g.fillRect(x + ((o + 4) % 8), y + 5, 1, 3);
        g.fillRect(x, y + 3, 8, 1); g.fillRect(x, y + 7, 8, 1);
    }

    function drawLadderTile(x, y, th, through) {
        const g = ctx;
        g.fillStyle = th.ladder;
        g.fillRect(x + 1, y, 1, 8); g.fillRect(x + 6, y, 1, 8);
        g.fillRect(x + 1, y + 2, 6, 1); if (!through) g.fillRect(x + 1, y + 6, 6, 1);
        g.fillStyle = shade(th.ladder, -0.45);
        g.fillRect(x + 2, y + 3, 4, 1); if (!through) g.fillRect(x + 2, y + 7, 4, 1);
    }

    function drawDoorTile(x, y, n, top) {
        const g = ctx, col = KEYCOL[n];
        g.fillStyle = '#5A2A0A'; g.fillRect(x, y, 8, 8);
        g.fillStyle = '#8B4A1C'; g.fillRect(x + 1, y + (top ? 1 : 0), 6, top ? 7 : 7);
        g.fillStyle = col;
        g.fillRect(x, y, 1, 8); g.fillRect(x + 7, y, 1, 8);
        if (top) { g.fillRect(x, y, 8, 1); g.fillStyle = '#000'; g.fillRect(x + 2, y + 2, 5, 7); digit(x + 3, y + 3, n, col); }
        else { g.fillStyle = '#3A1A04'; g.fillRect(x + 1, y + 3, 6, 1); g.fillStyle = col; g.fillRect(x + 5, y + 1, 1, 1); g.fillRect(x, y + 7, 8, 1); }
    }

    // doors in the back wall that lead to other holds
    function drawPortal(d, th) {
        const g = ctx, x = d.c * T, y = (d.r - 1) * T;
        g.fillStyle = shade(th.wall, -0.3); g.fillRect(x - 1, y, 10, 16);
        if (d.to) {
            g.fillStyle = '#000'; g.fillRect(x, y + 1, 8, 15);
            g.fillStyle = th.ladder;
            g.fillRect(x + 1, y, 6, 1); g.fillRect(x - 1, y + 1, 1, 15); g.fillRect(x + 8, y + 1, 1, 15);
            g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 7, y + 1, 1, 1);
            if (d.to < 10) digit(x + 3, y + 3, d.to, '#FFFF00');
            else { digit(x + 1, y + 3, Math.floor(d.to / 10), '#FFFF00'); digit(x + 4, y + 3, d.to % 10, '#FFFF00'); }
            g.fillStyle = '#505050'; g.fillRect(x + 3, y + 10, 2, 1); g.fillRect(x + 2, y + 11, 4, 1);
        } else {
            g.fillStyle = '#5A2A0A'; g.fillRect(x, y + 1, 8, 15);
            g.fillStyle = '#8B4A1C'; for (let j = 2; j < 16; j += 3) g.fillRect(x, y + j, 8, 1);
            g.fillStyle = '#FF2020';
            for (let i = 0; i < 8; i++) { g.fillRect(x + i, y + 4 + i, 1, 1); g.fillRect(x + 7 - i, y + 4 + i, 1, 1); }
        }
    }

    function buildStatic() {
        if (!S.staticLayer) { S.staticLayer = document.createElement('canvas'); S.staticLayer.width = W; S.staticLayer.height = PLAY_H; }
        const th = LEVELS[S.room].theme, w = S.w;
        const prev = ctx;
        ctx = S.staticLayer.getContext('2d');
        ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, PLAY_H);
        ctx.fillStyle = th.bg === '#000000' ? '#0C0C1C' : shade(th.bg, -0.3);
        for (let x = 4; x < W; x += 16) ctx.fillRect(x, 0, 1, PLAY_H);
        for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
            const ch = E.tileAt(w, c, r), x = c * T, y = r * T;
            switch (ch) {
                case '#': drawWallTile(x, y, th, c, r); break;
                case '=': drawFloorTile(x, y, th, c); break;
                case 'H': drawLadderTile(x, y, th, false); break;
                case '+': drawFloorTile(x, y, th, c); drawLadderTile(x, y, th, true); break;
                case 'o': ctx.drawImage(SPR.barrel, x, y); break;
                case 'O': ctx.drawImage(SPR.porthole, x, y); break;
                case 'L': ctx.drawImage(SPR.lantern, x, y); break;
                case 'K': ctx.drawImage(SPR.cannon, x, y); break;
                case 'z': ctx.drawImage(SPR.flag, x, y); break;
                default:
                    if (ch >= '1' && ch <= '9') drawDoorTile(x, y, +ch, E.tileAt(w, c, r - 1) !== ch);
            }
        }
        for (const d of w.portals) drawPortal(d, th);
        ctx = prev;
        S.staticDirty = false;
    }

    // ---------- drawing: dynamic ----------
    function bootySprite(c, r) { return SPR.booty[(c * 7 + r * 13) % SPR.booty.length]; }

    function drawDynamicTiles() {
        const w = S.w, th = LEVELS[S.room].theme, g = ctx;
        for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
            const ch = E.tileAt(w, c, r), x = c * T, y = r * T;
            if (ch === '$' || ch === '!') {
                g.drawImage(bootySprite(c, r), x, y);
                if ((S.frame + c * 37 + r * 11) % 140 < 6) { g.fillStyle = '#FFFFFF'; g.fillRect(x + 2 + (c % 4), y + 2, 1, 1); }
            } else if (ch >= 'a' && ch <= 'i') {
                const n = ch.charCodeAt(0) - 96, bob = Math.round(Math.sin(S.frame * 0.08 + c) * 1);
                g.drawImage(SPR.keys[n], x, y + bob);
                digit(x + 5, y - 1 + bob, n, KEYCOL[n]);
            } else if (ch === '-') {
                const k = (w.crumble[r * E.COLS + c] || 0) / E.CRUMBLE_TIME;
                for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
                    const hsh = ((c * 31 + r * 17 + i * 7 + j * 13) * 2654435761 >>> 0) % 1000 / 1000;
                    if (hsh < k) continue;
                    g.fillStyle = j === 0 ? '#FFFFFF' : ((i + j + c) % 3 === 0 ? shade(th.crumble, -0.4) : th.crumble);
                    g.fillRect(x + i, y + j, 1, 1);
                }
            } else if (ch === '~') {
                g.fillStyle = '#0000A8'; g.fillRect(x, y + 3, 8, 5);
                g.fillStyle = '#00D7D7';
                for (let i = 0; i < 8; i++) { const h = Math.round(Math.sin((x + i) * 0.5 + S.frame * 0.08) * 1.2); g.fillRect(x + i, y + 3 + h, 1, 1); }
            } else if (ch === 'X') {
                if (E.tileAt(w, c, r - 1) === 'X') continue;
                drawExit(x, y);
            } else if (ch === 'G' && S.gold && S.gold.room === S.room) {
                const glow = 0.5 + Math.sin(S.frame * 0.15) * 0.5;
                g.fillStyle = `rgba(255,220,0,${0.25 + glow * 0.3})`;
                g.beginPath(); g.arc(x + 4, y + 4, 9 + glow * 2, 0, Math.PI * 2); g.fill();
                g.drawImage(SPR.gold, x - 2, y + 1);
            }
        }
    }

    function drawRegrow() {
        const th = LEVELS[S.room].theme;
        for (const g of S.w.regrow) {
            const left = g.at - S.w.t;
            if (left > 60 || Math.floor(S.frame / 4) % 2) continue;
            ctx.fillStyle = th.crumble;
            for (let i = 0; i < 8; i += 2) ctx.fillRect(g.c * T + i, g.r * T, 1, 1);
        }
    }

    function drawExit(x, y) {
        const g = ctx;
        g.fillStyle = '#202020'; g.fillRect(x - 1, y, 10, 16);
        if (S.exitOpen) {
            const f = Math.floor(S.frame / 8) % 2;
            g.fillStyle = f ? '#FFFF00' : '#FFFFFF';
            g.fillRect(x - 1, y, 10, 1); g.fillRect(x - 1, y, 1, 16); g.fillRect(x + 8, y, 1, 16);
            g.fillStyle = '#000'; g.fillRect(x, y + 1, 8, 15);
            g.fillStyle = f ? '#FFFF00' : '#FF8C00';
            g.fillRect(x + 3, y + 3, 2, 6); g.fillRect(x + 2, y + 4, 4, 1); g.fillRect(x + 1, y + 5, 6, 1);
        } else {
            g.fillStyle = '#5A5A5A'; g.fillRect(x, y + 1, 8, 15);
            g.fillStyle = '#A8A8A8';
            for (let i = 1; i < 8; i += 2) g.fillRect(x + i, y + 1, 1, 15);
            g.fillStyle = '#FFFF00'; g.fillRect(x + 2, y + 8, 4, 4);
            g.fillStyle = '#000'; g.fillRect(x + 3, y + 10, 2, 2);
        }
    }

    function drawLifts() {
        const g = ctx;
        for (const L of S.w.lifts) {
            const x = Math.round(L.x), y = Math.round(L.y), w = L.w;
            if (L.dy) {
                const top = Math.min(L.y0, L.y0 + L.dy) - 6;
                g.fillStyle = '#C9A033';
                g.fillRect(x + 1, top, 1, y - top); g.fillRect(x + w - 2, top, 1, y - top);
                g.fillStyle = '#A8A8A8'; g.fillRect(x, y, w, 4);
                g.fillStyle = '#FFFFFF'; g.fillRect(x, y, w, 1);
                g.fillStyle = '#505050'; g.fillRect(x, y + 3, w, 1);
                for (let i = 2; i < w; i += 4) g.fillRect(x + i, y + 1, 1, 1);
            } else {
                g.fillStyle = '#B8672E'; g.fillRect(x, y, w, 4);
                g.fillStyle = '#E8A060'; g.fillRect(x, y, w, 1);
                g.fillStyle = '#5A2A0A'; g.fillRect(x, y + 3, w, 1);
                for (let i = 3; i < w; i += 6) g.fillRect(x + i, y + 1, 1, 2);
                g.fillStyle = '#C9A033'; g.fillRect(x + 1, y, 1, 4); g.fillRect(x + w - 2, y, 1, 4);
            }
        }
    }

    function drawEnemies() {
        const g = ctx;
        for (const e of S.w.enemies) {
            const side = e.dir >= 0 ? 0 : 1, f = Math.floor(e.anim / 10) % 2;
            const x = Math.round(e.x), y = Math.round(e.y);
            if (e.kind === 'pirate') g.drawImage((f ? SPR.pirateB : SPR.pirateA)[side], x, y);
            else if (e.kind === 'rat') g.drawImage((f ? SPR.ratB : SPR.ratA)[side], x, y);
            else g.drawImage((Math.floor(e.anim / 6) % 2 ? SPR.parB : SPR.parA)[side], x, y);
        }
    }

    function drawPlayer() {
        const p = S.p, g = ctx;
        const x = Math.round(p.x), y = Math.round(p.y), side = p.face >= 0 ? 0 : 1;
        if (S.mode === 'dead') { g.drawImage(SPR.pDead[Math.floor(S.timer / 4) % 2], x, y); return; }
        if (S.invuln > 0 && Math.floor(S.invuln / 4) % 2) return;
        let spr;
        if (p.mode === 'ladder') spr = SPR.pClimb[Math.floor(p.anim / 6) % 2];
        else if (p.mode === 'air') spr = SPR.pJump[side];
        else if (p.walking) spr = [SPR.pWalkA, SPR.pStand, SPR.pWalkB, SPR.pStand][Math.floor(p.anim / 5) % 4][side];
        else spr = SPR.pStand[side];
        g.drawImage(spr, x, y);
    }

    function drawFx() {
        const g = ctx;
        for (const b of S.bombs) {
            if (b.t > 0) { if (Math.floor(b.t / 4) % 2) g.drawImage(SPR.bomb, b.x, b.y); else { g.fillStyle = '#FF2020'; g.fillRect(b.x + 2, b.y + 3, 4, 5); } }
            else {
                const k = -b.t / 20;
                g.fillStyle = `rgba(255,${Math.round(220 - k * 200)},0,${1 - k})`;
                g.beginPath(); g.arc(b.x + 4, b.y + 4, 6 + k * 12, 0, Math.PI * 2); g.fill();
            }
        }
        for (const q of S.parts) { g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
        for (const f of S.floats) txt(f.s, f.x, f.y, f.col, { align: 'center', shadow: '#000' });
    }

    function drawHUD() {
        const g = ctx, th = LEVELS[S.room].theme;
        g.fillStyle = '#000'; g.fillRect(0, PLAY_H, W, H - PLAY_H);
        g.fillStyle = th.ladder; g.fillRect(0, PLAY_H, W, 1);
        for (let i = 0; i < Math.min(S.lives, 5); i++) g.drawImage(SPR.life, 2 + i * 7, PLAY_H + 3);
        if (S.lives > 5) txt('+', 37, PLAY_H + 3, '#FFFFFF');
        // key slot
        g.fillStyle = '#202020'; g.fillRect(46, PLAY_H + 2, 22, 10);
        if (S.held) { g.drawImage(SPR.keys[S.held], 47, PLAY_H + 2); txt(S.held, 58, PLAY_H + 3, KEYCOL[S.held]); }
        else txt('-', 54, PLAY_H + 3, '#505050');
        txt('BOOTY', 74, PLAY_H + 3, '#00FFFF');
        txt(`${String(S.booty).padStart(3, '0')}/${TOTAL}`, 116, PLAY_H + 3, '#FFFFFF');
        if (S.gold) {
            const s = Math.ceil(S.goldTime / 60);
            txt('TIME', 182, PLAY_H + 3, '#FF2020');
            txt(String(s).padStart(2, '0'), 218, PLAY_H + 3, s <= 10 && Math.floor(S.frame / 15) % 2 ? '#FF2020' : '#FFFF00');
        } else {
            const left = bootyIn(S.w);
            txt('HERE', 182, PLAY_H + 3, '#FF50FF');
            txt(String(left), 218, PLAY_H + 3, left ? '#FFFFFF' : '#00FF00');
        }
        txt('TAB', 232, PLAY_H + 3, '#303060');
        const name = `${S.room + 1} ${LEVELS[S.room].name}`;
        txt(name.slice(0, 22), 3, PLAY_H + 14, '#FFFF00');
        txt(String(S.score).padStart(6, '0'), 253, PLAY_H + 14, '#FFFFFF', { align: 'right' });
    }

    // ship map: 5 holds per deck, 4 decks
    const MAP_CELL = { w: 46, h: 28, x0: 13, y0: 25, gx: 2, gy: 6 };
    function cellRect(i) {
        const c = i % 5, r = Math.floor(i / 5);
        return [MAP_CELL.x0 + c * (MAP_CELL.w + MAP_CELL.gx), MAP_CELL.y0 + r * (MAP_CELL.h + MAP_CELL.gy), MAP_CELL.w, MAP_CELL.h];
    }
    function drawMap() {
        const g = ctx;
        g.fillStyle = 'rgba(0,0,20,0.94)'; g.fillRect(0, 0, W, PLAY_H);
        center('THE SHIP', 6, '#FFFF00');
        center(`${S.booty} OF ${TOTAL} PIECES FOUND`, 15, '#00FFFF');
        // door links
        LEVELS.forEach((d, i) => d.links.forEach(L => {
            if (!L.to) return;
            const j = L.to - 1;
            if (!S.visited[i] && !S.visited[j]) return;
            const [ax, ay, aw, ah] = cellRect(i), [bx, by, bw, bh] = cellRect(j);
            const x1 = ax + aw / 2, y1 = ay + ah / 2, x2 = bx + bw / 2, y2 = by + bh / 2;
            const back = LEVELS[j].links.find(l => l.to === i + 1);
            g.strokeStyle = back ? '#505080' : '#FF5050'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x1 + 0.5, y1 + 0.5); g.lineTo(x2 + 0.5, y2 + 0.5); g.stroke();
            if (!back) { g.fillStyle = '#FF5050'; g.fillRect(Math.round(x1 * 0.3 + x2 * 0.7) - 1, Math.round(y1 * 0.3 + y2 * 0.7) - 1, 3, 3); }
        }));
        LEVELS.forEach((d, i) => {
            const [x, y, w, h] = cellRect(i);
            const here = i === S.room, seen = S.visited[i];
            const left = S.worlds ? bootyIn(S.worlds[i]) : 0;
            g.fillStyle = seen ? d.theme.bg === '#000000' ? '#101018' : d.theme.bg : '#080808';
            g.fillRect(x, y, w, h);
            g.fillStyle = here && Math.floor(S.frame / 10) % 2 ? '#FFFFFF' : seen ? d.theme.floor : '#303030';
            g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
            txt(String(i + 1), x + 3, y + 3, seen ? '#FFFFFF' : '#505050');
            if (seen) {
                if (left) { g.drawImage(SPR.booty[i % SPR.booty.length], x + w - 20, y + h - 11); txt(String(left), x + w - 10, y + h - 10, '#FFFF00'); }
                else txt('OK', x + w - 19, y + h - 10, '#00FF00');
            } else txt('?', x + w - 10, y + h - 10, '#505050');
            if (S.gold && S.gold.room === i && Math.floor(S.frame / 8) % 2) g.drawImage(SPR.gold, x + 3, y + h - 9);
            if (here) g.drawImage(SPR.life, x + w - 9, y + 3);
        });
        center('TAB / N  BACK TO THE GAME', 158, '#A8A8A8');
    }

    function drawGame() {
        if (S.staticDirty) buildStatic();
        ctx.drawImage(S.staticLayer, 0, 0);
        drawDynamicTiles();
        drawRegrow();
        drawLifts();
        drawEnemies();
        if (S.mode !== 'trans' || S.timer >= 12) drawPlayer();
        drawFx();
        drawHUD();
        if (S.banner && (S.mode === 'play' || S.mode === 'trans')) {
            const lines = S.banner.tip ? wrap(S.banner.tip, 30) : [];
            const hgt = 14 + lines.length * 10;
            const y = S.p.y > 84 ? 6 : PLAY_H - hgt - 6;
            ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, y - 3, W, hgt + 2);
            ctx.fillStyle = LEVELS[S.room].theme.floor; ctx.fillRect(0, y - 3, W, 1); ctx.fillRect(0, y + hgt - 2, W, 1);
            center(S.banner.title, y, '#FFFF00');
            lines.forEach((l, i) => center(l, y + 12 + i * 10, '#00FF00'));
        } else if (S.msgT > 0 && S.mode === 'play') {
            const y = S.p.y > 90 ? 20 : 120;
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, y - 3, W, 14);
            center(S.msg, y, '#FFFF00');
        }
        if (S.mode === 'trans') {
            const k = S.timer < 12 ? S.timer / 12 : (24 - S.timer) / 12;
            ctx.fillStyle = '#000';
            const bar = Math.round(k * PLAY_H / 2);
            ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, PLAY_H - bar, W, bar);
        }
        if (S.mode === 'dead') {
            const why = { pirate: 'A PIRATE GOT YOU!', rat: 'BITTEN BY A RAT!', parrot: 'THE PARROT GOT YOU!', fall: 'YOU FELL TOO FAR!',
                abyss: 'OVERBOARD!', boom: 'BOOBY TRAP!', time: 'OUT OF TIME!', restart: 'BACK TO THE DOOR...' }[S.deathCause] || 'OUCH!';
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 70, W, 22);
            center(why, 74, '#FF2020'); center(`${S.lives - 1} LIVES LEFT`, 84, '#FFFFFF');
        }
        if (S.mode === 'map') drawMap();
        if (S.mode === 'paused') {
            ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, PLAY_H);
            center('PAUSED', 40, '#FFFF00', { size: 2 });
            center('P  CONTINUE', 74, '#FFFFFF'); center('TAB  SHIP MAP', 86, '#FFFFFF');
            center('R  BACK TO THE DOOR (-1 LIFE)', 98, '#FFFFFF');
            center('M  MUSIC ON/OFF', 110, '#FFFFFF'); center('Q  SAVE AND QUIT', 122, '#FFFFFF');
        }
        if (S.mode === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, PLAY_H);
            center('GAME OVER', 46, '#FF2020', { size: 2 });
            center(`SCORE ${S.score}   BOOTY ${S.booty}/${TOTAL}`, 80, '#FFFFFF');
            center('SPACE: CONTINUE FROM THE', 100, '#FFFF00');
            center('LAST DOOR WITH 5 LIVES', 110, '#FFFF00');
            center('Q: TITLE SCREEN', 126, '#A8A8A8');
        }
    }

    // ---------- title / intro / win ----------
    const BIG = {
        B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    };
    function bigWord(word, cx, y, px) {
        const lw = 5 * px, gap = px, total = word.length * lw + (word.length - 1) * gap;
        let x = cx - total / 2;
        for (const ch of word) {
            const L = BIG[ch];
            for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (L[j][i] === '1') {
                ctx.fillStyle = '#D70000'; ctx.fillRect(x + i * px + 2, y + j * px + 2, px, px);
                ctx.fillStyle = j < 2 ? '#FFFFFF' : j < 4 ? '#FFFF00' : '#FF8C00';
                ctx.fillRect(x + i * px, y + j * px, px, px);
                ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + i * px, y + j * px + px - 1, px, 1);
            }
            x += lw + gap;
        }
    }

    function drawShip(x, y, f) {
        const g = ctx, bob = Math.round(Math.sin(f * 0.05) * 1.5);
        y += bob;
        g.fillStyle = '#7A3E12';
        g.beginPath(); g.moveTo(x - 34, y); g.lineTo(x + 38, y); g.lineTo(x + 30, y + 12); g.lineTo(x - 28, y + 12); g.closePath(); g.fill();
        g.fillStyle = '#B8672E'; g.fillRect(x - 32, y, 68, 2);
        g.fillStyle = '#FFFF00'; for (let i = -24; i < 30; i += 10) g.fillRect(x + i, y + 5, 3, 3);
        g.fillStyle = '#5A2A0A'; g.fillRect(x - 12, y - 40, 2, 40); g.fillRect(x + 12, y - 46, 2, 46);
        g.fillStyle = '#E8E8E8';
        g.fillRect(x - 24, y - 34, 26, 12); g.fillRect(x - 22, y - 20, 22, 10);
        g.fillRect(x + 2, y - 40, 24, 14); g.fillRect(x + 4, y - 24, 20, 12);
        g.fillStyle = '#000'; g.fillRect(x + 14, y - 54, 10, 7);
        g.fillStyle = '#FFF'; g.fillRect(x + 17, y - 53, 4, 3); g.fillRect(x + 16, y - 50, 1, 1); g.fillRect(x + 21, y - 50, 1, 1);
    }

    function drawSea(y, f) {
        ctx.fillStyle = '#0000A8'; ctx.fillRect(0, y, W, H - y);
        ctx.fillStyle = '#00D7D7';
        for (let x = 0; x < W; x += 2) { const h = Math.round(Math.sin(x * 0.12 + f * 0.05) * 1.5); ctx.fillRect(x, y + h, 2, 1); }
        ctx.fillStyle = '#2020FF';
        for (let x = 0; x < W; x += 3) { const h = Math.round(Math.sin(x * 0.2 - f * 0.04) * 1.5); ctx.fillRect(x, y + 7 + h, 2, 1); }
    }

    const STARS = Array.from({ length: 40 }, (_, i) => [(i * 73) % W, (i * 37) % 90, i % 3]);

    function drawTitle() {
        const f = S.frame;
        ctx.fillStyle = '#000014'; ctx.fillRect(0, 0, W, H);
        for (const [x, y, k] of STARS) if ((f + x) % 90 > 4) { ctx.fillStyle = k ? '#A8A8A8' : '#FFFFFF'; ctx.fillRect(x, y, 1, 1); }
        ctx.fillStyle = '#FFFFC0'; ctx.beginPath(); ctx.arc(214, 84, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000014'; ctx.beginPath(); ctx.arc(219, 81, 9, 0, Math.PI * 2); ctx.fill();
        bigWord('BOOTY', W / 2, 12, 5);
        drawShip(64 + Math.sin(f * 0.01) * 10, 108, f);
        drawSea(118, f);
        const px = ((f * 0.4) % (W + 40)) - 20;
        ctx.drawImage(SPR.parA[0], Math.round(px), 66 + Math.round(Math.sin(f * 0.1) * 3));
        center(`${TOTAL} TREASURES. ${LEVELS.length} HOLDS.`, 54, '#00FFFF');
        if (Math.floor(f / 30) % 2) center('PRESS SPACE TO SET SAIL', 132, '#FFFF00');
        if (S.save && S.save.booty > 0) center(`C  CONTINUE (${S.save.booty}/${TOTAL} FOUND)`, 144, '#00FF00');
        center('ARROWS/WASD MOVE + CLIMB', 158, '#A8A8A8');
        center('SPACE JUMP  TAB MAP  M MUSIC', 168, '#A8A8A8');
        if (S.hi) center(`HI-SCORE ${String(S.hi).padStart(6, '0')}`, 181, '#FF50FF');
    }

    function drawIntro() {
        const f = S.frame;
        ctx.fillStyle = '#000014'; ctx.fillRect(0, 0, W, H);
        for (const [x, y, k] of STARS) if (y < 40 && (f + x) % 90 > 4) { ctx.fillStyle = k ? '#A8A8A8' : '#FFFFFF'; ctx.fillRect(x, y, 1, 1); }
        center('THE SHIP', 8, '#FFFF00', { size: 2, shadow: '#D70000' });
        const lines = [
            [`${LEVELS.length} HOLDS. ${TOTAL} PIECES OF BOOTY.`, '#FFFFFF'],
            ['', ''],
            ['DOORS IN THE BACK WALL LEAD TO', '#00FFFF'], ['OTHER HOLDS: STAND IN FRONT', '#00FFFF'], ['AND PRESS UP.', '#00FFFF'],
            ['', ''],
            ['A KEY OPENS THE DOOR WITH ITS', '#00FF00'], ['NUMBER. ONE KEY AT A TIME.', '#00FF00'], ['KEYS NEVER LEAVE THEIR HOLD.', '#00FF00'],
            ['', ''],
            ['RED DOORS ONLY OPEN ONE WAY.', '#FF5050'],
            ['FIND THEM ALL, THEN THE', '#FFFF00'], ['GOLDEN KEY. TAB = SHIP MAP.', '#FFFF00'],
        ];
        lines.forEach(([l, c], i) => l && center(l, 34 + i * 10, c));
        if (S.timer > 20 && Math.floor(f / 25) % 2) center('PRESS SPACE', 176, '#FF50FF');
    }

    function drawWin() {
        const f = S.frame;
        ctx.fillStyle = '#000014'; ctx.fillRect(0, 0, W, H);
        for (const [x, y] of STARS) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, 1, 1); }
        if (f % 20 === 0) burst(30 + Math.random() * 196, 30 + Math.random() * 60, ['#FFFF00', '#FF50FF', '#00FFFF', '#FF2020', '#00FF00'], 30, 1.5);
        for (const q of S.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
        center('YO HO HO!', 24, '#FFFF00', { size: 2, shadow: '#D70000' });
        center('YOU FOUND THE GOLDEN KEY', 52, '#FFFFFF');
        center(`BOOTY ${S.booty} / ${TOTAL}`, 72, '#00FFFF');
        center(`SCORE ${S.score}`, 86, '#FFFF00');
        const secs = Math.floor(S.playFrames / 60);
        center(`TIME AT SEA ${Math.floor(secs / 60)}M ${String(secs % 60).padStart(2, '0')}S`, 100, '#00FF00');
        ctx.drawImage(SPR.gold, W / 2 - 6, 116);
        drawSea(150, f);
        if (S.timer > 90 && Math.floor(f / 30) % 2) center('PRESS SPACE', 132, '#FF50FF');
    }

    // ---------- main loop ----------
    function render() {
        ctx = bctx;
        switch (S.mode) {
            case 'title': drawTitle(); break;
            case 'intro': drawIntro(); break;
            case 'win': drawWin(); break;
            default: drawGame();
        }
        const sx = S.shake ? Math.round((Math.random() - 0.5) * 3) : 0, sy = S.shake ? Math.round((Math.random() - 0.5) * 3) : 0;
        sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
        sctx.drawImage(buf, 0, 0, W, H, sx * SC, sy * SC, W * SC, H * SC);
        flushText();
    }

    const STEP = 1000 / 60;
    let last = performance.now(), acc = 0;
    function frame(now) {
        acc += Math.min(now - last, 250);
        last = now;
        let steps = 0;
        while (acc >= STEP && steps < 5) {
            if (API.manual) { acc = 0; break; }
            if (S.mode !== 'paused') update(); else S.frame++;
            acc -= STEP; steps++;
        }
        if (steps === 5) acc = 0;
        render();
        requestAnimationFrame(frame);
    }

    // Test hook used by the automated playthrough (harmless for players)
    const API = window.BOOTY = {
        S, newGame, press, held, LEVELS, manual: false,
        goto(i, door) {
            const d = S.worlds[i].portals[door || 0];
            setRoom(i, S.worlds[i].start && !door ? S.worlds[i].start : { x: d.x, y: d.y });
            S.visited[i] = true; S.mode = 'play'; S.banner = null;
        },
        tick(inp) {
            held.left = !!inp.left; held.right = !!inp.right; held.up = !!inp.up; held.down = !!inp.down;
            if (inp.jump) jumpQueued = true;
            update();
        },
    };

    const start = () => requestAnimationFrame(t => { last = t; frame(t); });
    if (document.fonts && document.fonts.load) {
        Promise.race([document.fonts.load(`8px ${FONT}`), new Promise(r => setTimeout(r, 1500))]).then(start, start);
    } else start();
})();
