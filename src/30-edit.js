/* ================= UI state, undo, editing commands ================= */
const ui = {
  sel: null, anchor: null, range: null, input: false, dur: "q", dots: 0, tup: false, lastPitch: 72, lastEntered: null,
  view: "page", zoom: 1, concert: false, part: "all", hideEmpty: false, names: true, mnum: "sys", spacing: 1, staffDist: 84, sysGap: 40, perSys: 0,
  voice: 1, tab: "write", rtab: "props", swing: false, metro: false, loop: false, clip: null
};
const undoStack = [], redoStack = [];
let dirty = false;
function snapshot() { return JSON.stringify(S); }
function commit(fn, label) {
  undoStack.push(snapshot()); if (undoStack.length > 120) undoStack.shift();
  redoStack.length = 0;
  try { fn(); } catch (e) { console.error(e); toast("ทำไม่สำเร็จ: " + e.message); }
  afterChange();
}
function afterChange() { dirty = true; autosave(); render(); refreshPanels(); }
function undo() { if (!undoStack.length) return toast("ไม่มีอะไรให้เลิกทำ"); redoStack.push(snapshot()); S = JSON.parse(undoStack.pop()); syncIds(); fixSel(); afterChange(); }
function redo() { if (!redoStack.length) return toast("ไม่มีอะไรให้ทำซ้ำ"); undoStack.push(snapshot()); S = JSON.parse(redoStack.pop()); syncIds(); fixSel(); afterChange(); }
function fixSel() {
  if (ui.sel && !evAt(ui.sel)) ui.sel = null;
  if (ui.anchor && !evAt(ui.anchor)) ui.anchor = null;
  if (ui.range && (ui.range.m2 >= nM() || ui.range.s2 >= S.staves.length)) ui.range = null;
}
let saveTimer = null;
function autosave() {
  clearTimeout(saveTimer);
  const st = document.getElementById("docState"); if (st) st.textContent = "กำลังบันทึก…";
  saveTimer = setTimeout(() => { try { localStorage.setItem("nota-score-v1", snapshot()); } catch (e) { } if (st) st.textContent = "บันทึกในเบราว์เซอร์นี้แล้ว"; }, 400);
}
let toastTimer = null;
function toast(msg) {
  let t = document.querySelector(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- selection helpers ---------- */
function selectEv(p, extend) {
  if (!p) return;
  if (extend && ui.sel && ui.sel.s === p.s) { if (!ui.anchor) ui.anchor = { ...ui.sel }; }
  else ui.anchor = null;
  ui.sel = p; ui.range = null;
  const e = evAt(p); if (e && e.t === "n" && e.keys.length) ui.lastPitch = e.keys[e.keys.length - 1] + dtr(S.staves[p.s]);
  render(); refreshPanels(); scrollToSel();
}
function selectMeasure(s, m, extend) {
  if (extend && (ui.range || ui.sel)) {
    const r = ui.range || { s1: ui.sel.s, s2: ui.sel.s, m1: ui.sel.m, m2: ui.sel.m };
    const base = ui.rangeBase || { s: r.s1, m: r.m1 };
    ui.range = { s1: Math.min(base.s, s), s2: Math.max(base.s, s), m1: Math.min(base.m, m), m2: Math.max(base.m, m) };
    ui.rangeBase = base;
  } else { ui.range = { s1: s, s2: s, m1: m, m2: m }; ui.rangeBase = { s, m }; }
  ui.sel = { s: ui.range.s1, m: ui.range.m1, i: 0, v: 1 }; ui.anchor = null;
  render(); refreshPanels();
}
function clearSel() { ui.sel = null; ui.anchor = null; ui.range = null; render(); refreshPanels(); }
function scrollToSel() {
  if (!ui.sel) return; const e = evAt(ui.sel); if (!e) return; const p = LAY.evPos[e.id]; if (!p) return;
  const pg = LAY.pages[p.page]; if (!pg) return;
  const c = document.getElementById("canvas"), r = pg.el.getBoundingClientRect(), cr = c.getBoundingClientRect();
  const x = r.left + p.x * ui.zoom - cr.left, y = r.top + p.top * ui.zoom - cr.top;
  if (y < 40 || y > cr.height - 80) c.scrollBy({ top: y - cr.height / 3, behavior: "smooth" });
  if (x < 40 || x > cr.width - 60) c.scrollBy({ left: x - cr.width / 2, behavior: "smooth" });
}
function selTargets() {
  // events affected by notation commands
  if (ui.range) { const out = []; for (let s = ui.range.s1; s <= ui.range.s2; s++) for (let m = ui.range.m1; m <= ui.range.m2; m++) allEvs(S.staves[s].measures[m]).forEach(e => out.push(e)); return out; }
  if (ui.anchor) return noteRange();
  if (ui.input && ui.lastEntered) { const f = findEv(ui.lastEntered); if (f) return [f.e]; }
  const e = evAt(ui.sel); return e ? [e] : [];
}
function needSel() { if (!ui.sel && !ui.range) { toast("เลือกโน้ตหรือห้องก่อน"); return false; } return true; }

/* ---------- note input ---------- */
function setInput(on) {
  ui.input = on;
  if (on && !ui.sel) ui.sel = ui.range ? { s: ui.range.s1, m: ui.range.m1, i: 0, v: 1 } : { s: 0, m: 0, i: 0, v: 1 };
  if (on) { ui.range = null; ui.anchor = null; if ((ui.sel.v || 1) !== ui.voice) { const st = S.staves[ui.sel.s], t = posTick(ui.sel); ui.sel = { s: ui.sel.s, m: ui.sel.m, i: evAtTick(vList(st, ui.sel.m, ui.voice), t), v: ui.voice }; } }
  render(); refreshPanels(); renderRibbon();
}
function pitchFromLetter(letter, st) {
  const L = LET.indexOf(letter);
  const wf = writtenKey(st, ui.sel.m);
  const ref = ui.lastPitch;
  let best = null;
  for (let oct = 0; oct <= 8; oct++) {
    const w = diaToMidi(oct * 7 + L, wf);
    if (best == null || Math.abs(w - ref) < Math.abs(best - ref)) best = w;
  }
  return best;
}
function drumFromWritten(wm) {
  const dia = midiToDia(wm);
  let best = DRUMS[0]; for (const d of DRUMS) if (Math.abs(drumDia(d.k) - dia) < Math.abs(drumDia(best.k) - dia)) best = d;
  return best.m;
}
function enterPitchWritten(wm, addToChord) {
  if (!ui.sel) return;
  const st = S.staves[ui.sel.s];
  const concert = st.clef === "percussion" ? drumFromWritten(wm) : wm - dtr(st);
  ui.lastPitch = wm;
  if (addToChord) return addChordNote(concert);
  enterEvent([concert]);
  if (st.clef !== "percussion") playPreview(concert, st);
}
function enterEvent(keys) {
  if (!ui.sel) return;
  commit(() => {
    const { s, m, i } = ui.sel; const v = ui.sel.v || 1; const st = S.staves[s]; const evs = ensureVoice(st, m, v); const cur = evs[i];
    if (!ui.input) { // overwrite selected event pitch, keep duration
      if (cur) { if (keys && keys.length) { cur.t = "n"; cur.keys = [...keys].sort((a, b) => a - b); } else { cur.t = "r"; cur.keys = []; delete cur.tie; } ui.lastEntered = cur.id; }
      return;
    }
    if (cur && cur.tup) {
      if (keys && keys.length) { cur.t = "n"; cur.keys = [...keys]; } else { cur.t = "r"; cur.keys = []; }
      ui.lastEntered = cur.id;
      const nx = nextEvPos(s, m, i, v); if (nx) ui.sel = nx; else { ensureMeasure(m + 1); ui.sel = { s, m: m + 1, i: 0, v }; }
      return;
    }
    const t = evStart(evs, i);
    if (ui.tup) {
      const base = DT[ui.dur], L = base * 2;
      if (t + L > mLen(m)) { toast("พื้นที่ในห้องไม่พอสำหรับ triplet"); return; }
      const g = "t" + nid();
      const grp = [0, 1, 2].map(k => { const e = k === 0 && keys && keys.length ? mkNote(keys, ui.dur) : mkRest(ui.dur); e.tup = { n: 3, of: 2, g }; return e; });
      setVoice(st, m, v, replaceSpan(evs, t, L, grp));
      ui.lastEntered = grp[0].id;
      const ni = V(st.measures[m], v).indexOf(grp[1]); ui.sel = { s, m, i: ni, v };
      return;
    }
    const L = durTicks(ui.dur, ui.dots);
    const r = insertAt(s, m, t, L, keys, null, v);
    ui.lastEntered = r.firstId;
    ui.sel = r.pos;
  });
  scrollToSel();
}
function addChordNote(concert) {
  const tgt = ui.input && ui.lastEntered ? findEv(ui.lastEntered) : (ui.sel ? { e: evAt(ui.sel) } : null);
  if (!tgt || !tgt.e) return;
  commit(() => { const e = tgt.e; if (e.t === "r") { e.t = "n"; e.keys = []; } if (!e.keys.includes(concert)) e.keys.push(concert); e.keys.sort((a, b) => a - b); });
  const st = ui.sel ? S.staves[ui.sel.s] : null; if (st && st.clef !== "percussion") playPreview(concert, st);
}
function enterRest() { enterEvent(null); }
function shiftPitch(semi) {
  const tg = selTargets().filter(e => e.t === "n"); if (!tg.length) return;
  const st = ui.sel ? S.staves[ui.sel.s] : null;
  commit(() => tg.forEach(e => {
    if (st && st.clef === "percussion") { e.keys = e.keys.map(k => { const ix = DRUMS.findIndex(d => d.m === k); const nx = DRUMS[Math.max(0, Math.min(DRUMS.length - 1, ix - Math.sign(semi)))]; return nx ? nx.m : k; }); }
    else { e.keys = e.keys.map(k => Math.max(12, Math.min(120, k + semi))); if (Math.abs(semi) === 1) e.pf = e.keys.map(() => semi); }
    e.keys.sort((a, b) => a - b);
  }));
  const e = tg[tg.length - 1]; if (st && st.clef !== "percussion" && e) { playPreview(e.keys[e.keys.length - 1], st); ui.lastPitch = e.keys[e.keys.length - 1] + dtr(st); }
}
function setAccidental(kind) {
  const tg = selTargets().filter(e => e.t === "n"); if (!tg.length) return toast("เลือกโน้ตก่อน");
  const st = S.staves[ui.sel ? ui.sel.s : 0];
  commit(() => tg.forEach(e => {
    e.keys = e.keys.map((k, j) => {
      const w = k + dtr(st), sp = spell(w, writtenKey(st, 0), e.pf ? e.pf[j] : 0);
      const nat = (sp.oct + 1) * 12 + NAT[sp.L];
      const target = kind === "sharp" ? nat + 1 : kind === "flat" ? nat - 1 : kind === "dsharp" ? nat + 2 : kind === "dflat" ? nat - 2 : nat;
      return target - dtr(st);
    });
    e.pf = e.keys.map(() => kind === "sharp" || kind === "dsharp" ? 1 : kind === "flat" || kind === "dflat" ? -1 : 0);
  }));
}
function setDuration(d) {
  ui.dur = d;
  if (!ui.input && ui.sel && !ui.range && !ui.anchor) {
    const { s, m, i } = ui.sel; const v = ui.sel.v || 1; const e = evAt(ui.sel); if (!e || e.tup) { renderRibbon(); return; }
    commit(() => {
      const evs = V(S.staves[s].measures[m], v), t = evStart(evs, i);
      const L = Math.min(durTicks(d, ui.dots), mLen(m) - t);
      const parts = decompose(L);
      const ne = parts.map(([dd, dots]) => { const c = cloneEv(e); c.d = dd; c.dots = dots; return c; });
      ne.forEach((c, k) => { if (k < ne.length - 1 && c.t === "n") c.tie = true; if (k > 0) { delete c.dyn; delete c.lyr; delete c.chord; delete c.tx; delete c.art; } });
      ne[ne.length - 1].tie = e.tie;
      setVoice(S.staves[s], m, v, replaceSpan(evs, t, L, ne));
      remapSpans(e.id, ne[0].id);
      ui.sel = { s, m, i: V(S.staves[s].measures[m], v).indexOf(ne[0]), v };
    });
  }
  renderRibbon();
}
function remapSpans(oldId, newId) { for (const sp of S.spans) { if (sp.a === oldId) sp.a = newId; if (sp.b === oldId) sp.b = newId; } }
function toggleDot() {
  ui.dots = ui.dots ? 0 : 1;
  if (!ui.input && ui.sel && !ui.range) setDuration(ui.dur); else renderRibbon();
}
function toggleTie() {
  const tg = selTargets().filter(e => e.t === "n"); if (!tg.length) return toast("เลือกโน้ตก่อน");
  if (ui.input && ui.lastEntered) {
    // MuseScore: add tied note of same pitch at cursor
    const f = findEv(ui.lastEntered); if (!f || f.e.t !== "n") return;
    const keys = [...f.e.keys];
    commit(() => { f.e.tie = true; const { s, m } = ui.sel; const v = ui.sel.v || 1; const t = posTick(ui.sel); const r = insertAt(s, m, t, durTicks(ui.dur, ui.dots), keys, null, v); ui.lastEntered = r.firstId; ui.sel = r.pos; });
    return;
  }
  const on = !tg.every(e => e.tie);
  commit(() => tg.forEach(e => { if (on) e.tie = true; else delete e.tie; }));
}
function toggleArt(a) {
  const tg = selTargets().filter(e => e.t === "n" || a === "ferm"); if (!tg.length) return toast("เลือกโน้ตก่อน");
  const on = !tg.every(e => e.art && e.art.includes(a));
  commit(() => tg.forEach(e => { e.art = (e.art || []).filter(x => x !== a); if (on) e.art.push(a); if (!e.art.length) delete e.art; }));
}
function setDyn(d) {
  const tg = selTargets(); if (!tg.length) return toast("เลือกโน้ตก่อน");
  commit(() => { const e = tg[0]; if (e.dyn === d) delete e.dyn; else e.dyn = d; });
}
function addSpan(type) {
  let a, b;
  if (ui.anchor && ui.sel) { const r = noteRange(); a = r[0]; b = r[r.length - 1]; }
  else if (ui.range) { const st = S.staves[ui.range.s1]; a = st.measures[ui.range.m1].ev[0]; const lm = st.measures[ui.range.m2].ev; b = lm[lm.length - 1]; }
  else if (ui.sel) { a = evAt(ui.sel); const nx = nextEvPos(ui.sel.s, ui.sel.m, ui.sel.i, ui.sel.v || 1); b = nx ? evAt(nx) : a; }
  if (!a || !b || a === b && type === "slur") return toast("เลือกช่วงโน้ต (Shift+คลิก หรือ Shift+→) ก่อน");
  commit(() => {
    const ex = S.spans.findIndex(sp => sp.a === a.id && sp.b === b.id && sp.type === type);
    if (ex >= 0) S.spans.splice(ex, 1); else S.spans.push({ type, a: a.id, b: b.id });
  });
}
function deleteSel() {
  if (ui.range) {
    commit(() => { for (let s = ui.range.s1; s <= ui.range.s2; s++) for (let m = ui.range.m1; m <= ui.range.m2; m++) S.staves[s].measures[m] = emptyMeasure(m); cleanupSpans(); });
    return;
  }
  const tg = ui.anchor ? noteRange() : (ui.sel ? [evAt(ui.sel)] : []);
  if (!tg.length || !tg[0]) return;
  const wasV = ui.sel ? ui.sel.v || 1 : 1;
  commit(() => {
    tg.forEach(e => { e.t = "r"; e.keys = []; delete e.tie; delete e.art; delete e.dyn; delete e.lyr; delete e.pf; });
    if (wasV > 1 && ui.sel) { const st = S.staves[ui.sel.s], before = !!V(st.measures[ui.sel.m], wasV); dropEmptyVoices(st, ui.sel.m); if (before && !V(st.measures[ui.sel.m], wasV)) { if (!ui.input) ui.sel = { s: ui.sel.s, m: ui.sel.m, i: 0, v: 1 }; } }
    cleanupSpans();
  });
}
/* ---------- voices ---------- */
function chooseVoice(v) {
  ui.voice = v;
  if (ui.sel && ui.input) {
    const st = S.staves[ui.sel.s], t = posTick(ui.sel);
    ui.sel = { s: ui.sel.s, m: ui.sel.m, i: evAtTick(vList(st, ui.sel.m, v), t), v };
    render(); refreshPanels(); renderRibbon(); return;
  }
  const e = ui.sel && !ui.range && !ui.anchor ? evAt(ui.sel) : null;
  if (e && (ui.sel.v || 1) !== v) {
    if (e.tup) { toast("ย้าย triplet ข้ามเสียงยังไม่รองรับ"); renderRibbon(); return; }
    const { s, m, i } = ui.sel, from = ui.sel.v || 1, st = S.staves[s];
    commit(() => {
      const src = V(st.measures[m], from), t = evStart(src, i), L = evTicks(e);
      src[i] = mkRest(e.d, e.dots);
      const tgt = ensureVoice(st, m, v);
      setVoice(st, m, v, replaceSpan(tgt, t, L, [e]));
      dropEmptyVoices(st, m);
      ui.sel = { s, m, i: V(st.measures[m], v).indexOf(e), v };
    });
    toast("ย้ายไปเสียง " + v);
  }
  renderRibbon(); renderStatus();
}
function cleanupSpans() { S.spans = S.spans.filter(sp => { const a = findEv(sp.a), b = findEv(sp.b); return a && b && a.e.t === "n" && b.e.t === "n"; }); }
function moveSel(dir, byMeasure, extend) {
  if (!ui.sel) { if (S.staves.length) selectEv({ s: 0, m: 0, i: 0, v: 1 }); return; }
  let p = ui.sel; const v = p.v || 1;
  if (byMeasure) { const m = Math.max(0, Math.min(nM() - 1, p.m + dir)); p = { s: p.s, m, i: 0, v }; }
  else p = dir > 0 ? nextEvPos(p.s, p.m, p.i, v) : prevEvPos(p.s, p.m, p.i, v);
  if (!ui.input && p && !evAt(p)) { const m = p.m; p = { s: p.s, m, i: 0, v: 1 }; }
  if (!p) { if (dir > 0 && ui.input) { commit(() => ensureMeasure(nM())); p = { s: ui.sel.s, m: nM() - 1, i: 0, v }; } else return; }
  if (ui.input) { ui.sel = p; render(); refreshPanels(); scrollToSel(); return; }
  selectEv(p, extend);
}
function moveStaff(dir) {
  if (!ui.sel) return;
  const vis = visibleStaves(); const k = vis.indexOf(ui.sel.s); const ns = vis[Math.max(0, Math.min(vis.length - 1, k + dir))];
  if (ns == null) return;
  const t = posTick(ui.sel), v = ui.input ? (ui.sel.v || 1) : 1;
  const p = { s: ns, m: ui.sel.m, i: evAtTick(vList(S.staves[ns], ui.sel.m, v), t), v };
  if (ui.input) { ui.sel = p; render(); refreshPanels(); } else selectEv(p);
}
/* ---------- clipboard ---------- */
function copySel() {
  if (ui.range) {
    const r = ui.range, data = [];
    for (let s = r.s1; s <= r.s2; s++) { const row = []; for (let m = r.m1; m <= r.m2; m++) row.push(JSON.parse(JSON.stringify(S.staves[s].measures[m]))); data.push(row); }
    ui.clip = { kind: "measures", data }; toast(`คัดลอก ${r.m2 - r.m1 + 1} ห้อง × ${r.s2 - r.s1 + 1} บรรทัด`);
  } else {
    const evs = ui.anchor ? noteRange() : (ui.sel ? [evAt(ui.sel)] : []);
    if (!evs.length || !evs[0]) return;
    ui.clip = { kind: "notes", data: JSON.parse(JSON.stringify(evs)) }; toast(`คัดลอกโน้ต ${evs.length} ตัว`);
  }
}
function pasteSel() {
  if (!ui.clip) return toast("คลิปบอร์ดว่าง");
  const at = ui.range ? { s: ui.range.s1, m: ui.range.m1, i: 0 } : ui.sel; if (!at) return toast("เลือกตำแหน่งที่จะวางก่อน");
  commit(() => {
    if (ui.clip.kind === "measures") {
      ui.clip.data.forEach((row, ds) => {
        const s = at.s + ds; if (!S.staves[s]) return;
        row.forEach((ms, dm) => { const m = at.m + dm; ensureMeasure(m); const nm = { ev: (ms.ev || ms).map(cloneEv) }; if (ms.vx) { nm.vx = {}; for (const k in ms.vx) nm.vx[k] = ms.vx[k].map(cloneEv); } S.staves[s].measures[m] = nm; refitMeasure(S.staves[s], m); });
      });
      ui.range = { s1: at.s, s2: Math.min(S.staves.length - 1, at.s + ui.clip.data.length - 1), m1: at.m, m2: at.m + ui.clip.data[0].length - 1 };
    } else {
      let p = at;
      for (const e of ui.clip.data) {
        const t = posTick(p);
        const r = insertAt(p.s, p.m, t, evTicks(e), e.t === "n" ? e.keys : null, null, p.v || 1);
        const f = findEv(r.firstId); if (f) { ["art", "dyn", "lyr", "chord", "tx", "pf"].forEach(k => { if (e[k]) f.e[k] = JSON.parse(JSON.stringify(e[k])); }); if (e.tie) { const lf = findEv(r.lastId); if (lf) lf.e.tie = true; } }
        p = r.pos;
      }
      ui.sel = p; ui.anchor = null;
    }
  });
}
/* ---------- measures ---------- */
function insertMeasures(at, n) {
  commit(() => {
    for (let k = 0; k < n; k++) {
      S.meta.splice(at, 0, {});
      for (const st of S.staves) st.measures.splice(at, 0, emptyMeasure(at));
    }
    if (!S.meta.some(x => x.bar === "end")) S.meta[nM() - 1].bar = "end";
    ui.range = { s1: 0, s2: S.staves.length - 1, m1: at, m2: at + n - 1 }; ui.sel = { s: 0, m: at, i: 0, v: 1 }; ui.anchor = null;
  });
  toast(`แทรก ${n} ห้องที่ตำแหน่งห้อง ${at + 1}`);
}
function appendMeasures(n) { commit(() => { for (let k = 0; k < n; k++) ensureMeasure(nM()); }); toast(`เพิ่ม ${n} ห้องท้ายเพลง — ตอนนี้มี ${nM()} ห้อง`); }
function deleteMeasures() {
  const r = ui.range || (ui.sel ? { m1: ui.sel.m, m2: ui.sel.m } : null); if (!r) return toast("เลือกห้องก่อน");
  if (r.m2 - r.m1 + 1 >= nM()) return toast("ต้องเหลืออย่างน้อย 1 ห้อง");
  const lastBar = S.meta[nM() - 1].bar;
  commit(() => {
    const keep0 = S.meta[0];
    S.meta.splice(r.m1, r.m2 - r.m1 + 1);
    for (const st of S.staves) st.measures.splice(r.m1, r.m2 - r.m1 + 1);
    if (r.m1 === 0 && S.meta[0]) { if (keep0.reh && !S.meta[0].reh) S.meta[0].reh = keep0.reh; }
    if (!S.meta[nM() - 1].bar) S.meta[nM() - 1].bar = lastBar || "end";
    cleanupSpans(); ui.range = null; ui.sel = { s: 0, m: Math.min(r.m1, nM() - 1), i: 0, v: 1 };
  });
  toast(r.m1 === r.m2 ? `ลบห้อง ${r.m1 + 1} แล้ว — Ctrl+Z เพื่อย้อน` : `ลบห้อง ${r.m1 + 1}–${r.m2 + 1} แล้ว — Ctrl+Z เพื่อย้อน`);
}
function setTimeSig(num, den, at) {
  commit(() => {
    if (at === 0) { S.time = [num, den]; if (S.meta[0].time) delete S.meta[0].time; } else S.meta[at].time = [num, den];
    let end = nM(); for (let m = at + 1; m < nM(); m++) if (S.meta[m].time) { end = m; break; }
    for (let m = at; m < end; m++) for (const st of S.staves) refitMeasure(st, m);
    cleanupSpans(); fixSel();
  });
}
function setKeySig(f, at) {
  commit(() => { if (at === 0) { S.key = f; delete S.meta[0].key; } else S.meta[at].key = f; });
}
function setClef(c) {
  if (!ui.sel && !ui.range) return toast("เลือกบรรทัดก่อน");
  const s = ui.range ? ui.range.s1 : ui.sel.s;
  if (S.staves[s].clef === "percussion" || c === "percussion") return toast("กุญแจเครื่องกระทบใช้กับ Drum Set เท่านั้น");
  commit(() => { S.staves[s].clef = c; });
}
function setBar(kind) {
  const m = ui.range ? ui.range.m2 : ui.sel ? ui.sel.m : null; if (m == null) return toast("เลือกห้องก่อน");
  commit(() => {
    if (kind === "repBeg") { const mm = ui.range ? ui.range.m1 : m; S.meta[mm].repBeg = !S.meta[mm].repBeg; return; }
    if (S.meta[m].bar === kind) delete S.meta[m].bar; else S.meta[m].bar = kind;
    if (kind === "single") delete S.meta[m].bar;
  });
}
function toggleBreak() { const m = ui.range ? ui.range.m2 : ui.sel ? ui.sel.m : null; if (m == null) return toast("เลือกห้องก่อน"); commit(() => { S.meta[m].brk = !S.meta[m].brk; }); }
function transposeScore(semi, withKey, scope) {
  commit(() => {
    const inRange = (s, m) => scope !== "sel" || !ui.range || (s >= ui.range.s1 && s <= ui.range.s2 && m >= ui.range.m1 && m <= ui.range.m2);
    S.staves.forEach((st, s) => { if (st.clef === "percussion") return; st.measures.forEach((ms, m) => { if (!inRange(s, m)) return; allEvs(ms).forEach(e => { if (e.t === "n") { e.keys = e.keys.map(k => k + semi); delete e.pf; } if (e.chord) e.chord = transposeChord(e.chord, semi, clampKey(S.key + fifthsFor(semi))); }); }); });
    if (withKey && scope !== "sel") { const df = fifthsFor(semi); S.key = clampKey(S.key + df); S.meta.forEach(x => { if (x.key != null) x.key = clampKey(x.key + df); }); }
  });
  toast(`ทรานสโพส ${semi > 0 ? "+" : ""}${semi} ครึ่งเสียง`);
}
function transposeChord(c, semi, newKey) {
  return c.replace(/(^|\/)([A-G])(#|b)?/g, (all, pre, L, acc) => {
    const pc = (NAT[LET.indexOf(L)] + (acc === "#" ? 1 : acc === "b" ? -1 : 0) + semi + 120) % 12;
    const sp = spell(60 + pc, newKey, 0); return pre + sp.step + (sp.a === 1 ? "#" : sp.a === -1 ? "b" : "");
  });
}
/* ---------- instruments ---------- */
function addInstrument(k) {
  commit(() => { const sts = makeStaves(k); sts.forEach(st => { st.measures = []; for (let m = 0; m < nM(); m++) st.measures.push(emptyMeasure(m)); S.staves.push(st); }); });
  toast("เพิ่ม " + CAT[k].name);
}
function staffBlock(s) { const st = S.staves[s]; if (!st.group) return [s]; return S.staves.map((x, i) => [x, i]).filter(([x]) => x.group === st.group).map(a => a[1]); }
function removeStaff(s) {
  const blk = staffBlock(s); if (S.staves.length - blk.length < 1) return toast("ต้องมีอย่างน้อย 1 เครื่องดนตรี");
  commit(() => { S.staves.splice(blk[0], blk.length); cleanupSpans(); ui.sel = null; ui.range = null; if (!S.staves.find(x => x.id === ui.part)) ui.part = "all"; });
}
function moveStaffBlock(s, dir) {
  const blk = staffBlock(s), from = blk[0], len = blk.length;
  const tgt = dir < 0 ? from - 1 : blk[len - 1] + 1; if (tgt < 0 || tgt >= S.staves.length) return;
  const nb = staffBlock(tgt);
  commit(() => {
    const items = S.staves.splice(from, len);
    const ins = dir < 0 ? nb[0] : nb[nb.length - 1] - len + 1;
    S.staves.splice(ins, 0, ...items); ui.sel = null; ui.range = null;
  });
}
