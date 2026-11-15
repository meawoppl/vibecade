/* Vibecade: street scene, playable demo and game previews. No dependencies. */
(() => {
'use strict';

const TAU = Math.PI * 2;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const C = { ink: '#070916', lime: '#c6ff4d', pink: '#ff5fa2', cyan: '#5fe3ff', amber: '#ffc24d', violet: '#b58cff', red: '#ff6b6b', white: '#f4f6ff' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

const hex = (h) => (h[0] === '#' ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : h.match(/\d+/g).map(Number));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const rgba = (h, a) => { const A = hex(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };

/* ---------- drawing helpers (all in pixels) ---------- */
const dot = (g, x, y, r, c, glow = 0) => { g.shadowColor = c; g.shadowBlur = glow; g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.shadowBlur = 0; };
const seg = (g, x1, y1, x2, y2, w, c, glow = 0) => { g.shadowColor = c; g.shadowBlur = glow; g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.shadowBlur = 0; };
const box = (g, x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
const ring = (g, x, y, r, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.stroke(); };

/* ---------- game simulations: step(dt, input) and draw(g, size) in a square ---------- */
const SIMS = {};

SIMS.blocks = (cols = 8, rows = 12) => {
  const SH = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]]];
  const COL = [C.amber, C.cyan, C.violet, C.lime, C.pink];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = rows - Math.round(rows / 3); r < rows; r++) { const gap = rnd(cols) | 0; for (let c = 0; c < cols; c++) if (c !== gap && Math.random() < 0.8) grid[r][c] = 1 + (rnd(5) | 0); }
  let p = null, fall = 0, flash = 0, moveT = 0, target = 0;
  const fits = (cells, x, y) => cells.every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < cols && Y < rows && (Y < 0 || !grid[Y][X]); });
  const S = {
    color: C.cyan, score: 0,
    spawn() {
      const i = rnd(SH.length) | 0;
      p = { cells: SH[i].map((c) => c.slice()), x: (cols / 2 - 1) | 0, y: -1, c: i + 1 };
      target = rnd(cols - 1) | 0;
      if (!fits(p.cells, p.x, p.y + 1)) { grid.forEach((r) => r.fill(0)); S.score = 0; }
    },
    rot() {
      const c = p.cells.map(([x, y]) => [-y, x]);
      const mx = Math.min(...c.map((q) => q[0])), my = Math.min(...c.map((q) => q[1]));
      const n = c.map(([x, y]) => [x - mx, y - my]);
      if (fits(n, p.x, p.y)) p.cells = n;
    },
    lock() {
      p.cells.forEach(([cx, cy]) => { const Y = p.y + cy; if (Y >= 0) grid[Y][p.x + cx] = p.c; });
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r].every((v) => v)) { grid.splice(r, 1); grid.unshift(Array(cols).fill(0)); S.score += 10; flash = 0.3; r++; S.fx && S.fx('clear'); }
      }
      p = null;
    },
    step(dt, inp) {
      flash = Math.max(0, flash - dt);
      if (!p) S.spawn();
      moveT -= dt;
      let dx = 0, drop = false;
      if (inp) {
        if (moveT <= 0 && inp.x) { dx = Math.sign(inp.x); moveT = 0.12; }
        if (inp.ap || inp.upp) S.rot();
        drop = inp.y > 0;
      } else if (moveT <= 0) { dx = Math.sign(target - p.x); moveT = 0.18; if (Math.random() < 0.08) S.rot(); }
      if (dx && fits(p.cells, p.x + dx, p.y)) p.x += dx;
      fall += dt * (drop ? 16 : inp ? 2.2 : 3.4);
      while (p && fall >= 1) {
        fall--;
        if (fits(p.cells, p.x, p.y + 1)) p.y++; else { S.lock(); S.fx && S.fx('lock'); fall = 0; }
      }
    },
    draw(g, s) {
      const cell = (s * 0.9) / rows, ox = (s - cols * cell) / 2, oy = s * 0.05;
      box(g, ox - 2, oy - 2, cols * cell + 4, rows * cell + 4, 3, flash ? rgba(C.white, 0.25) : 'rgba(255,255,255,.05)');
      const put = (x, y, c) => box(g, ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2, cell * 0.2, COL[c - 1]);
      grid.forEach((row, y) => row.forEach((v, x) => v && put(x, y, v)));
      if (p) p.cells.forEach(([cx, cy]) => p.y + cy >= 0 && put(p.x + cx, p.y + cy, p.c));
    },
  };
  return S;
};

SIMS.battle = () => {
  const a = SIMS.blocks(5, 9), b = SIMS.blocks(5, 9); let t = 0;
  return {
    color: C.pink,
    step(dt) { t += dt; a.step(dt); b.step(dt * 1.15); },
    draw(g, s) {
      g.save(); g.translate(-s * 0.25, 0); a.draw(g, s); g.restore();
      g.save(); g.translate(s * 0.25, 0); b.draw(g, s); g.restore();
      const k = (t * 0.8) % 1, y = s * 0.5;
      g.globalAlpha = 1 - k; seg(g, s * (0.46 + k * 0.08), y, s * (0.5 + k * 0.08), y, s * 0.02, C.pink, 6); g.globalAlpha = 1;
    },
  };
};

SIMS.volley = () => {
  const b = { x: 0.5, y: 0.5, vx: 0.5, vy: 0.3 }, L = { x: 0.2, y: 0.5 }, R = { x: 0.8, y: 0.5 };
  let smash = 0, t = 0;
  const S = {
    color: C.pink, score: 0,
    step(dt, inp) {
      t += dt;
      const ai = (P, tx, v) => { P.y += clamp(b.y - P.y, -dt * v, dt * v); P.x += clamp(tx - P.x, -dt * 0.4, dt * 0.4); };
      if (inp) {
        L.x = clamp(L.x + inp.x * dt * 0.9, 0.08, 0.46); L.y = clamp(L.y + inp.y * dt * 0.9, 0.1, 0.9);
        if (inp.ap) smash = 0.3;
      } else ai(L, 0.2 + (b.x < 0.5 ? (b.x - 0.2) * 0.3 : 0), 0.7);
      ai(R, 0.8 + (b.x > 0.5 ? (b.x - 0.8) * 0.3 : 0), 0.62);
      smash = Math.max(0, smash - dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < 0.06) { b.y = 0.06; b.vy = Math.abs(b.vy); }
      if (b.y > 0.94) { b.y = 0.94; b.vy = -Math.abs(b.vy); }
      for (const P of [L, R]) {
        const dx = b.x - P.x, dy = b.y - P.y, d = Math.hypot(dx, dy) || 1e-3;
        if (d < 0.115) {
          const hard = P === L && smash > 0;
          const sp = Math.min(1.5, Math.hypot(b.vx, b.vy) * 1.05 + (hard ? 0.45 : 0));
          b.vx = (dx / d) * sp; b.vy = (dy / d) * sp;
          if (Math.abs(b.vx) < 0.3) b.vx = 0.3 * (P === L ? 1 : -1);
          b.x = P.x + (dx / d) * 0.115; b.y = P.y + (dy / d) * 0.115;
          S.fx && S.fx(hard ? 'smash' : 'hit');
        }
      }
      if (b.x < 0 || b.x > 1) {
        const won = b.x > 1;
        if (won) { S.score++; S.fx && S.fx('score'); } else S.fx && S.fx('miss');
        b.x = 0.5; b.y = rnd(0.3, 0.7); b.vx = won ? -0.5 : 0.5; b.vy = rnd(-0.35, 0.35);
      }
    },
    draw(g, s) {
      g.setLineDash([s * 0.03, s * 0.03]); seg(g, s / 2, s * 0.05, s / 2, s * 0.95, s * 0.008, 'rgba(255,255,255,.18)'); g.setLineDash([]);
      dot(g, L.x * s, L.y * s, s * (0.075 + (smash > 0 ? 0.015 : 0)), C.lime, s * 0.08);
      dot(g, R.x * s, R.y * s, s * 0.075, C.pink, s * 0.08);
      dot(g, b.x * s, b.y * s, s * 0.035, C.white, s * 0.06);
    },
  };
  return S;
};

