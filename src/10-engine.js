"use strict";
/* ================= constants & theory ================= */
const TPQ = 480;
const DT = { w: 1920, h: 960, q: 480, "8": 240, "16": 120, "32": 60, "64": 30 };
const DORDER = ["w", "h", "q", "8", "16", "32", "64"];
const DNAME = { w: "whole", h: "half", q: "quarter", "8": "eighth", "16": "16th", "32": "32nd", "64": "64th" };
const DTH = { w: "ตัวกลม", h: "ตัวขาว", q: "ตัวดำ", "8": "เขบ็ต 1 ชั้น", "16": "เขบ็ต 2 ชั้น", "32": "เขบ็ต 3 ชั้น", "64": "เขบ็ต 4 ชั้น" };
const LET = "CDEFGAB";
const NAT = [0, 2, 4, 5, 7, 9, 11];
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
const KEYNAMES = { "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb", "-1": "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#" };
const KEYMINOR = { "-7": "Ab", "-6": "Eb", "-5": "Bb", "-4": "F", "-3": "C", "-2": "G", "-1": "D", 0: "A", 1: "E", 2: "B", 3: "F#", 4: "C#", 5: "G#", 6: "D#", 7: "A#" };
const ARTS = { stac: { vf: "a.", n: "Staccato", g: "𝅼" }, ten: { vf: "a-", n: "Tenuto", g: "𝅸" }, acc: { vf: "a>", n: "Accent", g: ">" }, marc: { vf: "a^", n: "Marcato", g: "^" }, stss: { vf: "av", n: "Staccatissimo", g: "▾" }, ferm: { vf: "a@a", n: "Fermata", g: "𝄐" } };
const DYNS = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff", "sfz", "fp", "sf", "rfz"];
const DYNVEL = { ppp: .22, pp: .32, p: .42, mp: .52, mf: .62, f: .75, ff: .87, fff: .97, sfz: .85, fp: .75, sf: .85, rfz: .8 };
const DRUMS = [
  { m: 49, k: "a/5/x2", n: "Crash" }, { m: 42, k: "g/5/x2", n: "Hi-hat" }, { m: 51, k: "f/5/x2", n: "Ride" },
  { m: 48, k: "e/5", n: "Tom สูง" }, { m: 47, k: "d/5", n: "Tom กลาง" }, { m: 38, k: "c/5", n: "Snare" }, { m: 37, k: "c/5/x2", n: "Side stick" },
  { m: 43, k: "a/4", n: "Floor tom" }, { m: 36, k: "f/4", n: "Kick" }, { m: 44, k: "d/4/x2", n: "Pedal HH" }
];
const DRUMBY = Object.fromEntries(DRUMS.map(d => [d.m, d]));
function drumDia(k) { const [l, o] = k.split("/"); return +o * 7 + LET.indexOf(l.toUpperCase()); }

