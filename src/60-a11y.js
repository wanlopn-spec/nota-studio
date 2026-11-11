/* ================= Spoken guide for blind / low-vision users ================= */
const A11Y = { on: false, engine: "auto", rate: 1, voice: "", hover: true, notes: true, toasts: true };
let a11yTTS = null, a11yPrev = null, a11yPending = false, a11yLastPointer = 0, a11yLastHoverEl = null, a11yLastScoreKey = "", a11yHoverT = 0, a11yScoreT = 0, a11yLastSpoken = "", a11yLastSpokenAt = 0, a11yGreeted = false, a11yReturnFocus = null;

/* ---------- settings ---------- */
function a11yLoad() { try { const o = JSON.parse(localStorage.getItem("nota-a11y") || "null"); if (o) Object.assign(A11Y, o); } catch (e) { } }
function a11ySave() { try { localStorage.setItem("nota-a11y", JSON.stringify(A11Y)); } catch (e) { } }

/* ---------- speech engines ---------- */
function a11yVoices() { try { return window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { return []; } }
function a11yThaiVoice() { return a11yVoices().find(v => /^th/i.test(v.lang)) || null; }
function a11yPickVoice() { const vs = a11yVoices(); return (A11Y.voice && vs.find(v => v.voiceURI === A11Y.voice)) || a11yThaiVoice() || null; }
function a11yEngine() {
  if (A11Y.engine !== "auto") return A11Y.engine === "claude" && !a11yTTS ? (window.speechSynthesis ? "browser" : "sr") : A11Y.engine;
  if (window.speechSynthesis && a11yThaiVoice()) return "browser";
  if (a11yTTS) return "claude";
  return window.speechSynthesis ? "browser" : "sr";
}
function a11yText(t) {
  return String(t == null ? "" : t)
    .replace(/\+½/g, " ขึ้นครึ่งเสียง ").replace(/[−-]½/g, " ลงครึ่งเสียง ").replace(/\+8va/g, " ขึ้นออกเทฟ ").replace(/[−-]8va/g, " ลงออกเทฟ ")
    .replace(/\(((?:Ctrl|Alt|Shift|Cmd|Ins|Insert|Del|Delete|Esc|Enter|Space|F\d+|[A-Z0-9.<>#]|[↑↓←→]|\+|–|-|\s)+)\)/g, (m, k) => ", ปุ่มลัด " + k.replace(/\+/g, " ") + ",")
    .replace(/([A-G])#/g, "$1 ชาร์ป").replace(/([A-G])b(?=[\s\d m,\/)]|$|maj|dim|aug|sus)/g, "$1 แฟลต")
    .replace(/♯/g, " ชาร์ป ").replace(/♭/g, " แฟลต ").replace(/♮/g, " เนเชอรัล ").replace(/𝄪/g, " ดับเบิลชาร์ป ").replace(/𝄫/g, " ดับเบิลแฟลต ")
    .replace(/↑/g, " ลูกศรขึ้น ").replace(/↓/g, " ลูกศรลง ").replace(/←/g, " ลูกศรซ้าย ").replace(/→/g, " ลูกศรขวา ")
    .replace(/♩/g, " ตัวดำ ").replace(/%/g, " เปอร์เซ็นต์").replace(/—/g, ", ").replace(/–/g, " ถึง ").replace(/·/g, ", ")
    .replace(/[\u{1D100}-\u{1D1FF}\u{1F300}-\u{1FAFF}←-⇿∀-⋿⌀-⏿①-➿⬀-⯿＋…▀-◿]/gu, " ")
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();
}
function a11yOut(text, kind) {
  const live = document.getElementById("a11yLive");
  const eng = a11yEngine();
  if (eng === "sr") { if (live) { live.textContent = ""; setTimeout(() => { live.textContent = text; }, 40); } return; }
  if (eng === "claude" && a11yTTS) {
    const p = kind === "queue" ? a11yTTS.add([{ text, language: "th" }]) : a11yTTS.speak(text, { language: "th", rate: Math.max(.7, Math.min(1.5, A11Y.rate)) });
    Promise.resolve(p).catch(e => { if (e && (e.code === "not_granted" || e.code === "unavailable")) { a11yTTS = null; a11yOut(text, kind); } });
    return;
  }
  if (!window.speechSynthesis) return;
  try {
    if (kind !== "queue") speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = a11yPickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "th-TH";
    u.rate = A11Y.rate;
    speechSynthesis.speak(u);
  } catch (e) { }
}
function a11ySpeak(text, kind = "state", force) {
  if (!A11Y.on && !force) return;
  text = a11yText(text).slice(0, 1800); if (!text) return;
  const now = Date.now();
  if (kind === "hover" && text === a11yLastSpoken && now - a11yLastSpokenAt < 1200) return;
  a11yLastSpoken = text; a11yLastSpokenAt = now;
  a11yOut(text, kind);
}

/* ---------- describing things ---------- */
const A11Y_ACC = { "-2": " ดับเบิลแฟลต", "-1": " แฟลต", "0": "", "1": " ชาร์ป", "2": " ดับเบิลชาร์ป" };
function a11yPitch(sp) { return sp.step + (A11Y_ACC[sp.a] || "") + " " + sp.oct; }
function a11yEvText(p, short) {
  const st = S.staves[p.s], e = evAt(p); if (!st || !e) return "";
  const what = e.t === "r" ? "ตัวหยุด" : st.clef === "percussion" ? e.keys.map(k => (DRUMBY[k] || { n: "กลอง" }).n).join(" กับ ")
    : (e.keys.length > 1 ? "คอร์ด " : "") + e.keys.map((k, j) => a11yPitch(spellWritten(k, st, p.m, e.pf ? e.pf[j] : 0))).join(", ");
  const dur = DTH[e.d] + (e.dots ? " ประจุด" : "") + (e.tup ? " ทริปเล็ต" : "");
  if (short) return `${what} ${dur}`;
  const extra = [];
  if (e.tie) extra.push("โยงเสียงไปตัวถัดไป");
  if (e.art) extra.push(e.art.map(a => ARTS[a] ? ARTS[a].n : a).join(" "));
  if (e.dyn) extra.push("ไดนามิก " + e.dyn);
  if (e.chord) extra.push("คอร์ด " + e.chord);
  if (e.lyr) extra.push("เนื้อร้อง " + e.lyr);
  if (e.tx) extra.push("ข้อความ " + e.tx);
  return `${what} ${dur}${extra.length ? ", " + extra.join(", ") : ""}, ${a11yWhereIn(p)}`;
}
function a11yWhereIn(p) {
  const st = S.staves[p.s]; const v = p.v || 1;
  const list = V(st.measures[p.m], v) || vList(st, p.m, v);
  const tick = evStart(list, Math.min(p.i, list.length)); const den = timeAt(p.m)[1];
  const beat = Math.round((tick / (1920 / den) + 1) * 100) / 100;
  const hand = st.group ? (st.gpos ? " มือซ้าย" : " มือขวา") : "";
  const voice = hasMulti(st.measures[p.m]) || v > 1 ? `, เสียง ${v}` : "";
  return `${st.name}${hand}, ห้อง ${p.m + 1} จังหวะ ${beat}${voice}`;
}
function a11ySelText() {
  if (!S) return "";
  if (ui.range) {
    const r = ui.range, n = r.s2 - r.s1 + 1;
    return `เลือกห้อง ${r.m1 + 1}${r.m2 > r.m1 ? " ถึง " + (r.m2 + 1) : ""}, ${n === 1 ? S.staves[r.s1].name : n + " บรรทัด"}`;
  }
  if (ui.anchor && ui.sel) { const n = noteRange().length; return `เลือกโน้ต ${n} ตัว, ถึง ${a11yEvText(ui.sel)}`; }
  if (!ui.sel) return "ไม่ได้เลือกอะไร";
  if (ui.input) { const e = evAt(ui.sel); return `เคอร์เซอร์ ${a11yWhereIn(ui.sel)}${e && e.t === "n" ? ", ทับโน้ต " + a11yEvText(ui.sel, true) : ""}`; }
  return a11yEvText(ui.sel);
}
function a11yFieldLabel(el) {
  if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) return l.textContent; }
  const lab = el.closest("label"); if (lab) { const c = lab.cloneNode(true); c.querySelectorAll("input,select,textarea,code").forEach(x => x.remove()); const t = c.textContent.trim(); if (t) return t; }
  let n = el; for (let k = 0; k < 2 && n; k++) { if (n.parentElement && n.parentElement.classList.contains("kv")) { const pv = n.previousElementSibling; if (pv) return pv.textContent; } n = n.parentElement; }
  const f = el.closest(".field,.tempo,.colorrow"); if (f) { const c = f.cloneNode(true); c.querySelectorAll("input,select,code").forEach(x => x.remove()); return c.textContent; }
  return "";
}
function a11yActLabel(act) {
  if (!act) return "";
  const [k, a] = act.includes(":") ? [act.slice(0, act.indexOf(":")), act.slice(act.indexOf(":") + 1)] : [act, ""];
  return ({ dyn: "ไดนามิก " + a, letter: "ใส่โน้ต " + a, voice: "เสียง " + a, persys: a === "0" ? "ห้องต่อบรรทัดอัตโนมัติ" : a === "custom" ? "กำหนดห้องต่อบรรทัดเอง" : a + " ห้องต่อบรรทัด", zoomin: "ซูมเข้า", zoomout: "ซูมออก", concert: "สลับ Concert pitch", theme: "ปรับโทนสี", a11y: "เปิดปิดเสียงนำทาง", a11yset: "ตั้งค่าเสียงนำทาง" })[k] || "";
}
function a11yDescribe(el) {
  if (!el || !el.tagName) return "";
  const tag = el.tagName.toLowerCase(), type = (el.getAttribute("type") || "").toLowerCase(), roleAttr = el.getAttribute("role");
  const aria = el.getAttribute("aria-label"), title = el.getAttribute("title");
  const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  let role = "", label = "", val = "", state = "";
  if (tag === "input" || tag === "select" || tag === "textarea") {
    label = aria || a11yFieldLabel(el) || el.getAttribute("placeholder") || title || "";
    if (type === "file") return "";
    if (type === "checkbox") { role = "ช่องติ๊ก"; state = el.checked ? "ติ๊กแล้ว" : "ไม่ได้ติ๊ก"; }
    else if (type === "range") { role = "แถบเลื่อน"; val = "ค่า " + el.value; }
    else if (type === "color") { role = "ตัวเลือกสี"; val = el.value; }
    else if (type === "number") { role = "ช่องตัวเลข"; val = el.value || "ว่าง"; }
    else if (tag === "select") { role = "เมนูเลือก"; val = el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].text : ""; }
    else { role = "ช่องกรอก"; val = el.value ? el.value : "ว่าง"; }
  } else if (roleAttr === "tab" || el.classList.contains("stab")) { role = "แท็บ"; label = aria || txt; if (el.getAttribute("aria-selected") === "true") state = "เลือกอยู่"; }
  else if (tag === "button" || roleAttr === "button") {
    role = "ปุ่ม"; label = aria || title || txt || a11yActLabel(el.dataset.act);
    if (el.getAttribute("aria-pressed") === "true") state = "เปิดอยู่";
    if (el.disabled) state = "ใช้ไม่ได้";
  }
  else if (tag === "a") { role = "ลิงก์"; label = aria || txt; }
  else if (tag === "li") { role = "คำสั่ง"; label = txt; if (el.getAttribute("aria-selected") === "true") state = "เลือกอยู่"; }
  else if (/^h[1-6]$/.test(tag) || el.dataset.pal != null) { role = "หัวข้อ"; label = txt; }
  else if (el.id === "canvas") { return "กระดาษโน้ต, " + a11ySelText(); }
  else label = aria || title || txt;
  if (!label && !val) return "";
  return [role, label, val, state].filter(Boolean).join(", ");
}
function a11yScoreHit(P, x, y) {
  const inside = hh => x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h;
  const notes = P.hits.filter(hh => hh.kind === "note" && inside(hh)).sort((a, b) => a.w * a.h - b.w * b.h);
  if (notes.length) { const n = notes[0]; return { key: "n:" + n.id, text: a11yEvText({ s: n.s, m: n.m, i: n.i, v: n.v || 1 }) }; }
  const st = P.hits.find(hh => hh.kind === "stave" && inside(hh));
  if (st) {
    const sf = S.staves[st.s], cnt = allEvs(sf.measures[st.m]).filter(e => e.t === "n").length;
    return { key: `s:${st.s}:${st.m}`, text: `${sf.name}${sf.group ? (sf.gpos ? " มือซ้าย" : " มือขวา") : ""}, ห้อง ${st.m + 1}, ${cnt ? "มีโน้ต " + cnt + " ตัว" : "ห้องว่าง"}` };
  }
  const t = P.hits.find(hh => hh.kind === "text" && inside(hh));
  if (t) { const nm = { title: "ชื่อเพลง", subtitle: "ชื่อรอง", composer: "ผู้ประพันธ์", lyricist: "ผู้แต่งคำร้อง" }[t.field]; return { key: "t:" + t.field, text: `${nm}, ${S[t.field] || "ว่าง"}, ดับเบิลคลิกเพื่อแก้` }; }
  return null;
}

/* ---------- announcing state changes ---------- */
function a11ySig() {
  const e = ui.sel ? evAt(ui.sel) : null; const le = ui.lastEntered ? findEv(ui.lastEntered) : null;
  return {
    input: ui.input, dur: ui.dur, dots: ui.dots, tup: ui.tup, voice: ui.voice, playing: !!playing, view: ui.view, zoom: ui.zoom, concert: ui.concert, tab: ui.tab, title: S && S.title,
    sel: ui.sel ? `${ui.sel.s}:${ui.sel.m}:${ui.sel.i}:${ui.sel.v || 1}` : "", selC: e ? JSON.stringify([e.t, e.d, e.dots, e.keys, e.tie, e.art, e.dyn, e.chord, e.lyr]) : "",
    range: ui.range ? JSON.stringify(ui.range) : "", anchor: ui.anchor ? JSON.stringify(ui.anchor) : "",
    last: ui.lastEntered || "", lastC: le ? JSON.stringify([le.e.t, le.e.d, le.e.dots, le.e.keys]) : "", lastPos: le ? `${le.s}:${le.m}:${le.i}:${le.v || 1}` : ""
  };
}
function a11yQueue() { if (a11yPending) return; a11yPending = true; setTimeout(() => { a11yPending = false; a11yDiff(); }, 0); }
function a11yDiff() {
  if (!S) return;
  const c = a11ySig(), p = a11yPrev; a11yPrev = c;
  if (!p || !A11Y.on) return;
  const parts = [];
  if (p.title !== c.title) parts.push("สกอร์ " + c.title);
  if (p.input !== c.input) parts.push(c.input ? "โหมดใส่โน้ต" : "โหมดเลือก");
  if (c.input && c.last && (c.last !== p.last || c.lastC !== p.lastC)) {
    const [s, m, i, v] = c.lastPos.split(":").map(Number);
    parts.push((c.last !== p.last ? "ใส่ " : "") + a11yEvText({ s, m, i, v }, true));
  } else if (c.sel !== p.sel || c.selC !== p.selC || c.range !== p.range || c.anchor !== p.anchor || p.input !== c.input) parts.push(a11ySelText());
  if (p.dur !== c.dur || p.dots !== c.dots) parts.push("ค่าตัวโน้ต " + DTH[c.dur] + (c.dots ? " ประจุด" : ""));
  if (p.tup !== c.tup) parts.push(c.tup ? "เปิดทริปเล็ต" : "ปิดทริปเล็ต");
  if (p.voice !== c.voice) parts.push("เสียง " + c.voice);
  if (p.playing !== c.playing) parts.push(c.playing ? "เริ่มเล่น" : "หยุดเล่น");
  if (p.view !== c.view) parts.push(c.view === "page" ? "มุมมองหน้ากระดาษ" : "มุมมองต่อเนื่อง");
  if (p.zoom !== c.zoom) parts.push("ซูม " + Math.round(c.zoom * 100) + " เปอร์เซ็นต์");
  if (p.concert !== c.concert) parts.push(c.concert ? "แสดง Concert pitch" : "แสดงโน้ตทรานสโพส");
  if (p.tab !== c.tab) parts.push("แท็บ " + ((TABS.find(t => t[0] === c.tab) || [])[1] || c.tab));
  if (parts.length) a11ySpeak(parts.join(", "), "state");
}
function a11yWhere() {
  if (!A11Y.on) { toast("กด F2 เพื่อเปิดเสียงนำทางก่อน"); return; }
  const m = ui.sel ? ui.sel.m : ui.range ? ui.range.m1 : 0;
  a11ySpeak(`${ui.input ? "โหมดใส่โน้ต" : "โหมดเลือก"}, ${a11ySelText()}, ค่าตัวโน้ต ${DTH[ui.dur]}${ui.dots ? " ประจุด" : ""}, เสียง ${ui.voice}, บันไดเสียง ${KEYNAMES[keyAt(m)]} major, อัตราจังหวะ ${timeAt(m).join(" ส่วน ")}, เทมโป ${tempoAt(m)}, สกอร์ ${S.title} มี ${nM()} ห้อง ${S.staves.length} บรรทัด`, "state");
}
function a11yToggle(force) {
  const on = force != null ? force : !A11Y.on;
  if (!on && A11Y.on) a11ySpeak("ปิดเสียงนำทาง", "state");
  A11Y.on = on; a11ySave(); if (on) a11yGreeted = true;
  const b = document.getElementById("btnA11y"); if (b) b.setAttribute("aria-pressed", String(on));
  renderStatus();
  if (on) {
    a11yPrev = a11ySig();
    let warn = "";
    if (a11yEngine() === "browser" && !a11yThaiVoice()) warn = " เครื่องนี้ยังไม่มีเสียงภาษาไทย ดูวิธีติดตั้งในตั้งค่าเสียงนำทาง";
    a11ySpeak("เปิดเสียงนำทางแล้ว. ชี้เมาส์ที่ปุ่มหรือโน้ตเพื่อฟังชื่อ. กด F2 เปิดหรือปิด, Shift F2 ฟังตำแหน่งปัจจุบัน, F6 ย้ายไปส่วนถัดไป, ลูกศรเลื่อนระหว่างปุ่ม, Escape กลับไปกระดาษโน้ต." + warn, "state");
    if (warn) toast("ยังไม่มีเสียงภาษาไทยในเครื่องนี้ — เปิดตั้งค่าเสียงนำทางเพื่อดูวิธีติดตั้ง");
  } else toast("ปิดเสียงนำทางแล้ว");
}

/* ---------- keyboard: regions, roving arrows ---------- */
const A11Y_REGIONS = [["header.top", "แถบด้านบน"], ["#tabs", "แท็บเมนู"], ["#ribbon", "ริบบอนเครื่องมือ"], ["#left", "พาเลตสัญลักษณ์"], ["#canvas", "กระดาษโน้ต"], ["#right", "แผงคุณสมบัติ"], ["footer.transport", "แถบเล่นเสียง"], ["#status", "แถบสถานะ"]];
function a11yFocusables(root) { return [...root.querySelectorAll('button,[href],input:not([type=file]),select,textarea,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden"); }
function a11yCycle(dir) {
  const regs = A11Y_REGIONS.map(([s, n]) => [document.querySelector(s), n]).filter(([el]) => el && el.getClientRects().length);
  if (!regs.length) return;
  const ae = document.activeElement; let k = regs.findIndex(([el]) => el.contains(ae));
  k = k < 0 ? (dir > 0 ? 0 : regs.length - 1) : (k + dir + regs.length) % regs.length;
  const [el, name] = regs[k];
  const target = el.id === "canvas" ? el : (a11yFocusables(el)[0] || el);
  if (target === el && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  a11ySuppressFocus = true; target.focus(); a11ySuppressFocus = false;
  a11ySpeak(name + ", " + (target === el ? (el.id === "canvas" ? a11ySelText() : "") : a11yDescribe(target)), "state");
}
let a11ySuppressFocus = false;
function a11yRove(e) {
  const t = e.target; if (!(t instanceof HTMLElement)) return false;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || t.closest("#canvas")) return false;
  const region = t.closest(".modal,.palette,header.top,#tabs,#ribbon,#left,#right,footer.transport,#status"); if (!region) return false;
  const list = a11yFocusables(region).filter(el => !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
  const i = list.indexOf(t); if (i < 0) return false;
  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
  list[(i + d + list.length) % list.length].focus();
  return true;
}

/* ---------- settings dialog ---------- */
function a11ySettings() {
  const vs = a11yVoices().slice().sort((a, b) => (/^th/i.test(b.lang) - /^th/i.test(a.lang)) || a.name.localeCompare(b.name));
  const thai = a11yThaiVoice();
  openModal("ตั้งค่าเสียงนำทาง", `<div style="display:flex;flex-direction:column;gap:12px">
    <div class="colorrow"><span>เสียงนำทาง</span><span class="seg"><button data-a11y-on="1" aria-pressed="${A11Y.on}">เปิด</button><button data-a11y-on="0" aria-pressed="${!A11Y.on}">ปิด</button></span><span></span></div>
    <div class="kv">
      <span>เสียงที่ใช้</span><select class="sel" id="a1Engine">
        <option value="auto" ${A11Y.engine === "auto" ? "selected" : ""}>อัตโนมัติ (ตอนนี้: ${{ browser: "เสียงในเครื่อง", claude: "เสียง Claude", sr: "โปรแกรมอ่านหน้าจอ" }[a11yEngine()]})</option>
        <option value="browser" ${A11Y.engine === "browser" ? "selected" : ""}>เสียงในเครื่อง (เบราว์เซอร์)</option>
        ${a11yTTS ? `<option value="claude" ${A11Y.engine === "claude" ? "selected" : ""}>เสียง Claude</option>` : ""}
        <option value="sr" ${A11Y.engine === "sr" ? "selected" : ""}>ส่งให้โปรแกรมอ่านหน้าจอ (NVDA, VoiceOver)</option></select>
      <span>เสียงผู้พูด</span><select class="sel" id="a1Voice"><option value="">อัตโนมัติ${thai ? " (" + esc(thai.name) + ")" : ""}</option>${vs.map(v => `<option value="${esc(v.voiceURI)}" ${A11Y.voice === v.voiceURI ? "selected" : ""}>${esc(v.name)} · ${esc(v.lang)}</option>`).join("")}</select>
      <span>ความเร็ว</span><input type="range" id="a1Rate" min="0.6" max="1.6" step="0.1" value="${A11Y.rate}" aria-label="ความเร็วเสียงพูด">
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <label class="toggle"><input type="checkbox" id="a1Hover" ${A11Y.hover ? "checked" : ""}> อ่านชื่อปุ่มและช่องต่าง ๆ เมื่อชี้เมาส์</label>
      <label class="toggle"><input type="checkbox" id="a1Notes" ${A11Y.notes ? "checked" : ""}> อ่านโน้ตและห้องเมื่อชี้เมาส์บนกระดาษโน้ต</label>
      <label class="toggle"><input type="checkbox" id="a1Toasts" ${A11Y.toasts ? "checked" : ""}> อ่านข้อความแจ้งเตือน</label>
    </div>
    ${!thai ? `<p class="note" style="color:var(--danger)">เครื่องนี้ยังไม่มีเสียงภาษาไทย · Windows: Settings → Time &amp; language → Speech → Add voices → ไทย · Mac: System Settings → Accessibility → Spoken Content → System voice → Thai (Kanya) · ติดตั้งแล้วรีโหลดหน้านี้</p>` : ""}
    <div class="btns"><button class="b" id="a1Test">🔊 ทดลองเสียง</button></div>
    <div><h5 style="margin:6px 0;font-size:10.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase">ปุ่มลัด</h5>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">${[["F2", "เปิด / ปิดเสียงนำทาง"], ["Shift + F2", "ฟังตำแหน่งและสถานะปัจจุบัน"], ["F6 หรือ F8", "ย้ายไปส่วนถัดไปของหน้าจอ (Shift ย้อนกลับ)"], ["Tab / ลูกศร", "เลื่อนระหว่างปุ่มในส่วนเดียวกัน"], ["Enter / Space", "กดปุ่มที่อยู่"], ["Esc", "กลับไปกระดาษโน้ต"], ["← →", "บนกระดาษโน้ต: เลื่อนทีละโน้ต (อ่านชื่อโน้ตให้ทุกครั้ง)"], ["Alt + ↑ ↓", "บนกระดาษโน้ต: ย้ายบรรทัด"]].map(([k, d]) => `<tr><td style="padding:4px 8px 4px 0;font-family:var(--f-mono);white-space:nowrap">${k}</td><td style="padding:4px 0">${d}</td></tr>`).join("")}</table></div></div>`,
    [{ label: "เสร็จ", pri: true }],
    ov => {
      const set = (k, v) => { A11Y[k] = v; a11ySave(); };
      ov.querySelectorAll("[data-a11y-on]").forEach(b => b.onclick = () => { a11yToggle(b.dataset.a11yOn === "1"); ov.querySelectorAll("[data-a11y-on]").forEach(x => x.setAttribute("aria-pressed", String((x.dataset.a11yOn === "1") === A11Y.on))); });
      ov.querySelector("#a1Engine").onchange = e => set("engine", e.target.value);
      ov.querySelector("#a1Voice").onchange = e => set("voice", e.target.value);
      ov.querySelector("#a1Rate").onchange = e => { set("rate", +e.target.value); a11ySpeak("ความเร็ว " + e.target.value, "state", true); };
      ov.querySelector("#a1Hover").onchange = e => set("hover", e.target.checked);
      ov.querySelector("#a1Notes").onchange = e => set("notes", e.target.checked);
      ov.querySelector("#a1Toasts").onchange = e => set("toasts", e.target.checked);
      ov.querySelector("#a1Test").onclick = () => a11ySpeak("ทดลองเสียงนำทาง NOTA STUDIO, โน้ต C 5 ตัวดำ, ห้อง 1 จังหวะ 1", "state", true);
    });
}

/* ---------- wiring ---------- */
function a11yInit() {
  a11yLoad();
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { }; } catch (e) { } }
  (async () => { try { a11yTTS = window.claude && typeof window.claude.use === "function" ? await window.claude.use("tts") : null; } catch (e) { a11yTTS = null; } })();
  // wrap app functions so state changes are announced
  const _refresh = refreshPanels; refreshPanels = function () { _refresh.apply(this, arguments); a11yQueue(); };
  const _ribbon = renderRibbon; renderRibbon = function () { _ribbon.apply(this, arguments); a11yQueue(); };
  const _play = play; play = function () { _play.apply(this, arguments); a11yQueue(); };
  const _stop = stop; stop = function () { _stop.apply(this, arguments); a11yQueue(); };
  const _toast = toast; toast = function (m) { _toast(m); if (A11Y.on && A11Y.toasts) setTimeout(() => a11ySpeak(m, "queue"), 5); };
  const _status = renderStatus; renderStatus = function () {
    _status.apply(this, arguments);
    const st = document.getElementById("status");
    if (st) st.insertAdjacentHTML("beforeend", `<button class="vbtn" data-act="a11yset" aria-pressed="${A11Y.on}" title="ตั้งค่าเสียงนำทางสำหรับผู้พิการทางสายตา">🔊 เสียงนำทาง${A11Y.on ? ": เปิด" : ""}</button>`);
  };
  const _open = openModal; openModal = function (title) {
    const prevFocus = document.activeElement; _open.apply(this, arguments);
    if (!document.getElementById("modal")) return;
    a11yReturnFocus = prevFocus;
    if (A11Y.on) {
      const m = document.querySelector("#modal .modal");
      const first = m && (a11yFocusables(m.querySelector(".body") || m)[0] || a11yFocusables(m)[0]);
      a11ySuppressFocus = true; if (first) first.focus(); a11ySuppressFocus = false;
      a11ySpeak("หน้าต่าง " + title + (first ? ", " + a11yDescribe(first) : ""), "state");
    }
  };
  const _close = closeModal; closeModal = function () {
    const had = !!document.getElementById("modal"); _close.apply(this, arguments);
    if (had && A11Y.on && a11yReturnFocus && document.contains(a11yReturnFocus)) { a11ySuppressFocus = true; a11yReturnFocus.focus(); a11ySuppressFocus = false; }
    a11yReturnFocus = null;
  };
  const _do = doAction; doAction = function (a) {
    if (a === "a11y") return a11yToggle();
    if (a === "a11yset") return a11ySettings();
    if (a === "whereami") return a11yWhere();
    return _do.apply(this, arguments);
  };
  COMMANDS.push(["Spoken guide เสียงนำทาง เปิดปิด (ผู้พิการทางสายตา)", "F2", "a11y"], ["Spoken guide settings ตั้งค่าเสียงนำทาง", "", "a11yset"], ["Where am I ตำแหน่งปัจจุบัน", "Shift+F2", "whereami"]);

  window.addEventListener("keydown", e => {
    if (e.key === "F2" && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) a11yWhere(); else a11yToggle(); return; }
    if (!A11Y.on) return;
    if ((e.key === "F6" || e.key === "F8") && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); a11yCycle(e.shiftKey ? -1 : 1); return; }
    if (e.key.startsWith("Arrow") && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && a11yRove(e)) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === "Escape" && !document.getElementById("modal") && !document.getElementById("pop")) {
      const ae = document.activeElement;
      if (ae && ae !== document.body && ae.id !== "canvas" && !["INPUT", "SELECT", "TEXTAREA"].includes(ae.tagName)) { e.preventDefault(); e.stopPropagation(); a11ySuppressFocus = true; document.getElementById("canvas").focus(); a11ySuppressFocus = false; a11ySpeak("กลับสู่กระดาษโน้ต, " + a11ySelText(), "state"); }
    }
  }, true);
  document.addEventListener("pointerdown", () => { a11yLastPointer = Date.now(); if (A11Y.on && !a11yGreeted) a11yGreet(); }, true);
  document.addEventListener("keydown", () => { if (A11Y.on && !a11yGreeted) a11yGreet(); }, true);
  // hover over controls
  document.addEventListener("pointerover", e => {
    if (!A11Y.on || !A11Y.hover || e.pointerType === "touch") return;
    if (e.target.closest && e.target.closest("#pages .page")) { if (!e.target.closest(".mtools,.addend,.pop")) return; }
    const el = e.target.closest && e.target.closest('button,a[href],input,select,textarea,[role="button"],[role="tab"],li[data-i],h3,h4,h5,.kv>span,.note,.big,.clock,.toast,.strip b');
    if (!el || el === a11yLastHoverEl) return;
    a11yLastHoverEl = el;
    clearTimeout(a11yHoverT);
    a11yHoverT = setTimeout(() => { const t = a11yDescribe(el); if (t) a11ySpeak(t, "hover"); }, 160);
  });
  document.addEventListener("pointerout", e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('button,a[href],input,select,textarea,[role="button"],[role="tab"],li[data-i],h3,h4,h5,.kv>span,.note,.big,.clock,.toast,.strip b')) a11yLastHoverEl = null; });
  // hover over the score
  const pagesEl = document.getElementById("pages");
  pagesEl.addEventListener("pointermove", e => {
    if (!A11Y.on || !A11Y.notes || e.pointerType === "touch") return;
    if (e.target.closest(".mtools,.addend,.pop")) return;
    const pg = e.target.closest(".page"); if (!pg) return;
    const P = LAY.pages[+pg.dataset.page]; if (!P) return;
    const cx = e.clientX, cy = e.clientY;
    clearTimeout(a11yScoreT);
    a11yScoreT = setTimeout(() => {
      const r = P.svg.getBoundingClientRect(); const x = (cx - r.left) * P.w / r.width, y = (cy - r.top) * P.h / r.height;
      const hit = a11yScoreHit(P, x, y); if (!hit || hit.key === a11yLastScoreKey) return;
      a11yLastScoreKey = hit.key; a11ySpeak(hit.text, "hover");
    }, 140);
  });
  pagesEl.addEventListener("pointerleave", () => { a11yLastScoreKey = ""; });
  // keyboard focus
  document.addEventListener("focusin", e => {
    if (!A11Y.on || a11ySuppressFocus || Date.now() - a11yLastPointer < 400) return;
    const t = a11yDescribe(e.target); if (t) a11ySpeak(t, "state");
  });
  document.addEventListener("change", e => { if (!A11Y.on) return; const el = e.target; if (el.matches && el.matches("select,input[type=checkbox],input[type=number],input[type=color]")) a11ySpeak(a11yDescribe(el), "state"); });
  let rangeT = 0; document.addEventListener("input", e => { if (!A11Y.on || !e.target.matches || !e.target.matches("input[type=range]")) return; clearTimeout(rangeT); rangeT = setTimeout(() => a11ySpeak("ค่า " + e.target.value, "state"), 200); });
  // command palette: read the highlighted command
  let palT = 0;
  document.addEventListener("keyup", e => {
    if (!A11Y.on || e.target.id !== "palIn") return;
    clearTimeout(palT);
    palT = setTimeout(() => { const li = document.querySelector('#palList li[aria-selected="true"]'); const n = document.querySelectorAll("#palList li[data-i]").length; if (e.key.startsWith("Arrow")) { if (li) a11ySpeak(li.textContent, "state"); } else a11ySpeak(n ? `พบ ${n} คำสั่ง, ${li ? li.textContent : ""}` : "ไม่พบคำสั่ง", "state"); }, e.key.startsWith("Arrow") ? 40 : 350);
  });
  a11yPrev = a11ySig();
  const b = document.getElementById("btnA11y"); if (b) b.setAttribute("aria-pressed", String(A11Y.on));
  renderStatus();
}
function a11yGreet() { a11yGreeted = true; setTimeout(() => a11ySpeak("เสียงนำทางพร้อมใช้งาน. กด Shift F2 เพื่อฟังตำแหน่ง, F2 เพื่อปิด", "queue"), 150); }
if (window.Vex) a11yInit(); else window.addEventListener("load", () => { if (window.Vex) a11yInit(); });