SIMS.fireflies = () => {
  const sparks = Array.from({ length: 14 }, () => ({ x: rnd(0.05, 0.95), y: rnd(0.05, 0.95), p: rnd(TAU) }));
  const bugs = [C.lime, C.cyan, C.pink].map((c) => ({ x: rnd(0.2, 0.8), y: rnd(0.2, 0.8), tx: 0.5, ty: 0.5, c, tr: [] }));
  let blooms = [], t = 0;
  const S = {
    color: C.lime, score: 0,
    step(dt, inp) {
      t += dt;
      sparks.forEach((sp) => { sp.x = clamp(sp.x + Math.sin(t * 0.7 + sp.p) * 0.02 * dt, 0.03, 0.97); sp.y = clamp(sp.y + Math.cos(t * 0.5 + sp.p) * 0.02 * dt, 0.03, 0.97); });
      bugs.forEach((b, i) => {
        if (i === 0 && inp) {
          b.x = clamp(b.x + inp.x * dt * 0.7, 0.04, 0.96); b.y = clamp(b.y + inp.y * dt * 0.7, 0.04, 0.96);
          if (inp.ap) { blooms.push({ x: b.x, y: b.y, r: 0, c: b.c, max: 0.42 }); S.fx && S.fx('flash'); }
        } else {
          const d = Math.hypot(b.tx - b.x, b.ty - b.y);
          if (d < 0.03 || Math.random() < 0.004) { const sp = sparks[rnd(sparks.length) | 0]; b.tx = sp.x; b.ty = sp.y; }
          else { b.x += ((b.tx - b.x) / d) * dt * 0.33; b.y += ((b.ty - b.y) / d) * dt * 0.33; }
        }
        b.tr.push([b.x, b.y]); if (b.tr.length > 16) b.tr.shift();
        sparks.forEach((sp) => {
          if (Math.hypot(sp.x - b.x, sp.y - b.y) < 0.055) {
            sp.x = rnd(0.05, 0.95); sp.y = rnd(0.05, 0.95);
            blooms.push({ x: b.x, y: b.y, r: 0, c: b.c, max: 0.1 });
            if (i === 0) { S.score++; S.fx && S.fx('spark'); }
          }
        });
      });
      blooms = blooms.filter((o) => (o.r += dt * (o.max > 0.2 ? 0.6 : 0.25)) < o.max);
    },
    draw(g, s) {
      sparks.forEach((sp) => dot(g, sp.x * s, sp.y * s, s * 0.012 * (1 + 0.4 * Math.sin(t * 4 + sp.p)), C.amber, s * 0.04));
      blooms.forEach((o) => ring(g, o.x * s, o.y * s, o.r * s, s * 0.01, rgba(o.c, 1 - o.r / o.max)));
      bugs.forEach((b) => {
        b.tr.forEach(([x, y], i) => dot(g, x * s, y * s, s * 0.004 * i * 0.25 + 0.5, rgba(b.c, (i / b.tr.length) * 0.5)));
        dot(g, b.x * s, b.y * s, s * 0.03, b.c, s * 0.1);
      });
    },
  };
  return S;
};

const timed = (color, draw) => () => { let t = rnd(10); return { color, step(dt) { t += dt; }, draw(g, s) { draw(g, s, t); } }; };

SIMS.chain = timed(C.amber, (g, s, t) => {
  const P = [[0.08, 0.14], [0.62, 0.3], [0.62, 0.42], [0.2, 0.58], [0.2, 0.7], [0.74, 0.86], [0.92, 0.5]];
  [[0, 1], [2, 3], [4, 5]].forEach(([a, b]) => seg(g, P[a][0] * s, (P[a][1] + 0.04) * s, P[b][0] * s, (P[b][1] + 0.04) * s, s * 0.022, C.cyan, 4));
  for (let i = 0; i < 4; i++) seg(g, (0.76 + (i % 2) * 0.06) * s, (0.93 - i * 0.02) * s, (0.82 - (i % 2) * 0.06) * s, (0.91 - i * 0.02) * s, s * 0.012, C.pink);
  const u = ((t * 0.22) % 1) * (P.length - 1), i = Math.min(u | 0, P.length - 2), f = u - i;
  const x = P[i][0] + (P[i + 1][0] - P[i][0]) * f, y = P[i][1] + (P[i + 1][1] - P[i][1]) * f - (i === 5 ? Math.sin(f * Math.PI) * 0.1 : 0);
  dot(g, x * s, y * s, s * 0.04, C.amber, s * 0.08);
});

SIMS.echo = timed(C.violet, (g, s, t) => {
  const cyc = t % 5.2, n = Math.floor(t / 5.2), seq = [0, 1, 2, 3].map((k) => (n * 7 + k * 5 + ((n + k) % 3)) % 6);
  const step = cyc < 2.4 ? Math.floor(cyc / 0.6) : cyc > 2.8 ? Math.floor((cyc - 2.8) / 0.6) : -1;
  const lit = step >= 0 && step < 4 && (cyc % 0.6 < 0.42 || cyc > 2.8) ? seq[step] : -1;
  const cols = [C.pink, C.cyan, C.lime, C.amber, C.violet, C.red];
  for (let i = 0; i < 6; i++) {
    const x = (0.1 + (i % 3) * 0.28) * s, y = (0.24 + ((i / 3) | 0) * 0.3) * s, on = i === lit;
    g.shadowColor = cols[i]; g.shadowBlur = on ? s * 0.1 : 0; box(g, x, y, s * 0.24, s * 0.24, s * 0.04, on ? cols[i] : rgba(cols[i], 0.18)); g.shadowBlur = 0;
    if (on && cyc > 2.8) ring(g, x + s * 0.12, y + s * 0.12, s * 0.05 + ((cyc - 2.8) % 0.6) * s * 0.2, s * 0.008, rgba(C.white, 0.6));
  }
});