const CAT = {
  piccolo: { name: "Piccolo", short: "Picc.", clef: "treble", tr: 12, oct: 1, timbre: "flute", gm: 72, fam: "ww" },
  flute: { name: "Flute", short: "Fl.", clef: "treble", tr: 0, timbre: "flute", gm: 73, fam: "ww" },
  oboe: { name: "Oboe", short: "Ob.", clef: "treble", tr: 0, timbre: "reed", gm: 68, fam: "ww" },
  clarinet: { name: "Clarinet in B♭", short: "Cl.", clef: "treble", tr: 2, timbre: "reed", gm: 71, fam: "ww" },
  bassclar: { name: "Bass Clarinet", short: "B. Cl.", clef: "treble", tr: 14, timbre: "reed", gm: 71, fam: "ww" },
  bassoon: { name: "Bassoon", short: "Bsn.", clef: "bass", tr: 0, timbre: "reed", gm: 70, fam: "ww" },
  sopsax: { name: "Soprano Saxophone", short: "S. Sax.", clef: "treble", tr: 2, timbre: "reed", gm: 64, fam: "sax" },
  altosax: { name: "Alto Saxophone", short: "A. Sax.", clef: "treble", tr: 9, timbre: "reed", gm: 65, fam: "sax" },
  tenorsax: { name: "Tenor Saxophone", short: "T. Sax.", clef: "treble", tr: 14, timbre: "reed", gm: 66, fam: "sax" },
  barisax: { name: "Baritone Saxophone", short: "Bar. Sax.", clef: "treble", tr: 21, timbre: "reed", gm: 67, fam: "sax" },
  horn: { name: "Horn in F", short: "Hn.", clef: "treble", tr: 7, timbre: "brass", gm: 60, fam: "brass" },
  trumpet: { name: "Trumpet in B♭", short: "Tpt.", clef: "treble", tr: 2, timbre: "brass", gm: 56, fam: "brass" },
  flugel: { name: "Flugelhorn", short: "Flg.", clef: "treble", tr: 2, timbre: "brass", gm: 56, fam: "brass" },
  trombone: { name: "Trombone", short: "Tbn.", clef: "bass", tr: 0, timbre: "brass", gm: 57, fam: "brass" },
  basstbn: { name: "Bass Trombone", short: "B. Tbn.", clef: "bass", tr: 0, timbre: "brass", gm: 57, fam: "brass" },
  tuba: { name: "Tuba", short: "Tba.", clef: "bass", tr: 0, timbre: "brass", gm: 58, fam: "brass" },
  timpani: { name: "Timpani", short: "Timp.", clef: "bass", tr: 0, timbre: "mallet", gm: 47, fam: "perc" },
  drums: { name: "Drum Set", short: "D. Set", clef: "percussion", tr: 0, timbre: "drums", gm: 0, fam: "perc" },
  vibes: { name: "Vibraphone", short: "Vib.", clef: "treble", tr: 0, timbre: "mallet", gm: 11, fam: "perc" },
  marimba: { name: "Marimba", short: "Mar.", clef: "treble", tr: 0, timbre: "mallet", gm: 12, fam: "perc" },
  glock: { name: "Glockenspiel", short: "Glk.", clef: "treble", tr: 24, oct: 1, timbre: "mallet", gm: 9, fam: "perc" },
  eguitar: { name: "Electric Guitar", short: "E. Gtr.", clef: "treble8vb", tr: 12, oct: 1, timbre: "pluck", gm: 26, fam: "rhythm" },
  aguitar: { name: "Acoustic Guitar", short: "Gtr.", clef: "treble8vb", tr: 12, oct: 1, timbre: "pluck", gm: 24, fam: "rhythm" },
  ebass: { name: "Electric Bass", short: "E. Bass", clef: "bass", tr: 12, oct: 1, timbre: "pluck", gm: 33, fam: "rhythm" },
  piano: { name: "Piano", short: "Pno.", grand: 1, timbre: "piano", gm: 0, fam: "kbd" },
  epiano: { name: "Electric Piano", short: "E. Pno.", grand: 1, timbre: "piano", gm: 4, fam: "kbd" },
  organ: { name: "Organ", short: "Org.", grand: 1, timbre: "organ", gm: 16, fam: "kbd" },
  harp: { name: "Harp", short: "Hp.", grand: 1, timbre: "pluck", gm: 46, fam: "kbd" },
  soprano: { name: "Soprano", short: "S.", clef: "treble", tr: 0, timbre: "voice", gm: 52, fam: "voice" },
  alto: { name: "Alto", short: "A.", clef: "treble", tr: 0, timbre: "voice", gm: 52, fam: "voice" },
  tenor: { name: "Tenor", short: "T.", clef: "treble8vb", tr: 12, oct: 1, timbre: "voice", gm: 52, fam: "voice" },
  bassv: { name: "Bass", short: "B.", clef: "bass", tr: 0, timbre: "voice", gm: 52, fam: "voice" },
  violin: { name: "Violin", short: "Vln.", clef: "treble", tr: 0, timbre: "string", gm: 40, fam: "str" },
  viola: { name: "Viola", short: "Vla.", clef: "alto", tr: 0, timbre: "string", gm: 41, fam: "str" },
  cello: { name: "Violoncello", short: "Vc.", clef: "bass", tr: 0, timbre: "string", gm: 42, fam: "str" },
  contrabass: { name: "Contrabass", short: "Cb.", clef: "bass", tr: 12, oct: 1, timbre: "pluck", gm: 32, fam: "str" }
};
const FAMNAME = { ww: "เครื่องลมไม้", sax: "แซกโซโฟน", brass: "เครื่องทองเหลือง", perc: "เครื่องกระทบ", rhythm: "กีตาร์ / เบส", kbd: "คีย์บอร์ด", voice: "ขับร้อง", str: "เครื่องสาย" };
const CLEFDIA = { treble: 38, treble8vb: 38, percussion: 38, bass: 26, alto: 32, tenor: 30 };
const RESTKEY = { treble: "b/4", treble8vb: "b/4", percussion: "b/4", bass: "d/3", alto: "c/4", tenor: "a/3" };
const WRESTKEY = { treble: "d/5", treble8vb: "d/5", percussion: "d/5", bass: "f/3", alto: "e/4", tenor: "c/4" };

