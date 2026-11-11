/* ================= Mixer: pan, insert effects, MIDI out to a DAW / VST host ================= */
const FXDEF = {
  eq: { n: "EQ 3 แบนด์", en: "3-band EQ", p: { low: [-12, 12, 0, .5, "ทุ้ม dB", "Low dB"], mid: [-12, 12, 0, .5, "กลาง dB", "Mid dB"], high: [-12, 12, 0, .5, "แหลม dB", "High dB"] } },
  comp: { n: "Compressor", en: "Compressor", p: { thr: [-60, 0, -18, 1, "Threshold dB", "Threshold dB"], ratio: [1, 20, 4, .5, "Ratio", "Ratio"], gain: [0, 24, 4, .5, "เพิ่มเสียง dB", "Makeup dB"] } },
  reverb: { n: "Reverb ห้องก้อง", en: "Reverb", p: { size: [.3, 6, 2.2, .1, "ขนาดห้อง วินาที", "Size seconds"], mix: [0, 1, .3, .01, "ผสม", "Mix"] } },
  delay: { n: "Delay เสียงสะท้อน", en: "Delay", p: { time: [.05, 1.2, .35, .01, "เวลา วินาที", "Time seconds"], fb: [0, .9, .35, .01, "Feedback", "Feedback"], mix: [0, 1, .25, .01, "ผสม", "Mix"] } },
  chorus: { n: "Chorus", en: "Chorus", p: { rate: [.1, 5, 1.2, .1, "ความเร็ว Hz", "Rate Hz"], depth: [0, 10, 3, .1, "ความลึก ms", "Depth ms"], mix: [0, 1, .4, .01, "ผสม", "Mix"] } },
  drive: { n: "Overdrive", en: "Overdrive", p: { amt: [0, 100, 30, 1, "ความแตก", "Drive"], tone: [500, 12000, 4000, 100, "โทน Hz", "Tone Hz"], mix: [0, 1, 1, .01, "ผสม", "Mix"] } },
  filter: { n: "Filter กรองเสียง", en: "Low-pass filter", p: { cut: [100, 18000, 8000, 50, "ความถี่ตัด Hz", "Cutoff Hz"], q: [.1, 18, .7, .1, "Resonance", "Resonance"] } }
};
function fxDefaults(type) { const p = {}; for (const k in FXDEF[type].p) p[k] = FXDEF[type].p[k][2]; return { type, on: true, p }; }
const dbLin = db => Math.pow(10, db / 20);
const IMP = {};
function impulse(ac, sec) {
  const key = ac.sampleRate + ":" + sec.toFixed(1); if (IMP[key]) return IMP[key];
  const len = Math.max(1, Math.floor(ac.sampleRate * sec)), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  return IMP[key] = b;
}
function driveCurve(amt) { const k = amt * 2, n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
/* returns {input, output, set(param, value)} */
function makeFX(ac, fx) {
  const p = fx.p, input = ac.createGain(), output = ac.createGain();
  const wetDry = (node, last) => { const dry = ac.createGain(), wet = ac.createGain(); input.connect(dry); dry.connect(output); input.connect(node); (last || node).connect(wet); wet.connect(output); const mix = v => { dry.gain.value = 1 - v; wet.gain.value = v; }; mix(p.mix); return mix; };
  switch (fx.type) {
    case "eq": {
      const l = ac.createBiquadFilter(), m = ac.createBiquadFilter(), h = ac.createBiquadFilter();
      l.type = "lowshelf"; l.frequency.value = 200; m.type = "peaking"; m.frequency.value = 1000; m.Q.value = .9; h.type = "highshelf"; h.frequency.value = 5000;
      input.connect(l); l.connect(m); m.connect(h); h.connect(output);
      const set = (k, v) => { if (k === "low") l.gain.value = v; if (k === "mid") m.gain.value = v; if (k === "high") h.gain.value = v; };
      for (const k in p) set(k, p[k]); return { input, output, set };
    }
    case "comp": {
      const c = ac.createDynamicsCompressor(), g = ac.createGain(); c.knee.value = 6; c.attack.value = .005; c.release.value = .15;
      input.connect(c); c.connect(g); g.connect(output);
      const set = (k, v) => { if (k === "thr") c.threshold.value = v; if (k === "ratio") c.ratio.value = v; if (k === "gain") g.gain.value = dbLin(v); };
      for (const k in p) set(k, p[k]); return { input, output, set };
    }
    case "reverb": {
      const cv = ac.createConvolver(); cv.buffer = impulse(ac, p.size);
      const mix = wetDry(cv);
      return { input, output, set: (k, v) => { if (k === "mix") mix(v); if (k === "size") cv.buffer = impulse(ac, v); } };
    }
    case "delay": {
      const d = ac.createDelay(2), fb = ac.createGain(); d.delayTime.value = p.time; fb.gain.value = p.fb; d.connect(fb); fb.connect(d);
      const mix = wetDry(d);
      return { input, output, set: (k, v) => { if (k === "mix") mix(v); if (k === "time") d.delayTime.value = v; if (k === "fb") fb.gain.value = v; } };
    }
    case "chorus": {
      const d = ac.createDelay(.1), lfo = ac.createOscillator(), dep = ac.createGain(); d.delayTime.value = .015; lfo.frequency.value = p.rate; dep.gain.value = p.depth / 1000;
      lfo.connect(dep); dep.connect(d.delayTime); lfo.start();
      const mix = wetDry(d);
      return { input, output, set: (k, v) => { if (k === "mix") mix(v); if (k === "rate") lfo.frequency.value = v; if (k === "depth") dep.gain.value = v / 1000; }, stop: () => { try { lfo.stop(); } catch (e) { } } };
    }
    case "drive": {
      const ws = ac.createWaveShaper(), lp = ac.createBiquadFilter(); ws.curve = driveCurve(p.amt); ws.oversample = "2x"; lp.type = "lowpass"; lp.frequency.value = p.tone; ws.connect(lp);
      const mix = wetDry(ws, lp);
      return { input, output, set: (k, v) => { if (k === "mix") mix(v); if (k === "amt") ws.curve = driveCurve(v); if (k === "tone") lp.frequency.value = v; } };
    }
    case "filter": {
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = p.cut; f.Q.value = p.q;
      input.connect(f); f.connect(output);
      return { input, output, set: (k, v) => { if (k === "cut") f.frequency.value = v; if (k === "q") f.Q.value = v; } };
    }
  }
  input.connect(output); return { input, output, set() { } };
}
/* per-staff chain: input → volume → pan → insert effects → destination */
function buildChain(ac, st, dest) {
  const vol = ac.createGain(); vol.gain.value = st.vol;
  let last = vol, pan = null;
  if (ac.createStereoPanner) { pan = ac.createStereoPanner(); pan.pan.value = st.pan || 0; vol.connect(pan); last = pan; }
  const fx = [];
  for (const f of st.fx || []) {
    if (!f.on || !FXDEF[f.type]) continue;
    const n = makeFX(ac, f); last.connect(n.input); last = n.output; fx.push({ ref: f, node: n });
  }
  last.connect(dest);
  return { input: vol, vol, pan, fx };
}
function outKind(st) { return (st.out && st.out.kind) || "app"; }

/* ---------- Web MIDI ---------- */
const MIDIIO = { access: null, outputs: [], tried: false, error: "" };
async function midiConnect(quiet) {
  if (!navigator.requestMIDIAccess) { MIDIIO.error = "เบราว์เซอร์นี้ไม่รองรับ MIDI — ใช้ Chrome หรือ Edge บนคอมพิวเตอร์"; if (!quiet) toast(MIDIIO.error); renderInspector(); return false; }
  try {
    MIDIIO.access = await navigator.requestMIDIAccess({ sysex: false });
    const refresh = () => { MIDIIO.outputs = [...MIDIIO.access.outputs.values()]; if (ui.rtab === "mix") renderInspector(); };
    MIDIIO.access.onstatechange = refresh; refresh(); MIDIIO.error = "";
    if (!quiet) toast(MIDIIO.outputs.length ? `เชื่อมต่อ MIDI แล้ว พบ ${MIDIIO.outputs.length} พอร์ต` : "เชื่อมต่อ MIDI แล้ว แต่ยังไม่พบพอร์ต — เปิด loopMIDI หรือ IAC Driver ก่อน");
    return true;
  } catch (e) {
    MIDIIO.error = "หน้านี้ใช้ MIDI ไม่ได้ (ถูกบล็อกหรือไม่ได้อนุญาต) — เปิดเว็บ GitHub ด้วย Chrome หรือ Edge แล้วกดอนุญาต MIDI";
    if (!quiet) toast(MIDIIO.error); renderInspector(); return false;
  } finally { MIDIIO.tried = true; }
}
function midiPortFor(st) { if (!st.out || !st.out.port) return MIDIIO.outputs[0] || null; return MIDIIO.outputs.find(o => o.name === st.out.port) || null; }
function midiChannel(st, si) { if (st.out && st.out.ch) return st.out.ch - 1; return st.clef === "percussion" ? 9 : (si >= 9 ? si + 1 : si) % 16; }
function scheduleMIDI(perf, startAudio, ac) {
  const used = new Map(); // port -> Set(channels)
  if (!MIDIIO.access) return used;
  const base = performance.now() + (startAudio - ac.currentTime) * 1000;
  S.staves.forEach((st, si) => {
    const k = outKind(st); if (k === "app") return;
    const port = midiPortFor(st); if (!port) return;
    const ch = midiChannel(st, si);
    if (!used.has(port)) used.set(port, new Set()); used.get(port).add(ch);
    try {
      if (ch !== 9) port.send([0xC0 | ch, st.gm & 127], base - 20);
      port.send([0xB0 | ch, 7, Math.round(Math.max(0, Math.min(1, st.vol)) * 127)], base - 15);
      port.send([0xB0 | ch, 10, Math.round(((st.pan || 0) + 1) * 63.5)], base - 15);
    } catch (e) { }
  });
  for (const n of perf.notes) {
    const st = S.staves[n.si]; if (outKind(st) === "app") continue;
    const port = midiPortFor(st); if (!port) continue;
    const ch = midiChannel(st, n.si), v = Math.max(1, Math.min(127, Math.round(n.vel * 127)));
    try { port.send([0x90 | ch, n.midi, v], base + n.t * 1000); port.send([0x80 | ch, n.midi, 0], base + (n.t + Math.max(.05, n.dur)) * 1000); } catch (e) { }
  }
  return used;
}
function midiPanic(used) {
  if (!used) return;
  for (const [port, chs] of used) { try { if (port.clear) port.clear(); for (const ch of chs) { port.send([0xB0 | ch, 123, 0]); port.send([0xB0 | ch, 120, 0]); } } catch (e) { } }
}

/* ---------- mixer UI ---------- */
const mixOpen = new Set();
function fxParamRow(si, k, f, name, d) {
  const [mn, mx, , step, th, en] = d, v = f.p[name] != null ? f.p[name] : d[2];
  const shown = step >= 1 ? Math.round(v) : (+v).toFixed(step < .1 ? 2 : 1);
  return `<label class="fxp"><span>${th}</span><input type="range" min="${mn}" max="${mx}" step="${step}" value="${v}" data-fxp="${si}:${k}:${name}" aria-label="${esc(FXDEF[f.type].n + " " + th)}" data-en="${esc(FXDEF[f.type].en + " " + en)}"><code>${shown}</code></label>`;
}
function renderMixer() {
  let x = `<div class="sec"><h5>มิกเซอร์</h5>
    <div class="mixinfo"><b>ใช้ VST / VST3</b><p class="note">เบราว์เซอร์โหลดปลั๊กอิน VST หรือ VST3 โดยตรงไม่ได้ ให้ตั้ง "เอาต์พุต" ของแทร็กเป็น MIDI แล้วส่งไปยังโปรแกรมที่เปิด VST ได้ เช่น Reaper, Cakewalk, Ableton, FL Studio, Kontakt หรือ VSTHost · Windows ใช้พอร์ตเสมือน loopMIDI · Mac ใช้ IAC Driver</p>
    <div class="btns"><button class="b ${MIDIIO.access ? "" : "pri"}" data-act="midiconnect" data-en="Connect MIDI">${MIDIIO.access ? "🔄 ค้นหาพอร์ต MIDI ใหม่" : "🎹 เชื่อมต่อ MIDI"}</button></div>
    ${MIDIIO.access ? `<p class="note">${MIDIIO.outputs.length ? "พอร์ตที่พบ: " + MIDIIO.outputs.map(o => esc(o.name)).join(", ") : "ยังไม่พบพอร์ต MIDI — เปิด loopMIDI / IAC Driver หรือเสียบอุปกรณ์ MIDI แล้วกดค้นหาใหม่"}</p>` : MIDIIO.error ? `<p class="note" style="color:var(--danger)">${esc(MIDIIO.error)}</p>` : ""}</div>`;
  S.staves.forEach((st, i) => {
    const open = mixOpen.has(st.id), k = outKind(st), fx = st.fx || [];
    const summary = [k !== "app" ? "MIDI" + (st.out && st.out.port ? " · " + esc(st.out.port) : "") : "", ...fx.filter(f => f.on).map(f => FXDEF[f.type] ? FXDEF[f.type].en : "")].filter(Boolean).join(" · ");
    x += `<div class="mix${open ? " open" : ""}"><div class="h"><span>${esc(st.name)}${st.group ? (st.gpos ? " (L.H.)" : " (R.H.)") : ""}</span><button class="ib" data-act="mute:${i}" aria-pressed="${st.mute}" title="Mute">M</button><button class="ib" data-act="solo:${i}" aria-pressed="${st.solo}" title="Solo">S</button><button class="ib" data-act="mixopen:${i}" aria-pressed="${open}" aria-expanded="${open}" title="เอฟเฟกต์และเอาต์พุต" data-en="Effects and output for ${esc(st.name)}">⚙</button></div>
      <label class="fxp"><span>ระดับ</span><input type="range" min="0" max="100" value="${Math.round(st.vol * 100)}" data-vol="${i}" aria-label="ระดับเสียง ${esc(st.name)}"><code>${Math.round(st.vol * 100)}</code></label>
      ${!open && summary ? `<div class="fxsum">${summary}</div>` : ""}`;
    if (open) {
      x += `<label class="fxp"><span>แพน</span><input type="range" min="-1" max="1" step="0.05" value="${st.pan || 0}" data-pan="${i}" aria-label="แพนซ้ายขวา ${esc(st.name)}" data-en="Pan ${esc(st.name)}"><code>${panText(st.pan || 0)}</code></label>
        <div class="kv mixkv"><span>เอาต์พุต</span><select class="sel" data-out="${i}" aria-label="เอาต์พุต ${esc(st.name)}" data-en="Output ${esc(st.name)}">
          <option value="app" ${k === "app" ? "selected" : ""}>เสียงในแอป</option><option value="midi" ${k === "midi" ? "selected" : ""}>MIDI ออก (VST / DAW)</option><option value="both" ${k === "both" ? "selected" : ""}>ทั้งสองอย่าง</option></select>`;
      if (k !== "app") {
        x += `<span>พอร์ต</span>${MIDIIO.access ? `<select class="sel" data-port="${i}" aria-label="พอร์ต MIDI" data-en="MIDI port">${MIDIIO.outputs.length ? MIDIIO.outputs.map(o => `<option ${st.out && st.out.port === o.name ? "selected" : ""}>${esc(o.name)}</option>`).join("") : `<option value="">ไม่พบพอร์ต</option>`}</select>` : `<button class="b" data-act="midiconnect" data-en="Connect MIDI">เชื่อมต่อ MIDI</button>`}
          <span>ช่อง (channel)</span><select class="sel" data-ch="${i}" aria-label="ช่อง MIDI" data-en="MIDI channel">${Array.from({ length: 16 }, (_, c) => `<option value="${c + 1}" ${midiChannel(st, i) === c ? "selected" : ""}>${c + 1}${c === 9 ? " (กลอง)" : ""}</option>`).join("")}</select>`;
      }
      x += `</div><div class="fxhead">Insert effects</div>${k === "midi" ? `<p class="note">แทร็กนี้ส่งออกเป็น MIDI อย่างเดียว เอฟเฟกต์ในแอปจึงไม่มีผล ให้ใส่เอฟเฟกต์ VST ในโปรแกรม DAW แทน หรือเลือก "ทั้งสองอย่าง"</p>` : ""}`;
      fx.forEach((f, kk) => {
        const d = FXDEF[f.type]; if (!d) return;
        x += `<div class="fx${f.on ? "" : " off"}"><div class="fxtop"><select class="sel" data-fxtype="${i}:${kk}" aria-label="ชนิดเอฟเฟกต์ช่อง ${kk + 1}" data-en="Effect slot ${kk + 1} type">${Object.entries(FXDEF).map(([t, dd]) => `<option value="${t}" ${t === f.type ? "selected" : ""}>${dd.n}</option>`).join("")}</select>
          <button class="ib" data-act="fxon:${i}:${kk}" aria-pressed="${f.on}" title="${f.on ? "ปิด" : "เปิด"}เอฟเฟกต์" data-en="${d.en} ${f.on ? "on" : "off"}">⏻</button><button class="ib" data-act="fxup:${i}:${kk}" title="เลื่อนขึ้น" data-en="Move effect up">↑</button><button class="ib" data-act="fxrm:${i}:${kk}" title="ลบเอฟเฟกต์" data-en="Remove ${d.en}">✕</button></div>
          ${Object.entries(d.p).map(([name, dd]) => fxParamRow(i, kk, f, name, dd)).join("")}</div>`;
      });
      x += fx.length < 6 ? `<button class="b" data-act="fxadd:${i}" data-en="Add effect to ${esc(st.name)}">＋ เพิ่มเอฟเฟกต์</button>` : "";
    }
    x += `</div>`;
  });
  return x + `</div>`;
}
function panText(v) { v = +v; return Math.abs(v) < .03 ? "C" : (v < 0 ? "L" : "R") + Math.round(Math.abs(v) * 100); }
function liveChain(si) { return playing && playing.chains ? playing.chains[si] : null; }
function mixAction(k, arg) {
  const [a, b] = String(arg).split(":").map(Number), st = S.staves[a];
  if (k === "midiconnect") { midiConnect(false); return true; }
  if (!st) return false;
  if (k === "mixopen") { if (mixOpen.has(st.id)) mixOpen.delete(st.id); else mixOpen.add(st.id); renderInspector(); return true; }
  if (k === "fxadd") { st.fx = st.fx || []; st.fx.push(fxDefaults(st.fx.length ? "reverb" : "eq")); afterMixChange(true); toast(`เพิ่มเอฟเฟกต์ให้ ${st.name}`); return true; }
  if (k === "fxrm") { st.fx.splice(b, 1); afterMixChange(true); toast("ลบเอฟเฟกต์แล้ว"); return true; }
  if (k === "fxon") { st.fx[b].on = !st.fx[b].on; afterMixChange(true); return true; }
  if (k === "fxup") { if (b > 0) { const t = st.fx[b]; st.fx[b] = st.fx[b - 1]; st.fx[b - 1] = t; afterMixChange(true); } return true; }
  return false;
}
function afterMixChange(structural) {
  autosave(); renderInspector();
  if (structural && playing) toast("การเปลี่ยนนี้มีผลเมื่อกดเล่นใหม่");
}
function mixWire() {
  const _do = doAction; doAction = function (act) {
    if (act && /^(mixopen|fxadd|fxrm|fxon|fxup|midiconnect)(:|$)/.test(act)) { const i = act.indexOf(":"); return mixAction(i < 0 ? act : act.slice(0, i), i < 0 ? "" : act.slice(i + 1)); }
    return _do.apply(this, arguments);
  };
  document.addEventListener("input", e => {
    const t = e.target; if (!t.dataset) return;
    const show = v => { const c = t.parentElement && t.parentElement.querySelector("code"); if (c) c.textContent = v; };
    if (t.dataset.vol != null) { const ch = liveChain(+t.dataset.vol); if (ch) ch.vol.gain.value = t.value / 100; show(t.value); }
    else if (t.dataset.pan != null) { const st = S.staves[+t.dataset.pan]; st.pan = +t.value; const ch = liveChain(+t.dataset.pan); if (ch && ch.pan) ch.pan.pan.value = st.pan; show(panText(st.pan)); autosave(); }
    else if (t.dataset.fxp) {
      const [si, kk, name] = t.dataset.fxp.split(":"), f = S.staves[+si].fx[+kk]; f.p[name] = +t.value;
      const ch = liveChain(+si); if (ch) { const n = ch.fx.find(z => z.ref === f); if (n) n.node.set(name, +t.value); }
      const step = +t.step; show(step >= 1 ? Math.round(t.value) : (+t.value).toFixed(step < .1 ? 2 : 1)); autosave();
    }
  });
  document.addEventListener("change", e => {
    const t = e.target; if (!t.dataset) return;
    if (t.dataset.out != null) { const st = S.staves[+t.dataset.out]; st.out = { ...(st.out || {}), kind: t.value }; if (t.value !== "app" && !MIDIIO.access) midiConnect(true).then(() => { if (MIDIIO.outputs[0] && !st.out.port) st.out.port = MIDIIO.outputs[0].name; renderInspector(); }); afterMixChange(true); }
    else if (t.dataset.port != null) { const st = S.staves[+t.dataset.port]; st.out = { ...(st.out || {}), port: t.value }; afterMixChange(false); }
    else if (t.dataset.ch != null) { const st = S.staves[+t.dataset.ch]; st.out = { ...(st.out || {}), ch: +t.value }; afterMixChange(false); }
    else if (t.dataset.fxtype) { const [si, kk] = t.dataset.fxtype.split(":").map(Number); S.staves[si].fx[kk] = fxDefaults(t.value); afterMixChange(true); }
  });
  COMMANDS.push(["Connect MIDI เชื่อมต่อ MIDI (VST / DAW)", "", "midiconnect"]);
}
mixWire();