SIMS.fuse = timed(C.amber, (g, s, t) => {
  const u = (t * 0.28) % 1.35, Y = (x) => 0.5 + 0.16 * Math.sin(x * Math.PI * 2);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = s * 0.012; g.beginPath();
  for (let x = 0.06; x <= 0.94; x += 0.02) g.lineTo(x * s, Y(x) * s); g.stroke();
  for (let i = 0; i < 6; i++) { const x = 0.1 + i * 0.16, on = u > x; dot(g, x * s, (Y(x) - 0.1) * s, s * 0.045, on ? C.amber : 'rgba(255,194,77,.18)', on ? s * 0.1 : 0); seg(g, x * s, (Y(x) - 0.055) * s, x * s, Y(x) * s, s * 0.008, 'rgba(255,255,255,.3)'); }
  const x = Math.min(u, 0.94); if (u < 1) for (let k = 0; k < 5; k++) dot(g, (x + rnd(-0.02, 0.02)) * s, (Y(x) + rnd(-0.02, 0.02)) * s, s * rnd(0.006, 0.02), k ? C.amber : C.white, s * 0.06);
});

SIMS.kaiju = timed(C.lime, (g, s, t) => {
  for (let i = 0; i < 7; i++) box(g, (i * 0.15 - 0.02) * s, (0.78 - ((i * 37) % 5) * 0.03) * s, s * 0.12, s * 0.3, 2, 'rgba(95,227,255,.22)');
  const bob = Math.sin(t * 2) * 0.02, hit = (t * 0.5) % 1 > 0.92;
  g.shadowColor = C.lime; g.shadowBlur = s * 0.08; g.fillStyle = hit ? C.white : C.lime; g.beginPath();
  g.ellipse(s * 0.5, (0.62 + bob) * s, s * 0.2, s * 0.3, 0, 0, TAU); g.fill();
  [-1, 1].forEach((d) => { g.beginPath(); g.moveTo((0.5 + d * 0.08) * s, (0.36 + bob) * s); g.lineTo((0.5 + d * 0.17) * s, (0.24 + bob) * s); g.lineTo((0.5 + d * 0.02) * s, (0.34 + bob) * s); g.fill(); });
  g.shadowBlur = 0;
  [-1, 1].forEach((d) => dot(g, (0.5 + d * 0.07) * s, (0.5 + bob) * s, s * 0.03, C.ink));
  seg(g, 0.43 * s, (0.62 + bob) * s, 0.57 * s, (0.62 + bob) * s, s * 0.015, C.ink);
  for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1, x0 = i % 2 ? 0.92 : 0.08; dot(g, (x0 + (0.5 - x0) * u) * s, (0.95 - 0.5 * u - Math.sin(u * Math.PI) * 0.18) * s, s * 0.022, C.pink, s * 0.06); }
});

SIMS.heist = timed(C.amber, (g, s, t) => {
  [0.3, 0.72].forEach((x, i) => {
    const a = Math.PI / 2 + Math.sin(t * (0.8 + i * 0.3) + i * 2) * 0.55;
    g.fillStyle = 'rgba(255,194,77,.22)'; g.beginPath(); g.moveTo(x * s, 0.04 * s);
    g.lineTo((x + Math.cos(a - 0.18) * 1.1) * s, (0.04 + Math.sin(a - 0.18) * 1.1) * s); g.lineTo((x + Math.cos(a + 0.18) * 1.1) * s, (0.04 + Math.sin(a + 0.18) * 1.1) * s); g.fill();
    dot(g, x * s, 0.04 * s, s * 0.03, C.amber, s * 0.06);
  });
  box(g, 0.9 * s, 0.62 * s, s * 0.08, s * 0.2, 2, rgba(C.lime, 0.6));
  for (let i = 0; i < 3; i++) {
    const x = ((t * (0.1 + i * 0.03) + i * 0.37) % 1.1) - 0.05, y = 0.78 + Math.sin(t * 6 + i) * 0.008;
    dot(g, x * s, y * s, s * 0.035, [C.cyan, C.pink, C.violet][i], s * 0.05);
    g.fillStyle = C.white; g.beginPath(); g.moveTo(x * s, (y - 0.085) * s); g.lineTo((x + 0.022) * s, (y - 0.06) * s); g.lineTo(x * s, (y - 0.035) * s); g.lineTo((x - 0.022) * s, (y - 0.06) * s); g.fill();
  }
});

SIMS.garden = timed(C.pink, (g, s, t) => {
  const cols = [C.pink, C.amber, C.violet, C.cyan, C.red];
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.14 + i * 0.21) % 1, x = (0.14 + i * 0.18) * s, h = Math.min(k * 2.2, 1) * (0.34 + (i % 3) * 0.1) * s, fade = k > 0.9 ? (1 - k) * 10 : 1;
    g.globalAlpha = fade; seg(g, x, 0.92 * s, x, 0.92 * s - h, s * 0.014, C.lime, 3);
    const b = clamp((k - 0.45) * 3, 0, 1);
    if (b > 0) { for (let p = 0; p < 6; p++) dot(g, x + Math.cos((p * TAU) / 6 + t * 0.3) * s * 0.045 * b, 0.92 * s - h + Math.sin((p * TAU) / 6 + t * 0.3) * s * 0.045 * b, s * 0.03 * b, cols[i], s * 0.04); dot(g, x, 0.92 * s - h, s * 0.022 * b, C.white); }
    g.globalAlpha = 1;
  }
  seg(g, 0.04 * s, 0.93 * s, 0.96 * s, 0.93 * s, s * 0.012, rgba(C.lime, 0.4));
});

SIMS.puppet = timed(C.violet, (g, s, t) => {
  const cx = 0.5 * s, sw = Math.sin(t * 3), hat = [C.pink, C.amber, C.cyan, C.lime][Math.floor(t / 1.5) % 4], by = (0.4 + Math.abs(sw) * 0.02) * s;
  [[-0.2, 0.52], [0.2, 0.52], [0, 0.26]].forEach(([dx, y]) => seg(g, cx + dx * s * (1 + sw * 0.2), 0.02 * s, cx + dx * s * (1 + sw * 0.2), y * s, s * 0.004, 'rgba(255,255,255,.3)'));
  seg(g, cx, by, cx, by + 0.26 * s, s * 0.07, C.violet, 6);
  seg(g, cx, by + 0.04 * s, cx - 0.2 * s, by + (0.1 - sw * 0.12) * s, s * 0.035, C.violet);
  seg(g, cx, by + 0.04 * s, cx + 0.2 * s, by + (0.1 + sw * 0.12) * s, s * 0.035, C.violet);
  seg(g, cx, by + 0.26 * s, cx - (0.08 + sw * 0.06) * s, 0.9 * s, s * 0.035, C.violet);
  seg(g, cx, by + 0.26 * s, cx + (0.08 - sw * 0.06) * s, 0.9 * s, s * 0.035, C.violet);
  dot(g, cx, by - 0.08 * s, s * 0.075, C.white);
  g.fillStyle = hat; g.beginPath(); g.moveTo(cx - 0.09 * s, by - 0.13 * s); g.lineTo(cx + 0.09 * s, by - 0.13 * s); g.lineTo(cx, by - 0.3 * s); g.fill();
});