const dotted = (b, n) => n === 0 ? b : n === 1 ? b * 1.5 : b * 1.75;
function evTicks(e) { const t = dotted(DT[e.d], e.dots || 0); return e.tup ? Math.round(t * e.tup.of / e.tup.n) : t; }
function durTicks(d, dots) { return dotted(DT[d], dots); }
function decompose(n) {
  const out = []; let guard = 0;
  while (n >= 30 && guard++ < 40) {
    let done = false;
    for (const d of DORDER) {
      const b = DT[d];
      if (b * 1.5 <= n && b >= 60) { out.push([d, 1]); n -= b * 1.5; done = true; break; }
      if (b <= n) { out.push([d, 0]); n -= b; done = true; break; }
    }
    if (!done) break;
  }
  return out;
}
function fifthsFor(semi) { let f = ((semi * 7) % 12 + 12) % 12; if (f > 6) f -= 12; return f; }
function clampKey(f) { while (f > 7) f -= 12; while (f < -7) f += 12; return f; }
function keyAlts(f) {
  const a = [0, 0, 0, 0, 0, 0, 0];
  if (f > 0) for (let i = 0; i < f; i++) a[SHARP_ORDER[i]] = 1;
  if (f < 0) for (let i = 0; i < -f; i++) a[FLAT_ORDER[i]] = -1;
  return a;
}
function spell(midi, f, pref) {
  const pc = ((midi % 12) + 12) % 12, ka = keyAlts(f);
  const cands = [];
  for (let L = 0; L < 7; L++) for (let a = -2; a <= 2; a++) if ((NAT[L] + a + 120) % 12 === pc) cands.push({ L, a });
  let c = cands.find(x => x.a === ka[x.L] && x.a !== 0) || null;
  if (!c) {
    if (pref > 0) c = cands.find(x => x.a === 1);
    else if (pref < 0) c = cands.find(x => x.a === -1);
  }
  if (!c) c = cands.find(x => x.a === 0 && ka[x.L] === 0) || cands.find(x => x.a === 0);
  if (!c) c = cands.find(x => x.a === (f >= 0 ? 1 : -1)) || cands.find(x => Math.abs(x.a) === 1) || cands[0];
  const oct = Math.floor((midi - c.a) / 12) - 1;
  const acc = c.a === 1 ? "#" : c.a === 2 ? "##" : c.a === -1 ? "b" : c.a === -2 ? "bb" : "";
  return { L: c.L, a: c.a, oct, step: LET[c.L], key: LET[c.L].toLowerCase() + acc + "/" + oct, name: LET[c.L] + (c.a === 1 ? "♯" : c.a === 2 ? "𝄪" : c.a === -1 ? "♭" : c.a === -2 ? "𝄫" : "") + oct };
}
function diaToMidi(dia, f) { const L = ((dia % 7) + 7) % 7, oct = Math.floor(dia / 7); return (oct + 1) * 12 + NAT[L] + keyAlts(f)[L]; }
function midiToDia(midi) { const s = spell(midi, 0, 0); return s.oct * 7 + s.L; }
const midiName = (m, f = 0) => spell(m, f, 0).name;

