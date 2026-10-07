#!/usr/bin/env node
/* ============================================================
   Ship checker: proves the whole ship can be completed.

   For every hold it runs the real engine physics and explores
   every move (walk, jump, climb, wait for lifts) from every door
   you can arrive through. Locked doors open when their key and
   the door are both reachable in the same visit (keys never
   leave a hold). Then it checks the whole ship:
     * every piece of booty can be reached
     * every key opens its door
     * no spot inside a hold traps you (you can always get back
       to where you came in, or leave through a door)
     * the door network lets you get from anywhere to anywhere
   Enemies are ignored and crumbling planks count as solid.

   Usage:  node tools/check-levels.js         (whole ship)
           node tools/check-levels.js 7       (only hold 7, local checks)
   ============================================================ */
const E = require('../engine.js');
const LEVELS = require('../levels.js');

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const MACROS = [
    Array(4).fill({ left: true }), Array(4).fill({ right: true }),
    Array(4).fill({ up: true }), Array(4).fill({ down: true }),
    [{ jump: true, left: true }], [{ jump: true, right: true }], [{ jump: true }],
];
const WAIT = Array(4).fill({});

// Build the reachable-state graph of one hold, for a given set of open doors,
// starting from all entry points.
function buildGraph(def, open, entries) {
    const w = E.parseLevel(def, { crumble: false });
    for (let i = 0; i < w.tiles.length; i++) if (open.has(w.tiles[i])) w.tiles[i] = '.';
    const period = w.lifts.reduce((a, L) => lcm(a, L.period || 1), 1);
    const macros = w.lifts.length ? MACROS.concat([WAIT]) : MACROS;

    const nodes = [], ids = new Map(), adj = [], evTable = [null], evIndex = new Map();
    const keyOf = (p, t) => `${Math.round(p.x)},${Math.round(p.y)},${p.mode[0]},${p.lift},${period > 1 ? t % period : 0}`;

    function sim(p0, t0, inputs) {
        const p = Object.assign({}, p0);
        E.setTime(w, t0);
        const booty = new Set(), keys = new Set(), doors = new Set();
        let f = 0;
        for (; f < inputs.length + 240; f++) {
            const inp = f < inputs.length ? inputs[f] : {};
            if (f >= inputs.length && (p.mode === 'ground' || p.mode === 'ladder')) break;
            E.stepWorld(w);
            const ev = [];
            E.stepPlayer(w, p, inp, ev);
            if (p.dead) return null;
            for (const e of ev) {
                if (e.type === 'door') doors.add(String(e.n));
                else if (e.type === 'touch') {
                    if (e.ch === '$' || e.ch === '!') booty.add(e.c + ',' + e.r);
                    else if (e.ch >= 'a' && e.ch <= 'i') keys.add(String(e.ch.charCodeAt(0) - 96));
                }
            }
        }
        if (p.mode === 'air') return null;
        let ev = 0;
        if (booty.size || keys.size || doors.size) {
            const k = [...booty].sort().join(' ') + '|' + [...keys].sort().join('') + '|' + [...doors].sort().join('');
            ev = evIndex.get(k);
            if (ev === undefined) { ev = evTable.length; evTable.push({ booty: [...booty], keys: [...keys], doors: [...doors] }); evIndex.set(k, ev); }
        }
        return { p, t: w.t, ev };
    }

    function addNode(p, t) {
        const k = keyOf(p, t);
        let id = ids.get(k);
        if (id !== undefined) return [id, false];
        id = nodes.length;
        const portal = E.portalAt(w, p);
        nodes.push({ p, t, portal: portal ? portal.i : -1 });
        ids.set(k, id); adj.push([]);
        return [id, true];
    }

    const entryIds = [];
    for (const en of entries) {
        const settled = sim(E.newPlayer(w, en.pos), 0, []);
        if (!settled) throw new Error(`${def.name}: entry ${en.id} is not a safe place to stand`);
        const [sid, fresh] = addNode(settled.p, settled.t);
        entryIds.push(sid);
        if (!fresh) continue;
        const queue = [sid];
        for (let h = 0; h < queue.length; h++) {
            const from = queue[h], node = nodes[from];
            for (const m of macros) {
                const r = sim(node.p, node.t, m);
                if (!r) continue;
                const [to, isNew] = addNode(r.p, r.t);
                adj[from].push(to, r.ev);
                if (isNew) queue.push(to);
            }
            if (nodes.length > 3e6) throw new Error('state explosion');
        }
    }
    return { w, nodes, adj, evTable, entryIds };
}