SIMS.sheep = timed(C.white, (g, s, t) => {
  const u = (t * 0.12) % 1, cx = 0.18 + smooth(0, 0.8, u) * 0.62;
  g.strokeStyle = C.lime; g.lineWidth = s * 0.012; g.strokeRect(0.72 * s, 0.32 * s, 0.24 * s, 0.36 * s);
  for (let i = 0; i < 9; i++) dot(g, (cx + Math.cos(i * 2.4) * 0.09 + Math.sin(t * 2 + i) * 0.01) * s, (0.5 + Math.sin(i * 2.4) * 0.12 + Math.cos(t * 1.7 + i) * 0.01) * s, s * (i ? 0.03 : 0.05), C.white, s * 0.03);
  [C.cyan, C.pink].forEach((c, i) => dot(g, (cx - 0.16 + Math.sin(t * 3 + i * 3) * 0.02) * s, (0.5 + (i ? 0.2 : -0.2) * Math.cos(t * 1.4)) * s, s * 0.028, c, s * 0.06));
});

SIMS.racers = timed(C.red, (g, s, t) => {
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = s * 0.16; g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.34, s * 0.24, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = s * 0.004; g.setLineDash([s * 0.03, s * 0.03]); g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.34, s * 0.24, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  [C.red, C.cyan, C.amber, C.lime].forEach((c, i) => {
    const a = t * (1.1 + i * 0.17) + i * 1.6, r = 0.34 + (i - 1.5) * 0.035, x = (0.5 + Math.cos(a) * r) * s, y = (0.5 + Math.sin(a) * r * 0.7) * s;
    g.save(); g.translate(x, y); g.rotate(Math.atan2(Math.cos(a) * 0.7, -Math.sin(a))); g.shadowColor = c; g.shadowBlur = s * 0.05; box(g, -s * 0.035, -s * 0.018, s * 0.07, s * 0.036, s * 0.01, c); g.restore(); g.shadowBlur = 0;
  });
});

SIMS.switchyard = timed(C.cyan, (g, s, t) => {
  const n = Math.floor(t * 0.3), up = n % 2 === 0, u = (t * 0.3) % 1, w = s * 0.014;
  seg(g, 0.05 * s, 0.5 * s, 0.45 * s, 0.5 * s, w, 'rgba(255,255,255,.35)');
  seg(g, 0.45 * s, 0.5 * s, 0.9 * s, 0.24 * s, w, up ? C.white : 'rgba(255,255,255,.2)');
  seg(g, 0.45 * s, 0.5 * s, 0.9 * s, 0.76 * s, w, up ? 'rgba(255,255,255,.2)' : C.white);
  box(g, 0.86 * s, 0.14 * s, s * 0.1, s * 0.16, 3, C.pink); box(g, 0.86 * s, 0.7 * s, s * 0.1, s * 0.16, 3, C.cyan);
  dot(g, 0.45 * s, 0.5 * s, s * 0.025, C.amber, s * 0.05);
  const c = up ? C.pink : C.cyan;
  for (let k = 0; k < 3; k++) {
    const q = clamp(u * 1.15 - k * 0.07, 0, 1), x = q < 0.5 ? 0.05 + q * 0.8 : 0.45 + (q - 0.5) * 0.82, y = q < 0.5 ? 0.5 : 0.5 + (q - 0.5) * (up ? -0.5 : 0.5);
    box(g, (x - 0.03) * s, (y - 0.03) * s, s * 0.06, s * 0.06, s * 0.012, c);
  }
});

SIMS.tug = timed(C.lime, (g, s, t) => {
  const x = 0.5 + 0.16 * Math.sin(t * 0.8) + 0.02 * Math.sin(t * 7), y = 0.5 * s, pulse = (t * 0.6) % 1;
  seg(g, 0.06 * s, y, 0.94 * s, y, s * 0.02, 'rgba(255,255,255,.5)', 4);
  seg(g, 0.5 * s, 0.3 * s, 0.5 * s, 0.7 * s, s * 0.006, 'rgba(255,255,255,.25)');
  dot(g, x * s, y, s * 0.05, C.amber, s * 0.1);
  ring(g, x * s, y, s * 0.05 + pulse * s * 0.14, s * 0.008, rgba(C.amber, 1 - pulse));
  for (let i = 0; i < 3; i++) { dot(g, (0.1 + i * 0.09 + (x - 0.5) * 0.5) * s, y + Math.sin(t * 8 + i) * s * 0.012, s * 0.035, C.lime, s * 0.04); dot(g, (0.9 - i * 0.09 + (x - 0.5) * 0.5) * s, y + Math.cos(t * 8 + i) * s * 0.012, s * 0.035, C.pink, s * 0.04); }
});

SIMS.orchestra = timed(C.violet, (g, s, t) => {
  const cols = [C.pink, C.amber, C.lime, C.cyan, C.violet, C.pink, C.amber];
  for (let i = 0; i < 7; i++) {
    const h = (0.14 + 0.56 * Math.abs(Math.sin(t * 2.2 + i * 0.9)) * (0.6 + 0.4 * Math.sin(t * 0.7 + i))) * s;
    g.shadowColor = cols[i]; g.shadowBlur = s * 0.04; box(g, (0.09 + i * 0.12) * s, 0.9 * s - h, s * 0.09, h, s * 0.02, cols[i]); g.shadowBlur = 0;
    const u = (t * 0.4 + i * 0.3) % 1; g.globalAlpha = 1 - u; dot(g, (0.135 + i * 0.12) * s, (0.9 - u * 0.8) * s - h * 0.2, s * 0.015, C.white); g.globalAlpha = 1;
  }
});

/* people and the figures they control */
const fig = (g, x, y, h, c, la, ra, glow = 0, lean = 0) => {
  const hip = y - h * 0.42, sh = y - h * 0.78, sx = x + lean * h * 0.5, w = h * 0.085, arm = h * 0.3;
  g.shadowColor = c; g.shadowBlur = glow;
  seg(g, x, hip, x - h * 0.1, y, w, c, glow); seg(g, x, hip, x + h * 0.1, y, w, c, glow);
  seg(g, x, hip, sx, sh, w * 1.5, c, glow);
  seg(g, sx, sh, sx - Math.cos(la) * arm, sh - Math.sin(la) * arm, w, c, glow);
  seg(g, sx, sh, sx + Math.cos(ra) * arm, sh - Math.sin(ra) * arm, w, c, glow);
  dot(g, sx, sh - h * 0.14, h * 0.085, c, glow);
  return [[sx - Math.cos(la) * arm, sh - Math.sin(la) * arm], [sx + Math.cos(ra) * arm, sh - Math.sin(ra) * arm]];
};
const pane = (g, s, x, y, w, h) => { box(g, x * s, y * s, w * s, h * s, s * 0.012, '#0d1030'); g.strokeStyle = '#3a4080'; g.lineWidth = s * 0.012; g.strokeRect(x * s, y * s, w * s, h * s); };
const walk = (g, s) => { seg(g, 0, 0.955 * s, s, 0.955 * s, s * 0.006, 'rgba(255,255,255,.18)'); };