/* ================= score model ================= */
let S = null, IDC = 0;
const nid = () => "e" + (++IDC);
const mkRest = (d, dots = 0) => ({ id: nid(), t: "r", d, dots, keys: [] });
const mkNote = (keys, d, dots = 0) => ({ id: nid(), t: "n", d, dots, keys: [...keys].sort((a, b) => a - b) });
function restsFor(n) { return decompose(n).map(([d, dots]) => mkRest(d, dots)); }
function keyAt(m) { for (let i = m; i >= 0; i--) if (S.meta[i] && S.meta[i].key != null) return S.meta[i].key; return S.key; }
function timeAt(m) { for (let i = m; i >= 0; i--) if (S.meta[i] && S.meta[i].time) return S.meta[i].time; return S.time; }
function mLen(m) { const [n, d] = timeAt(m); return n * 1920 / d; }
function tempoAt(m) { for (let i = m; i >= 0; i--) if (S.meta[i] && S.meta[i].tempo) return S.meta[i].tempo.bpm; return S.tempo; }
function dtr(st) { return ui.concert ? (st.oct ? st.tr : 0) : st.tr; }
function writtenKey(st, m) { return st.clef === "percussion" ? 0 : clampKey(keyAt(m) + fifthsFor(dtr(st))); }
function vfClef(st) { return st.clef === "treble8vb" ? "treble" : st.clef; }

function makeStaves(instKey) {
  const c = CAT[instKey]; if (!c) return [];
  const base = { inst: instKey, timbre: c.timbre, gm: c.gm, fam: c.fam, vol: .8, mute: false, solo: false };
  if (c.grand) {
    const g = "g" + Math.random().toString(36).slice(2, 7);
    return [
      { ...base, id: "s" + Math.random().toString(36).slice(2, 8), name: c.name, short: c.short, clef: "treble", tr: 0, oct: 0, group: g, gpos: 0 },
      { ...base, id: "s" + Math.random().toString(36).slice(2, 8), name: c.name, short: c.short, clef: "bass", tr: 0, oct: 0, group: g, gpos: 1 }
    ];
  }
  return [{ ...base, id: "s" + Math.random().toString(36).slice(2, 8), name: c.name, short: c.short, clef: c.clef, tr: c.tr, oct: c.oct || 0, group: null }];
}
function emptyMeasure(m) { return { ev: restsFor(mLen(m)) }; }
function newScore(o) {
  IDC = 0;
  S = { v: 1, title: o.title || "Untitled", subtitle: o.subtitle || "", composer: o.composer || "", lyricist: o.lyricist || "",
    key: o.key || 0, time: o.time || [4, 4], tempo: o.tempo || 100, tempoText: o.tempoText || "", template: o.template || "", meta: [], staves: [], spans: [] };
  const n = o.measures || 16;
  for (let m = 0; m < n; m++) S.meta.push({});
  for (const k of o.insts) for (const st of makeStaves(k)) { st.measures = []; S.staves.push(st); }
  for (const st of S.staves) for (let m = 0; m < n; m++) st.measures.push(emptyMeasure(m));
  S.meta[n - 1].bar = "end";
  return S;
}
function nM() { return S.meta.length; }
/* ---- voices: ms.ev = voice 1, ms.vx[2..4] = extra voices ---- */
function V(ms, v) { if (!ms) return null; if (!v || v === 1) return ms.ev; return ms.vx && ms.vx[v] || null; }
function voicesOf(ms) { const out = [[1, ms.ev]]; if (ms.vx) for (const k of [2, 3, 4]) if (ms.vx[k]) out.push([k, ms.vx[k]]); return out; }
function allEvs(ms) { const out = []; for (const [, l] of voicesOf(ms)) out.push(...l); return out; }
function vLen(st, m, v) { const l = V(st.measures[m], v); return l ? l.length : decompose(mLen(m)).length; }
function vList(st, m, v) { return V(st.measures[m], v) || restsFor(mLen(m)); }
function ensureVoice(st, m, v) { const ms = st.measures[m]; if (!v || v === 1) return ms.ev; ms.vx = ms.vx || {}; if (!ms.vx[v]) ms.vx[v] = restsFor(mLen(m)); return ms.vx[v]; }
function setVoice(st, m, v, list) { const ms = st.measures[m]; if (!v || v === 1) ms.ev = list; else { ms.vx = ms.vx || {}; ms.vx[v] = list; } }
function dropEmptyVoices(st, m) { const ms = st.measures[m]; if (!ms.vx) return; for (const k of [2, 3, 4]) if (ms.vx[k] && ms.vx[k].every(e => e.t === "r")) delete ms.vx[k]; if (!Object.keys(ms.vx).length) delete ms.vx; }
function hasMulti(ms) { return !!(ms.vx && Object.keys(ms.vx).length); }
function syncIds() { let mx = 0; for (const st of S.staves) for (const ms of st.measures) for (const e of allEvs(ms)) { const k = parseInt(String(e.id).slice(1)); if (k > mx) mx = k; } IDC = mx; }
function findEv(id) {
  for (let s = 0; s < S.staves.length; s++) { const st = S.staves[s]; for (let m = 0; m < st.measures.length; m++) for (const [v, ev] of voicesOf(st.measures[m])) { for (let i = 0; i < ev.length; i++) if (ev[i].id === id) return { s, m, i, v, e: ev[i] }; } }
  return null;
}
function evStart(evs, i) { let t = 0; for (let k = 0; k < i; k++) t += evTicks(evs[k]); return t; }
function evAtTick(evs, tick) { let t = 0; for (let i = 0; i < evs.length; i++) { const l = evTicks(evs[i]); if (tick < t + l) return i; t += l; } return evs.length - 1; }
function cloneEv(e) { const c = JSON.parse(JSON.stringify(e)); c.id = nid(); return c; }
function nextEvPos(s, m, i, v = 1) { const st = S.staves[s]; if (i + 1 < vLen(st, m, v)) return { s, m, i: i + 1, v }; if (m + 1 < nM()) return { s, m: m + 1, i: 0, v }; return null; }
function prevEvPos(s, m, i, v = 1) { const st = S.staves[s]; if (i > 0) return { s, m, i: i - 1, v }; if (m > 0) return { s, m: m - 1, i: vLen(st, m - 1, v) - 1, v }; return null; }
function evAt(p) { if (!p || !S.staves[p.s] || !S.staves[p.s].measures[p.m]) return null; const l = V(S.staves[p.s].measures[p.m], p.v || 1); return l ? l[p.i] : null; }
function posTick(p) { const st = S.staves[p.s]; return evStart(vList(st, p.m, p.v || 1), p.i); }