function reach(G, start) {
    const seen = new Uint8Array(G.nodes.length);
    const st = [start]; seen[start] = 1;
    const booty = new Set(), keys = new Set(), doors = new Set(), portals = new Set();
    while (st.length) {
        const v = st.pop();
        if (G.nodes[v].portal >= 0) portals.add(G.nodes[v].portal);
        const a = G.adj[v];
        for (let i = 0; i < a.length; i += 2) {
            const ev = G.evTable[a[i + 1]];
            if (ev) { ev.booty.forEach(b => booty.add(b)); ev.keys.forEach(k => keys.add(k)); ev.doors.forEach(d => doors.add(d)); }
            if (!seen[a[i]]) { seen[a[i]] = 1; st.push(a[i]); }
        }
    }
    return { seen, booty, keys, doors, portals };
}

// can every state reached from this entry get back to the entry or out through a door?
function traps(G, entryId, seen) {
    const n = G.nodes.length;
    const radj = Array.from({ length: n }, () => []);
    for (let v = 0; v < n; v++) { const a = G.adj[v]; for (let i = 0; i < a.length; i += 2) radj[a[i]].push(v); }
    const ok = new Uint8Array(n), st = [];
    const mark = v => { if (!ok[v]) { ok[v] = 1; st.push(v); } };
    mark(entryId);
    for (let v = 0; v < n; v++) { const d = G.nodes[v].portal; if (d >= 0 && G.w.portals[d].to) mark(v); }
    while (st.length) { const v = st.pop(); for (const u of radj[v]) mark(u); }
    const bad = new Set();
    for (let v = 0; v < n; v++) if (seen[v] && !ok[v]) {
        const p = G.nodes[v].p;
        bad.add(`${Math.floor((p.x + 4) / E.T)},${Math.round((p.y + 16) / E.T) - 1}`);
    }
    return bad;
}

// where can you appear in this hold? the start, and every door someone can come through
function entriesOf(def, idx) {
    const w = E.parseLevel(def, { crumble: false });
    const list = [];
    if (w.start) list.push({ id: 'start', pos: w.start });
    for (const d of w.portals) {
        const other = d.to || d.from;
        const partner = LEVELS[other - 1].links.find(l => (l.to || l.from) === idx + 1);
        if (d.from || (partner && partner.to)) list.push({ id: 'door' + d.i, door: d.i, pos: { x: d.x, y: d.y } });
    }
    return list;
}

function analyseHold(idx, log) {
    const def = LEVELS[idx], t0 = Date.now();
    const entries = entriesOf(def, idx);
    const open = new Set();
    let G, per;
    for (;;) {
        G = buildGraph(def, open, entries);
        per = entries.map((en, k) => reach(G, G.entryIds[k]));
        let changed = false;
        for (const r of per) for (const n of r.keys) if (r.doors.has(n) && !open.has(n)) { open.add(n); changed = true; }
        if (!changed) break;
    }
    const result = { idx, entries: entries.map((en, k) => ({
        id: en.id, door: en.door, booty: per[k].booty, portals: per[k].portals, traps: traps(G, G.entryIds[k], per[k].seen),
    })), open, states: G.nodes.length, ms: Date.now() - t0, w: G.w };
    if (log) console.log(`  hold ${String(idx + 1).padStart(2)} ${def.name.padEnd(20)} ${G.nodes.length} states, ${result.ms} ms`);
    return result;
}