SIMS.mirror = () => {
  let t = rnd(10), la = 0.4, ra = 0.4; const tr = [];
  const S = {
    color: C.lime, aim: null,
    step(dt) {
      t += dt;
      let tl = 0.3 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.2)), trg = 0.3 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.2 + 2));
      if (S.aim) { tl = clamp(1.5 - S.aim.y * 2.2 + (0.5 - S.aim.x) * 1.4, -0.9, 1.5); trg = clamp(1.5 - S.aim.y * 2.2 - (0.5 - S.aim.x) * 1.4, -0.9, 1.5); }
      la += (tl - la) * Math.min(1, dt * 9); ra += (trg - ra) * Math.min(1, dt * 9);
    },
    draw(g, s) {
      pane(g, s, 0.36, 0.06, 0.58, 0.72); walk(g, s);
      const hands = fig(g, 0.65 * s, 0.74 * s, 0.56 * s, C.lime, la, ra, s * 0.06);
      hands.forEach((h) => { tr.push([h[0] / s, h[1] / s, 1]); });
      while (tr.length > 44) tr.shift();
      tr.forEach((p, i) => dot(g, p[0] * s, p[1] * s, s * 0.008, rgba(i % 2 ? C.amber : C.pink, (i / tr.length) * 0.7)));
      fig(g, 0.2 * s, 0.95 * s, 0.4 * s, '#cfd3f5', la, ra);
      g.setLineDash([s * 0.012, s * 0.02]); seg(g, 0.27 * s, 0.6 * s, 0.4 * s, 0.5 * s, s * 0.005, rgba(C.lime, 0.5 + 0.4 * Math.sin(t * 5))); g.setLineDash([]);
    },
  };
  return S;
};

SIMS.steer = timed(C.cyan, (g, s, t) => {
  const sway = Math.sin(t * 0.9) * 0.2 + Math.sin(t * 0.37) * 0.07, cx = 0.5 + sway;
  pane(g, s, 0.05, 0.05, 0.9, 0.5); walk(g, s);
  g.save(); g.beginPath(); g.rect(0.05 * s, 0.05 * s, 0.9 * s, 0.5 * s); g.clip();
  for (let i = 0; i < 16; i++) { const y = ((t * 0.25 + i * 0.137) % 1) * 0.5 + 0.05, x = 0.08 + ((i * 0.618) % 1) * 0.84; dot(g, x * s, y * s, s * 0.005, 'rgba(255,255,255,.5)'); }
  for (let i = 0; i < 3; i++) { const u = (t * 0.2 + i / 3) % 1, x = 0.5 + Math.sin((t - (1 - u) * 2.2) * 0.9) * 0.2; ring(g, x * s, (0.08 + u * 0.36) * s, s * 0.045, s * 0.008, rgba(C.amber, 0.9 - u * 0.5)); }
  for (let k = 1; k < 7; k++) dot(g, (cx - (sway - (Math.sin((t - k * 0.06) * 0.9) * 0.2 + Math.sin((t - k * 0.06) * 0.37) * 0.07))) * s, (0.46 + k * 0.012) * s, s * (0.03 - k * 0.003), rgba(C.cyan, 0.5 - k * 0.07));
  dot(g, cx * s, 0.46 * s, s * 0.035, C.cyan, s * 0.08);
  g.restore();
  for (let i = 0; i < 4; i++) fig(g, (0.26 + i * 0.16 + sway * 0.55) * s, 0.95 * s, (0.3 + (i % 2) * 0.03) * s, '#cfd3f5', -0.5, -0.5, 0, sway * 0.9);
  const dir = Math.cos(t * 0.9) > 0 ? 1 : -1; g.fillStyle = rgba(C.cyan, 0.8); g.font = `700 ${s * 0.07}px sans-serif`; g.textAlign = 'center'; g.fillText(dir > 0 ? '→' : '←', (0.5 + dir * 0.42) * s, 0.8 * s); g.textAlign = 'start';
});

SIMS.duo = timed(C.pink, (g, s, t) => {
  pane(g, s, 0.05, 0.05, 0.9, 0.5); walk(g, s);
  const a = [0.5 + Math.cos(t * 1.1) * 0.25, 0.3 + Math.sin(t * 1.7) * 0.14], b = [0.5 + Math.cos(t * 1.1 + 2.6) * 0.28, 0.3 + Math.sin(t * 1.3 + 1) * 0.15];
  const k = (t * 0.5) % 1, star = [0.2 + ((Math.floor(t * 0.5) * 0.37) % 0.6), 0.14 + ((Math.floor(t * 0.5) * 0.61) % 0.3)];
  seg(g, a[0] * s, a[1] * s, b[0] * s, b[1] * s, s * 0.008, 'rgba(255,255,255,.35)', 6);
  dot(g, star[0] * s, star[1] * s, s * 0.02 * (1 + Math.sin(t * 8) * 0.2), C.amber, s * 0.08); ring(g, star[0] * s, star[1] * s, k * s * 0.09, s * 0.006, rgba(C.amber, 1 - k));
  dot(g, a[0] * s, a[1] * s, s * 0.04, C.lime, s * 0.09); dot(g, b[0] * s, b[1] * s, s * 0.04, C.pink, s * 0.09);
  [[0.33, C.lime, 0.5], [0.67, C.pink, -0.5]].forEach(([x, c, d], i) => {
    const hands = fig(g, x * s, 0.95 * s, 0.34 * s, '#cfd3f5', i ? 0.9 : -0.2, i ? -0.2 : 0.9);
    const h = hands[i ? 0 : 1]; g.shadowColor = c; g.shadowBlur = s * 0.05; box(g, h[0] - s * 0.016, h[1] - s * 0.03, s * 0.032, s * 0.05, s * 0.006, c); g.shadowBlur = 0;
    for (let n = 0; n < 2; n++) { const u = (t * 0.8 + n * 0.5 + i * 0.3) % 1; dot(g, (x + (0.5 - x) * u * 0.6) * s, (0.66 - u * 0.12) * s, s * 0.008, rgba(c, 1 - u)); }
  });
});

const make = (name) => (SIMS[name] || SIMS.fireflies)();
const paint = (g, sim, x, y, s, alpha = 1) => {
  g.save(); g.beginPath(); g.rect(x, y, s, s); g.clip(); g.fillStyle = C.ink; g.fillRect(x, y, s, s);
  g.translate(x, y); sim.draw(g, s); g.globalAlpha = 1; g.shadowBlur = 0;
  if (alpha < 1) { g.fillStyle = rgba(C.ink, 1 - alpha); g.fillRect(0, 0, s, s); }
  g.restore();
};

/* ---------- shared evening clock ---------- */
const clock = (() => {
  const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const dusk = 18.72 + 1.85 * Math.cos((TAU * (doy - 176)) / 365) + 0.2;
  const subs = [];
  const K = {
    t: 19.75, dusk, weekend: [5, 6].includes(now.getDay()), preview: true,
    get close() { return K.weekend ? 23 : 22; },
    get open() { return K.t >= dusk && K.t < K.close; },
    get speakers() { return K.open && K.t < 21; },
    state() { return K.t < dusk ? 'Resting until dusk' : !K.open ? 'Closed · windows dark' : K.speakers ? 'Games on · speakers soft' : 'Games on · sound on phones only'; },
    label() { const h = Math.floor(K.t) % 24, m = Math.floor((K.t % 1) * 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; },
    set(t) { K.t = clamp(t, 15, 24.5); subs.forEach((f) => f()); },
    on(f) { subs.push(f); },
    live(real) { const d = new Date(); let h = d.getHours() + d.getMinutes() / 60; if (h < 3) h += 24; const inRange = h >= 15 && h <= 24.5, lit = inRange && h >= dusk && h < K.close; K.preview = !(real ? inRange : lit); K.set(K.preview ? dusk + 0.9 : h); },
  };
  return K;
})();

/* ---------- sound (opt-in) ---------- */
const sound = (() => {
  let ac = null, on = false;
  const NOTES = { spark: [880, 0.07, 'sine'], flash: [520, 0.18, 'triangle'], hit: [330, 0.06, 'square'], smash: [180, 0.16, 'sawtooth'], score: [988, 0.22, 'triangle'], miss: [120, 0.25, 'sine'], clear: [660, 0.25, 'triangle'], lock: [150, 0.05, 'square'], tab: [440, 0.06, 'sine'] };
  return {
    toggle() { on = !on; if (on && !ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac && on) ac.resume(); return on; },
    fx(name) {
      if (!on || !ac || !NOTES[name]) return;
      const [f, d, type] = NOTES[name], o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, t); if (name === 'score' || name === 'clear') o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d);
      v.gain.setValueAtTime(0.06, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(ac.destination); o.start(t); o.stop(t + d);
    },
  };
})();

