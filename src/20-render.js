/* ================= engraving (VexFlow) ================= */
const VF = Vex.Flow;
const PW = 1000, PH = 1414, ML_ = 64, MR_ = 52, MT_ = 70, MB_ = 64;
let SEL = "#d4731f"; const INK = "#1b1814";
let LAY = { pages: [], mpos: {}, hits: [] };

function perSys() { return (S && S.layout && S.layout.perSys) || 0; }
function equalW() { return !(S && S.layout && S.layout.equalW === false); }
function visibleStaves() {
  if (ui.part === "all") return S.staves.map((_, i) => i);
  const st = S.staves.find(s => s.id === ui.part); if (!st) { ui.part = "all"; return S.staves.map((_, i) => i); }
  return S.staves.map((s, i) => [s, i]).filter(([s]) => s.id === st.id || (st.group && s.group === st.group)).map(x => x[1]);
}

const VCOL = { 1: "#d4731f", 2: "#23845a", 3: "#2a64b8", 4: "#9046b5" };
function drawCursor(bg, ax, topY, botY, v) {
  const c = VCOL[v] || SEL;
  svgEl(bg, "rect", { x: ax - 5, y: topY - 16, width: 20, height: botY - topY + 32, fill: c, "fill-opacity": .2, rx: 3 });
  svgEl(bg, "rect", { x: ax - 5, y: topY - 16, width: 20, height: 3, fill: c, rx: 1 });
  if (v > 1) svgEl(bg, "text", { x: ax + 5, y: topY - 20, "font-size": 10, "font-family": "Manrope,sans-serif", "font-weight": 700, "text-anchor": "middle", fill: c }).textContent = String(v);
}
function diaKey(d) { return LET[((d % 7) + 7) % 7].toLowerCase() + "/" + Math.floor(d / 7); }
function restKeyFor(clef, v, multi, whole) { const mid = CLEFDIA[clef] - 4; const off = multi ? (v % 2 ? 4 : -4) : 0; return diaKey(mid + off + (whole ? 2 : 0)); }
function vfNoteFor(st, e, m, isFull, wf, opts, v, multi) {
  const dir = multi ? (v % 2 ? 1 : -1) : (st.clef === "percussion" ? 1 : 0);
  const clef = vfClef(st);
  let n;
  if (e.t === "r") {
    if (isFull) n = new VF.StaveNote({ clef, keys: [restKeyFor(st.clef, v, multi, true)], duration: "w", type: "r", align_center: true });
    else n = new VF.StaveNote({ clef, keys: [restKeyFor(st.clef, v, multi, e.d === "w")], duration: e.d, dots: e.dots || 0, type: "r" });
  } else if (st.clef === "percussion") {
    const keys = e.keys.map(k => (DRUMBY[k] || DRUMS[5]).k);
    const uniq = [...new Set(keys)].sort((a, b) => drumDia(a) - drumDia(b));
    n = new VF.StaveNote({ clef: "percussion", keys: uniq, duration: e.d, dots: e.dots || 0, stem_direction: dir || 1 });
  } else {
    const keys = e.keys.map((k, j) => spellWritten(k, st, m, e.pf ? e.pf[j] : 0).key);
    n = dir ? new VF.StaveNote({ clef, keys, duration: e.d, dots: e.dots || 0, stem_direction: dir }) : new VF.StaveNote({ clef, keys, duration: e.d, dots: e.dots || 0, auto_stem: true });
  }
  if (!isFull && e.dots) VF.Dot.buildAndAttach([n], { all: true });
  if (e.art && e.t === "n") for (const a of e.art) {
    const A = ARTS[a]; if (!A) continue;
    const art = new VF.Articulation(A.vf);
    const up = n.getStemDirection() === 1;
    art.setPosition(a === "ferm" || a === "marc" ? VF.Modifier.Position.ABOVE : (up ? VF.Modifier.Position.BELOW : VF.Modifier.Position.ABOVE));
    n.addModifier(art, 0);
  }
  if (e.art && e.t === "r" && e.art.includes("ferm")) n.addModifier(new VF.Articulation("a@a").setPosition(VF.Modifier.Position.ABOVE), 0);
  if (opts && opts.sel && opts.sel.has(e.id)) n.setStyle({ fillStyle: VCOL[v] || SEL, strokeStyle: VCOL[v] || SEL });
  return n;
}