/* replace [t, t+L) of a measure by newEvs (sum ticks == L) */
function replaceSpan(evs, t, L, newEvs) {
  const res = []; let cur = 0;
  for (const e of evs) {
    const s = cur, end = cur + evTicks(e); cur = end;
    if (end <= t) res.push(e);
    else if (s < t) {
      const parts = decompose(t - s);
      if (parts.length === 1 && !e.tup) { const c = { ...e, d: parts[0][0], dots: parts[0][1] }; res.push(c); }
      else res.push(...restsFor(t - s));
    }
  }
  res.push(...newEvs);
  cur = 0;
  for (const e of evs) {
    const s = cur, end = cur + evTicks(e); cur = end;
    if (s >= t + L) res.push(e);
    else if (end > t + L) res.push(...restsFor(end - (t + L)));
  }
  return res;
}
function ensureMeasure(m) {
  while (nM() <= m) {
    const last = nM() - 1; if (S.meta[last].bar === "end") delete S.meta[last].bar;
    S.meta.push({ bar: "end" });
    for (const st of S.staves) st.measures.push(emptyMeasure(nM() - 1));
  }
}
/* insert template (keys or rest) of length L at (s,m,t); splits over barlines with ties; returns pos after & id of first event */
function insertAt(s, m, t, L, keys, extra, v = 1) {
  const st = S.staves[s]; let firstId = null, lastNote = null;
  while (L > 0) {
    ensureMeasure(m);
    const ML = mLen(m), avail = ML - t, put = Math.min(L, avail);
    const parts = decompose(put);
    const evs = parts.map(([d, dots]) => keys && keys.length ? mkNote(keys, d, dots) : mkRest(d, dots));
    if (keys && keys.length) evs.forEach((e, k) => { if (k < evs.length - 1) e.tie = true; });
    if (extra && evs[0]) Object.assign(evs[0], extra);
    if (lastNote && keys && keys.length) lastNote.tie = true;
    if (!firstId && evs[0]) firstId = evs[0].id;
    lastNote = evs[evs.length - 1];
    setVoice(st, m, v, replaceSpan(ensureVoice(st, m, v), t, put, evs));
    L -= put; t += put;
    if (L > 0) { m++; t = 0; }
  }
  if (t >= mLen(m)) { m++; t = 0; ensureMeasure(m); }
  const i = evAtTick(vList(st, m, v), t);
  return { pos: { s, m, i, v }, firstId, lastId: lastNote && lastNote.id };
}
function refitMeasure(st, m) {
  const ML = mLen(m);
  for (const [v, evs] of voicesOf(st.measures[m])) {
    let cur = 0; const out = [];
    for (const e of evs) { const l = evTicks(e); if (cur + l <= ML) { out.push(e); cur += l; } else break; }
    if (cur < ML) out.push(...restsFor(ML - cur));
    setVoice(st, m, v, out);
  }
}
function isEmptyMeasure(st, m) { return allEvs(st.measures[m]).every(e => e.t === "r"); }