/* ---------- the street ---------- */
function Street(cv) {
  const g = cv.getContext('2d');
  const names = ['blocks', 'fireflies', 'volley', 'kaiju', 'racers', 'orchestra'];
  let wins = names.map(make), W = 0, H = 0, sc = 1, sceneW = 0, time = 0, party = 0, sparks = [];
  const WX = (i) => (i < 3 ? 60 + i * 114 : 648 + (i - 3) * 114), WY = 185, WS = 100;
  const stars = Array.from({ length: 60 }, () => [rnd(1036), rnd(-200, 105), rnd(0.4, 1.4), rnd(TAU)]);
  const people = Array.from({ length: 8 }, (_, i) => ({ x: rnd(1036), y: rnd(366, 390), dir: i % 2 ? 1 : -1, sp: rnd(22, 40), h: rnd(0.8, 0.98), ph: rnd(TAU), play: 0, win: -1, cool: rnd(8) }));
  this.visible = true;
  this.resize = () => {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
    sc = Math.max(H / 430, W / 1036); sceneW = 1036 * sc;
  };
  this.party = () => { party = 9; wins = wins.map((_, i) => make(Object.keys(SIMS)[((rnd(16) | 0) + i) % 16])); };
  this.step = (dt) => {
    time += dt; wins.forEach((w) => w.step(dt));
    if (party > 0) { party -= dt; if (Math.random() < dt * 5) { const x = rnd(1036), y = rnd(0, 90), c = [C.pink, C.lime, C.cyan, C.amber][rnd(4) | 0]; for (let k = 0; k < 18; k++) { const a = rnd(TAU), v = rnd(20, 70); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c }); } } if (party <= 0) wins = names.map(make); }
    sparks = sparks.filter((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; return (p.l -= dt) > 0; });
    people.forEach((p) => {
      if (p.play > 0) { p.play -= dt; if (p.play <= 0 || !clock.open) { p.play = 0; p.cool = rnd(6, 14); } return; }
      p.x += p.dir * p.sp * dt; p.ph += dt * p.sp * 0.16; p.cool -= dt;
      if (p.x < -40) p.x = 1076; if (p.x > 1076) p.x = -40;
      if (clock.open && p.cool <= 0) for (let i = 0; i < 6; i++) if (Math.abs(p.x - (WX(i) + 50 + (i % 2 ? 14 : -14))) < 2) { if (Math.random() < 0.45) { p.play = rnd(5, 12); p.win = i; } else p.cool = 3; }
    });
  };
  const person = (p, night) => {
    const s = p.h, x = p.x, y = p.y, sw = p.play ? 0 : Math.sin(p.ph) * 9, c = mix('#4a4f66', '#05060f', night);
    g.strokeStyle = c; g.lineWidth = 7 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x + sw, y); g.moveTo(x, y - 40 * s); g.lineTo(x - sw, y); g.stroke();
    box(g, x - 10 * s, y - 78 * s, 20 * s, 44 * s, 9 * s, c);
    dot(g, x, y - 88 * s, 9 * s, c);
    if (p.play) {
      const col = wins[p.win].color;
      g.strokeStyle = c; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y - 68 * s); g.lineTo(x + 9 * s, y - 56 * s); g.stroke();
      g.shadowColor = col; g.shadowBlur = 10; box(g, x + 6 * s, y - 64 * s, 6 * s, 10 * s, 1.5, col); g.shadowBlur = 0;
      dot(g, x, y - 80 * s, 16 * s, rgba(col, 0.1 * night));
      if (!clock.speakers) { g.fillStyle = rgba(col, 0.5 + 0.5 * Math.sin(time * 4 + p.ph)); g.font = `${12 * s}px sans-serif`; g.fillText('♪', x + 12 * s, y - 92 * s - (time * 6 + p.ph * 3) % 10); }
    }
  };
  this.draw = () => {
    const t = clock.t, d = clock.dusk, night = smooth(d - 0.9, d + 0.9, t), sunset = clamp(1 - Math.abs((t - d) / 1.1), 0, 1);
    let on = smooth(d - 0.2, d + 0.35, t) * (1 - smooth(clock.close - 0.04, clock.close + 0.08, t));
    if (t > 21) on *= 0.82;
    const pan = Math.max(0, sceneW - W), cam = pan * (reduced ? 0.08 : 0.5 - 0.5 * Math.cos(time * 0.13));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(sc, 0, 0, sc, -cam, H - 430 * sc);
    const sky = g.createLinearGradient(0, -220, 0, 320);
    sky.addColorStop(0, mix(mix('#3f8fd8', '#080a22', night), '#5a3a86', sunset * 0.7));
    sky.addColorStop(1, mix(mix('#cfe8fb', '#1d2350', night), '#ff9a5c', sunset));
    g.fillStyle = sky; g.fillRect(-10, -400, 1056, 730);
    stars.forEach(([x, y, r, p]) => dot(g, x, y, r, rgba(C.white, night * (0.5 + 0.5 * Math.sin(time * 1.5 + p)))));
    if (night > 0.05) dot(g, 900, 30, 15, rgba('#fff4d6', night), 34 * night);
    sparks.forEach((p) => dot(g, p.x, p.y, 1.6, rgba(p.c, p.l), 6));
    // building
    g.fillStyle = mix('#9a94a0', '#1a1d38', night); g.fillRect(20, 110, 996, 210);
    g.fillStyle = mix('#7f7986', '#12142b', night); g.fillRect(14, 104, 1008, 12); g.fillRect(20, 150, 996, 4);
    // door, number, hedges
    g.fillStyle = mix('#3b3a45', '#0a0b18', night); g.fillRect(483, 200, 70, 120);
    g.fillStyle = mix('#5f6f7f', '#141a33', night); g.fillRect(489, 206, 58, 108);
    g.fillStyle = rgba(C.amber, 0.35 + 0.65 * night); g.font = '700 15px ui-monospace, monospace'; g.textAlign = 'center'; g.fillText('2051', 518, 190);
    [[396, 476], [560, 640]].forEach(([a, b]) => { g.fillStyle = mix('#3f7a4e', '#0f2a22', night); g.beginPath(); g.roundRect(a, 282, b - a, 40, 14); g.fill(); });
    // windows
    for (let i = 0; i < 6; i++) {
      const x = WX(i);
      if (on > 0.02) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x + 50, WY + 50, 30, x + 50, WY + 50, 120); gl.addColorStop(0, rgba(wins[i].color, 0.22 * on * night)); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(x - 70, WY - 70, 240, 240); g.globalCompositeOperation = 'source-over'; }
      paint(g, wins[i], x, WY, WS, on);
      g.fillStyle = rgba('#d5dae6', (1 - night) * 0.88 * (1 - on * 0.5)); g.fillRect(x, WY, WS, WS);
      if (on < 0.05 && night > 0.5 && i % 3 === 1) { g.fillStyle = rgba(C.lime, 0.4); g.font = '700 9px ui-monospace, monospace'; g.fillText('PLAY HERE', x + 50, WY + 48); g.font = '7px ui-monospace, monospace'; g.fillText('from dusk', x + 50, WY + 60); }
      g.strokeStyle = mix('#5b5664', '#2c3160', night); g.lineWidth = 3; g.strokeRect(x, WY, WS, WS);
    }
    // speakers
    if (clock.speakers) [224, 812].forEach((x) => { for (let k = 0; k < 3; k++) { const u = (time * 0.7 + k / 3) % 1; g.strokeStyle = rgba(C.lime, (1 - u) * 0.7); g.lineWidth = 2; g.beginPath(); g.arc(x, 176, 6 + u * 18, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } });
    // ground
    g.fillStyle = mix('#bdb9b4', '#22253f', night); g.fillRect(-10, 320, 1056, 72);
    g.fillStyle = mix('#77747a', '#101227', night); g.fillRect(-10, 392, 1056, 40);
    g.fillStyle = mix('#d8d5d0', '#34385c', night); g.fillRect(-10, 390, 1056, 3);
    if (on > 0.02) for (let i = 0; i < 6; i++) {
      const x = WX(i), sp = g.createLinearGradient(0, 320, 0, 392); sp.addColorStop(0, rgba(wins[i].color, 0.34 * on * night)); sp.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sp; g.beginPath(); g.moveTo(x - 6, 320); g.lineTo(x + 106, 320); g.lineTo(x + 150, 392); g.lineTo(x - 50, 392); g.fill();
    }
    // lamps
    [36, 1000].forEach((x) => { g.fillStyle = mix('#55525c', '#0a0b18', night); g.fillRect(x - 2, 150, 4, 240); g.fillRect(x - 12, 148, 24, 5); const l = g.createRadialGradient(x, 156, 2, x, 156, 110); l.addColorStop(0, rgba('#ffd9a0', 0.55 * night)); l.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = l; g.fillRect(x - 110, 46, 220, 220); });
    people.slice().sort((a, b) => a.y - b.y).forEach((p) => person(p, night));
    g.textAlign = 'start';
  };
}