function buildMeasureVF(si, m, opts) {
  const st = S.staves[si], ms = st.measures[m], wf = writtenKey(st, m);
  const [num, den] = timeAt(m);
  const vs = voicesOf(ms), multi = vs.length > 1;
  const parts = vs.map(([v, evs]) => {
    const isFull = evs.length === 1 && evs[0].t === "r" && evTicks(evs[0]) === mLen(m);
    const notes = evs.map(e => vfNoteFor(st, e, m, isFull, wf, opts, v, multi));
    const tuplets = []; const groups = {};
    evs.forEach((e, k) => { if (e.tup) (groups[e.tup.g] = groups[e.tup.g] || []).push(notes[k]); });
    for (const g in groups) { const first = evs.find(e => e.tup && e.tup.g === g); try { tuplets.push(new VF.Tuplet(groups[g], { num_notes: first.tup.n, notes_occupied: first.tup.of, bracketed: true, location: multi && v % 2 === 0 ? -1 : 1 })); } catch (er) { } }
    const voice = new VF.Voice({ num_beats: num, beat_value: den }).setMode(VF.Voice.Mode.SOFT);
    voice.addTickables(notes);
    return { v, notes, voice, tuplets, evs, isFull, beams: [] };
  });
  if (st.clef !== "percussion") { try { VF.Accidental.applyAccidentals(parts.map(p => p.voice), KEYNAMES[wf]); } catch (e) { } }
  for (const p of parts) {
    try {
      const groupsB = VF.Beam.getDefaultBeamGroups(num + "/" + den);
      const o = { groups: groupsB, beam_rests: false };
      if (multi) o.stem_direction = p.v % 2 ? 1 : -1; else o.maintain_stem_directions = st.clef === "percussion";
      p.beams = VF.Beam.generateBeams(p.notes, o);
    } catch (e) { p.beams = []; }
  }
  return { parts, voices: parts.map(p => p.voice), multi };
}

function spellWritten(k, st, m, pf) {
  const t = dtr(st), ck = keyAt(m), c = spell(k, ck, pf || 0);
  if (!t) return c;
  const dd = Math.floor(t / 12) * 7 + SEMIDIA[((t % 12) + 12) % 12];
  const dia = c.oct * 7 + c.L + dd, L = ((dia % 7) + 7) % 7, oct = Math.floor(dia / 7);
  const a = (k + t) - ((oct + 1) * 12 + NAT[L]);
  if (Math.abs(a) > 2) return spell(k + t, writtenKey(st, m), pf || 0);
  const acc = a === 1 ? "#" : a === 2 ? "##" : a === -1 ? "b" : a === -2 ? "bb" : "";
  return { L, a, oct, step: LET[L], key: LET[L].toLowerCase() + acc + "/" + oct, name: LET[L] + (a === 1 ? "♯" : a === 2 ? "𝄪" : a === -1 ? "♭" : a === -2 ? "𝄫" : "") + oct };
}
function rowExtent(si, ms) {
  const st = S.staves[si]; const top = CLEFDIA[st.clef]; let up = 0, down = 0, dyn = false, lyr = false, chord = false, tx = false;
  for (const m of ms) for (const e of allEvs(st.measures[m])) {
    if (e.dyn) dyn = true; if (e.lyr) lyr = true; if (e.chord) chord = true; if (e.tx) tx = true;
    if (e.t !== "n") continue;
    for (const k of e.keys) {
      let dia;
      if (st.clef === "percussion") dia = drumDia((DRUMBY[k] || DRUMS[5]).k);
      else { const sp = spellWritten(k, st, m, 0); dia = sp.oct * 7 + sp.L; }
      up = Math.max(up, (dia - top) * 5 + 8);
      down = Math.max(down, (top - 8 - dia) * 5 + 8);
    }
  }
  if (S.spans.some(sp => sp.type !== "slur" && ms.some(m => allEvs(st.measures[m]).some(e => e.id === sp.a || e.id === sp.b)))) dyn = true;
  return { up: Math.max(0, up), down: Math.max(0, down), dyn, lyr, chord, tx };
}
function headerWidth(m, first, vis) {
  let w = 0;
  for (const si of vis) {
    const st = S.staves[si];
    const s = new VF.Stave(0, 0, 400);
    if (first) s.addClef(vfClef(st), "default", st.clef === "treble8vb" ? "8vb" : undefined);
    const keyChange = m > 0 && S.meta[m].key != null;
    if ((first || keyChange) && st.clef !== "percussion") s.addKeySignature(KEYNAMES[writtenKey(st, m)]);
    if (m === 0 || S.meta[m].time) s.addTimeSignature(timeAt(m).join("/"));
    if (S.meta[m].repBeg) s.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
    w = Math.max(w, s.getNoteStartX());
  }
  return w;
}