function report(results) {
    let ok = true;
    const problems = [];
    const holdOf = i => `hold ${i + 1} (${LEVELS[i].name})`;
    // global door graph: node = hold:entry
    const node = (h, e) => h + ':' + e;
    const edges = new Map();
    for (const R of results) {
        for (const en of R.entries) {
            const out = [];
            for (const pi of en.portals) {
                const d = R.w.portals[pi];
                if (!d.to) continue;
                const dest = results[d.to - 1];
                const arrival = dest.w.portals.find(x => x.to === R.idx + 1 || x.from === R.idx + 1);
                out.push(node(d.to - 1, 'door' + arrival.i));
            }
            edges.set(node(R.idx, en.id), out);
        }
    }
    const startNode = node(0, 'start');
    const fwd = new Set([startNode]), st = [startNode];
    while (st.length) for (const v of edges.get(st.pop()) || []) if (!fwd.has(v)) { fwd.add(v); st.push(v); }
    // the ship's door network must be strongly connected: pick any door you reach from
    // the start and check that it reaches, and is reached from, every other arrival point
    const root = (edges.get(startNode) || [])[0];
    const reachFrom = (src, graph) => { const s = new Set([src]), q = [src]; while (q.length) for (const v of graph.get(q.pop()) || []) if (!s.has(v)) { s.add(v); q.push(v); } return s; };
    const rev = new Map();
    for (const [v, outs] of edges) for (const u of outs) { if (!rev.has(u)) rev.set(u, []); rev.get(u).push(v); }
    const down = root ? reachFrom(root, edges) : new Set(), up = root ? reachFrom(root, rev) : new Set();
    const back = new Set([startNode, ...[...down].filter(v => up.has(v))]);
    let total = 0, got = 0;
    for (const R of results) {
        const all = [];
        for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
            const ch = E.tileAt(R.w, c, r);
            if (ch === '$' || ch === '!') all.push(c + ',' + r);
        }
        const reached = new Set();
        let visited = false;
        for (const en of R.entries) {
            const nd = node(R.idx, en.id);
            if (!fwd.has(nd)) continue;
            visited = true;
            en.booty.forEach(b => reached.add(b));
            if (!back.has(nd)) problems.push(`${holdOf(R.idx)}: arriving via ${en.id} cuts you off from part of the ship`);
            if (en.traps.size) problems.push(`${holdOf(R.idx)}: entering via ${en.id}, these spots are dead ends: ${[...en.traps].slice(0, 5).join(' ')}${en.traps.size > 5 ? ' ...' : ''}`);
        }
        if (!visited) problems.push(`${holdOf(R.idx)} can never be reached`);
        const missed = all.filter(b => !reached.has(b));
        if (missed.length) problems.push(`${holdOf(R.idx)}: unreachable booty at ${missed.join(' ')}`);
        total += all.length; got += all.length - missed.length;
        const fresh = E.parseLevel(LEVELS[R.idx]);
        const keysIn = new Set(Object.keys(fresh.keyHomes).map(ch => String(ch.charCodeAt(0) - 96)));
        const doorsIn = new Set(fresh.tiles.filter(ch => ch >= '1' && ch <= '9'));
        for (const d of doorsIn) if (!keysIn.has(d)) problems.push(`${holdOf(R.idx)}: door ${d} has no key`);
        else if (!R.open.has(d)) problems.push(`${holdOf(R.idx)}: door ${d} can never be opened`);
        for (const k of keysIn) if (!doorsIn.has(k)) problems.push(`${holdOf(R.idx)}: key ${k} has no door`);
        R.w.portals.forEach(d => {
            if (!d.to) return;
            const used = R.entries.some(en => fwd.has(node(R.idx, en.id)) && en.portals.has(d.i));
            if (!used) problems.push(`${holdOf(R.idx)}: the door to hold ${d.to} can never be used`);
        });
    }
    console.log(`\nbooty reachable: ${got}/${total}`);
    console.log(`door network: ${fwd.size} arrival points reachable, ${[...fwd].filter(v => back.has(v)).length} of them fully connected`);
    if (problems.length) { ok = false; console.log('\nPROBLEMS:'); problems.forEach(p => console.log('  - ' + p)); }
    else console.log('\nOK: the whole ship can be completed, with no dead ends.');
    return ok;
}

module.exports = { buildGraph, reach, analyseHold, report };

if (require.main === module) {
    const only = process.argv[2] ? Number(process.argv[2]) - 1 : null;
    if (only !== null) {
        const R = analyseHold(only, true);
        R.entries.forEach(en => console.log(`    from ${en.id}: booty ${en.booty.size}, doors reachable ${[...en.portals].join(',') || '-'}${en.traps.size ? ', DEAD ENDS ' + [...en.traps].slice(0, 5).join(' ') : ''}`));
        console.log(`    locked doors opened: ${[...R.open].join(',') || 'none'}`);
    } else {
        console.log('Exploring every hold...');
        const results = LEVELS.map((_, i) => analyseHold(i, true));
        process.exit(report(results) ? 0 : 1);
    }
}