/* ---------- boot ---------- */
const sims = [];           // {canvas, sim, visible, size}
const watch = new IntersectionObserver((es) => es.forEach((e) => { const s = sims.find((q) => q.canvas === e.target); if (s) s.visible = e.isIntersecting; }), { rootMargin: '80px' });
const fit = (cv) => { const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(r.width * dpr); if (w && cv.width !== w) { cv.width = w; cv.height = w; } return cv.width; };
const addSim = (canvas, sim) => { const e = { canvas, sim, visible: false, g: canvas.getContext('2d') }; sims.push(e); watch.observe(canvas); return e; };
const render = (e, alpha) => { const s = fit(e.canvas); if (s) paint(e.g, e.sim, 0, 0, s, alpha); };

const GAMES = {
  blocks: ['Co-op puzzle', 'Up to six, one window each', 'D-pad and a Rotate button'],
  battle: ['Team versus', 'Up to six, left windows against right', 'D-pad and a Rotate button'],
  volley: ['Team sport', 'Up to 24, in two teams', 'Stick and a Smash button'],
  fireflies: ['Free roam', 'Up to 24', 'Stick and a Flash button'],
  chain: ['Build together', 'Up to 12', 'D-pad, with Gadget and Rotate buttons'],
  echo: ['Memory', 'Up to 24', 'D-pad and a Choose button'],
  fuse: ['Relay', 'Up to 12, in teams', 'D-pad, with buttons to pass left and right'],
  kaiju: ['Boss fight', 'Up to 24, working together', 'Stick and a Charge button'],
  heist: ['Stealth co-op', 'Up to 12', 'Stick, with Grab/Drop and Tiptoe buttons'],
  garden: ['Gentle', 'Up to 24', 'Stick, with Plant/Water and Seed buttons'],
  puppet: ['Performance', 'A crowd of neighbors', 'D-pad, with Perform and Done buttons'],
  sheep: ['Herding', 'Up to 12', 'Stick and a Bark button'],
  racers: ['Racing', 'Up to 24', 'One Throttle button: hold to go'],
  switchyard: ['Puzzle', 'One player per junction', 'D-pad and a Horn button'],
  tug: ['Team strength', 'Up to 24, in two teams', 'D-pad and a Pull button'],
  orchestra: ['Music', 'Up to 12', 'D-pad, with Play and Octave buttons'],
};

let street = null, demo = null, sheet = null;

function bootStreet() {
  const cv = $('street'); if (!cv || !cv.getContext) return;
  street = new Street(cv); street.resize(); addEventListener('resize', street.resize);
  new IntersectionObserver((es) => (street.visible = es[0].isIntersecting)).observe(cv);
  for (let i = 0; i < 240; i++) street.step(0.05);
  const range = $('clock-range'), box_ = $('clock');
  box_.hidden = false;
  const sync = () => {
    range.value = clock.t; $('clock-time').textContent = clock.label();
    $('clock-state').textContent = (clock.preview && !playing ? 'Tonight · ' : '') + clock.state();
    $('clock-state').dataset.s = clock.t < clock.dusk ? 'rest' : !clock.open ? 'dark' : clock.speakers ? 'loud' : 'quiet';
    const pc = (a, b) => `${((b - a) / 9.5) * 100}%`;
    if ($('tl-bar')) { $('tl-rest').style.width = pc(15, clock.dusk); $('tl-loud').style.width = pc(clock.dusk, 21); $('tl-quiet').style.width = pc(21, clock.close); $('tl-dark').style.width = pc(clock.close, 24.5); $('tl-marker').style.left = pc(15, clock.t); }
    if (reduced) street.draw();
  };
  let playing = false;
  clock.on(sync);
  range.addEventListener('input', () => { playing = false; clock.preview = false; clock.set(+range.value); });
  $('clock-live').addEventListener('click', () => { playing = false; clock.live(true); });
  $('clock-weekend').checked = clock.weekend;
  $('clock-weekend').addEventListener('change', (e) => { clock.weekend = e.target.checked; clock.set(clock.t); });
  $('clock-play').addEventListener('click', () => { playing = !playing; if (playing && clock.t > 24.3) clock.set(15); });
  $('tl-bar') && $('tl-bar').addEventListener('pointerdown', (e) => { const r = e.currentTarget.getBoundingClientRect(); playing = false; clock.preview = false; clock.set(15 + ((e.clientX - r.left) / r.width) * 9.5); });
  street.tick = (dt) => { if (playing) { clock.set(clock.t + dt * 0.5); if (clock.t >= 24.5) playing = false; } $('clock-play').textContent = playing ? '❚❚ Pause' : '▶ Play the evening'; };
  clock.live();
}