function measureMinWidth(m, vis) {
  const voices = [];
  let extra = 0;
  for (const si of vis) {
    const b = buildMeasureVF(si, m, null);
    voices.push(b.voices);
    const evs = b.parts[0].evs;
    let lyr = 0; for (const e of evs) if (e.lyr) lyr += Math.max(0, e.lyr.length * 6.5 - 18); extra = Math.max(extra, lyr);
    let chd = 0; for (const e of evs) if (e.chord) chd += Math.max(0, e.chord.length * 8 - 16); extra = Math.max(extra, chd);
  }
  const f = new VF.Formatter();
  voices.forEach(vs => f.joinVoices(vs));
  let w = 60;
  try { w = f.preCalculateMinTotalWidth(voices.flat()); } catch (e) { w = 120; }
  return Math.max(64, (w * 0.74 + extra) * ui.spacing + 26);
}

function familyGroups(rows) {
  const out = []; let cur = null;
  rows.forEach((si, k) => {
    const st = S.staves[si], key = st.group ? "G:" + st.group : "F:" + st.fam;
    if (cur && cur.key === key) cur.to = k; else { cur = { key, from: k, to: k, brace: !!st.group }; out.push(cur); }
  });
  return out;
}

function svgEl(svg, tag, attrs, text) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (text != null) el.textContent = text;
  svg.appendChild(el); return el;
}
function txt(svg, x, y, s, o = {}) {
  return svgEl(svg, "text", { x, y, "font-family": o.family || "'EB Garamond',Georgia,serif", "font-size": o.size || 14, "font-weight": o.weight || 400,
    "font-style": o.style || "normal", "text-anchor": o.anchor || "start", fill: o.fill || INK, ...(o.attrs || {}) }, s);
}

function render() {
  const pagesEl = document.getElementById("pages");
  pagesEl.innerHTML = "";
  pagesEl.classList.toggle("cont", ui.view === "cont");
  LAY = { pages: [], mpos: {}, hits: [], evPos: {} };
  if (!S || !S.staves.length) { pagesEl.innerHTML = '<div class="empty">ยังไม่มีเครื่องดนตรี — เพิ่มจากแท็บ “เครื่องดนตรี”</div>'; return; }
  const vis = visibleStaves();
  const N = nM();
  const showNames = ui.names;
  const mw = [], hFirst = [], hMid = [];
  for (let m = 0; m < N; m++) { mw[m] = measureMinWidth(m, vis); hFirst[m] = headerWidth(m, true, vis); hMid[m] = headerWidth(m, false, vis); }
  const nameW = (first) => showNames ? (first ? 108 : 62) : 16;
  // systems
  const systems = [];
  if (ui.view === "cont") {
    systems.push({ ms: [...Array(N).keys()] });
  } else {
    let cur = [], used = 0, first = true;
    for (let m = 0; m < N; m++) {
      const W = PW - ML_ - MR_ - nameW(systems.length === 0);
      const need = mw[m] + (cur.length === 0 ? hFirst[m] : hMid[m]);
      const NPS = perSys();
      const forced = NPS > 0 && cur.length >= NPS;
      if (cur.length && ((!NPS && used + need > W) || forced)) { systems.push({ ms: cur }); cur = []; used = 0; }
      const need2 = mw[m] + (cur.length === 0 ? hFirst[m] : hMid[m]);
      cur.push(m); used += need2;
      if (S.meta[m].brk) { systems.push({ ms: cur }); cur = []; used = 0; }
    }
    if (cur.length) systems.push({ ms: cur });
  }
  // widths & rows
  const SD = ui.staffDist;
  systems.forEach((sys, k) => {
    const first = k === 0;
    sys.nameW = nameW(first);
    sys.rows = vis.filter(si => {
      if (!ui.hideEmpty || first || ui.view === "cont") return true;
      const st = S.staves[si];
      const partners = st.group ? S.staves.filter(s => s.group === st.group) : [st];
      return partners.some(p => sys.ms.some(m => !isEmptyMeasure(p, m)));
    });
    if (!sys.rows.length) sys.rows = [vis[0]];
    sys.w = sys.ms.map((m, i) => mw[m] + (i === 0 ? hFirst[m] : hMid[m]));
    const total = sys.w.reduce((a, b) => a + b, 0);
    const W = PW - ML_ - MR_ - sys.nameW;
    const last = k === systems.length - 1;
    const NPS = perSys();
    if (ui.view !== "cont" && NPS) {
      // fixed number of measures per line
      const midBase = Math.min(...hMid);
      const heads = sys.ms.map((m, i) => i === 0 ? hFirst[m] : Math.max(0, hMid[m] - midBase));
      const H = heads.reduce((a, b) => a + b, 0);
      const avail = Math.max(40 * sys.ms.length, (W - H) * (sys.ms.length < NPS && last ? sys.ms.length / NPS : 1));
      if (equalW()) { const cell = (W - H) / NPS; sys.w = sys.ms.map((m, i) => (sys.ms.length < NPS && !last ? avail / sys.ms.length : cell) + heads[i]); }
      else { const base = sys.ms.reduce((a, m) => a + mw[m], 0); sys.w = sys.ms.map((m, i) => avail * mw[m] / base + heads[i]); }
    } else if (ui.view !== "cont" && (!last || total > W * .62) && total < W) {
      const extra = W - total, base = sys.ms.reduce((a, m) => a + mw[m], 0);
      sys.w = sys.w.map((w, i) => w + extra * (mw[sys.ms[i]] / base));
    }
    sys.ext = sys.rows.map(si => rowExtent(si, sys.ms));
    sys.rowY = []; let y = 0;
    sys.rows.forEach((si, r) => {
      sys.rowY.push(y);
      if (r === sys.rows.length - 1) return;
      const a = sys.ext[r], b = sys.ext[r + 1];
      const below = Math.max(a.down, 8) + (a.dyn ? 30 : 0) + (a.lyr ? 24 : 0);
      const above = Math.max(b.up, 8) + (b.chord ? 24 : 0) + (b.tx ? 18 : 0);
      const sameGroup = S.staves[si].group && S.staves[sys.rows[r + 1]].group === S.staves[si].group;
      y += Math.max(sameGroup ? SD - 6 : SD, 40 + below + above + 6);
    });
    const lastE = sys.ext[sys.ext.length - 1];
    sys.top = Math.max(40, sys.ext[0].up + (sys.ext[0].chord ? 24 : 0) + (sys.ext[0].tx ? 18 : 0) + 34);
    sys.h = y + 40 + Math.max(lastE.down, 8) + (lastE.dyn ? 30 : 0) + (lastE.lyr ? 24 : 0);
  });
  // pagination
  const pages = [];
  if (ui.view === "cont") {
    const sys = systems[0]; const width = ML_ + sys.nameW + sys.w.reduce((a, b) => a + b, 0) + MR_;
    sys.y = 40 + sys.top; pages.push({ w: Math.max(width, 600), h: sys.y + sys.h + 40, systems: [sys] });
  } else {
    let page = { w: PW, h: PH, systems: [] }, y = MT_ + 150;
    for (const sys of systems) {
      const top = sys.top;
      if (y + top + sys.h > PH - MB_ && page.systems.length) { pages.push(page); page = { w: PW, h: PH, systems: [] }; y = MT_ + 10; }
      sys.y = y + top; page.systems.push(sys); y = sys.y + sys.h + ui.sysGap;
    }
    pages.push(page);
  }
  const selSet = selectedIds();
  _firstSys = systems[0];
  pages.forEach((pg, pi) => drawPage(pg, pi, pagesEl, selSet, pages.length));
  LAY.systems = systems;
  updateStrip();
  positionPlayhead();
  if (typeof drawMeasureTools === "function") drawMeasureTools();
}

