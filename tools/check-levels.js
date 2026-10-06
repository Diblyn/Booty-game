#!/usr/bin/env node
/* ============================================================
   Level checker: proves every hold can be completed.
   Runs the real engine physics and explores every move
   (walk, jump, climb, wait for lifts). Enemies are ignored,
   crumbling decks are treated as solid.

   Usage:  node tools/check-levels.js          (all holds)
           node tools/check-levels.js 4        (only hold 4)
   ============================================================ */
const E = require('../engine.js');
const LEVELS = require('../levels.js');

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

const MACROS = [
    { name: 'L', inputs: Array(4).fill({ left: true }) },
    { name: 'R', inputs: Array(4).fill({ right: true }) },
    { name: 'U', inputs: Array(4).fill({ up: true }) },
    { name: 'D', inputs: Array(4).fill({ down: true }) },
    { name: 'JL', inputs: [{ jump: true, left: true }] },
    { name: 'JR', inputs: [{ jump: true, right: true }] },
    { name: 'JU', inputs: [{ jump: true }] },
];
const WAIT = { name: 'W', inputs: Array(4).fill({}) };

function clone(p) { return Object.assign({}, p); }

function explore(def, openDoors) {
    const w = E.parseLevel(def, { crumble: false });
    for (let i = 0; i < w.tiles.length; i++) if (openDoors.has(w.tiles[i])) w.tiles[i] = '.';
    const period = w.lifts.reduce((a, L) => lcm(a, L.period || 1), 1);
    const macros = w.lifts.length ? MACROS.concat([WAIT]) : MACROS;

    const touched = new Set(), keys = new Set(), doors = new Set();
    let exitReached = false, goldReached = false;

    function sim(p, t, inputs) {
        p = clone(p);
        E.setTime(w, t);
        const ev = [];
        let f = 0;
        for (; f < inputs.length + 240; f++) {
            const inp = f < inputs.length ? inputs[f] : {};
            if (f >= inputs.length && (p.mode === 'ground' || p.mode === 'ladder')) break;
            E.stepWorld(w);
            E.stepPlayer(w, p, inp, ev);
            if (p.dead) return null;
        }
        if (p.mode === 'air') return null;
        for (const e of ev) {
            if (e.type === 'door') doors.add(String(e.n));
            if (e.type === 'touch') {
                if (e.ch === '$' || e.ch === '!') touched.add(e.c + ',' + e.r);
                else if (e.ch >= 'a' && e.ch <= 'i') keys.add(String(e.ch.charCodeAt(0) - 96));
                else if (e.ch === 'X') exitReached = true;
                else if (e.ch === 'G') goldReached = true;
            }
        }
        return { p, t: w.t };
    }

    const edges = [];
    const keyOf = (p, t) => `${Math.round(p.x)},${Math.round(p.y)},${p.mode[0]},${p.lift},${period > 1 ? t % period : 0}`;
    let start = sim(E.newPlayer(w), 0, []);
    if (!start) throw new Error('start position is not stable');
    const seen = new Map([[keyOf(start.p, start.t), 0]]);
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
        const from = head;
        const node = queue[head++];
        for (const m of macros) {
            const nx = sim(node.p, node.t, m.inputs);
            if (!nx) continue;
            const k = keyOf(nx.p, nx.t);
            let id = seen.get(k);
            if (id === undefined) { id = queue.length; seen.set(k, id); queue.push(nx); }
            edges.push(from, id);
        }
        if (queue.length > 3e6) throw new Error('state explosion');
    }
    // softlock scan: every reachable state must be able to get back to the start
    const radj = Array.from({ length: queue.length }, () => []);
    for (let i = 0; i < edges.length; i += 2) radj[edges[i + 1]].push(edges[i]);
    const back = new Uint8Array(queue.length); back[0] = 1;
    const st = [0];
    while (st.length) { const v = st.pop(); for (const u of radj[v]) if (!back[u]) { back[u] = 1; st.push(u); } }
    const traps = new Set();
    for (let i = 0; i < queue.length; i++) if (!back[i]) {
        const q = queue[i].p;
        traps.add(`tile ${Math.floor((q.x + 4) / E.T)},${Math.round((q.y + 16) / E.T) - 1}`);
    }
    return { touched, keys, doors, exitReached, goldReached, states: seen.size, traps };
}

function check(def, idx) {
    const t0 = Date.now();
    const open = new Set();
    let res;
    const traps = new Set();
    for (;;) {
        res = explore(def, open);
        for (const t of res.traps) traps.add(t + (open.size ? ` (doors open: ${[...open].join(',')})` : ' (doors closed)'));
        let changed = false;
        for (const n of res.keys) if (res.doors.has(n) && !open.has(n)) { open.add(n); changed = true; }
        if (!changed) break;
    }
    const w = E.parseLevel(def);
    const allBooty = [], allKeys = new Set(), allDoors = new Set();
    for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
        const ch = E.tileAt(w, c, r);
        if (ch === '$' || ch === '!') allBooty.push(c + ',' + r);
        if (ch >= 'a' && ch <= 'i') allKeys.add(String(ch.charCodeAt(0) - 96));
        if (ch >= '1' && ch <= '9') allDoors.add(ch);
    }
    const problems = [];
    const missed = allBooty.filter(b => !res.touched.has(b));
    if (missed.length) problems.push(`unreachable booty at ${missed.join(' ')}`);
    for (const d of allDoors) {
        if (!allKeys.has(d)) problems.push(`door ${d} has no key`);
        else if (!open.has(d)) problems.push(`door ${d} cannot be opened (key reachable: ${res.keys.has(d)}, door reachable: ${res.doors.has(d)})`);
    }
    for (const k of allKeys) if (!allDoors.has(k)) problems.push(`key ${k} has no door`);
    if (def.finale) { if (!res.goldReached) problems.push('golden key unreachable'); }
    else if (!res.exitReached) problems.push('exit unreachable');
    if (traps.size) problems.push(`no way back to the start from: ${[...traps].slice(0, 6).join('; ')}${traps.size > 6 ? ` (+${traps.size - 6} more)` : ''}`);
    const ok = problems.length === 0;
    console.log(`${ok ? 'OK  ' : 'FAIL'} hold ${idx + 1} ${def.name.padEnd(20)} booty ${allBooty.length - missed.length}/${allBooty.length}  states ${res.states}  ${Date.now() - t0}ms`);
    for (const p of problems) console.log('       - ' + p);
    return ok;
}

module.exports = { explore, check };

if (require.main === module) {
    const only = process.argv[2] ? [Number(process.argv[2]) - 1] : LEVELS.map((_, i) => i);
    let allOk = true;
    for (const i of only) allOk = check(LEVELS[i], i) && allOk;
    const total = LEVELS.reduce((n, d) => n + d.map.join('').split('').filter(c => c === '$' || c === '!').length, 0);
    console.log(`total booty: ${total}`);
    process.exit(allOk ? 0 : 1);
}