function bootDemo() {
  const cv = $('demo-canvas'); if (!cv) return;
  const keys = { up: 0, down: 0, left: 0, right: 0, a: 0 }, edge = { a: 0, up: 0 };
  const LABEL = { fireflies: ['Fireflies', 'Flash', 'You are the green one. Catch the sparks.'], volley: ['Volley', 'Smash', 'You are the green bumper. Send it right.'], blocks: ['Neon Blocks', 'Rotate', 'Left and right to move, down to drop.'] };
  const e = addSim(cv, make('fireflies'));
  demo = { e, name: 'fireflies', playing: false };
  const load = (name) => { demo.name = name; e.sim = make(name); e.sim.fx = sound.fx; $('demo-name').textContent = LABEL[name][0]; $('demo-a').textContent = LABEL[name][1]; hint(); document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.demo === name)); };
  const hint = () => { $('demo-hint').textContent = demo.playing ? LABEL[demo.name][2] : 'Watching the demo play itself'; $('demo-start').textContent = demo.playing ? 'Let go (Esc)' : 'Start playing'; $('demo').classList.toggle('live', demo.playing); };
  const start = (v) => { demo.playing = v; if (v) e.sim.score = 0; hint(); };
  const press = (k, v) => { if (v && !keys[k] && (k === 'a' || k === 'up')) edge[k] = 1; keys[k] = v; };
  demo.input = () => { const i = { x: keys.right - keys.left, y: keys.down - keys.up, a: keys.a, ap: edge.a, upp: edge.up }; edge.a = edge.up = 0; return i; };
  e.sim.fx = sound.fx;
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { load(b.dataset.demo); sound.fx('tab'); }));
  $('demo-start').addEventListener('click', () => { start(!demo.playing); if (demo.playing) cv.focus({ preventScroll: true }); });
  document.querySelectorAll('[data-key]').forEach((b) => {
    const k = b.dataset.key;
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); if (!demo.playing) start(true); press(k, 1); b.classList.add('down'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => b.addEventListener(n, () => { press(k, 0); b.classList.remove('down'); }));
  });
  const MAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'a' };
  addEventListener('keydown', (ev) => { if (!demo.playing) return; if (ev.key === 'Escape') return start(false); const k = MAP[ev.key]; if (k) { ev.preventDefault(); press(k, 1); } });
  addEventListener('keyup', (ev) => { const k = MAP[ev.key]; if (k) press(k, 0); });
  addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = 0)));
}

function bootWall() {
  document.querySelectorAll('.cab').forEach((b) => {
    const cv = document.createElement('canvas'); b.querySelector('.cab-screen').appendChild(cv);
    const e = addSim(cv, make(b.dataset.game)); for (let i = 0; i < 60; i++) e.sim.step(0.05);
    b.addEventListener('click', () => {
      const d = $('sheet'), m = GAMES[b.dataset.game]; if (!d.showModal) return;
      $('sheet-tag').textContent = m[0]; $('sheet-name').textContent = b.querySelector('.cab-name').textContent; $('sheet-blurb').textContent = b.querySelector('.cab-blurb').textContent;
      $('sheet-players').textContent = m[1]; $('sheet-controls').textContent = m[2];
      if (!sheet) sheet = addSim($('sheet-canvas'), make(b.dataset.game)); else sheet.sim = make(b.dataset.game);
      sheet.visible = true; d.showModal(); sound.fx('tab');
    });
  });
  const d = $('sheet'); if (d) { d.addEventListener('close', () => sheet && (sheet.visible = false)); d.addEventListener('click', (ev) => ev.target === d && d.close()); }
}

function bootTrio() {
  document.querySelectorAll('[data-sim]').forEach((el) => {
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); el.appendChild(cv);
    const e = addSim(cv, make(el.dataset.sim)); for (let i = 0; i < 40; i++) e.sim.step(0.05);
    if ('aim' in el.dataset) {
      const set = (ev) => { const r = cv.getBoundingClientRect(); e.sim.aim = { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }; if (reduced) { e.sim.step(0.2); render(e); } };
      cv.addEventListener('pointermove', set); cv.addEventListener('pointerdown', set);
      cv.addEventListener('pointerleave', () => (e.sim.aim = null));
    }
  });
}

function bootLost() {
  const cv = $('lost'); if (!cv) return;
  const e = addSim(cv, make('fireflies')); e.visible = true;
  const aim = { x: 0, y: 0, on: false };
  cv.addEventListener('pointermove', (ev) => { const r = cv.getBoundingClientRect(); aim.x = (ev.clientX - r.left) / r.width; aim.y = (ev.clientY - r.top) / r.height; aim.on = true; });
  demo = { e, playing: true, input: () => (aim.on ? { x: clamp((aim.x - 0.5) * 3, -1, 1), y: clamp((aim.y - 0.5) * 3, -1, 1) } : null) };
  const out = $('lost-score'); e.after = () => out && (out.textContent = `Sparks caught: ${e.sim.score}`);
}

function bootSound() {
  const b = $('sound'); if (!b || !(window.AudioContext || window.webkitAudioContext)) return;
  b.hidden = false;
  b.addEventListener('click', () => { const on = sound.toggle(); b.setAttribute('aria-pressed', on); b.querySelector('.sound-label').textContent = on ? 'Sound on' : 'Sound off'; sound.fx('score'); });
}

function bootKonami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let i = 0;
  addEventListener('keydown', (e) => { i = e.key === code[i] ? i + 1 : e.key === code[0] ? 1 : 0; if (i === code.length) { i = 0; street && street.party(); sound.fx('clear'); } });
}

let last = 0, slow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (document.hidden) return;
  if (street && street.visible) { street.tick && street.tick(dt); street.step(dt); street.draw(); }
  slow += dt; const wallTick = slow > 1 / 30; if (wallTick) slow = 0;
  sims.forEach((e) => {
    if (!e.visible) return;
    const mine = demo && e === demo.e;
    if (mine) { e.sim.step(dt, demo.playing ? demo.input() : null); render(e); const sc_ = $('demo-score'); if (sc_) sc_.textContent = `Score ${e.sim.score}`; e.after && e.after(); }
    else if (wallTick) { e.sim.step(1 / 30); render(e); }
  });
}

function boot() {
  document.documentElement.classList.add('js');
  bootStreet(); bootDemo(); bootWall(); bootTrio(); bootLost(); bootSound(); bootKonami();
  if (reduced) {
    street && street.draw();
    setTimeout(() => sims.forEach((e) => render(e)), 60);
    const tick = (now) => { requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; if (demo && demo.playing && demo.e.visible) { demo.e.sim.step(dt, demo.input()); render(demo.e); const s = $('demo-score'); if (s) s.textContent = `Score ${demo.e.sim.score}`; demo.e.after && demo.e.after(); } if (sheet && sheet.visible) render(sheet); if (street && street.tick) { const t0 = clock.t; street.tick(dt); if (clock.t !== t0) street.draw(); } };
    requestAnimationFrame(tick);
  } else requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