function drawPage(pg, pi, root, selSet, pageCount) {
  const div = document.createElement("div"); div.className = "page"; div.dataset.page = pi;
  root.appendChild(div);
  const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
  renderer.resize(pg.w, pg.h);
  const ctx = renderer.getContext();
  const svg = div.querySelector("svg");
  const bg = svgEl(svg, "g", { class: "bg" });
  const z = ui.zoom;
  svg.setAttribute("viewBox", `0 0 ${pg.w} ${pg.h}`);
  svg.setAttribute("width", pg.w * z); svg.setAttribute("height", pg.h * z);
  svg.style.width = pg.w * z + "px"; svg.style.height = pg.h * z + "px";
  const P = { el: div, svg, w: pg.w, h: pg.h, hits: [] };
  LAY.pages.push(P);
  // header
  if (pi === 0 && ui.view !== "cont") {
    const tTitle = txt(svg, pg.w / 2, MT_ + 40, S.title || "Untitled", { size: 30, anchor: "middle", weight: 600 });
    P.hits.push({ kind: "text", field: "title", x: pg.w / 2 - 200, y: MT_ + 10, w: 400, h: 40 });
    if (S.subtitle) txt(svg, pg.w / 2, MT_ + 66, S.subtitle, { size: 16, anchor: "middle", style: "italic" });
    P.hits.push({ kind: "text", field: "subtitle", x: pg.w / 2 - 200, y: MT_ + 50, w: 400, h: 24 });
    if (S.composer) txt(svg, pg.w - MR_, MT_ + 104, S.composer, { size: 14, anchor: "end" });
    P.hits.push({ kind: "text", field: "composer", x: pg.w - MR_ - 260, y: MT_ + 88, w: 260, h: 22 });
    if (S.lyricist) txt(svg, ML_, MT_ + 104, S.lyricist, { size: 14 });
    P.hits.push({ kind: "text", field: "lyricist", x: ML_, y: MT_ + 88, w: 260, h: 22 });
    if (ui.part !== "all") { const st = S.staves.find(s => s.id === ui.part); if (st) txt(svg, ML_, MT_ + 20, st.name, { size: 15, weight: 600 }); }
  } else if (ui.view !== "cont") {
    txt(svg, pi % 2 ? pg.w - MR_ : ML_, 36, String(pi + 1), { size: 13, anchor: pi % 2 ? "end" : "start" });
    txt(svg, pg.w / 2, 36, S.title, { size: 12, anchor: "middle", style: "italic", fill: "#6b6358" });
  } else {
    txt(svg, ML_, 40, S.title || "Untitled", { size: 22, weight: 600 });
    if (S.composer) txt(svg, ML_, 62, S.composer, { size: 13 });
  }
  pg.systems.forEach(sys => drawSystem(ctx, svg, bg, P, sys, selSet));
  div.addEventListener("pointerdown", ev => onPagePointer(ev, P));
  div.addEventListener("dblclick", ev => onPageDbl(ev, P));
}