/* ================= sample score: 12-bar blues ================= */
function noteNum(tok) {
  if (/^\d+$/.test(tok)) return +tok;
  const mm = /^([A-Ga-g])(#|b|x|bb)?(-?\d)$/.exec(tok); if (!mm) throw new Error("bad pitch " + tok);
  const L = LET.indexOf(mm[1].toUpperCase()), a = { "#": 1, x: 2, b: -1, bb: -2 }[mm[2]] || 0;
  return (+mm[3] + 1) * 12 + NAT[L] + a;
}
function parseSeq(str) {
  return str.trim().split("|").map(bar => bar.trim().split(/\s+/).filter(Boolean).map(tok => {
    let tie = false; if (tok.endsWith("~")) { tie = true; tok = tok.slice(0, -1); }
    let [p, d] = tok.split(":"); let dots = 0; while (d.endsWith(".")) { dots++; d = d.slice(0, -1); }
    if (p === "r") return mkRest(d, dots);
    const keys = p.startsWith("[") ? p.slice(1, -1).split(",").map(noteNum) : [noteNum(p)];
    const e = mkNote(keys, d, dots); if (tie) e.tie = true; return e;
  }));
}
function loadSample() {
  newScore({ title: "Bangkok Night Blues", subtitle: "for jazz combo", composer: "Nota Studio · ตัวอย่าง", key: -2, time: [4, 4], tempo: 132, measures: 12, template: "Jazz combo",
    insts: ["altosax", "trumpet", "trombone", "piano", "contrabass", "drums"] });
  S.tempoText = "Medium Swing";
  const [alto, tpt, tbn, rh, lh, bass, drums] = S.staves;
  const put = (st, str) => parseSeq(str).forEach((bar, m) => { st.measures[m].ev = bar; });
  put(alto, `F5:8 Db5:8 D5:8 F5:8~ F5:h | Eb5:q. Db5:8 Bb4:h | F5:8 Db5:8 D5:8 F5:8~ F5:q r:q | Bb4:8 C5:8 D5:8 F5:8 G5:q F5:q |
    Ab5:8 Gb5:8 G5:8 Ab5:8~ Ab5:h | G5:q. F5:8 Eb5:h | F5:8 Db5:8 D5:8 F5:8~ F5:q D5:q | B4:q D5:q F5:q G5:q |
    G5:8 F5:8 Eb5:8 C5:8~ C5:h | A4:q C5:q Eb5:q F5:q | D5:q. Bb4:8 B4:q D5:q | C5:q Eb5:q A4:q r:q`);
  alto.measures.forEach(ms => ms.ev.forEach(e => { if (e.t === "n") e.keys = e.keys.map(k => k - 12); }));
  put(tpt, `r:w | r:w | r:w | r:w | r:q. Db5:8 r:h | r:q. Db5:8 r:h | r:q. D5:8 r:h | r:q. F5:8 r:h |
    Eb5:h. r:q | Eb5:h. r:q | D5:q D5:q F5:q F5:q | Eb5:q Eb5:q Eb5:q r:q`);
  put(tbn, `Ab3:w | G3:w | Ab3:w | Ab3:w | G3:w | G3:w | Ab3:w | Ab3:h B3:h | Bb3:w | A3:w | Ab3:h B3:h | Bb3:h A3:h`);
  const ch = { Bb7: "[D4,Ab4,C5]", Eb7: "[G4,Db5,F5]", G7: "[B4,F5,A5]", Cm7: "[Eb4,Bb4,D5]", F7: "[A4,Eb5,G5]" };
  const prog = ["Bb7", "Eb7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "G7", "Cm7", "F7", "Bb7 G7", "Cm7 F7"];
  prog.forEach((p, m) => {
    const cs = p.split(" ");
    if (cs.length === 1) rh.measures[m].ev = parseSeq(`${ch[cs[0]]}:q. ${ch[cs[0]]}:8 r:h`)[0];
    else rh.measures[m].ev = parseSeq(`${ch[cs[0]]}:q. ${ch[cs[0]]}:8 ${ch[cs[1]]}:q. ${ch[cs[1]]}:8`)[0];
    rh.measures[m].ev[0].chord = cs[0]; if (cs[1]) rh.measures[m].ev[2].chord = cs[1];
  });
  put(lh, `Bb2:h F2:h | Eb2:h Bb2:h | Bb2:h F2:h | Bb2:h D3:h | Eb2:h Bb2:h | Eb2:h G2:h | Bb2:h F2:h | G2:h D3:h | C3:h G2:h | F2:h C3:h | Bb2:h G2:h | C3:h F2:h`);
  put(bass, `Bb2:q D3:q F3:q Ab3:q | Eb3:q G3:q Bb2:q Db3:q | Bb2:q C3:q D3:q F3:q | Bb2:q A2:q Ab2:q G2:q | Eb2:q G2:q Bb2:q Db3:q | Eb3:q D3:q Db3:q B2:q |
    Bb2:q D3:q F3:q Ab3:q | G2:q B2:q D3:q F3:q | C3:q Eb3:q G3:q Bb2:q | F2:q A2:q C3:q Eb3:q | Bb2:q D3:q G2:q B2:q | C3:q Eb3:q F2:q A2:q`);
  const groove = `51:q 51:8 51:8 [51,38]:q 51:8 51:8`;
  put(drums, Array(12).fill(groove).join(" | "));
  drums.measures[11].ev = parseSeq(`51:q 51:8 51:8 [49,38]:q r:q`)[0];
  drums.measures.forEach((ms, m) => { ms.vx = { 2: parseSeq(m === 11 ? `36:q r:q 36:q r:q` : `36:q 44:q 36:q 44:q`)[0] }; });
  alto.measures[0].ev[0].dyn = "mf"; tbn.measures[0].ev[0].dyn = "mp"; rh.measures[0].ev[0].dyn = "mp"; bass.measures[0].ev[0].dyn = "mf"; drums.measures[0].ev[0].dyn = "mp";
  tpt.measures[4].ev[1].dyn = "f"; tpt.measures[4].ev[1].art = ["acc"]; tpt.measures[5].ev[1].art = ["acc"]; tpt.measures[6].ev[1].art = ["acc"]; tpt.measures[7].ev[1].art = ["acc"];
  tpt.measures[10].ev.forEach(e => e.art = ["ten"]); tpt.measures[11].ev.slice(0, 3).forEach(e => e.art = ["stac"]);
  alto.measures[11].ev[2].art = ["acc"];
  const sl = (st, m1, i1, m2, i2) => S.spans.push({ type: "slur", a: st.measures[m1].ev[i1].id, b: st.measures[m2].ev[i2].id });
  sl(alto, 0, 0, 0, 2); sl(alto, 1, 0, 1, 2); sl(alto, 4, 0, 4, 2); sl(alto, 8, 0, 8, 3); sl(alto, 3, 0, 3, 5);
  S.spans.push({ type: "cresc", a: tbn.measures[7].ev[0].id, b: tbn.measures[8].ev[0].id });
  S.spans.push({ type: "dim", a: alto.measures[10].ev[0].id, b: alto.measures[11].ev[2].id });
  tbn.measures[8].ev[0].dyn = "f";
  S.meta[0].reh = "A"; S.meta[0].repBeg = true; S.meta[11].bar = "repEnd";
  S.meta[4].text = "Shout";
  syncIds();
}
