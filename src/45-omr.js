/* ================= PDF / image sheet-music import (reads notes with Claude) ================= */
var PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
var PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
var omrCtl = null;
function loadScriptOnce(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = document.createElement("script"); s.src = src; s.dataset.src = src;
    s.onload = () => res(); s.onerror = () => rej(new Error("โหลด " + src.split("/").pop() + " ไม่สำเร็จ"));
    document.head.appendChild(s);
  });
}
async function pdfToImages(file, onProgress) {
  await loadScriptOnce(PDFJS_URL);
  await loadScriptOnce(PDFJS_WORKER); // defines window.pdfjsWorker → pdf.js runs it on the main thread
  const lib = window.pdfjsLib; if (!lib) throw new Error("เปิดตัวอ่าน PDF ไม่ได้");
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n = Math.min(doc.numPages, 12), out = [];
  for (let p = 1; p <= n; p++) {
    onProgress && onProgress(`แปลงหน้า ${p}/${n} เป็นภาพ…`);
    const page = await doc.getPage(p);
    const v0 = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 1900 / v0.width);
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: cx, viewport: vp }).promise;
    out.push(...(await splitPage(c)));
  }
  return { images: out, pages: n, totalPages: doc.numPages };
}
async function imageFileToCanvas(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); await new Promise((r, j) => { img.onload = r; img.onerror = () => j(new Error("เปิดรูปไม่ได้")); img.src = url; });
    const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const cx = c.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
/* split a tall page at the emptiest horizontal band near the middle so each half keeps more detail */
async function splitPage(c) {
  const toBlob = cv => new Promise(r => cv.toBlob(r, "image/jpeg", .9));
  if (c.height < c.width * 1.1) return [await toBlob(c)];
  const cx = c.getContext("2d"), w = c.width, h = c.height;
  const data = cx.getImageData(0, 0, w, h).data;
  const ink = y => { let s = 0; for (let x = 0; x < w; x += 4) { const i = (y * w + x) * 4; if (data[i] < 140) s++; } return s; };
  let best = Math.round(h / 2), bestInk = Infinity;
  for (let y = Math.round(h * .38); y < h * .62; y += 2) { const v = ink(y) + ink(Math.min(h - 1, y + 6)) + ink(Math.max(0, y - 6)); if (v < bestInk) { bestInk = v; best = y; } }
  if (bestInk > w * .02) return [await toBlob(c)]; // no clean gap between systems → keep the page whole
  const part = (y0, y1) => { const d = document.createElement("canvas"); d.width = w; d.height = y1 - y0; const dx = d.getContext("2d"); dx.drawImage(c, 0, y0, w, y1 - y0, 0, 0, w, y1 - y0); return d; };
  return [await toBlob(part(0, best)), await toBlob(part(best, h))];
}

const OMR_PROMPT = (ctx, idx, total) => `You are reading printed sheet music (Western staff notation) from an image and transcribing it exactly into JSON.
This is image ${idx} of ${total} from one score, in reading order.${ctx ? `
Earlier images established: ${ctx}. Continue with the SAME parts in the SAME order; output only the measures visible in THIS image.` : ""}

Reply with ONLY one JSON object:
{"title": string, "composer": string, "tempo": number (quarter-note BPM, guess 100 if absent),
 "time": [beats, beatType], "parts": [ {"name": string, "instrument": one of ${JSON.stringify(Object.keys(CAT))},
   "keyFifths": number (key signature as printed for this part: sharps positive, flats negative),
   "staves": [ {"clef": "treble"|"bass"|"alto"|"tenor"|"treble8vb"|"percussion", "measures": [ string, ... ]} ] } ]}

Rules:
- One "staves" entry per staff of the part (piano/organ/harp usually 2: right hand then left hand). Every staff of every part must have the same number of measures.
- Each measure is one string of space-separated events in time order, using WRITTEN pitch exactly as printed (apply the key signature and accidentals, including accidentals carried through the bar).
- Event = PITCH:DURATION. PITCH is a letter A-G, optional # or b (## / bb for doubles), and octave number (middle C = C4), e.g. F#5, Bb3. A rest is r. A chord is [C4,E4,G4].
- DURATION: w h q 8 16 32 (whole..32nd); add "." for a dot; add "t" for a triplet member (e.g. 8t); add "~" at the very end if tied to the next note (e.g. G4:h~).
- A whole-bar rest is r:w. The durations in a measure must add up to the time signature.
- Ignore dynamics, slurs, lyrics and text. If only one voice can be read, transcribe the top voice of each staff.
- If the image is not sheet music, reply {"parts": []}.`;