function drawSystem(ctx, svg, bg, P, sys, selSet) {
  const x0 = ML_ + sys.nameW;
  const rows = sys.rows;
  const staveGrid = rows.map(() => []);
  const vfByEv = {};
  const firstSys = LAY.systems ? false : true;
  let x = x0;
  sys.ms.forEach((m, mi) => {
    const w = sys.w[mi];
    const staves = rows.map((si, r) => {
      const st = S.staves[si];
      const s = new VF.Stave(x, sys.y + sys.rowY[r], w, { space_above_staff_ln: 0, space_below_staff_ln: 0, left_bar: true });
      if (mi === 0) s.addClef(vfClef(st), "default", st.clef === "treble8vb" ? "8vb" : undefined);
      const keyChange = m > 0 && S.meta[m].key != null;
      if ((mi === 0 || keyChange) && st.clef !== "percussion") s.addKeySignature(KEYNAMES[writtenKey(st, m)]);
      if (m === 0 || S.meta[m].time) s.addTimeSignature(timeAt(m).join("/"));
      if (S.meta[m].repBeg) s.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
      const bar = S.meta[m].bar;
      s.setEndBarType(bar === "end" ? VF.Barline.type.END : bar === "double" ? VF.Barline.type.DOUBLE : bar === "repEnd" ? VF.Barline.type.REPEAT_END : VF.Barline.type.SINGLE);
      return s;
    });
    const startX = Math.max(...staves.map(s => s.getNoteStartX()));
    staves.forEach(s => s.setNoteStartX(startX));
    // selection backgrounds
    if (ui.range && m >= ui.range.m1 && m <= ui.range.m2) {
      rows.forEach((si, r) => {
        if (si >= ui.range.s1 && si <= ui.range.s2) svgEl(bg, "rect", { x: x + 1, y: sys.y + sys.rowY[r] - 8, width: w - 2, height: 56, fill: SEL, "fill-opacity": .13, stroke: SEL, "stroke-opacity": .6, "stroke-width": 1, rx: 3 });
      });
    }
    staves.forEach(s => s.setContext(ctx).draw());
    const built = rows.map(si => buildMeasureVF(si, m, { sel: selSet }));
    const f = new VF.Formatter();
    built.forEach(b => f.joinVoices(b.voices));
    try { f.format(built.flatMap(b => b.voices), Math.max(20, x + w - startX - 14)); } catch (e) { console.warn(e); }
    const tickX = {};
    built.forEach((b, r) => {
      const si = rows[r], st = S.staves[si];
      const stv = staves[r], topY = stv.getYForLine(0), botY = stv.getYForLine(4), ext = sys.ext[r];
      const evxBy = {};
      for (const part of b.parts) {
        try { part.voice.draw(ctx, stv); } catch (e) { console.warn("voice", e); }
        part.beams.forEach(bm => { try { bm.setContext(ctx).draw(); } catch (e) { } });
        part.tuplets.forEach(t => { try { t.setContext(ctx).draw(); } catch (e) { } });
        const v = part.v; let tick = 0; const evx = evxBy[v] = [];
        part.evs.forEach((e, i) => {
          const n = part.notes[i];
          let ax = 0; try { ax = n.getAbsoluteX(); } catch (er) { ax = startX; }
          vfByEv[e.id] = { n, r, si, m, v, stave: stv };
          LAY.evPos[e.id] = { page: LAY.pages.length - 1, x: ax, top: topY, bot: botY };
          evx.push({ i, x: ax, tick });
          if (tickX[tick] == null || ax < tickX[tick]) tickX[tick] = ax;
          let bb = null; try { bb = n.getBoundingBox(); } catch (er) { }
          const hx = bb ? bb.getX() : ax - 6, hy = bb ? bb.getY() : topY, hw = bb ? Math.max(bb.getW(), 12) : 14, hh = bb ? Math.max(bb.getH(), 12) : 40;
          P.hits.push({ kind: "note", s: si, m, i, v, id: e.id, x: hx - 2, y: hy - 2, w: hw + 4, h: hh + 4 });
          if (ui.input && ui.sel && ui.sel.s === si && ui.sel.m === m && ui.sel.i === i && (ui.sel.v || 1) === v) drawCursor(bg, ax, topY, botY, v);
          if (e.chord) txt(svg, ax - 2, topY - Math.max(14, ext.up + 6), prettyChord(e.chord), { size: 15, weight: 600 });
          if (e.tx) txt(svg, ax, topY - Math.max(14, ext.up + 6) - (e.chord ? 20 : 0), e.tx, { size: 13, style: "italic" });
          if (e.dyn) txt(svg, ax - 2, botY + Math.max(26, ext.down + 20), e.dyn, { size: 17, style: "italic", weight: 600, attrs: { "letter-spacing": "-0.5" } });
          if (e.lyr) txt(svg, ax + 4, botY + Math.max(26, ext.down + 20) + (ext.dyn ? 26 : 0), e.lyr, { size: 13.5, anchor: "middle", family: "'Manrope','EB Garamond',sans-serif" });
          tick += evTicks(e);
        });
      }
      // cursor in a voice that does not exist yet in this measure
      if (ui.input && ui.sel && ui.sel.s === si && ui.sel.m === m && !evxBy[ui.sel.v || 1]) {
        const t = posTick(ui.sel); let cx = startX + 4;
        for (const p of evxBy[1]) if (p.tick <= t) cx = p.x;
        drawCursor(bg, cx, topY, botY, ui.sel.v || 1);
      }
      P.hits.push({ kind: "stave", s: si, m, x: x, y: topY - 14, w, h: botY - topY + 28, topY, evx: evxBy[1], evxBy, stave: stv });
    });
    // measure meta
    const top = sys.y + sys.rowY[0];
    if (mi === 0 && ui.mnum !== "none" && m > 0) txt(svg, x + 2, top - 12, String(m + 1), { size: 11, style: "italic", fill: "#5d564d" });
    if (ui.mnum === "all" && mi > 0) txt(svg, x + 2, top - 12, String(m + 1), { size: 10, style: "italic", fill: "#8a8174" });
    let aboveY = top - 28;
    if (S.meta[m].reh) {
      const rx = mi === 0 ? x0 - 6 : x - 4;
      svgEl(svg, "rect", { x: rx, y: aboveY - 24, width: 16 + S.meta[m].reh.length * 10, height: 24, fill: "none", stroke: INK, "stroke-width": 1.4, rx: 2 });
      txt(svg, rx + 8 + S.meta[m].reh.length * 5, aboveY - 6, S.meta[m].reh, { size: 17, weight: 600, anchor: "middle", family: "'Manrope',sans-serif" });
      aboveY -= 0;
    }
    const tempoHere = m === 0 ? { bpm: S.tempo, text: S.tempoText } : S.meta[m].tempo;
    if (tempoHere && (m === 0 || mi >= 0)) {
      const tx = (S.meta[m].reh ? 40 : 0) + (mi === 0 ? x0 : x + 4);
      const label = (tempoHere.text ? tempoHere.text + "  " : "");
      const t1 = txt(svg, tx, aboveY - 6, label, { size: 15, weight: 600 });
      let lw = label.length * 7.6; try { const L = t1.getComputedTextLength(); if (L > 0) lw = L + 4; } catch (e) { }
      txt(svg, tx + lw, aboveY - 6, "♩", { size: 17, family: "'Noto Music',serif" });
      txt(svg, tx + lw + 12, aboveY - 6, "= " + tempoHere.bpm, { size: 15 });
    }
    if (S.meta[m].text) txt(svg, (mi === 0 ? x0 : x) + 6, top - 14 - (S.meta[m].reh || tempoHere ? 34 : 0), S.meta[m].text, { size: 14, weight: 600, style: "italic" });
    if (S.meta[m].brk && ui.view !== "cont") txt(svg, x + w - 2, top - 6, "↵", { size: 12, anchor: "end", fill: "#b06a28", family: "'Manrope',sans-serif" });
    // connectors per family group
    const groups = familyGroups(rows);
    const bar = S.meta[m].bar;
    groups.forEach(g => {
      if (g.from === g.to && !g.brace) return;
      try {
        const c = new VF.StaveConnector(staves[g.from], staves[g.to]);
        c.setType(bar === "end" ? "boldDoubleRight" : bar === "double" ? "thinDouble" : "singleRight");
        if (bar !== "repEnd") c.setContext(ctx).draw();
      } catch (e) { }
    });
    staves.forEach((s, r) => staveGrid[r].push(s));
    // playhead geometry
    if (!LAY.mpos[m]) {
      const pts = Object.keys(tickX).map(Number).sort((a, b) => a - b).map(t => [t, tickX[t]]);
      LAY.mpos[m] = { page: LAY.pages.length - 1, mx: x, x1: startX, x2: x + w, yTop: top - 18, yBot: sys.y + sys.rowY[rows.length - 1] + 58, pts, len: mLen(m) };
    }
    x += w;
  });
  // system-left connectors, braces, brackets, names
  const firstStaves = staveGrid.map(r => r[0]);
  if (rows.length > 1) { try { new VF.StaveConnector(firstStaves[0], firstStaves[rows.length - 1]).setType("singleLeft").setContext(ctx).draw(); } catch (e) { } }
  const groups = familyGroups(rows);
  groups.forEach(g => {
    if (g.brace) { try { new VF.StaveConnector(firstStaves[g.from], firstStaves[g.to]).setType("brace").setContext(ctx).draw(); } catch (e) { } }
    else if (g.to > g.from) { try { new VF.StaveConnector(firstStaves[g.from], firstStaves[g.to]).setType("bracket").setContext(ctx).draw(); } catch (e) { } }
  });
  if (ui.names) {
    const done = new Set();
    rows.forEach((si, r) => {
      const st = S.staves[si];
      if (st.group && done.has(st.group)) return;
      let yc = firstStaves[r].getYForLine(2) + 5;
      if (st.group) { done.add(st.group); const rr = rows.map((x, k) => [x, k]).filter(([x]) => S.staves[x].group === st.group).map(a => a[1]); const last = rr[rr.length - 1]; yc = (firstStaves[rr[0]].getYForLine(0) + firstStaves[last].getYForLine(4)) / 2 + 5; }
      const label = sys === LAY_firstSystem() ? st.name : st.short;
      txt(svg, x0 - (st.group ? 24 : 12), yc, label, { size: sys === LAY_firstSystem() ? 13.5 : 12.5, anchor: "end", family: "'Manrope',sans-serif", fill: "#2a251f" });
    });
  }
  // ties (per voice), slurs, hairpins
  rows.forEach((si, r) => {
    const st = S.staves[si];
    for (const v of [1, 2, 3, 4]) {
      const list = [];
      sys.ms.forEach(m => { const l = V(st.measures[m], v); if (l) list.push(...l); else list.push(null); });
      if (!list.some(Boolean)) continue;
      const firstM = sys.ms[0];
      if (firstM > 0 && list[0] && list[0].t === "n") {
        const pl = V(st.measures[firstM - 1], v), pe = pl && pl[pl.length - 1];
        if (pe && pe.t === "n" && pe.tie) drawTie(ctx, null, vfByEv[list[0].id], pe, list[0]);
      }
      list.forEach((e, k) => {
        if (!e || e.t !== "n" || !e.tie) return;
        if (k + 1 < list.length) { const nx = list[k + 1]; if (nx && nx.t === "n") drawTie(ctx, vfByEv[e.id], vfByEv[nx.id], e, nx); }
        else {
          const lastM = sys.ms[sys.ms.length - 1];
          if (lastM + 1 < nM()) { const nl = V(st.measures[lastM + 1], v), ne = nl && nl[0]; if (ne && ne.t === "n") drawTie(ctx, vfByEv[e.id], null, e, ne); }
        }
      });
    }
  });
  const sysStartX = x0, sysEndX = x;
  for (const sp of S.spans) {
    const A = vfByEv[sp.a], B = vfByEv[sp.b];
    if (!A && !B) {
      // span might pass through this system entirely
      const fa = findEv(sp.a), fb = findEv(sp.b);
      if (!fa || !fb) continue;
      if (fa.m < sys.ms[0] && fb.m > sys.ms[sys.ms.length - 1] && rows.includes(fa.s)) {
        const r = rows.indexOf(fa.s); drawSpan(svg, sp, null, null, staveGrid[r][0], sysStartX, sysEndX, sys.ext[r]);
      }
      continue;
    }
    if (A && B) drawSpan(svg, sp, A, B, A.stave, sysStartX, sysEndX, sys.ext[A.r]);
    else if (A) drawSpan(svg, sp, A, null, A.stave, sysStartX, sysEndX, sys.ext[A.r]);
    else drawSpan(svg, sp, null, B, B.stave, sysStartX, sysEndX, sys.ext[B.r]);
  }
}
let _firstSys = null;
function LAY_firstSystem() { return _firstSys; }

