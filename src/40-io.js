/* ================= playback ================= */
let AC = null, master = null, noiseBuf = null, playing = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function newMaster() {
  const ac = audio();
  const g = ac.createGain(); g.gain.value = (+document.getElementById("masterVol").value / 100) * .55;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  g.connect(comp); comp.connect(ac.destination); return g;
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function env(g, t0, a, peak, sus, dur, rel) {
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.setTargetAtTime(peak * sus, t0 + a, .12); g.gain.setValueAtTime(peak * sus, t0 + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(a, dur) + rel);
}
function synth(ac, out, timbre, midi, t0, dur, vel) {
  if (timbre === "drums") return drum(ac, out, midi, t0, vel);
  const f = hz(midi), g = ac.createGain(); g.connect(out);
  const oscs = []; const mk = (type, freq, gain) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; const gg = ac.createGain(); gg.gain.value = gain; o.connect(gg); oscs.push([o, gg]); return gg; };
  let rel = .12, end;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.connect(g);
  const vib = (depth) => { const l = ac.createOscillator(); l.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.value = depth; l.connect(lg); oscs.forEach(([o]) => lg.connect(o.frequency)); l.start(t0 + .15); l.stop(t0 + dur + .5); };
  switch (timbre) {
    case "piano": mk("triangle", f, .7).connect(lp); mk("sine", f * 2, .18).connect(lp); lp.frequency.value = 2400 + vel * 2500;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vel * .5, t0 + .006); g.gain.exponentialRampToValueAtTime(vel * .18, t0 + .35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(dur + .35, 3)); end = t0 + Math.min(dur + .4, 3.1); break;
    case "brass": mk("sawtooth", f, .5).connect(lp); lp.Q.value = 1.5; lp.frequency.setValueAtTime(300, t0); lp.frequency.linearRampToValueAtTime(900 + vel * 2600, t0 + .06); lp.frequency.setTargetAtTime(700 + vel * 1600, t0 + .08, .2);
      env(g, t0, .03, vel * .32, .8, dur, .08); end = t0 + dur + .3; break;
    case "reed": mk("square", f, .35).connect(lp); mk("sawtooth", f, .15).connect(lp); lp.frequency.value = 1200 + vel * 1600; vib(f * .004);
      env(g, t0, .025, vel * .3, .85, dur, .07); end = t0 + dur + .3; break;
    case "flute": mk("sine", f, .7).connect(lp); mk("triangle", f * 2, .06).connect(lp); lp.frequency.value = 5000; vib(f * .005);
      env(g, t0, .05, vel * .45, .9, dur, .1); end = t0 + dur + .35; break;
    case "string": mk("sawtooth", f, .4).connect(lp); mk("sawtooth", f * 1.003, .3).connect(lp); lp.frequency.value = 2400; vib(f * .006);
      env(g, t0, .09, vel * .3, .9, dur, .2); end = t0 + dur + .5; break;
    case "pluck": mk("triangle", f, .8).connect(lp); mk("sawtooth", f, .12).connect(lp); lp.frequency.setValueAtTime(3000, t0); lp.frequency.exponentialRampToValueAtTime(400, t0 + .6);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vel * .55, t0 + .005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(dur + .25, 1.8)); end = t0 + Math.min(dur + .3, 1.9); break;
    case "mallet": mk("sine", f, .8).connect(lp); mk("sine", f * 4, .12).connect(lp); lp.frequency.value = 8000;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vel * .5, t0 + .004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4); end = t0 + 1.5; break;
    case "organ": mk("sine", f, .5).connect(lp); mk("sine", f * 2, .3).connect(lp); mk("sine", f * 3, .15).connect(lp); lp.frequency.value = 6000;
      env(g, t0, .01, vel * .32, 1, dur, .05); end = t0 + dur + .2; break;
    case "voice": mk("triangle", f, .6).connect(lp); mk("sawtooth", f, .08).connect(lp); lp.frequency.value = 1400; vib(f * .008);
      env(g, t0, .08, vel * .4, .9, dur, .15); end = t0 + dur + .4; break;
    default: mk("triangle", f, .6).connect(lp); lp.frequency.value = 3000; env(g, t0, .01, vel * .4, .8, dur, .1); end = t0 + dur + .3;
  }
  oscs.forEach(([o, gg]) => { o.start(t0); o.stop(end); });
}
function drum(ac, out, m, t0, vel) {
  const g = ac.createGain(); g.connect(out);
  const noise = (type, freq, decay, gain) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; const gg = ac.createGain(); s.connect(fl); fl.connect(gg); gg.connect(g); gg.gain.setValueAtTime(vel * gain, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + decay); s.start(t0); s.stop(t0 + decay + .02); };
  const tone = (f1, f2, decay, gain) => { const o = ac.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + decay * .8); const gg = ac.createGain(); o.connect(gg); gg.connect(g); gg.gain.setValueAtTime(vel * gain, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + decay); o.start(t0); o.stop(t0 + decay + .02); };
  if (m === 36 || m === 35) tone(140, 45, .35, 1.1);
  else if (m === 38 || m === 40) { noise("bandpass", 1800, .18, .6); tone(200, 160, .1, .5); }
  else if (m === 37) noise("bandpass", 2600, .05, .5);
  else if (m === 42 || m === 44) noise("highpass", 7500, .05, .32);
  else if (m === 46) noise("highpass", 7000, .3, .3);
  else if (m === 51 || m === 59) { noise("highpass", 6000, .35, .14); tone(3200, 3000, .3, .04); }
  else if (m === 49 || m === 57) noise("highpass", 4500, 1.3, .32);
  else tone(hz(m - 12), hz(m - 14), .35, .8);
}
function measureSeq(from) {
  const seq = []; let repStart = 0; const done = new Set(); let m = 0, guard = 0;
  while (m < nM() && guard++ < 4000) {
    if (S.meta[m].repBeg) repStart = m;
    seq.push(m);
    if (S.meta[m].bar === "repEnd" && !done.has(m)) { done.add(m); m = repStart; continue; }
    m++;
  }
  const k = seq.indexOf(from); return k > 0 ? seq.slice(k) : seq;
}
function swingWarp(tick) { if (!ui.swing) return tick; const b = Math.floor(tick / 480) * 480, r = tick - b; return b + (r <= 240 ? r * (320 / 240) : 320 + (r - 240) * (160 / 240)); }
function buildPerformance(fromM, onlyRange) {
  let seq = measureSeq(fromM);
  if (onlyRange) seq = seq.filter(m => m >= onlyRange.m1 && m <= onlyRange.m2).filter((m, i, a) => a.indexOf(m) === i);
  const anySolo = S.staves.some(s => s.solo);
  const notes = [], measures = []; let T = 0;
  const carry = S.staves.map(() => ({ 1: {}, 2: {}, 3: {}, 4: {} })), vel = S.staves.map(() => .62);
  let lastM = -1;
  for (const m of seq) {
    const spt = 60 / (tempoAt(m) * TPQ), len = mLen(m);
    const t0 = T;
    measures.push({ m, t0, t1: t0 + len * spt, spt });
    if (lastM >= 0 && m !== lastM + 1) carry.forEach((_, i) => carry[i] = { 1: {}, 2: {}, 3: {}, 4: {} });
    S.staves.forEach((st, si) => {
      const present = new Set(voicesOf(st.measures[m]).map(x => x[0]));
      for (const vv of [2, 3, 4]) if (!present.has(vv)) carry[si][vv] = {};
      for (const [vv, list] of voicesOf(st.measures[m])) {
      let tick = 0; const cv = carry[si];
      for (const e of list) {
        const l = evTicks(e);
        if (e.dyn && DYNVEL[e.dyn]) vel[si] = DYNVEL[e.dyn];
        if (e.t === "n") {
          const nc = {};
          const s1 = t0 + swingWarp(tick) * spt, s2 = t0 + swingWarp(tick + l) * spt;
          let v = vel[si]; if (e.art && (e.art.includes("acc") || e.art.includes("marc"))) v = Math.min(1, v + .18);
          let d = s2 - s1; if (e.art && (e.art.includes("stac") || e.art.includes("stss"))) d *= .45; else if (!(e.art && e.art.includes("ten"))) d *= .92;
          for (const k of e.keys) {
            let rec = cv[vv][k];
            if (rec) rec.dur = s1 + d - rec.t; else { rec = { t: s1, dur: d, midi: k, vel: v, si, m }; notes.push(rec); }
            if (e.tie) nc[k] = rec;
          }
          cv[vv] = nc;
        } else cv[vv] = {};
        tick += l;
      }
      }
    });
    T = t0 + len * spt; lastM = m;
  }
  return { notes: notes.filter(n => { const st = S.staves[n.si]; return !st.mute && (!anySolo || st.solo); }), measures, total: T };
}
function play() {
  if (playing) return stop();
  const ac = audio(); master = newMaster();
  const from = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0;
  const perf = buildPerformance(from, ui.loop && ui.range ? ui.range : null);
  const start = ac.currentTime + .08;
  for (const n of perf.notes) { const st = S.staves[n.si]; const out = ac.createGain(); out.gain.value = st.vol; out.connect(master); synth(ac, out, st.timbre, n.midi, start + n.t, Math.max(.05, n.dur), n.vel); }
  if (ui.metro) for (const ms of perf.measures) { const [num, den] = timeAt(ms.m); const step = 1920 / den; for (let k = 0; k < num; k++) { const t = start + ms.t0 + k * step * ms.spt; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = k === 0 ? 1600 : 1100; g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05); o.connect(g); g.connect(master); o.start(t); o.stop(t + .06); } }
  playing = { start, perf, raf: 0 };
  document.getElementById("tpPlay").textContent = "❚❚";
  const tick = () => {
    if (!playing) return;
    const now = ac.currentTime - playing.start;
    updateClock(Math.max(0, now), perf.total);
    const ms = perf.measures.find(x => now >= x.t0 && now < x.t1);
    if (ms) { playing.pos = { m: ms.m, tick: (now - ms.t0) / ms.spt }; positionPlayhead(true); }
    if (now > perf.total + .3) { if (ui.loop) { stop(true); play(); return; } stop(); return; }
    playing.raf = requestAnimationFrame(tick);
  };
  playing.raf = requestAnimationFrame(tick);
}
function stop() {
  if (!playing) return;
  cancelAnimationFrame(playing.raf);
  try { master.gain.setTargetAtTime(0, AC.currentTime, .02); const mm = master; setTimeout(() => { try { mm.disconnect(); } catch (e) { } }, 200); } catch (e) { }
  playing = null; document.getElementById("tpPlay").textContent = "▶";
  positionPlayhead();
}
function updateClock(t, total) {
  const f = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  document.getElementById("clock").innerHTML = `${f(t)} <small>/ ${f(total)}</small>`;
  document.getElementById("trackFill").style.width = Math.min(100, total ? t / total * 100 : 0) + "%";
}
function positionPlayhead(follow) {
  document.querySelectorAll(".playhead").forEach(x => x.remove());
  if (!playing || !playing.pos) return;
  const mp = LAY.mpos[playing.pos.m]; if (!mp) return;
  const pg = LAY.pages[mp.page]; if (!pg) return;
  let x = mp.x1; const pts = mp.pts.concat([[mp.len, mp.x2 - 8]]), t = playing.pos.tick;
  for (let k = 0; k < pts.length - 1; k++) if (t >= pts[k][0] && t <= pts[k + 1][0]) { x = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * ((t - pts[k][0]) / Math.max(1, pts[k + 1][0] - pts[k][0])); break; }
  const h = document.createElement("div"); h.className = "playhead";
  h.style.left = (x + 4) * ui.zoom + "px"; h.style.top = mp.yTop * ui.zoom + "px"; h.style.height = (mp.yBot - mp.yTop) * ui.zoom + "px";
  pg.el.appendChild(h);
  if (follow) {
    const c = document.getElementById("canvas"), r = h.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (r.top < cr.top + 20 || r.bottom > cr.bottom - 20) c.scrollBy({ top: r.top - cr.top - cr.height / 4 });
    if (r.left < cr.left + 20 || r.right > cr.right - 40) c.scrollBy({ left: r.left - cr.left - cr.width / 3 });
  }
}
function playPreview(midi, st) {
  try { const ac = audio(); const g = ac.createGain(); g.gain.value = .3 * st.vol; g.connect(ac.destination); synth(ac, g, st.timbre, midi, ac.currentTime + .01, .35, .6); } catch (e) { }
}

