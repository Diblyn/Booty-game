/* ============================================================
   BOOTY engine: tiles, physics, lifts, enemies.
   No DOM here, so the same code runs in the browser and in
   tools/check-levels.js (node) to prove every hold is solvable.
   ============================================================ */
(function (root) {
    'use strict';

    const T = 8;            // tile size (px)
    const COLS = 32;        // map width in tiles
    const ROWS = 21;        // map height in tiles (HUD lives below)

    const WALK = 1;         // px per frame
    const JUMP_VY = -2.5;   // fixed arc jump, like the 8-bit original
    const GRAV = 0.2;
    const MAX_FALL = 3;
    const CLIMB = 1;
    const LETHAL_FALL = 64; // falling more than 8 tiles kills you
    const CRUMBLE_TIME = 30;
    const REGROW_TIME = 300;  // crumbled planks come back after 5 seconds

    const isSolid = ch => ch === '#' || ch === '=' || ch === '-' || (ch >= '1' && ch <= '9');
    const isLadder = ch => ch === 'H' || ch === '+';
    const isTop = ch => isSolid(ch) || ch === '+';
    const TOUCHABLE = '$!abcdefghiXG';

    function parseLevel(def, opts) {
        opts = opts || {};
        if (!def.map || def.map.length !== ROWS) {
            throw new Error(`"${def.name}": map must have ${ROWS} rows (has ${def.map ? def.map.length : 0})`);
        }
        def.map.forEach((row, r) => {
            if (row.length !== COLS) throw new Error(`"${def.name}": row ${r} has ${row.length} chars, needs ${COLS}`);
        });

        const tiles = def.map.join('').split('');
        const w = {
            def, tiles, t: 0,
            start: null, enemies: [], lifts: [],
            crumble: {}, crumbleEnabled: opts.crumble !== false, regrow: [],
            boot: 0, golden: null,
        };

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const i = r * COLS + c;
                const ch = tiles[i];
                if (ch === '@') { w.start = { x: c * T, y: (r + 1) * T - 16 }; tiles[i] = '.'; }
                else if (ch === 'P') { w.enemies.push({ kind: 'pirate', x: c * T, y: (r + 1) * T - 16, w: 8, h: 16, dir: c < 16 ? 1 : -1, spd: 0.5, anim: 0 }); tiles[i] = '.'; }
                else if (ch === 'R') { w.enemies.push({ kind: 'rat', x: c * T, y: r * T, w: 8, h: 8, dir: c < 16 ? 1 : -1, spd: 0.9, anim: 0 }); tiles[i] = '.'; }
                else if (ch === 'V') { w.enemies.push({ kind: 'parrot', x: c * T, y: r * T, baseY: r * T, w: 8, h: 8, dir: c < 16 ? 1 : -1, spd: 0.7, ph: c * 0.7, anim: 0 }); tiles[i] = '.'; }
                else if (ch === 'G') { w.golden = { c, r }; }
                else if (ch === '$' || ch === '!') w.boot++;
            }
        }
        if (!w.start) throw new Error(`"${def.name}": no @ start position`);

        (def.lifts || []).forEach((L, i) => {
            const dx = L.dx || 0, dy = L.dy || 0, spd = L.spd || 0.5;
            const range = Math.max(Math.abs(dx), Math.abs(dy)) * T;
            const lift = {
                i, x0: L.x * T, y0: L.y * T, w: (L.w || 2) * T,
                dx: dx * T, dy: dy * T, spd, phase: L.phase || 0,
                period: Math.round(2 * range / spd),
                x: 0, y: 0, px: 0, py: 0, mx: 0, my: 0,
            };
            w.lifts.push(lift);
        });
        setTime(w, 0);
        return w;
    }

    function liftPos(L, t) {
        if (!L.period) return [L.x0, L.y0];
        const u = ((t / L.period) + L.phase) % 1;
        const k = u < 0.5 ? u * 2 : 2 - u * 2;
        return [L.x0 + L.dx * k, L.y0 + L.dy * k];
    }

    function setTime(w, t) {
        w.t = t;
        for (const L of w.lifts) {
            const [x, y] = liftPos(L, t);
            const [px, py] = liftPos(L, t - 1);
            L.x = x; L.y = y; L.px = px; L.py = py; L.mx = x - px; L.my = y - py;
        }
    }

    function stepWorld(w, p) {
        setTime(w, w.t + 1);
        if (!w.regrow.length) return;
        w.regrow = w.regrow.filter(g => {
            if (w.t < g.at) return true;
            if (p && !p.dead && p.x < g.c * T + T && p.x + 8 > g.c * T && p.y < g.r * T + T && p.y + 16 > g.r * T) { g.at = w.t + 30; return true; }
            setTile(w, g.c, g.r, '-');
            delete w.crumble[g.r * COLS + g.c];
            return false;
        });
    }

    function tileAt(w, c, r) {
        if (c < 0 || c >= COLS || r < 0) return '#';
        if (r >= ROWS) return '.';
        return w.tiles[r * COLS + c];
    }
    function setTile(w, c, r, ch) { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) w.tiles[r * COLS + c] = ch; }

    function span(x) { return [Math.floor(x / T), Math.floor((x + T - 0.001) / T)]; }

    function rowHas(w, x, r, test) {
        const [a, b] = span(x);
        for (let c = a; c <= b; c++) if (test(tileAt(w, c, r))) return true;
        return false;
    }

    function aligned(v) { return Math.abs(v / T - Math.round(v / T)) < 0.01; }

    function tileSupport(w, p) {
        const feet = p.y + 16;
        if (!aligned(feet)) return false;
        return rowHas(w, p.x, Math.round(feet / T), isTop);
    }

    function overlapX(p, L) { return p.x + 8 > L.x + 0.01 && p.x < L.x + L.w - 0.01; }

    function liftSupport(w, p) {
        for (const L of w.lifts) if (overlapX(p, L) && Math.abs(p.y + 16 - L.y) < 0.05) return L.i;
        return -1;
    }

    function newPlayer(w) {
        return { x: w.start.x, y: w.start.y, vx: 0, vy: 0, mode: 'ground', face: 1, jdir: 0,
                 lift: -1, peak: w.start.y, dead: null, anim: 0, walking: false };
    }

    function moveX(w, p, dx, ev) {
        if (!dx) return false;
        let nx = p.x + dx;
        const r1 = Math.floor(p.y / T), r2 = Math.floor((p.y + 16 - 0.001) / T);
        let blocked = false;
        if (dx > 0) {
            const c = Math.floor((nx + T - 0.001) / T);
            for (let r = r1; r <= r2; r++) {
                const ch = tileAt(w, c, r);
                if (isSolid(ch)) { nx = c * T - T; blocked = true; if (ch >= '1' && ch <= '9') ev.push({ type: 'door', n: +ch, c, r }); break; }
            }
        } else {
            const c = Math.floor(nx / T);
            for (let r = r1; r <= r2; r++) {
                const ch = tileAt(w, c, r);
                if (isSolid(ch)) { nx = (c + 1) * T; blocked = true; if (ch >= '1' && ch <= '9') ev.push({ type: 'door', n: +ch, c, r }); break; }
            }
        }
        p.x = nx;
        return blocked;
    }

    function ladderCol(p) { return Math.floor((p.x + 4) / T); }

    function canGrabUp(w, p) { return isLadder(tileAt(w, ladderCol(p), Math.floor((p.y + 15) / T))); }
    function canGrabDown(w, p) { return aligned(p.y + 16) && isLadder(tileAt(w, ladderCol(p), Math.round((p.y + 16) / T))); }

    function die(p, cause, ev) { if (!p.dead) { p.dead = cause; ev.push({ type: 'die', cause }); } }

    function startFall(p) { p.mode = 'air'; p.vy = 0; p.vx = 0; p.jdir = 0; p.peak = p.y; p.lift = -1; }

    // Pick up a lift rising into the player's feet from below.
    function liftCatch(w, p) {
        for (const L of w.lifts) {
            if (!overlapX(p, L)) continue;
            const feet = p.y + 16;
            if (L.py >= feet - 0.05 && L.y < feet) { p.y = L.y - 16; p.lift = L.i; p.mode = 'ground'; p.vy = 0; p.peak = p.y; return true; }
        }
        return false;
    }

    function stepPlayer(w, p, inp, ev) {
        if (p.dead) return;
        p.walking = false;

        if (p.mode === 'ground') {
            // ride the lift
            if (p.lift >= 0) {
                const L = w.lifts[p.lift];
                if (L.my > 0 && tileSupport(w, p)) p.lift = -1;
                else { moveX(w, p, L.mx, ev); p.y = L.y - 16; }
            }

            if (inp.jump) {
                p.mode = 'air'; p.vy = JUMP_VY;
                p.jdir = inp.left ? -1 : inp.right ? 1 : 0;
                if (p.jdir) p.face = p.jdir;
                p.vx = p.jdir * WALK; p.peak = p.y; p.lift = -1;
                ev.push({ type: 'jump' });
            } else if (inp.up && canGrabUp(w, p)) {
                p.mode = 'ladder'; p.x = ladderCol(p) * T; p.y = Math.round(p.y); p.lift = -1;
            } else if (inp.down && canGrabDown(w, p)) {
                p.mode = 'ladder'; p.x = ladderCol(p) * T; p.y = Math.round(p.y); p.lift = -1;
            } else {
                const vx = inp.left ? -WALK : inp.right ? WALK : 0;
                if (vx) { p.face = Math.sign(vx); moveX(w, p, vx, ev); p.walking = true; p.anim++; }
            }

            if (p.mode === 'ground') {
                if (p.lift < 0 && liftCatch(w, p)) {
                    // a rising lift scooped us up
                } else if (tileSupport(w, p)) {
                    p.lift = -1;
                    if (w.crumbleEnabled) {
                        const r = Math.round((p.y + 16) / T);
                        const [a, b] = span(p.x);
                        for (let c = a; c <= b; c++) {
                            if (tileAt(w, c, r) === '-') {
                                const k = r * COLS + c;
                                w.crumble[k] = (w.crumble[k] || 0) + 1;
                                if (w.crumble[k] >= CRUMBLE_TIME) {
                                    setTile(w, c, r, '.');
                                    w.regrow.push({ c, r, at: w.t + REGROW_TIME });
                                    ev.push({ type: 'crumble', c, r });
                                }
                            }
                        }
                    }
                } else {
                    const li = liftSupport(w, p);
                    if (li >= 0) { p.lift = li; p.y = w.lifts[li].y - 16; }
                    else if (!liftCatch(w, p)) startFall(p);
                }
                p.peak = p.y;
            }
        } else if (p.mode === 'air') {
            p.vy = Math.min(p.vy + GRAV, MAX_FALL);
            if (moveX(w, p, p.vx, ev)) p.vx = 0;
            const oldFeet = p.y + 16;
            let ny = p.y + p.vy;
            if (p.vy > 0) {
                let landY = null, landLift = -1;
                const r = Math.ceil(oldFeet / T - 0.001);
                if (ny + 16 >= r * T && rowHas(w, p.x, r, isTop)) landY = r * T - 16;
                for (const L of w.lifts) {
                    if (!overlapX(p, L)) continue;
                    if (oldFeet <= L.py + 0.05 && ny + 16 >= L.y) {
                        const cand = L.y - 16;
                        if (landY === null || cand < landY) { landY = cand; landLift = L.i; }
                    }
                }
                if (landY !== null) {
                    p.y = landY; p.vy = 0; p.vx = 0; p.mode = 'ground'; p.lift = landLift;
                    ev.push({ type: 'land' });
                    if (p.y - p.peak > LETHAL_FALL) die(p, 'fall', ev);
                } else p.y = ny;
            } else {
                const r = Math.floor(ny / T);
                if (r < Math.floor(p.y / T) + 1 && rowHas(w, p.x, r, isSolid)) { ny = (r + 1) * T; p.vy = 0; }
                p.y = ny;
                p.peak = Math.min(p.peak, p.y);
            }
            if (p.y > ROWS * T + 8) die(p, 'abyss', ev);
        } else if (p.mode === 'ladder') {
            const col = Math.round(p.x / T);
            if (inp.up) {
                const ny = p.y - CLIMB;
                if (isLadder(tileAt(w, col, Math.floor((ny + 16) / T)))) { p.y = ny; p.anim++; }
            } else if (inp.down) {
                if (isLadder(tileAt(w, col, Math.floor((p.y + 16) / T)))) { p.y += CLIMB; p.anim++; }
            } else if (inp.left || inp.right) {
                if (aligned(p.y + 16) && rowHas(w, p.x, Math.round((p.y + 16) / T), isTop)) {
                    p.mode = 'ground'; p.peak = p.y;
                    const vx = inp.left ? -WALK : WALK;
                    p.face = Math.sign(vx); moveX(w, p, vx, ev); p.walking = true; p.anim++;
                }
            }
        }

        // things the body touches (1px inset so neighbours are not grabbed)
        const c1 = Math.floor((p.x + 1) / T), c2 = Math.floor((p.x + 7 - 0.001) / T);
        const r1 = Math.floor((p.y + 1) / T), r2 = Math.floor((p.y + 16 - 0.001) / T);
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
            const ch = tileAt(w, c, r);
            if (TOUCHABLE.indexOf(ch) >= 0) ev.push({ type: 'touch', ch, c, r });
        }
    }

    function stepEnemies(w) {
        for (const e of w.enemies) {
            e.anim++;
            if (e.kind === 'parrot') {
                let nx = e.x + e.dir * e.spd;
                const c = e.dir > 0 ? Math.floor((nx + 7.99) / T) : Math.floor(nx / T);
                const r = Math.floor((e.y + 4) / T);
                if (isSolid(tileAt(w, c, r)) || nx < T || nx > (COLS - 2) * T) e.dir *= -1; else e.x = nx;
                e.y = e.baseY + Math.sin(w.t * 0.06 + e.ph) * 5;
                continue;
            }
            const nx = e.x + e.dir * e.spd;
            const lead = e.dir > 0 ? Math.floor((nx + 7.99) / T) : Math.floor(nx / T);
            const feetRow = Math.round((e.y + e.h) / T);
            let blocked = !isTop(tileAt(w, lead, feetRow));
            for (let r = Math.floor(e.y / T); r < feetRow && !blocked; r++) if (isSolid(tileAt(w, lead, r))) blocked = true;
            if (blocked) e.dir *= -1; else e.x = nx;
        }
    }

    function enemyHit(w, p) {
        const px1 = p.x + 2, px2 = p.x + 6, py1 = p.y + 2, py2 = p.y + 16;
        for (const e of w.enemies) {
            let ex1, ex2, ey1, ey2;
            if (e.kind === 'pirate') { ex1 = e.x + 2; ex2 = e.x + 6; ey1 = e.y + 4; ey2 = e.y + 16; }
            else if (e.kind === 'rat') { ex1 = e.x + 1; ex2 = e.x + 7; ey1 = e.y + 4; ey2 = e.y + 8; }
            else { ex1 = e.x + 1; ex2 = e.x + 7; ey1 = e.y + 1; ey2 = e.y + 7; }
            if (px1 < ex2 && px2 > ex1 && py1 < ey2 && py2 > ey1) return e;
        }
        return null;
    }

    const api = { T, COLS, ROWS, WALK, JUMP_VY, GRAV, LETHAL_FALL, CRUMBLE_TIME, REGROW_TIME,
        isSolid, isLadder, isTop, parseLevel, setTime, stepWorld, tileAt, setTile,
        newPlayer, stepPlayer, stepEnemies, enemyHit, liftPos };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.BootyEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