function drawTie(ctx, A, B, ea, eb) {
  const common = ea.keys.filter(k => eb.keys.includes(k));
  if (!common.length) return;
  const idxA = A ? common.map(k => sortedIndex(A, ea, k)) : common.map((_, i) => i);
  const idxB = B ? common.map(k => sortedIndex(B, eb, k)) : idxA;
  try {
    new VF.StaveTie({ first_note: A ? A.n : null, last_note: B ? B.n : null, first_indices: A ? idxA : idxB, last_indices: B ? idxB : idxA }).setContext(ctx).draw();
  } catch (e) { }
}
function sortedIndex(V, e, k) {
  // VexFlow sorts keys by line; our keys are sorted ascending already, so index matches for pitched staves
  const i = e.keys.indexOf(k); return Math.max(0, Math.min(i, V.n.keys.length - 1));
}

function drawSpan(svg, sp, A, B, stave, sx, ex, ext) {
  const topY = stave.getYForLine(0), botY = stave.getYForLine(4);
  if (sp.type === "slur") {
    let x1, y1, x2, y2, below = false;
    const pick = (V) => { const ys = V.n.getYs(); const up = V.n.getStemDirection && V.n.getStemDirection() === 1; return { up, top: Math.min(...ys), bot: Math.max(...ys), x: V.n.getAbsoluteX() }; };
    const a = A ? pick(A) : null, b = B ? pick(B) : null;
    below = a ? a.up : (b ? b.up : false);
    const mv = A || B; if (mv && hasMulti(S.staves[mv.si].measures[mv.m])) below = (mv.v || 1) % 2 === 0;
    if (a) { x1 = a.x + 5; y1 = below ? a.bot + 9 : a.top - 9; } else { x1 = sx + 4; y1 = below ? botY + 14 : topY - 14; }
    if (b) { x2 = b.x + 5; y2 = below ? b.bot + 9 : b.top - 9; } else { x2 = ex - 4; y2 = y1; }
    if (!a) y1 = y2;
    const h = Math.min(22, 8 + (x2 - x1) * .06) * (below ? 1 : -1);
    const c1x = x1 + (x2 - x1) * .25, c2x = x1 + (x2 - x1) * .75;
    const d = `M${x1},${y1} C${c1x},${y1 + h} ${c2x},${y2 + h} ${x2},${y2} C${c2x},${y2 + h * .78} ${c1x},${y1 + h * .78} ${x1},${y1} Z`;
    svgEl(svg, "path", { d, fill: INK, stroke: INK, "stroke-width": .6 });
  } else {
    const y = botY + Math.max(22, ((ext && ext.down) || 0) + 16);
    const x1 = A ? A.n.getAbsoluteX() + 2 : sx + 4;
    const x2 = B ? B.n.getAbsoluteX() + 10 : ex - 6;
    const open = 7;
    const cr = sp.type === "cresc";
    const pts = cr ? [[x2, y - open], [x1, y], [x2, y + open]] : [[x1, y - open], [x2, y], [x1, y + open]];
    svgEl(svg, "polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: INK, "stroke-width": 1.3 });
  }
}

function prettyChord(c) { return c.replace(/b/g, "♭").replace(/#/g, "♯").replace(/^(.)♭/, "$1♭").replace(/maj/g, "maj").replace(/(^|\/)([A-G])♭/g, "$1$2♭"); }

function selectedIds() {
  const set = new Set();
  if (ui.sel && !ui.input) { const e = evAt(ui.sel); if (e) set.add(e.id); }
  if (ui.anchor && ui.sel) for (const e of noteRange()) set.add(e.id);
  if (ui.range) for (let s = ui.range.s1; s <= ui.range.s2; s++) for (let m = ui.range.m1; m <= ui.range.m2; m++) if (S.staves[s]) allEvs(S.staves[s].measures[m]).forEach(e => set.add(e.id));
  return set;
}
function noteRange() {
  if (!ui.anchor || !ui.sel || ui.anchor.s !== ui.sel.s || (ui.anchor.v || 1) !== (ui.sel.v || 1)) return [];
  const a = ui.anchor, b = ui.sel;
  const ka = a.m * 1e4 + a.i, kb = b.m * 1e4 + b.i;
  const [p, q] = ka <= kb ? [a, b] : [b, a];
  const out = [], st = S.staves[a.s];
  for (let m = p.m; m <= q.m; m++) (V(st.measures[m], a.v || 1) || []).forEach((e, i) => {
    if ((m > p.m || i >= p.i) && (m < q.m || i <= q.i)) out.push(e);
  });
  return out;
}