function parseLooseMeasure(str, len) {
  const evs = []; let used = 0; let tupLeft = 0, tupG = null;
  for (let tok of String(str || "").trim().split(/\s+/)) {
    if (!tok) continue;
    let tie = false; if (tok.endsWith("~")) { tie = true; tok = tok.slice(0, -1); }
    const ci = tok.lastIndexOf(":"); if (ci < 0) continue;
    const p = tok.slice(0, ci); let d = tok.slice(ci + 1).toLowerCase();
    let trip = false; if (d.endsWith("t")) { trip = true; d = d.slice(0, -1); }
    let dots = 0; while (d.endsWith(".")) { dots++; d = d.slice(0, -1); }
    if (d === "1") d = "w"; else if (d === "2") d = "h"; else if (d === "4") d = "q";
    if (!DT[d]) continue;
    let e;
    try {
      if (p.toLowerCase() === "r") e = mkRest(d, Math.min(dots, 2));
      else { const keys = (p.startsWith("[") ? p.replace(/[\[\]]/g, "").split(",") : [p]).map(k => noteNum(k.trim().replace(/^([a-g])/, m => m.toUpperCase()))); e = mkNote(keys, d, Math.min(dots, 2)); }
    } catch (er) { continue; }
    if (trip) { if (!tupLeft) { tupG = "t" + nid(); tupLeft = 3; } e.tup = { n: 3, of: 2, g: tupG }; tupLeft--; } else tupLeft = 0;
    if (tie && e.t === "n") e.tie = true;
    const l = evTicks(e); if (used + l > len + 1) break;
    evs.push(e); used += l;
  }
  // complete an unfinished triplet group with rests
  if (tupLeft) { const last = evs[evs.length - 1]; for (let k = 0; k < tupLeft; k++) { const r = mkRest(last.d); r.tup = { ...last.tup }; evs.push(r); used += evTicks(r); } }
  if (used < len) evs.push(...restsFor(len - used));
  return evs;
}
function buildScoreFromOMR(pagesJson, fileName) {
  const first = pagesJson.find(p => p && p.parts && p.parts.length);
  if (!first) throw new Error("ไม่พบโน้ตดนตรีในไฟล์นี้");
  const time = Array.isArray(first.time) && first.time[0] > 0 && [2, 4, 8, 16].includes(+first.time[1]) ? [+first.time[0], +first.time[1]] : [4, 4];
  const parts = first.parts.map(pt => {
    const inst = CAT[pt.instrument] ? pt.instrument : null;
    return { name: String(pt.name || (inst ? CAT[inst].name : "Part")).slice(0, 60), inst, keyFifths: +pt.keyFifths || 0, staves: (pt.staves || []).map(s => ({ clef: s.clef, measures: [] })) };
  });
  for (const pj of pagesJson) {
    if (!pj || !pj.parts) continue;
    parts.forEach((pt, pi) => {
      const src = pj.parts[pi]; if (!src || !src.staves) return;
      const count = Math.max(...src.staves.map(s => (s.measures || []).length), 0);
      pt.staves.forEach((st, si) => { const ms = (src.staves[si] && src.staves[si].measures) || []; for (let m = 0; m < count; m++) st.measures.push(ms[m] || "r:w"); });
    });
  }
  const nMeas = Math.max(1, ...parts.flatMap(p => p.staves.map(s => s.measures.length)));
  IDC = 0;
  S = { v: 1, title: String(first.title || fileName.replace(/\.[^.]+$/, "")).slice(0, 120), subtitle: "นำเข้าจากไฟล์ " + fileName, composer: String(first.composer || "").slice(0, 120), lyricist: "",
    key: 0, time, tempo: Math.max(30, Math.min(300, Math.round(+first.tempo || 100))), tempoText: "", template: "PDF import", meta: [], staves: [], spans: [], layout: S && S.layout ? { ...S.layout } : undefined };
  for (let m = 0; m < nMeas; m++) S.meta.push({});
  S.meta[nMeas - 1].bar = "end";
  const L = mLen(0);
  parts.forEach((pt, pi) => {
    const c = pt.inst ? CAT[pt.inst] : null;
    const grand = pt.staves.length > 1;
    const gid = grand ? "g" + Math.random().toString(36).slice(2, 7) : null;
    pt.staves.forEach((sd, k) => {
      const clef = ["treble", "bass", "alto", "tenor", "treble8vb", "percussion"].includes(sd.clef) ? sd.clef : (c && c.clef) || (k ? "bass" : "treble");
      const tr = c && !c.grand ? c.tr : 0;
      const st = { id: "s" + Math.random().toString(36).slice(2, 8), inst: pt.inst || (clef === "percussion" ? "drums" : "piano"), name: pt.name, short: c ? c.short : pt.name.slice(0, 5) + ".", clef, tr, oct: c && c.oct ? 1 : 0,
        timbre: clef === "percussion" ? "drums" : c ? c.timbre : "piano", gm: c ? c.gm : 0, fam: c ? c.fam : (grand ? "kbd" : "ww"), vol: .8, mute: false, solo: false, group: gid, gpos: k, measures: [] };
      for (let m = 0; m < nMeas; m++) {
        const evs = parseLooseMeasure(sd.measures[m] || "r:w", L);
        if (clef !== "percussion" && tr) evs.forEach(e => { if (e.t === "n") e.keys = e.keys.map(x => x - tr); });
        if (clef === "percussion") evs.forEach(e => { if (e.t === "n") e.keys = e.keys.map(x => drumFromWritten(x)); });
        st.measures.push({ ev: evs });
      }
      S.staves.push(st);
    });
  });
  const p0 = parts[0], t0 = p0 && p0.inst && !CAT[p0.inst].grand ? CAT[p0.inst].tr : 0;
  S.key = clampKey((p0 ? p0.keyFifths : 0) - fifthsFor(t0));
  syncIds();
  return { measures: nMeas, parts: parts.length };
}