/* ================= MIDI ================= */
function vlq(n) { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
function toMidi() {
  const perf = buildPerformance(0, null);
  const tracks = [];
  const bpm0 = S.tempo, usq = Math.round(60000000 / bpm0);
  const tr0 = [{ t: 0, d: [0xff, 0x51, 3, (usq >> 16) & 255, (usq >> 8) & 255, usq & 255] }, { t: 0, d: [0xff, 0x58, 4, S.time[0], Math.log2(S.time[1]), 24, 8] }];
  const titleB = [...new TextEncoder().encode(S.title)]; tr0.push({ t: 0, d: [0xff, 0x03, ...vlq(titleB.length), ...titleB] });
  tracks.push(tr0);
  const secToTick = s => Math.round(s * bpm0 / 60 * TPQ);
  S.staves.forEach((st, si) => {
    const ch = st.clef === "percussion" ? 9 : (si >= 9 ? si + 1 : si) % 16;
    const nameB = [...new TextEncoder().encode(st.name)];
    const evs = [{ t: 0, d: [0xff, 0x03, ...vlq(nameB.length), ...nameB] }];
    if (ch !== 9) evs.push({ t: 0, d: [0xc0 | ch, st.gm & 127] });
    for (const n of perf.notes) if (n.si === si) {
      const t1 = secToTick(n.t), t2 = Math.max(t1 + 10, secToTick(n.t + n.dur)), v = Math.max(1, Math.min(127, Math.round(n.vel * 127)));
      evs.push({ t: t1, d: [0x90 | ch, n.midi, v], o: 1 }); evs.push({ t: t2, d: [0x80 | ch, n.midi, 0], o: 0 });
    }
    tracks.push(evs);
  });
  const out = [..."MThd"].map(c => c.charCodeAt(0)).concat([0, 0, 0, 6, 0, 1, 0, tracks.length, (TPQ >> 8) & 255, TPQ & 255]);
  for (const tr of tracks) {
    tr.sort((a, b) => a.t - b.t || (a.o ?? 2) - (b.o ?? 2));
    const data = []; let last = 0;
    for (const e of tr) { data.push(...vlq(e.t - last), ...e.d); last = e.t; }
    data.push(0, 0xff, 0x2f, 0);
    out.push(..."MTrk".split("").map(c => c.charCodeAt(0)), (data.length >>> 24) & 255, (data.length >> 16) & 255, (data.length >> 8) & 255, data.length & 255, ...data);
  }
  return new Uint8Array(out);
}

/* ================= MusicXML export ================= */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const XTYPE = { w: "whole", h: "half", q: "quarter", "8": "eighth", "16": "16th", "32": "32nd", "64": "64th" };
const SEMIDIA = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
function parseChord(c) {
  const mm = /^([A-G])(#|b)?(.*?)(?:\/([A-G])(#|b)?)?$/.exec(c); if (!mm) return null;
  const kinds = { "": "major", m: "minor", min: "minor", "7": "dominant", maj7: "major-seventh", M7: "major-seventh", m7: "minor-seventh", dim: "diminished", dim7: "diminished-seventh", m7b5: "half-diminished", aug: "augmented", "6": "major-sixth", m6: "minor-sixth", "9": "dominant-ninth", sus4: "suspended-fourth", sus2: "suspended-second" };
  return { step: mm[1], alter: mm[2] === "#" ? 1 : mm[2] === "b" ? -1 : 0, kind: kinds[mm[3]] || "other", text: mm[3], bass: mm[4] ? { step: mm[4], alter: mm[5] === "#" ? 1 : mm[5] === "b" ? -1 : 0 } : null };
}
function toMusicXML() {
  const exportPitch = !ui.concert; const savedC = ui.concert; ui.concert = false;
  let x = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<score-partwise version="4.0">\n<work><work-title>${esc(S.title)}</work-title></work>\n<identification>${S.composer ? `<creator type="composer">${esc(S.composer)}</creator>` : ""}${S.lyricist ? `<creator type="lyricist">${esc(S.lyricist)}</creator>` : ""}<encoding><software>Nota Studio</software></encoding></identification>\n<part-list>\n`;
  S.staves.forEach((st, i) => { x += `<score-part id="P${i + 1}"><part-name>${esc(st.name + (st.group ? (st.gpos ? " (LH)" : " (RH)") : ""))}</part-name><part-abbreviation>${esc(st.short)}</part-abbreviation><score-instrument id="P${i + 1}-I1"><instrument-name>${esc(st.name)}</instrument-name></score-instrument><midi-instrument id="P${i + 1}-I1"><midi-channel>${st.clef === "percussion" ? 10 : (i % 15) + 1}</midi-channel><midi-program>${(st.gm || 0) + 1}</midi-program></midi-instrument></score-part>\n`; });
  x += `</part-list>\n`;
  const spanStart = {}, spanEnd = {}; S.spans.forEach((sp, k) => { (spanStart[sp.a] = spanStart[sp.a] || []).push([sp, k]); (spanEnd[sp.b] = spanEnd[sp.b] || []).push([sp, k]); });
  S.staves.forEach((st, si) => {
    x += `<part id="P${si + 1}">\n`;
    const t = st.tr, dia = Math.floor(t / 12) * 7 + SEMIDIA[((t % 12) + 12) % 12];
    for (let m = 0; m < nM(); m++) {
      x += `<measure number="${m + 1}">`;
      const meta = S.meta[m];
      if (m === 0 || meta.key != null || meta.time) {
        x += `<attributes>`;
        if (m === 0) x += `<divisions>${TPQ}</divisions>`;
        if (m === 0 || meta.key != null) x += `<key><fifths>${writtenKey(st, m)}</fifths></key>`;
        if (m === 0 || meta.time) x += `<time><beats>${timeAt(m)[0]}</beats><beat-type>${timeAt(m)[1]}</beat-type></time>`;
        if (m === 0) {
          const c = st.clef;
          x += c === "percussion" ? `<clef><sign>percussion</sign></clef>` : c === "bass" ? `<clef><sign>F</sign><line>4</line></clef>` : c === "alto" ? `<clef><sign>C</sign><line>3</line></clef>` : c === "tenor" ? `<clef><sign>C</sign><line>4</line></clef>` : `<clef><sign>G</sign><line>2</line>${c === "treble8vb" ? "<clef-octave-change>-1</clef-octave-change>" : ""}</clef>`;
          if (t) x += `<transpose><diatonic>${-dia}</diatonic><chromatic>${-t}</chromatic></transpose>`;
        }
        x += `</attributes>`;
      }
      if (meta.repBeg) x += `<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>`;
      if (si === 0 && meta.reh) x += `<direction placement="above"><direction-type><rehearsal>${esc(meta.reh)}</rehearsal></direction-type></direction>`;
      if (si === 0 && (m === 0 || meta.tempo)) { const tp = m === 0 ? { bpm: S.tempo, text: S.tempoText } : meta.tempo; x += `<direction placement="above"><direction-type>${tp.text ? `<words>${esc(tp.text)}</words>` : ""}<metronome><beat-unit>quarter</beat-unit><per-minute>${tp.bpm}</per-minute></metronome></direction-type><sound tempo="${tp.bpm}"/></direction>`; }
      if (si === 0 && meta.text) x += `<direction placement="above"><direction-type><words>${esc(meta.text)}</words></direction-type></direction>`;
      const wf = writtenKey(st, m);
      const vlist = voicesOf(st.measures[m]);
      vlist.forEach(([vn, vevs], vk) => {
      if (vk > 0) x += `<backup><duration>${mLen(m)}</duration></backup>`;
      vevs.forEach(e => {
        if (e.chord) { const c = parseChord(e.chord); if (c) x += `<harmony><root><root-step>${c.step}</root-step>${c.alter ? `<root-alter>${c.alter}</root-alter>` : ""}</root><kind text="${esc(c.text)}">${c.kind}</kind>${c.bass ? `<bass><bass-step>${c.bass.step}</bass-step>${c.bass.alter ? `<bass-alter>${c.bass.alter}</bass-alter>` : ""}</bass>` : ""}</harmony>`; }
        if (e.dyn) x += `<direction placement="below"><direction-type><dynamics><${e.dyn}/></dynamics></direction-type><sound dynamics="${Math.round((DYNVEL[e.dyn] || .6) * 140)}"/></direction>`;
        if (e.tx) x += `<direction placement="above"><direction-type><words font-style="italic">${esc(e.tx)}</words></direction-type></direction>`;
        (spanStart[e.id] || []).forEach(([sp, k]) => { if (sp.type !== "slur") x += `<direction placement="below"><direction-type><wedge type="${sp.type === "cresc" ? "crescendo" : "diminuendo"}" number="${(k % 6) + 1}"/></direction-type></direction>`; });
        const dur = evTicks(e);
        const keys = e.t === "n" ? e.keys : [null];
        keys.forEach((k, j) => {
          x += `<note>`;
          if (j > 0) x += `<chord/>`;
          if (k == null) x += `<rest${vevs.length === 1 && vk === 0 ? ` measure="yes"` : ""}/>`;
          else if (st.clef === "percussion") { const d = DRUMBY[k] || DRUMS[5]; const [l, o] = d.k.split("/"); x += `<unpitched><display-step>${l.toUpperCase()}</display-step><display-octave>${o}</display-octave></unpitched>`; }
          else { const sp = spellWritten(k, st, m, e.pf ? e.pf[j] : 0); x += `<pitch><step>${sp.step}</step>${sp.a ? `<alter>${sp.a}</alter>` : ""}<octave>${sp.oct}</octave></pitch>`; }
          x += `<duration>${dur}</duration>`;
          const prev = prevTied(st, m, e, vn);
          if (k != null && prev && prev.keys.includes(k)) x += `<tie type="stop"/>`;
          if (k != null && e.tie) x += `<tie type="start"/>`;
          x += `<voice>${vn}</voice>${vlist.length > 1 && k != null ? `<stem>${vn % 2 ? "up" : "down"}</stem>` : ""}<type>${XTYPE[e.d]}</type>${"<dot/>".repeat(e.dots || 0)}`;
          if (e.tup) x += `<time-modification><actual-notes>${e.tup.n}</actual-notes><normal-notes>${e.tup.of}</normal-notes></time-modification>`;
          if (st.clef === "percussion" && k != null) { const d = DRUMBY[k]; if (d && d.k.includes("/x")) x += `<notehead>x</notehead>`; }
          let nt = "";
          if (k != null && prev && prev.keys.includes(k)) nt += `<tied type="stop"/>`;
          if (k != null && e.tie) nt += `<tied type="start"/>`;
          if (j === 0) {
            (spanEnd[e.id] || []).forEach(([sp, k2]) => { if (sp.type === "slur") nt += `<slur type="stop" number="${(k2 % 6) + 1}"/>`; });
            (spanStart[e.id] || []).forEach(([sp, k2]) => { if (sp.type === "slur") nt += `<slur type="start" number="${(k2 % 6) + 1}"/>`; });
            if (e.art) { const a = e.art.filter(a => a !== "ferm").map(a => ({ stac: "<staccato/>", ten: "<tenuto/>", acc: "<accent/>", marc: "<strong-accent/>", stss: "<staccatissimo/>" }[a])).join(""); if (a) nt += `<articulations>${a}</articulations>`; if (e.art.includes("ferm")) nt += `<fermata type="upright"/>`; }
            if (e.tup) { const g = vevs.filter(z => z.tup && z.tup.g === e.tup.g); if (g[0] === e) nt += `<tuplet type="start" bracket="yes"/>`; if (g[g.length - 1] === e) nt += `<tuplet type="stop"/>`; }
          }
          if (nt) x += `<notations>${nt}</notations>`;
          if (j === 0 && e.lyr) x += `<lyric number="1"><syllabic>single</syllabic><text>${esc(e.lyr)}</text></lyric>`;
          x += `</note>`;
        });
        (spanEnd[e.id] || []).forEach(([sp, k]) => { if (sp.type !== "slur") x += `<direction placement="below"><direction-type><wedge type="stop" number="${(k % 6) + 1}"/></direction-type></direction>`; });
      });
      });
      const bar = meta.bar;
      if (bar) x += `<barline location="right"><bar-style>${bar === "double" ? "light-light" : "light-heavy"}</bar-style>${bar === "repEnd" ? `<repeat direction="backward"/>` : ""}</barline>`;
      if (meta.brk && si === 0) x += `<print new-system="yes"/>`;
      x += `</measure>\n`;
    }
    x += `</part>\n`;
  });
  x += `</score-partwise>\n`;
  ui.concert = savedC;
  return x;
}
function prevTied(st, m, e, v = 1) {
  const evs = V(st.measures[m], v) || [], i = evs.indexOf(e);
  const pl = m > 0 ? V(st.measures[m - 1], v) : null;
  const p = i > 0 ? evs[i - 1] : pl ? pl[pl.length - 1] : null;
  return p && p.t === "n" && p.tie ? p : null;
}

/* ================= MusicXML import ================= */
function typeToDur(t) { return { whole: "w", half: "h", quarter: "q", eighth: "8", "16th": "16", "32nd": "32", "64th": "64", breve: "w" }[t] || null; }
function fromMusicXML(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("ไฟล์ XML ไม่ถูกต้อง");
  const root = doc.querySelector("score-partwise");
  if (!root) throw new Error("รองรับเฉพาะ MusicXML แบบ score-partwise");
  const q = (el, sel) => el.querySelector(sel), qt = (el, sel) => { const n = el && el.querySelector(sel); return n ? n.textContent.trim() : ""; };
  IDC = 0;
  const title = qt(doc, "work > work-title") || qt(doc, "movement-title") || "Imported score";
  const composer = qt(doc, 'identification creator[type="composer"]');
  const parts = [...root.querySelectorAll(":scope > part")];
  const partNames = {}; doc.querySelectorAll("part-list score-part").forEach(sp => { partNames[sp.getAttribute("id")] = { name: qt(sp, "part-name") || "Part", short: qt(sp, "part-abbreviation"), prog: +qt(sp, "midi-program") || 1 }; });
  const firstMeasures = parts[0] ? [...parts[0].querySelectorAll(":scope > measure")] : [];
  const NMs = firstMeasures.length || 1;
  S = { v: 1, title, subtitle: "", composer, lyricist: "", key: 0, time: [4, 4], tempo: 100, tempoText: "", template: "Imported", meta: [], staves: [], spans: [] };
  for (let m = 0; m < NMs; m++) S.meta.push({});
  // global attributes from first part
  let divisions = 1;
  firstMeasures.forEach((ms, m) => {
    const k = q(ms, "attributes key fifths"), t = q(ms, "attributes time");
    if (k) { const f = +k.textContent; if (m === 0) S.key = f; else S.meta[m].key = f; }
    if (t) { const tt = [+qt(t, "beats"), +qt(t, "beat-type")]; if (tt[0] && tt[1]) { if (m === 0) S.time = tt; else S.meta[m].time = tt; } }
    const snd = q(ms, "sound[tempo]"); if (snd) { const bpm = Math.round(+snd.getAttribute("tempo")); if (m === 0) S.tempo = bpm; else S.meta[m].tempo = { bpm, text: "" }; }
    const reh = q(ms, "rehearsal"); if (reh) S.meta[m].reh = reh.textContent.trim();
    const bl = ms.querySelectorAll("barline"); bl.forEach(b => {
      const loc = b.getAttribute("location") || "right", st = qt(b, "bar-style"), rep = q(b, "repeat");
      if (rep && rep.getAttribute("direction") === "forward") S.meta[m].repBeg = true;
      if (loc === "right") { if (rep && rep.getAttribute("direction") === "backward") S.meta[m].bar = "repEnd"; else if (st === "light-heavy") S.meta[m].bar = "end"; else if (st === "light-light") S.meta[m].bar = "double"; }
    });
    if (q(ms, 'print[new-system="yes"]') && m > 0) S.meta[m - 1].brk = true;
  });
  // try reading global key fifths via concert: MusicXML keys are written; approximate concert key from first part with transpose
  parts.forEach(part => {
    const pid = part.getAttribute("id"), pn = partNames[pid] || { name: "Part", short: "", prog: 1 };
    const measures = [...part.querySelectorAll(":scope > measure")];
    let nStaves = 1; const sv = q(part, "attributes staves"); if (sv) nStaves = Math.max(1, Math.min(4, +sv.textContent));
    const gid = nStaves > 1 ? "g" + Math.random().toString(36).slice(2, 7) : null;
    let chrom = 0; const tc = q(part, "attributes transpose chromatic"); if (tc) { chrom = +tc.textContent; const oc = q(part, "attributes transpose octave-change"); if (oc) chrom += 12 * +oc.textContent; }
    const clefs = []; part.querySelectorAll("measure:first-of-type attributes clef").forEach(c => { const n = +(c.getAttribute("number") || 1); clefs[n - 1] = c; });
    const guess = guessInst(pn.name);
    const staves = [];
    for (let k = 0; k < nStaves; k++) {
      const c = clefs[k]; const sign = c ? qt(c, "sign") : "G", line = c ? +qt(c, "line") : 2, oct = c ? +qt(c, "clef-octave-change") : 0;
      let clef = sign === "F" ? "bass" : sign === "C" ? (line === 4 ? "tenor" : "alto") : sign === "percussion" ? "percussion" : (oct === -1 ? "treble8vb" : "treble");
      const tr = -chrom;
      staves.push({ id: "s" + Math.random().toString(36).slice(2, 8), inst: guess || "piano", name: pn.name, short: pn.short || pn.name.slice(0, 4) + ".", clef, tr, oct: tr % 12 === 0 && tr !== 0 ? 1 : 0,
        timbre: clef === "percussion" ? "drums" : guess ? CAT[guess].timbre : "piano", gm: Math.max(0, pn.prog - 1), fam: guess ? CAT[guess].fam : (nStaves > 1 ? "kbd" : "ww"), vol: .8, mute: false, solo: false, group: gid, gpos: k, measures: [] });
    }
    divisions = 1;
    measures.forEach((ms, m) => {
      if (m >= NMs) return;
      const dv = q(ms, "attributes divisions"); if (dv) divisions = +dv.textContent || 1;
      const conv = d => Math.round(d * TPQ / divisions);
      let cursor = 0; const pos = staves.map(() => ({})); const lists = staves.map(() => ({})); const vmap = staves.map(() => ({}));
      let pendingDyn = Array(nStaves).fill(null), pendingWords = Array(nStaves).fill(null), pendingChord = null, wedgeStart = null;
      for (const el of ms.children) {
        if (el.tagName === "backup") { cursor -= conv(+qt(el, "duration")); continue; }
        if (el.tagName === "forward") { cursor += conv(+qt(el, "duration")); continue; }
        if (el.tagName === "harmony") { const r = qt(el, "root-step"), a = +qt(el, "root-alter") || 0, kind = q(el, "kind"); pendingChord = r + (a > 0 ? "#" : a < 0 ? "b" : "") + (kind ? (kind.getAttribute("text") ?? ({ minor: "m", dominant: "7", "major-seventh": "maj7", "minor-seventh": "m7", diminished: "dim", "half-diminished": "m7b5" }[kind.textContent.trim()] || "")) : ""); continue; }
        if (el.tagName === "direction") {
          const stn = Math.max(0, Math.min(nStaves - 1, (+qt(el, "staff") || 1) - 1));
          const dyn = q(el, "dynamics"); if (dyn && dyn.firstElementChild) pendingDyn[stn] = dyn.firstElementChild.tagName;
          const w = q(el, "words"); if (w && w.textContent.trim()) pendingWords[stn] = w.textContent.trim();
          continue;
        }
        if (el.tagName !== "note") continue;
        if (q(el, "grace")) continue;
        const stn = Math.max(0, Math.min(nStaves - 1, (+qt(el, "staff") || 1) - 1));
        const voice = qt(el, "voice") || "1";
        const isChord = !!q(el, "chord");
        const dur = conv(+qt(el, "duration") || 0);
        if (vmap[stn][voice] == null) { const used = Object.keys(vmap[stn]).length; if (used >= 4) { if (!isChord) cursor += dur; continue; } vmap[stn][voice] = used + 1; }
        const vn = vmap[stn][voice];
        const list = lists[stn][vn] = lists[stn][vn] || [];
        if (pos[stn][vn] == null) pos[stn][vn] = 0;
        let midi = null;
        if (q(el, "pitch")) { const step = qt(el, "pitch step"), alt = +qt(el, "pitch alter") || 0, oc = +qt(el, "pitch octave"); midi = (oc + 1) * 12 + NAT[LET.indexOf(step)] + Math.round(alt) + chrom; }
        else if (q(el, "unpitched")) { const step = qt(el, "display-step"), oc = qt(el, "display-octave"); const key = step.toLowerCase() + "/" + oc; const d = DRUMS.find(x => x.k.startsWith(key)) || DRUMS[5]; midi = d.m; }
        if (isChord) { const last = list[list.length - 1]; if (last && midi != null) { if (last.t === "r") { last.t = "n"; } if (!last.keys.includes(midi)) last.keys.push(midi); last.keys.sort((a, b) => a - b); } continue; }
        if (cursor > pos[stn][vn]) { list.push(...restsFor(cursor - pos[stn][vn])); pos[stn][vn] = cursor; }
        if (cursor < pos[stn][vn]) { cursor += dur; continue; }
        let d = typeToDur(qt(el, "type")); let dots = el.querySelectorAll("dot").length;
        const tm = q(el, "time-modification");
        const evs = [];
        if (!d || (tm && false)) { decompose(dur).forEach(([dd, dt]) => evs.push(midi != null ? mkNote([midi], dd, dt) : mkRest(dd, dt))); }
        else { const e = midi != null ? mkNote([midi], d, dots) : mkRest(d, dots); if (tm) { e.tup = { n: +qt(tm, "actual-notes") || 3, of: +qt(tm, "normal-notes") || 2, g: "" }; } evs.push(e); }
        const e0 = evs[0];
        if (q(el, "rest[measure='yes']")) { evs.length = 0; evs.push(...restsFor(dur)); }
        if (midi != null) {
          if (el.querySelector("tie[type='start'], tied[type='start']")) evs[evs.length - 1].tie = true;
          const arts = []; const ar = q(el, "articulations");
          if (ar) { if (q(ar, "staccato")) arts.push("stac"); if (q(ar, "tenuto")) arts.push("ten"); if (q(ar, "accent")) arts.push("acc"); if (q(ar, "strong-accent")) arts.push("marc"); if (q(ar, "staccatissimo")) arts.push("stss"); }
          if (q(el, "fermata")) arts.push("ferm");
          if (arts.length) e0.art = arts;
          const ly = qt(el, "lyric text"); if (ly) e0.lyr = ly;
          el.querySelectorAll("slur").forEach(sl => { const ty = sl.getAttribute("type"); if (ty === "start") (staves[stn]._sl = staves[stn]._sl || []).push(e0.id); else if (ty === "stop" && staves[stn]._sl && staves[stn]._sl.length) S.spans.push({ type: "slur", a: staves[stn]._sl.pop(), b: e0.id }); });
        }
        if (pendingDyn[stn] && DYNS.includes(pendingDyn[stn]) && midi != null) { e0.dyn = pendingDyn[stn]; pendingDyn[stn] = null; }
        if (pendingWords[stn]) { e0.tx = pendingWords[stn]; pendingWords[stn] = null; }
        if (pendingChord && stn === 0) { e0.chord = pendingChord; pendingChord = null; }
        list.push(...evs);
        pos[stn][vn] = cursor + dur; cursor += dur;
      }
      // tuplet group ids
      lists.forEach(lv => Object.values(lv).forEach(list => { let g = null, cnt = 0; list.forEach(e => { if (e.tup) { if (!g || cnt >= e.tup.n) { g = "t" + nid(); cnt = 0; } e.tup.g = g; cnt++; } else { g = null; cnt = 0; } }); }));
      staves.forEach((st, k) => { const lv = lists[k]; const ms = { ev: lv[1] || [] }; for (const vn of [2, 3, 4]) if (lv[vn] && lv[vn].some(e => e.t === "n")) { ms.vx = ms.vx || {}; ms.vx[vn] = lv[vn]; } st.measures[m] = ms; });
    });
    staves.forEach(st => { delete st._sl; for (let m = 0; m < NMs; m++) { if (!st.measures[m]) st.measures[m] = { ev: [] }; } S.staves.push(st); });
  });
  // concert key: written key of first non-transposing part, else adjust
  const ref = S.staves.find(s => s.tr === 0 && s.clef !== "percussion");
  if (!ref && S.staves[0]) { const df = fifthsFor(S.staves[0].tr); S.key = clampKey(S.key - df); S.meta.forEach(x => { if (x.key != null) x.key = clampKey(x.key - df); }); }
  for (const st of S.staves) for (let m = 0; m < NMs; m++) refitMeasure(st, m);
  if (!S.meta.some(x => x.bar === "end")) S.meta[NMs - 1].bar = S.meta[NMs - 1].bar || "end";
  syncIds();
}
function guessInst(name) {
  const n = name.toLowerCase();
  const map = [["piccolo", "piccolo"], ["flute", "flute"], ["oboe", "oboe"], ["bass clar", "bassclar"], ["clarinet", "clarinet"], ["bassoon", "bassoon"], ["soprano sax", "sopsax"], ["alto sax", "altosax"], ["tenor sax", "tenorsax"], ["bari", "barisax"], ["horn", "horn"], ["trumpet", "trumpet"], ["flugel", "flugel"], ["bass trombone", "basstbn"], ["trombone", "trombone"], ["tuba", "tuba"], ["timpani", "timpani"], ["drum", "drums"], ["vibra", "vibes"], ["marimba", "marimba"], ["glock", "glock"], ["electric guitar", "eguitar"], ["guitar", "aguitar"], ["bass guitar", "ebass"], ["electric bass", "ebass"], ["organ", "organ"], ["harp", "harp"], ["piano", "piano"], ["violin", "violin"], ["viola", "viola"], ["cello", "cello"], ["contrabass", "contrabass"], ["double bass", "contrabass"], ["soprano", "soprano"], ["alto", "alto"], ["tenor", "tenor"], ["bass", "bassv"], ["voice", "soprano"]];
  for (const [k, v] of map) if (n.includes(k)) return v;
  return null;
}

/* ================= zip (store) + reader ================= */
const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = -1; for (let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(); const chunks = [], central = []; let off = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    chunks.push(new Uint8Array(head), name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
}
async function readZip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eo = -1; for (let i = u8.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error("ไฟล์ zip ไม่ถูกต้อง");
  const count = dv.getUint16(eo + 10, true); let p = dv.getUint32(eo + 16, true); const out = {};
  for (let k = 0; k < count; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    const lnl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true);
    const data = u8.subarray(lo + 30 + lnl + lel, lo + 30 + lnl + lel + csize);
    out[name] = { method, data };
    p += 46 + nlen + elen + clen;
  }
  const get = async (name) => {
    const f = out[name]; if (!f) return null;
    if (f.method === 0) return new TextDecoder().decode(f.data);
    if (typeof DecompressionStream === "undefined") throw new Error("เบราว์เซอร์นี้แตกไฟล์ .mxl ไม่ได้ ลองใช้ .musicxml");
    const ds = new Blob([f.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(ds).text();
  };
  let rootPath = null;
  const cont = await get("META-INF/container.xml");
  if (cont) { const m = /full-path="([^"]+)"/.exec(cont); if (m) rootPath = m[1]; }
  if (!rootPath) rootPath = Object.keys(out).find(n => !n.startsWith("META-INF") && /\.(xml|musicxml)$/i.test(n));
  if (!rootPath) throw new Error("ไม่พบ MusicXML ในไฟล์ .mxl");
  return await get(rootPath);
}

/* ================= exports via downloads capability ================= */
let DL = undefined;
async function dl() { if (DL !== undefined) return DL; try { DL = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { DL = null; } return DL; }
function fileBase() { return (S.title || "score").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "score"; }
const STANDALONE = !(window.claude && typeof window.claude.use === "function");
function anchorDownload(filename, data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast("ดาวน์โหลด " + filename);
}
async function saveFile(filename, data) {
  if (STANDALONE) return anchorDownload(filename, data);
  const d = await dl();
  if (!d) { toast("หน้านี้บันทึกไฟล์ไม่ได้ในมุมมองนี้ — ใช้ปุ่ม “คัดลอก MusicXML” แทน"); return; }
  try { await d.save({ filename, data }); toast("ส่งไฟล์ " + filename + " แล้ว"); }
  catch (e) { const c = e && e.code; if (c === "declined") toast("ยกเลิกการบันทึก"); else if (c === "rate_limited") toast("มีหน้าต่างบันทึกเปิดอยู่ ลองอีกครั้ง"); else toast("บันทึกไม่สำเร็จ (" + (c || "error") + ")"); }
}
function pageSVGString(i) {
  const pg = LAY.pages[i]; if (!pg) return null;
  const clone = pg.svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.setAttribute("width", pg.w); clone.setAttribute("height", pg.h); clone.removeAttribute("style");
  const bgr = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bgr.setAttribute("width", "100%"); bgr.setAttribute("height", "100%"); bgr.setAttribute("fill", "#ffffff"); clone.insertBefore(bgr, clone.firstChild);
  clone.querySelectorAll(".bg").forEach(g => g.remove());
  return new XMLSerializer().serializeToString(clone);
}
async function exportZip() {
  const savedSel = [ui.sel, ui.range, ui.anchor, ui.input]; ui.sel = ui.range = ui.anchor = null; ui.input = false; render();
  const files = [{ name: fileBase() + ".musicxml", data: toMusicXML() }, { name: fileBase() + ".mid", data: toMidi() }, { name: fileBase() + ".nota.json", data: snapshot() }];
  LAY.pages.forEach((_, i) => files.push({ name: `${fileBase()}-page-${i + 1}.svg`, data: pageSVGString(i) }));
  [ui.sel, ui.range, ui.anchor, ui.input] = savedSel; render();
  await saveFile(fileBase() + ".zip", makeZip(files));
}
async function exportOne(kind) {
  if (kind === "json") return saveFile(fileBase() + ".nota.json", snapshot());
  if (kind === "musicxml" && STANDALONE) return saveFile(fileBase() + ".musicxml", toMusicXML());
  if (kind === "midi" && STANDALONE) return saveFile(fileBase() + ".mid", new Blob([toMidi()], { type: "audio/midi" }));
  if (kind === "musicxml") return saveFile(fileBase() + "-musicxml.zip", makeZip([{ name: fileBase() + ".musicxml", data: toMusicXML() }]));
  if (kind === "midi") return saveFile(fileBase() + "-midi.zip", makeZip([{ name: fileBase() + ".mid", data: toMidi() }]));
  const saved = [ui.sel, ui.range, ui.anchor, ui.input]; ui.sel = ui.range = ui.anchor = null; ui.input = false; render();
  const pageIx = 0; const svgs = LAY.pages.map((_, i) => pageSVGString(i));
  [ui.sel, ui.range, ui.anchor, ui.input] = saved; render();
  if (kind === "svg") { if (svgs.length === 1) return saveFile(fileBase() + ".svg", svgs[0]); return saveFile(fileBase() + "-svg.zip", makeZip(svgs.map((s, i) => ({ name: `${fileBase()}-page-${i + 1}.svg`, data: s })))); }
  if (kind === "png") {
    const pngs = [];
    for (let i = 0; i < svgs.length; i++) {
      const pg = LAY.pages[i]; const img = new Image(); const url = URL.createObjectURL(new Blob([svgs[i]], { type: "image/svg+xml" }));
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement("canvas"); c.width = pg.w * 2.5; c.height = pg.h * 2.5; const cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      pngs.push(await new Promise(r => c.toBlob(r, "image/png")));
    }
    if (pngs.length === 1) return saveFile(fileBase() + ".png", pngs[0]);
    const arrs = await Promise.all(pngs.map(b => b.arrayBuffer()));
    return saveFile(fileBase() + "-png.zip", makeZip(arrs.map((a, i) => ({ name: `${fileBase()}-page-${i + 1}.png`, data: new Uint8Array(a) }))));
  }
}
async function copyMusicXML() {
  const x = toMusicXML();
  try { await navigator.clipboard.writeText(x); toast("คัดลอก MusicXML แล้ว — วางลงไฟล์ .musicxml ได้เลย"); }
  catch (e) { openModal("คัดลอก MusicXML", `<textarea id="mxText" class="inp" style="width:100%;height:300px;font:11px var(--f-mono)" readonly></textarea><p class="note">เลือกข้อความทั้งหมด (Ctrl+A) แล้วคัดลอก</p>`, [{ label: "ปิด" }]); const ta = document.getElementById("mxText"); ta.value = x; ta.select(); }
}
async function importFile(file) {
  try {
    const name = file.name.toLowerCase();
    let snapshotBefore = S ? snapshot() : null;
    if (name.endsWith(".json")) { const o = JSON.parse(await file.text()); if (!o.staves || !o.meta) throw new Error("ไม่ใช่ไฟล์โปรเจกต์ Nota"); S = o; syncIds(); }
    else if (name.endsWith(".mxl")) fromMusicXML(await readZip(await file.arrayBuffer()));
    else fromMusicXML(await file.text());
    if (snapshotBefore) { undoStack.push(snapshotBefore); redoStack.length = 0; }
    ui.sel = ui.range = ui.anchor = null; ui.part = "all";
    afterChange(); renderRibbon(); toast("เปิด “" + S.title + "” แล้ว");
  } catch (e) { console.error(e); toast("เปิดไฟล์ไม่ได้: " + e.message); }
}