async function importSheetImage(file) {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  let sample = null;
  try { sample = window.claude && window.claude.use ? await window.claude.use("sample") : null; } catch (e) { sample = null; }
  if (!sample) {
    openModal("อ่านโน้ตจาก PDF", `<p>การอ่านโน้ตจาก PDF หรือรูปภาพใช้ Claude ช่วยอ่าน จึงใช้ได้เมื่อเปิดแอปผ่านลิงก์ Claude เท่านั้น</p><p class="note">ในเวอร์ชันนี้ ถ้ามีไฟล์ต้นฉบับจาก MuseScore, Sibelius หรือ Finale ให้ส่งออกเป็น MusicXML แล้วเปิดแทน จะได้โน้ตครบถูกต้องกว่า</p>`, [{ label: "ปิด", pri: true }]);
    return;
  }
  let lim = null; try { lim = await sample.limits(); } catch (e) { }
  if (!lim || !lim.images) { toast("มุมมองนี้ส่งภาพให้ Claude อ่านไม่ได้ — ลองเปิดแอปผ่านลิงก์ Claude ในเบราว์เซอร์"); return; }
  omrCtl = new AbortController(); const ctl = omrCtl;
  openModal("อ่านโน้ตจาก " + (isPdf ? "PDF" : "รูปภาพ"), `<div style="display:flex;flex-direction:column;gap:10px">
      <div class="big" id="omrStep">กำลังเตรียมไฟล์…</div>
      <div class="track" style="height:6px"><div id="omrBar" style="width:4%"></div></div>
      <p class="note" id="omrNote">Claude จะอ่านโน้ตทีละส่วนของหน้า ใช้เวลาประมาณ 20–60 วินาทีต่อส่วน การอ่านใช้โควตา Claude ของคุณ</p>
      <p class="note">ความแม่นยำขึ้นกับความคมชัดของไฟล์: โน้ตที่พิมพ์จากโปรแกรมอ่านได้ดีกว่าภาพถ่ายหรือลายมือ ตรวจและแก้โน้ตหลังนำเข้าได้ตามปกติ</p></div>`,
    [{ label: "หยุด", fn: () => { ctl.abort(); } }]);
  const step = t => { const e = $("omrStep"); if (e) e.textContent = t; };
  const bar = f => { const e = $("omrBar"); if (e) e.style.width = Math.round(4 + f * 96) + "%"; };
  try {
    let images = [], note = "";
    if (isPdf) { const r = await pdfToImages(file, step); images = r.images; if (r.totalPages > r.pages) note = `อ่านเฉพาะ ${r.pages} หน้าแรกจาก ${r.totalPages} หน้า`; }
    else images = await splitPage(await imageFileToCanvas(file));
    if (!images.length) throw new Error("ไฟล์ไม่มีหน้า");
    const results = []; let ctxText = "";
    for (let k = 0; k < images.length; k++) {
      if (ctl.signal.aborted) throw { code: "cancelled" };
      step(`Claude กำลังอ่านส่วนที่ ${k + 1} จาก ${images.length}…`); bar(k / images.length);
      const j = await sample.json(OMR_PROMPT(ctxText, k + 1, images.length), { images: [images[k]], modelTier: "complex", signal: ctl.signal });
      results.push(j);
      if (!ctxText && j && j.parts && j.parts.length) ctxText = JSON.stringify({ time: j.time, parts: j.parts.map(p => ({ name: p.name, instrument: p.instrument, keyFifths: p.keyFifths, staves: (p.staves || []).map(s => s.clef) })) });
    }
    bar(1); step("กำลังสร้างสกอร์…");
    const prev = snapshot();
    const info = buildScoreFromOMR(results, file.name);
    undoStack.push(prev); redoStack.length = 0;
    ui.sel = { s: 0, m: 0, i: 0, v: 1 }; ui.range = ui.anchor = null; ui.part = "all"; ui.input = false;
    afterChange(); renderRibbon(); $("tempoIn").value = S.tempo;
    closeModal();
    openModal("นำเข้าเสร็จแล้ว", `<p>อ่านได้ <b>${info.parts}</b> เครื่องดนตรี <b>${info.measures}</b> ห้อง${note ? " · " + note : ""}</p><p class="note">ฟังเทียบกับต้นฉบับ แล้วแก้โน้ตที่อ่านผิดได้ตามปกติ กด Ctrl+Z เพื่อกลับไปสกอร์เดิม</p>`,
      [{ label: "ปิด" }, { label: "▶ ฟังเลย", pri: true, fn: () => { stop(); play(); renderRibbon(); } }]);
  } catch (e) {
    closeModal();
    const c = e && e.code;
    if (c === "cancelled") return toast("หยุดการอ่านโน้ตแล้ว");
    const msg = { not_granted: "ต้องอนุญาตให้แอปใช้ Claude ก่อน จึงจะอ่านโน้ตได้", rate_limited: "ใช้งาน Claude ถี่เกินไปหรือถึงขีดจำกัด ลองใหม่ภายหลัง", image_rejected: "ภาพจากไฟล์นี้ใหญ่หรือเสียเกินไป", refused: "Claude อ่านไฟล์นี้ไม่ได้", invalid_json: "Claude ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองอีกครั้ง", session_expired: "ต้องเข้าสู่ระบบ Claude ใหม่", sampling_disabled: "บัญชีนี้ใช้ Claude ในแอปไม่ได้" }[c];
    toast(msg || ("อ่านโน้ตไม่สำเร็จ: " + ((e && e.message) || c || "ข้อผิดพลาด")));
  }
}
