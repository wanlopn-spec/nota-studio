/* ================= Spoken guide for blind / low-vision users (Thai + English) ================= */
const A11Y = { on: false, engine: "auto", rate: 1, voice: "", voiceEn: "", lang: "th", hover: true, notes: true, toasts: true };
let a11yTTS = null, a11yPrev = null, a11yPending = false, a11yLastPointer = 0, a11yLastHoverEl = null, a11yLastScoreKey = "", a11yHoverT = 0, a11yScoreT = 0, a11yLastSpoken = "", a11yLastSpokenAt = 0, a11yGreeted = false, a11yReturnFocus = null, a11ySuppressFocus = false;
const TH_RE = /[฀-๿]/;
const LG = (lg, th, en) => lg === "en" ? en : th;

/* ---------- settings ---------- */
function a11yLoad() { try { const o = JSON.parse(localStorage.getItem("nota-a11y") || "null"); if (o) Object.assign(A11Y, o); } catch (e) { } }
function a11ySave() { try { localStorage.setItem("nota-a11y", JSON.stringify(A11Y)); } catch (e) { } }
function a11yLangs() { return A11Y.lang === "both" ? ["th", "en"] : [A11Y.lang === "en" ? "en" : "th"]; }
const A11Y_LANGNAME = { th: "ไทย", en: "English", both: "ไทย + English" };

/* ---------- speech engines ---------- */
function a11yVoices() { try { return window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { return []; } }
function a11yThaiVoice() { return a11yVoices().find(v => /^th/i.test(v.lang)) || null; }
function a11yEnVoice() { const vs = a11yVoices(); return vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
function a11yPickVoice(lg) {
  const vs = a11yVoices();
  if (lg === "en") return (A11Y.voiceEn && vs.find(v => v.voiceURI === A11Y.voiceEn)) || a11yEnVoice();
  return (A11Y.voice && vs.find(v => v.voiceURI === A11Y.voice)) || a11yThaiVoice();
}
function a11yEngine() {
  const needThai = a11yLangs().includes("th");
  if (A11Y.engine !== "auto") return A11Y.engine === "claude" && !a11yTTS ? (window.speechSynthesis ? "browser" : "sr") : A11Y.engine;
  if (window.speechSynthesis && (!needThai || a11yThaiVoice())) return "browser";
  if (a11yTTS) return "claude";
  return window.speechSynthesis ? "browser" : "sr";
}
function a11yClean(t, lg) {
  const en = lg === "en";
  return String(t == null ? "" : t)
    .replace(/\+½/g, en ? " up a semitone " : " ขึ้นครึ่งเสียง ").replace(/[−-]½/g, en ? " down a semitone " : " ลงครึ่งเสียง ")
    .replace(/\+8va/g, en ? " up an octave " : " ขึ้นออกเทฟ ").replace(/[−-]8va/g, en ? " down an octave " : " ลงออกเทฟ ")
    .replace(/\(((?:Ctrl|Alt|Shift|Cmd|Ins|Insert|Del|Delete|Esc|Enter|Space|F\d+|[A-Z0-9.<>#]|[↑↓←→]|\+|–|-|\s)+)\)/g, (m, k) => (en ? ", shortcut " : ", ปุ่มลัด ") + k.replace(/\+/g, " ") + ",")
    .replace(/([A-G])#/g, en ? "$1 sharp" : "$1 ชาร์ป").replace(/([A-G])b(?=[\s\d m,\/)]|$|maj|dim|aug|sus)/g, en ? "$1 flat" : "$1 แฟลต")
    .replace(/♯/g, en ? " sharp " : " ชาร์ป ").replace(/♭/g, en ? " flat " : " แฟลต ").replace(/♮/g, en ? " natural " : " เนเชอรัล ")
    .replace(/𝄪/g, en ? " double sharp " : " ดับเบิลชาร์ป ").replace(/𝄫/g, en ? " double flat " : " ดับเบิลแฟลต ")
    .replace(/↑/g, en ? " up arrow " : " ลูกศรขึ้น ").replace(/↓/g, en ? " down arrow " : " ลูกศรลง ").replace(/←/g, en ? " left arrow " : " ลูกศรซ้าย ").replace(/→/g, en ? " right arrow " : " ลูกศรขวา ")
    .replace(/♩/g, en ? " quarter note " : " ตัวดำ ").replace(/%/g, en ? " percent" : " เปอร์เซ็นต์").replace(/—/g, ", ").replace(/–/g, en ? " to " : " ถึง ").replace(/·/g, ", ")
    .replace(/[\u{1D100}-\u{1D1FF}\u{1F300}-\u{1FAFF}←-⇿∀-⋿⌀-⏿①-➿⬀-⯿＋…▀-◿]/gu, " ")
    .replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();
}
function a11yOut(text, kind, lg) {
  const eng = a11yEngine();
  if (eng === "claude" && a11yTTS) {
    const p = kind === "queue" ? a11yTTS.add([{ text, language: lg }]) : a11yTTS.speak(text, { language: lg, rate: Math.max(.7, Math.min(1.5, A11Y.rate)) });
    Promise.resolve(p).catch(e => { if (e && (e.code === "not_granted" || e.code === "unavailable")) { a11yTTS = null; a11yOut(text, kind, lg); } });
    return;
  }
  if (!window.speechSynthesis) return;
  try {
    if (kind !== "queue") speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = a11yPickVoice(lg); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lg === "en" ? "en-US" : "th-TH";
    u.rate = A11Y.rate;
    speechSynthesis.speak(u);
  } catch (e) { }
}
/* msg: a function (lg) => text, or a Thai string (translated for English when a translation is known) */
function a11yMsgFn(msg) { return typeof msg === "function" ? msg : (lg => lg === "en" ? (a11yTr(msg) || msg) : msg); }
function a11ySpeak(msg, kind = "state", force) {
  if (!A11Y.on && !force) return;
  const fn = a11yMsgFn(msg);
  const texts = [];
  for (const lg of a11yLangs()) {
    let t = a11yClean(fn(lg), lg).slice(0, 1800); if (!t) continue;
    const speakLg = lg === "en" && TH_RE.test(t) ? "th" : lg; // untranslated text is read with the Thai voice
    if (texts.some(x => x.t === t)) continue;
    texts.push({ t, lg: speakLg });
  }
  if (!texts.length) return;
  const joined = texts.map(x => x.t).join(" / "), now = Date.now();
  if (kind === "hover" && joined === a11yLastSpoken && now - a11yLastSpokenAt < 1200) return;
  a11yLastSpoken = joined; a11yLastSpokenAt = now;
  if (a11yEngine() === "sr") { const live = document.getElementById("a11yLive"); if (live) { live.textContent = ""; setTimeout(() => { live.textContent = joined; }, 40); } return; }
  texts.forEach((x, k) => a11yOut(x.t, k === 0 ? kind : "queue", x.lg));
}

/* ---------- English translations of the app's Thai wording ---------- */
const A11Y_EXACT = {
  "สกอร์ใหม่": "New score", "เพิ่มเครื่องดนตรี": "Add instrument", "แทรกห้อง": "Insert measures", "ต่อท้ายห้อง": "Add measures at end", "ปรับโทนสีแอป": "App color theme",
  "ตั้งค่าเสียงนำทาง": "Spoken guide settings", "จำนวนห้องต่อบรรทัด": "Measures per line", "คัดลอก MusicXML": "Copy MusicXML", "อ่านโน้ตจาก PDF": "Read notes from PDF", "อ่านโน้ตจาก รูปภาพ": "Read notes from image", "นำเข้าเสร็จแล้ว": "Import finished",
  "ไม่มีสิ่งที่เลือก": "Nothing selected", "ช่วงที่เลือก": "Selected range", "ข้อความบนโน้ต": "Text on note", "ย้ายไปเสียง": "Move to voice", "เครื่องดนตรีในสกอร์": "Instruments in score", "การแสดงระดับเสียง": "Pitch display",
  "มิกเซอร์": "Mixer", "ข้อมูลเพลง": "Score info", "จัดหน้า": "Layout", "สถิติ": "Statistics", "ธีมสำเร็จรูป": "Preset themes", "ปรับเอง": "Custom", "ปุ่มลัด": "Shortcuts",
  "คอร์ด": "Chord", "เนื้อร้อง": "Lyric", "บันไดเสียง": "Key signature", "อัตราจังหวะ": "Time signature", "เส้นกั้นท้าย": "End barline", "ชื่อเพลง": "Title", "ชื่อรอง": "Subtitle", "ผู้ประพันธ์": "Composer", "คำร้อง": "Lyricist",
  "ห้อง/บรรทัด": "Measures per line", "เลขห้อง": "Measure numbers", "ระยะบรรทัด": "Staff spacing", "ระยะระบบ": "System spacing", "จำนวน": "Count", "ทิศทาง": "Direction", "ขั้นคู่": "Interval", "ขอบเขต": "Scope",
  "จำนวนจังหวะ": "Beats", "ตัวโน้ตต่อจังหวะ": "Beat unit", "ห้องต่อบรรทัด": "Measures per line", "จำนวนห้อง": "Number of measures", "เสียงที่ใช้": "Voice engine", "เสียงผู้พูด": "Thai voice", "เสียงภาษาไทย": "Thai voice", "เสียงภาษาอังกฤษ": "English voice",
  "ความเร็ว": "Speed", "ภาษา": "Language", "โหมด": "Mode", "สีหลัก (accent)": "Accent color", "โทนพื้นหลัง": "Background tone", "สีกระดาษโน้ต": "Paper color", "เสียงนำทาง": "Spoken guide",
  "ยกเลิก": "Cancel", "ใช้": "Apply", "เสร็จ": "Done", "ปิด": "Close", "สร้างสกอร์": "Create score", "แทรก": "Insert", "เพิ่ม": "Add", "คืนค่าเริ่มต้น": "Reset to default", "หยุด": "Stop", "ฟังเลย": "Play now",
  "มืด": "Dark", "สว่าง": "Light", "คัดลอก": "Copy", "วาง": "Paste", "ล้าง": "Clear", "Transpose…": "Transpose", "ทดลองเสียง": "Test voice", "＋ เพิ่มเครื่องดนตรี": "Add instrument",
  "อัตโนมัติ": "Automatic", "ปกติ": "Normal", "คู่": "Double", "จบ": "Final", "จบย้อน": "End repeat", "ต้นบรรทัด": "Start of each line", "ทุกห้อง": "Every measure", "ไม่แสดง": "Hidden", "ขึ้น": "Up", "ลง": "Down",
  "ทั้งสกอร์": "Whole score", "ช่วงที่เลือก": "Selection", "—": "None", "ตัวหยุด": "Rest", "พาเลต": "Palettes", "คุณสมบัติ": "Properties", "เครื่องดนตรี": "Instruments", "หน้า": "Page",
  "เลือกโน้ตหรือห้องก่อน": "Select a note or measure first", "เลือกโน้ตก่อน": "Select a note first", "เลือกห้องก่อน": "Select a measure first", "เลือกห้องก่อน แล้วจึงแทรก": "Select a measure first, then insert",
  "ไม่มีอะไรให้เลิกทำ": "Nothing to undo", "ไม่มีอะไรให้ทำซ้ำ": "Nothing to redo", "คลิปบอร์ดว่าง": "Clipboard is empty", "เลือกตำแหน่งที่จะวางก่อน": "Choose where to paste first",
  "ต้องมีอย่างน้อย 1 เครื่องดนตรี": "The score needs at least one instrument", "ต้องเหลืออย่างน้อย 1 ห้อง": "The score needs at least one measure", "จัดห้องต่อบรรทัดอัตโนมัติ": "Automatic measures per line",
  "บันทึกธีมแล้ว": "Theme saved", "กลับไปใช้ธีม MuBiTo ส้ม": "Back to the MuBiTo orange theme", "ยกเลิกการบันทึก": "Save cancelled", "ปิดเสียงนำทางแล้ว": "Spoken guide off", "Swing 8ths: เปิด": "Swing eighths on", "Swing 8ths: ปิด": "Swing eighths off",
  "หยุดการอ่านโน้ตแล้ว": "Stopped reading the sheet music", "เลือกตำแหน่งก่อน หรือกด N": "Choose a position first, or press N", "เลือกตำแหน่งก่อน": "Choose a position first",
  "เลือกช่วงโน้ต (Shift+คลิก หรือ Shift+→) ก่อน": "Select a range of notes first, with Shift click or Shift right arrow", "พื้นที่ในห้องไม่พอสำหรับ triplet": "Not enough room in this measure for a triplet",
  "กด F2 เพื่อเปิดเสียงนำทางก่อน": "Press F2 to turn on the spoken guide first", "เลือกบรรทัดก่อน": "Select a staff first", "กุญแจเครื่องกระทบใช้กับ Drum Set เท่านั้น": "The percussion clef is only for the drum set",
  "เลือกจำนวนห้องต่อบรรทัดก่อน (4, 5, 6, 8 หรืออื่น ๆ)": "Choose a number of measures per line first", "ย้าย triplet ข้ามเสียงยังไม่รองรับ": "Moving a triplet to another voice is not supported yet",
  "ยังไม่มีเสียงภาษาไทยในเครื่องนี้ — เปิดตั้งค่าเสียงนำทางเพื่อดูวิธีติดตั้ง": "This computer has no Thai voice yet. Open spoken guide settings to see how to install one"
};
const A11Y_RULES = [
  [/^เพิ่ม (\d+) ห้องท้ายเพลง — ตอนนี้มี (\d+) ห้อง$/, "Added $1 measure at the end. The score now has $2 measures"],
  [/^แทรก (\d+) ห้องที่ตำแหน่งห้อง (\d+)$/, "Inserted $1 measure at measure $2"],
  [/^ลบห้อง (\d+) แล้ว — Ctrl\+Z เพื่อย้อน$/, "Deleted measure $1. Press Control Z to undo"],
  [/^ลบห้อง (\d+)–(\d+) แล้ว — Ctrl\+Z เพื่อย้อน$/, "Deleted measures $1 to $2. Press Control Z to undo"],
  [/^คัดลอก (\d+) ห้อง × (\d+) บรรทัด$/, "Copied $1 measures, $2 staves"], [/^คัดลอกโน้ต (\d+) ตัว$/, "Copied $1 notes"],
  [/^ทรานสโพส ([+-]?\d+) ครึ่งเสียง$/, "Transposed $1 semitones"], [/^จัดหน้า (\d+) ห้องต่อบรรทัดทุกบรรทัด$/, "$1 measures on every line"],
  [/^ส่งไฟล์ (.+) แล้ว$/, "Sent file $1"], [/^ดาวน์โหลด (.+)$/, "Downloading $1"], [/^เปิด “(.+)” แล้ว$/, "Opened $1"], [/^สร้าง “(.+)” แล้ว.*$/, "Created $1. Press N to start entering notes"],
  [/^ย้ายไปเสียง (\d)$/, "Moved to voice $1"], [/^เพิ่ม (.+)$/, "Added $1"], [/^บันไดเสียงที่ห้อง (\d+)$/, "Key signature at measure $1"], [/^อัตราจังหวะที่ห้อง (\d+)$/, "Time signature at measure $1"],
  [/^ห้องที่ (\d+)$/, "Measure $1"], [/^(.+) · ห้อง (\d+)$/, "$1, measure $2"], [/^ห้อง (\d+)–(\d+)$/, "Measures $1 to $2"], [/^ห้อง (\d+)$/, "Measure $1"], [/^(\d+) ห้อง$/, "$1 measures"],
  [/^อ่านโน้ตไม่สำเร็จ: (.+)$/, "Could not read the notes: $1"], [/^ทำไม่สำเร็จ: (.+)$/, "That did not work: $1"], [/^เปิดไฟล์ไม่ได้: (.+)$/, "Could not open the file: $1"]
];
function a11yTr(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/\s+/g, " ").trim(); if (!s) return null;
  if (!TH_RE.test(s)) return s;
  if (A11Y_EXACT[s] != null) return A11Y_EXACT[s];
  const s2 = s.replace(/^[▶＋⇤⇥🗑🔊\s]+|[⇤⇥\s]+$/gu, "");
  if (A11Y_EXACT[s2] != null) return A11Y_EXACT[s2];
  for (const [re, en] of A11Y_RULES) if (re.test(s)) return s.replace(re, en);
  // interval and key menu wording
  const w = s.replace(/เมเจอร์/g, "major").replace(/ไมเนอร์/g, "minor").replace(/เพอร์เฟกต์/g, "perfect").replace(/ออกเทฟ/g, "octave");
  return TH_RE.test(w) ? null : w;
}
const a11yStripThai = s => String(s || "").replace(/[฀-๿]+/g, " ").replace(/\s+/g, " ").trim();

/* ---------- describing notes and positions ---------- */
const A11Y_ACC = { th: { "-2": " ดับเบิลแฟลต", "-1": " แฟลต", "0": "", "1": " ชาร์ป", "2": " ดับเบิลชาร์ป" }, en: { "-2": " double flat", "-1": " flat", "0": "", "1": " sharp", "2": " double sharp" } };
const A11Y_DUR_EN = { w: "whole note", h: "half note", q: "quarter note", "8": "eighth note", "16": "16th note", "32": "32nd note", "64": "64th note" };
const A11Y_DRUM_EN = { 49: "crash", 42: "hi-hat", 51: "ride", 48: "high tom", 47: "mid tom", 38: "snare", 37: "side stick", 43: "floor tom", 36: "kick", 44: "pedal hi-hat" };
function a11yDur(d, dots, tup, lg) { return lg === "en" ? (dots ? "dotted " : "") + A11Y_DUR_EN[d] + (tup ? " triplet" : "") : DTH[d] + (dots ? " ประจุด" : "") + (tup ? " ทริปเล็ต" : ""); }
function a11yPitch(sp, lg) { return sp.step + (A11Y_ACC[lg === "en" ? "en" : "th"][sp.a] || "") + " " + sp.oct; }
function a11yEvText(p, short, lg) {
  const st = S.staves[p.s], e = evAt(p); if (!st || !e) return "";
  const what = e.t === "r" ? LG(lg, "ตัวหยุด", "rest") : st.clef === "percussion" ? e.keys.map(k => lg === "en" ? (A11Y_DRUM_EN[k] || "drum") : (DRUMBY[k] || { n: "กลอง" }).n).join(LG(lg, " กับ ", " and "))
    : (e.keys.length > 1 ? LG(lg, "คอร์ด ", "chord ") : "") + e.keys.map((k, j) => a11yPitch(spellWritten(k, st, p.m, e.pf ? e.pf[j] : 0), lg)).join(", ");
  const dur = a11yDur(e.d, e.dots, e.tup, lg);
  if (short) return `${what} ${dur}`;
  const extra = [];
  if (e.tie) extra.push(LG(lg, "โยงเสียงไปตัวถัดไป", "tied to the next note"));
  if (e.art) extra.push(e.art.map(a => ARTS[a] ? ARTS[a].n : a).join(" "));
  if (e.dyn) extra.push(LG(lg, "ไดนามิก ", "dynamic ") + e.dyn);
  if (e.chord) extra.push(LG(lg, "คอร์ด ", "chord symbol ") + e.chord);
  if (e.lyr) extra.push(LG(lg, "เนื้อร้อง ", "lyric ") + e.lyr);
  if (e.tx) extra.push(LG(lg, "ข้อความ ", "text ") + e.tx);
  return `${what} ${dur}${extra.length ? ", " + extra.join(", ") : ""}, ${a11yWhereIn(p, lg)}`;
}
function a11yWhereIn(p, lg) {
  const st = S.staves[p.s]; const v = p.v || 1;
  const list = V(st.measures[p.m], v) || vList(st, p.m, v);
  const tick = evStart(list, Math.min(p.i, list.length)); const den = timeAt(p.m)[1];
  const beat = Math.round((tick / (1920 / den) + 1) * 100) / 100;
  const hand = st.group ? (st.gpos ? LG(lg, " มือซ้าย", " left hand") : LG(lg, " มือขวา", " right hand")) : "";
  const voice = hasMulti(st.measures[p.m]) || v > 1 ? LG(lg, `, เสียง ${v}`, `, voice ${v}`) : "";
  return LG(lg, `${st.name}${hand}, ห้อง ${p.m + 1} จังหวะ ${beat}${voice}`, `${st.name}${hand}, measure ${p.m + 1}, beat ${beat}${voice}`);
}
function a11ySelText(lg) {
  if (!S) return "";
  if (ui.range) {
    const r = ui.range, n = r.s2 - r.s1 + 1, who = n === 1 ? S.staves[r.s1].name : LG(lg, n + " บรรทัด", n + " staves");
    return r.m2 > r.m1 ? LG(lg, `เลือกห้อง ${r.m1 + 1} ถึง ${r.m2 + 1}, ${who}`, `Selected measures ${r.m1 + 1} to ${r.m2 + 1}, ${who}`) : LG(lg, `เลือกห้อง ${r.m1 + 1}, ${who}`, `Selected measure ${r.m1 + 1}, ${who}`);
  }
  if (ui.anchor && ui.sel) { const n = noteRange().length; return LG(lg, `เลือกโน้ต ${n} ตัว, ถึง `, `Selected ${n} notes, up to `) + a11yEvText(ui.sel, false, lg); }
  if (!ui.sel) return LG(lg, "ไม่ได้เลือกอะไร", "Nothing selected");
  if (ui.input) { const e = evAt(ui.sel); return LG(lg, "เคอร์เซอร์ ", "Cursor at ") + a11yWhereIn(ui.sel, lg) + (e && e.t === "n" ? LG(lg, ", ทับโน้ต ", ", over ") + a11yEvText(ui.sel, true, lg) : ""); }
  return a11yEvText(ui.sel, false, lg);
}

/* ---------- describing controls ---------- */
function a11yActEN(act) {
  if (!act) return "";
  const i = act.indexOf(":"), k = i < 0 ? act : act.slice(0, i), a = i < 0 ? "" : act.slice(i + 1);
  const M = {
    input: "Note input", select: "Select mode", dot: "Dot", tup: "Triplet", rest: "Rest", tie: "Tie", up: "Pitch up a semitone", down: "Pitch down a semitone", octup: "Up an octave", octdown: "Down an octave",
    slur: "Slur", cresc: "Crescendo", dim: "Diminuendo", lyric: "Lyrics", chordsym: "Chord symbol", stafftext: "Staff text", reh: "Rehearsal mark", tempo: "Tempo marking", systext: "System text",
    addinst: "Add instrument", transpose: "Transpose", concert: "Concert pitch", appendm: "Add several measures", insertm: "Insert several measures", deletem: "Delete measure",
    zoomin: "Zoom in", zoomout: "Zoom out", zoomfit: "Fit to width", break: "System break", hideempty: "Hide empty staves", names: "Instrument names", play: "Play", stop: "Stop", loop: "Loop selection",
    metro: "Metronome", swing: "Swing eighths", copyxml: "Copy MusicXML", open: "Open MusicXML or project file", openpdf: "Import PDF or image and listen", new: "New score", sample: "Load sample score",
    undo: "Undo", redo: "Redo", copy: "Copy", paste: "Paste", del: "Clear", selall: "Select all", mvup: "Move instrument up", mvdn: "Move instrument down", rm: "Remove instrument",
    applytime: "Apply time signature", a11ylang: "Change spoken guide language", theme: "Color theme", equalw: "Equal measure widths", a11y: "Spoken guide on or off", a11yset: "Spoken guide settings", whereami: "Where am I"
  };
  if (M[k] && !a) return M[k];
  switch (k) {
    case "dur": return A11Y_DUR_EN[a] || a;
    case "acc": return { sharp: "Sharp", flat: "Flat", natural: "Natural", dsharp: "Double sharp", dflat: "Double flat" }[a] || "";
    case "letter": return "Enter note " + a;
    case "art": return ARTS[a] ? ARTS[a].n : a;
    case "dyn": return "Dynamic " + a;
    case "bar": return { double: "Double barline", end: "Final barline", repBeg: "Start repeat", repEnd: "End repeat", single: "Normal barline" }[a] || "";
    case "edit": return { title: "Edit title", subtitle: "Edit subtitle", composer: "Edit composer", lyricist: "Edit lyricist" }[a] || "";
    case "navtext": return { "D.C. al Fine": "Da Capo al Fine", "D.S. al Coda": "Dal Segno al Coda", "Fine": "Fine", "𝄋": "Segno", "𝄌": "Coda" }[a] || a;
    case "rtab": return { inst: "Manage instruments", mix: "Open mixer", props: "Properties", page: "Page settings" }[a] || "";
    case "addm": return { end: "Add measure at end", before: "Insert measure before", after: "Insert measure after" }[a] || "";
    case "pick": return a === "key" ? "Key signature" : "Time signature";
    case "key": return KEYNAMES[a] + " major, " + KEYMINOR[a] + " minor";
    case "time": return "Time signature " + a.replace("/", " over ");
    case "clef": return { treble: "Treble clef", bass: "Bass clef", alto: "Alto clef", tenor: "Tenor clef", treble8vb: "Treble clef, octave down", percussion: "Percussion clef" }[a] || "";
    case "view": return a === "page" ? "Page view" : "Continuous view";
    case "exp": return { zip: "Export everything as zip", musicxml: "Export MusicXML", midi: "Export MIDI", svg: "Export SVG", png: "Export PNG", json: "Save project file" }[a] || "";
    case "mvup": return "Move instrument up"; case "mvdn": return "Move instrument down"; case "rm": return "Remove instrument";
    case "mute": return "Mute " + ((S.staves[+a] || {}).name || ""); case "solo": return "Solo " + ((S.staves[+a] || {}).name || "");
    case "persys": return a === "0" ? "Automatic measures per line" : a === "custom" ? "Custom measures per line" : a + " measures per line";
    case "voice": return "Voice " + a;
    case "a11ylang": return { th: "Thai voice", en: "English voice", both: "Thai and English voice" }[a] || "";
  }
  return M[k] || "";
}
const A11Y_ID_EN = {
  btnNew: "New score", btnOpen: "Open file", btnUndo: "Undo", btnRedo: "Redo", cmdBtn: "Command search", cmdBtn2: "Command search", openLeft: "Palettes", openRight: "Properties panel", closeLeft: "Close",
  tpPlay: "Play", tpStop: "Stop", tpLoop: "Loop selection", tpMetro: "Metronome", palSearch: "Search symbols", tempoIn: "Tempo", tempoIn2: "Tempo", masterVol: "Volume", rgStaff: "Staff spacing", rgSpace: "Note spacing",
  selPart: "Part", pDyn: "Dynamic", pChord: "Chord symbol", pLyr: "Lyric", pTx: "Staff text", pKey: "Key signature", pTn: "Time signature beats", pTd: "Time signature beat unit", pReh: "Rehearsal mark",
  pBpm: "Tempo", pTt: "Tempo text", pSys: "System text", pBar: "End barline", pRep: "Start repeat", pBrk: "System break after this measure", pConcert: "Concert pitch", pMnum: "Measure numbers",
  pStaff: "Staff spacing", pGap: "System spacing", pHide: "Hide empty staves", pNames: "Show instrument names", pPerSys: "Measures per line", nTitle: "Title", nComp: "Composer", nKey: "Key signature",
  nTn: "Beats", nTd: "Beat unit", nTempo: "Tempo", nMeas: "Number of measures", instQ: "Search instruments", tDir: "Direction", tIv: "Interval", tScope: "Scope", tKey: "Transpose the key signature too",
  tdN: "Beats", tdD: "Beat unit", mN: "Number of measures", psN: "Measures per line", psEq: "Equal measure widths", thAccent: "Accent color", thBase: "Background tone", thPaper: "Paper color",
  a1Engine: "Voice engine", a1Voice: "Thai voice", a1VoiceEn: "English voice", a1Lang: "Language", a1Rate: "Speed", a1Hover: "Read buttons and fields on hover", a1Notes: "Read notes and measures on hover",
  a1Toasts: "Read notifications", a1Test: "Test voice", popIn: "Text entry", palIn: "Command search", mxText: "MusicXML text"
};
const A11Y_TAB_EN = { write: "Write", notations: "Notations", text: "Text", score: "Instruments and measures", layout: "Layout", play: "Play", export: "Export" };
const A11Y_RTAB_EN = { props: "Properties", inst: "Instruments", mix: "Mixer", page: "Page" };
const A11Y_PAL_EN = ["Clefs", "Key signatures", "Time signatures", "Accidentals", "Articulations", "Dynamics", "Lines", "Barlines and repeats", "Text and tempo", "Measures"];
const A11Y_THEME_EN = { mubito: "MuBiTo orange", midnight: "Midnight blue", forest: "Forest green", rose: "Rose pink", violet: "Violet", graphite: "Graphite gray", contrast: "High contrast", daylight: "Daylight", ocean: "Ocean blue", mint: "Mint" };
function a11yKeyHint(el) { const t = el.getAttribute("title") || el.getAttribute("aria-label") || ""; const m = /\(([^()]*)\)\s*$/.exec(t); return m ? ` (${m[1]})` : ""; }
function a11yLabelEN(el, raw) {
  const d = el.dataset || {};
  if (d.act) { const a = a11yActEN(d.act); if (a) return a + a11yKeyHint(el); }
  if (el.id && A11Y_ID_EN[el.id]) return A11Y_ID_EN[el.id] + a11yKeyHint(el);
  if (d.tab) return A11Y_TAB_EN[d.tab] || d.tab;
  if (d.rtab) return A11Y_RTAB_EN[d.rtab] || d.rtab;
  if (d.pal != null) { const n = (/(\d+)\s*$/.exec(raw) || [])[1]; return (A11Y_PAL_EN[+d.pal] || "") + (n ? `, ${n} items` : ""); }
  if (d.t != null) { const t = TEMPLATES[+d.t]; return t ? (t.k === "ว่าง" ? "Blank score, one flute" : t.k + ", " + t.d) : ""; }
  if (d.inst) return CAT[d.inst] ? CAT[d.inst].name : d.inst;
  if (d.th) return (A11Y_THEME_EN[d.th] || d.th) + " theme";
  if (d.mode) return d.mode === "light" ? "Light mode" : "Dark mode";
  if (d.a11yOn != null) return d.a11yOn === "1" ? "On" : "Off";
  if (d.k != null) return KEYNAMES[d.k] + " major, " + KEYMINOR[d.k] + " minor";
  if (d.rename != null) return "Instrument name";
  if (d.vol != null) return "Volume, " + ((S.staves[+d.vol] || {}).name || "");
  if (d.field) return { title: "Title", subtitle: "Subtitle", composer: "Composer", lyricist: "Lyricist", tempoText: "Tempo text" }[d.field] || d.field;
  if (el.tagName === "LI") { const s = a11yStripThai(raw); return s || raw; }
  const tr = a11yTr(raw); if (tr) return tr;
  const st = a11yStripThai(raw); if (/[A-Za-z]{3}/.test(st)) return st;
  return raw;
}
function a11yFieldLabel(el) {
  if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) return l.textContent; }
  const lab = el.closest("label"); if (lab) { const c = lab.cloneNode(true); c.querySelectorAll("input,select,textarea,code").forEach(x => x.remove()); const t = c.textContent.trim(); if (t) return t; }
  let n = el; for (let k = 0; k < 2 && n; k++) { if (n.parentElement && n.parentElement.classList.contains("kv")) { const pv = n.previousElementSibling; if (pv) return pv.textContent; } n = n.parentElement; }
  const f = el.closest(".field,.tempo,.colorrow"); if (f) { const c = f.cloneNode(true); c.querySelectorAll("input,select,code").forEach(x => x.remove()); return c.textContent; }
  return "";
}
function a11yActTH(act) {
  if (!act) return "";
  const [k, a] = act.includes(":") ? [act.slice(0, act.indexOf(":")), act.slice(act.indexOf(":") + 1)] : [act, ""];
  return ({ dyn: "ไดนามิก " + a, letter: "ใส่โน้ต " + a, voice: "เสียง " + a, persys: a === "0" ? "ห้องต่อบรรทัดอัตโนมัติ" : a === "custom" ? "กำหนดห้องต่อบรรทัดเอง" : a + " ห้องต่อบรรทัด", zoomin: "ซูมเข้า", zoomout: "ซูมออก", concert: "สลับ Concert pitch", theme: "ปรับโทนสี", a11y: "เปิดปิดเสียงนำทาง", a11yset: "ตั้งค่าเสียงนำทาง" })[k] || "";
}
function a11yDescribe(el, lg = "th") {
  if (!el || !el.tagName) return "";
  const en = lg === "en";
  const tag = el.tagName.toLowerCase(), type = (el.getAttribute("type") || "").toLowerCase(), roleAttr = el.getAttribute("role");
  const aria = el.getAttribute("aria-label"), title = el.getAttribute("title");
  const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  let role = "", label = "", val = "", state = "";
  if (el.id === "canvas") return LG(lg, "กระดาษโน้ต, ", "Score, ") + a11ySelText(lg);
  if (tag === "input" || tag === "select" || tag === "textarea") {
    if (type === "file") return "";
    label = aria || a11yFieldLabel(el) || el.getAttribute("placeholder") || title || "";
    if (type === "checkbox") { role = LG(lg, "ช่องติ๊ก", "checkbox"); state = el.checked ? LG(lg, "ติ๊กแล้ว", "checked") : LG(lg, "ไม่ได้ติ๊ก", "not checked"); }
    else if (type === "range") { role = LG(lg, "แถบเลื่อน", "slider"); val = LG(lg, "ค่า ", "value ") + el.value; }
    else if (type === "color") { role = LG(lg, "ตัวเลือกสี", "color picker"); val = el.value; }
    else if (type === "number") { role = LG(lg, "ช่องตัวเลข", "number field"); val = el.value || LG(lg, "ว่าง", "empty"); }
    else if (tag === "select") { role = LG(lg, "เมนูเลือก", "menu"); const o = el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].text : ""; val = en ? (a11yTr(o) || o) : o; }
    else { role = LG(lg, "ช่องกรอก", "text field"); val = el.value ? el.value : LG(lg, "ว่าง", "empty"); }
  } else if (roleAttr === "tab" || el.classList.contains("stab")) { role = LG(lg, "แท็บ", "tab"); label = aria || txt; if (el.getAttribute("aria-selected") === "true") state = LG(lg, "เลือกอยู่", "selected"); }
  else if (tag === "button" || roleAttr === "button") {
    role = LG(lg, "ปุ่ม", "button"); label = aria || title || txt || a11yActTH(el.dataset.act);
    if (el.getAttribute("aria-pressed") === "true") state = LG(lg, "เปิดอยู่", "on");
    if (el.disabled) state = LG(lg, "ใช้ไม่ได้", "unavailable");
  }
  else if (tag === "a") { role = LG(lg, "ลิงก์", "link"); label = aria || txt; }
  else if (tag === "li") { role = LG(lg, "คำสั่ง", "command"); label = txt; if (el.getAttribute("aria-selected") === "true") state = LG(lg, "เลือกอยู่", "selected"); }
  else if (/^h[1-6]$/.test(tag) || el.dataset.pal != null) { role = LG(lg, "หัวข้อ", "heading"); label = txt; }
  else label = aria || title || txt;
  if (en) label = a11yLabelEN(el, label);
  if (!label && !val) return "";
  return [role, label, val, state].filter(Boolean).join(", ");
}
function a11yScoreHit(P, x, y) {
  const inside = hh => x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h;
  const notes = P.hits.filter(hh => hh.kind === "note" && inside(hh)).sort((a, b) => a.w * a.h - b.w * b.h);
  if (notes.length) { const n = notes[0], p = { s: n.s, m: n.m, i: n.i, v: n.v || 1 }; return { key: "n:" + n.id, msg: lg => a11yEvText(p, false, lg) }; }
  const st = P.hits.find(hh => hh.kind === "stave" && inside(hh));
  if (st) {
    const sf = S.staves[st.s], cnt = allEvs(sf.measures[st.m]).filter(e => e.t === "n").length;
    return { key: `s:${st.s}:${st.m}`, msg: lg => `${sf.name}${sf.group ? (sf.gpos ? LG(lg, " มือซ้าย", " left hand") : LG(lg, " มือขวา", " right hand")) : ""}, ${LG(lg, "ห้อง", "measure")} ${st.m + 1}, ${cnt ? LG(lg, "มีโน้ต " + cnt + " ตัว", cnt + " notes") : LG(lg, "ห้องว่าง", "empty measure")}` };
  }
  const t = P.hits.find(hh => hh.kind === "text" && inside(hh));
  if (t) return { key: "t:" + t.field, msg: lg => { const nm = lg === "en" ? { title: "Title", subtitle: "Subtitle", composer: "Composer", lyricist: "Lyricist" }[t.field] : { title: "ชื่อเพลง", subtitle: "ชื่อรอง", composer: "ผู้ประพันธ์", lyricist: "ผู้แต่งคำร้อง" }[t.field]; return `${nm}, ${S[t.field] || LG(lg, "ว่าง", "empty")}, ${LG(lg, "ดับเบิลคลิกเพื่อแก้", "double click to edit")}`; } };
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
  if (p.title !== c.title) parts.push(lg => LG(lg, "สกอร์ ", "Score ") + c.title);
  if (p.input !== c.input) parts.push(lg => c.input ? LG(lg, "โหมดใส่โน้ต", "Note input mode") : LG(lg, "โหมดเลือก", "Select mode"));
  if (c.input && c.last && (c.last !== p.last || c.lastC !== p.lastC)) {
    const [s, m, i, v] = c.lastPos.split(":").map(Number), isNew = c.last !== p.last;
    parts.push(lg => (isNew ? LG(lg, "ใส่ ", "Entered ") : "") + a11yEvText({ s, m, i, v }, true, lg));
  } else if (c.sel !== p.sel || c.selC !== p.selC || c.range !== p.range || c.anchor !== p.anchor || p.input !== c.input) parts.push(lg => a11ySelText(lg));
  if (p.dur !== c.dur || p.dots !== c.dots) parts.push(lg => LG(lg, "ค่าตัวโน้ต ", "Duration ") + a11yDur(c.dur, c.dots, false, lg));
  if (p.tup !== c.tup) parts.push(lg => c.tup ? LG(lg, "เปิดทริปเล็ต", "Triplet on") : LG(lg, "ปิดทริปเล็ต", "Triplet off"));
  if (p.voice !== c.voice) parts.push(lg => LG(lg, "เสียง ", "Voice ") + c.voice);
  if (p.playing !== c.playing) parts.push(lg => c.playing ? LG(lg, "เริ่มเล่น", "Playing") : LG(lg, "หยุดเล่น", "Stopped"));
  if (p.view !== c.view) parts.push(lg => c.view === "page" ? LG(lg, "มุมมองหน้ากระดาษ", "Page view") : LG(lg, "มุมมองต่อเนื่อง", "Continuous view"));
  if (p.zoom !== c.zoom) parts.push(lg => LG(lg, "ซูม ", "Zoom ") + Math.round(c.zoom * 100) + "%");
  if (p.concert !== c.concert) parts.push(lg => c.concert ? LG(lg, "แสดง Concert pitch", "Showing concert pitch") : LG(lg, "แสดงโน้ตทรานสโพส", "Showing transposed pitch"));
  if (p.tab !== c.tab) parts.push(lg => LG(lg, "แท็บ ", "Tab ") + (lg === "en" ? A11Y_TAB_EN[c.tab] : ((TABS.find(t => t[0] === c.tab) || [])[1] || c.tab)));
  if (parts.length) a11ySpeak(lg => parts.map(f => f(lg)).join(", "), "state");
}
function a11yWhere() {
  if (!A11Y.on) { toast("กด F2 เพื่อเปิดเสียงนำทางก่อน"); return; }
  const m = ui.sel ? ui.sel.m : ui.range ? ui.range.m1 : 0, [tn, td] = timeAt(m);
  a11ySpeak(lg => lg === "en"
    ? `${ui.input ? "Note input mode" : "Select mode"}, ${a11ySelText(lg)}, duration ${a11yDur(ui.dur, ui.dots, false, lg)}, voice ${ui.voice}, key ${KEYNAMES[keyAt(m)]} major, time signature ${tn} over ${td}, tempo ${tempoAt(m)}, score ${S.title}, ${nM()} measures, ${S.staves.length} staves`
    : `${ui.input ? "โหมดใส่โน้ต" : "โหมดเลือก"}, ${a11ySelText(lg)}, ค่าตัวโน้ต ${a11yDur(ui.dur, ui.dots, false, lg)}, เสียง ${ui.voice}, บันไดเสียง ${KEYNAMES[keyAt(m)]} major, อัตราจังหวะ ${tn} ส่วน ${td}, เทมโป ${tempoAt(m)}, สกอร์ ${S.title} มี ${nM()} ห้อง ${S.staves.length} บรรทัด`, "state");
}
function a11yIntro(lg, warn) {
  return lg === "en"
    ? "Spoken guide on. Point at a button or note to hear its name. F2 turns it on or off, Shift F2 tells your position, F6 moves to the next area, arrow keys move between buttons, Escape returns to the score, Control F2 changes the language." + (warn ? " This computer has no Thai voice yet." : "")
    : "เปิดเสียงนำทางแล้ว. ชี้เมาส์ที่ปุ่มหรือโน้ตเพื่อฟังชื่อ. กด F2 เปิดหรือปิด, Shift F2 ฟังตำแหน่งปัจจุบัน, F6 ย้ายไปส่วนถัดไป, ลูกศรเลื่อนระหว่างปุ่ม, Escape กลับไปกระดาษโน้ต, Control F2 เปลี่ยนภาษา." + (warn ? " เครื่องนี้ยังไม่มีเสียงภาษาไทย ดูวิธีติดตั้งในตั้งค่าเสียงนำทาง" : "");
}
function a11yToggle(force) {
  const on = force != null ? force : !A11Y.on;
  if (!on && A11Y.on) a11ySpeak(lg => LG(lg, "ปิดเสียงนำทาง", "Spoken guide off"), "state");
  A11Y.on = on; a11ySave(); if (on) a11yGreeted = true;
  const b = document.getElementById("btnA11y"); if (b) b.setAttribute("aria-pressed", String(on));
  renderStatus();
  if (on) {
    a11yPrev = a11ySig();
    const warn = a11yEngine() === "browser" && a11yLangs().includes("th") && !a11yThaiVoice();
    a11ySpeak(lg => a11yIntro(lg, warn), "state");
    if (warn) toast("ยังไม่มีเสียงภาษาไทยในเครื่องนี้ — เปิดตั้งค่าเสียงนำทางเพื่อดูวิธีติดตั้ง");
  } else toast("ปิดเสียงนำทางแล้ว");
}
function a11yLangButtons() { document.querySelectorAll('[data-act^="a11ylang:"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.act === "a11ylang:" + A11Y.lang))); }
function a11ySetLang(lang, fromButton) {
  A11Y.lang = lang; a11ySave(); renderStatus(); a11yLangButtons();
  const sel = document.getElementById("a1Lang"); if (sel) sel.value = lang;
  if (fromButton && !A11Y.on) { a11yToggle(true); return; }
  a11ySpeak(lg => LG(lg, "ภาษาเสียงนำทาง: " + A11Y_LANGNAME[lang], "Spoken guide language: " + { th: "Thai", en: "English", both: "Thai and English" }[lang]), "state", true);
}
function a11yCycleLang() { a11ySetLang({ th: "en", en: "both", both: "th" }[A11Y.lang] || "th"); }

/* ---------- keyboard: regions, roving arrows ---------- */
const A11Y_REGIONS = [["header.top", "แถบด้านบน", "Top bar"], ["#tabs", "แท็บเมนู", "Menu tabs"], ["#ribbon", "ริบบอนเครื่องมือ", "Tool ribbon"], ["#left", "พาเลตสัญลักษณ์", "Symbol palettes"], ["#canvas", "กระดาษโน้ต", "Score"], ["#right", "แผงคุณสมบัติ", "Properties panel"], ["footer.transport", "แถบเล่นเสียง", "Playback bar"], ["#status", "แถบสถานะ", "Status bar"]];
function a11yFocusables(root) { return [...root.querySelectorAll('button,[href],input:not([type=file]),select,textarea,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden"); }
function a11yCycle(dir) {
  const regs = A11Y_REGIONS.map(([s, th, en]) => [document.querySelector(s), th, en]).filter(([el]) => el && el.getClientRects().length);
  if (!regs.length) return;
  const ae = document.activeElement; let k = regs.findIndex(([el]) => el.contains(ae));
  k = k < 0 ? (dir > 0 ? 0 : regs.length - 1) : (k + dir + regs.length) % regs.length;
  const [el, th, en] = regs[k];
  const target = el.id === "canvas" ? el : (a11yFocusables(el)[0] || el);
  if (target === el && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  a11ySuppressFocus = true; target.focus(); a11ySuppressFocus = false;
  a11ySpeak(lg => LG(lg, th, en) + ", " + (target === el ? (el.id === "canvas" ? a11ySelText(lg) : "") : a11yDescribe(target, lg)), "state");
}
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
  const vs = a11yVoices();
  const thaiVs = vs.filter(v => /^th/i.test(v.lang)), enVs = vs.filter(v => /^en/i.test(v.lang));
  const thai = a11yThaiVoice(), env = a11yEnVoice();
  const opts = (list, cur) => list.map(v => `<option value="${esc(v.voiceURI)}" ${cur === v.voiceURI ? "selected" : ""}>${esc(v.name)} · ${esc(v.lang)}</option>`).join("");
  openModal("ตั้งค่าเสียงนำทาง", `<div style="display:flex;flex-direction:column;gap:12px">
    <div class="colorrow"><span>เสียงนำทาง</span><span class="seg"><button data-a11y-on="1" aria-pressed="${A11Y.on}">เปิด</button><button data-a11y-on="0" aria-pressed="${!A11Y.on}">ปิด</button></span><span></span></div>
    <div class="kv">
      <span>ภาษา</span><select class="sel" id="a1Lang">
        <option value="th" ${A11Y.lang === "th" ? "selected" : ""}>ไทย</option>
        <option value="en" ${A11Y.lang === "en" ? "selected" : ""}>English</option>
        <option value="both" ${A11Y.lang === "both" ? "selected" : ""}>ไทย + English (อ่านไทยก่อน แล้วตามด้วยอังกฤษ)</option></select>
      <span>เสียงที่ใช้</span><select class="sel" id="a1Engine">
        <option value="auto" ${A11Y.engine === "auto" ? "selected" : ""}>อัตโนมัติ (ตอนนี้: ${{ browser: "เสียงในเครื่อง", claude: "เสียง Claude", sr: "โปรแกรมอ่านหน้าจอ" }[a11yEngine()]})</option>
        <option value="browser" ${A11Y.engine === "browser" ? "selected" : ""}>เสียงในเครื่อง (เบราว์เซอร์)</option>
        ${a11yTTS ? `<option value="claude" ${A11Y.engine === "claude" ? "selected" : ""}>เสียง Claude</option>` : ""}
        <option value="sr" ${A11Y.engine === "sr" ? "selected" : ""}>ส่งให้โปรแกรมอ่านหน้าจอ (NVDA, VoiceOver)</option></select>
      <span>เสียงภาษาไทย</span><select class="sel" id="a1Voice"><option value="">${thai ? "อัตโนมัติ (" + esc(thai.name) + ")" : "ไม่มีเสียงภาษาไทยในเครื่อง"}</option>${opts(thaiVs, A11Y.voice)}</select>
      <span>เสียงภาษาอังกฤษ</span><select class="sel" id="a1VoiceEn"><option value="">${env ? "อัตโนมัติ (" + esc(env.name) + ")" : "อัตโนมัติ"}</option>${opts(enVs, A11Y.voiceEn)}</select>
      <span>ความเร็ว</span><input type="range" id="a1Rate" min="0.6" max="1.6" step="0.1" value="${A11Y.rate}" aria-label="ความเร็วเสียงพูด">
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <label class="toggle"><input type="checkbox" id="a1Hover" ${A11Y.hover ? "checked" : ""}> อ่านชื่อปุ่มและช่องต่าง ๆ เมื่อชี้เมาส์</label>
      <label class="toggle"><input type="checkbox" id="a1Notes" ${A11Y.notes ? "checked" : ""}> อ่านโน้ตและห้องเมื่อชี้เมาส์บนกระดาษโน้ต</label>
      <label class="toggle"><input type="checkbox" id="a1Toasts" ${A11Y.toasts ? "checked" : ""}> อ่านข้อความแจ้งเตือน</label>
    </div>
    ${!thai ? `<p class="note" style="color:var(--danger)">เครื่องนี้ยังไม่มีเสียงภาษาไทย · Windows: Settings → Time &amp; language → Speech → Add voices → ไทย · Mac: System Settings → Accessibility → Spoken Content → System voice → Thai (Kanya) · ติดตั้งแล้วรีโหลดหน้านี้ · ระหว่างนี้เลือกภาษา English ได้</p>` : ""}
    <div class="btns"><button class="b" id="a1Test">🔊 ทดลองเสียง</button></div>
    <div><h5 style="margin:6px 0;font-size:10.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase">ปุ่มลัด</h5>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">${[["F2", "เปิด / ปิดเสียงนำทาง"], ["Ctrl + F2", "เปลี่ยนภาษา: ไทย → English → ไทย + English"], ["Shift + F2", "ฟังตำแหน่งและสถานะปัจจุบัน"], ["F6 หรือ F8", "ย้ายไปส่วนถัดไปของหน้าจอ (Shift ย้อนกลับ)"], ["Tab / ลูกศร", "เลื่อนระหว่างปุ่มในส่วนเดียวกัน"], ["Enter / Space", "กดปุ่มที่อยู่"], ["Esc", "กลับไปกระดาษโน้ต"], ["← →", "บนกระดาษโน้ต: เลื่อนทีละโน้ต (อ่านชื่อโน้ตให้ทุกครั้ง)"], ["Alt + ↑ ↓", "บนกระดาษโน้ต: ย้ายบรรทัด"]].map(([k, d]) => `<tr><td style="padding:4px 8px 4px 0;font-family:var(--f-mono);white-space:nowrap">${k}</td><td style="padding:4px 0">${d}</td></tr>`).join("")}</table></div></div>`,
    [{ label: "เสร็จ", pri: true }],
    ov => {
      const set = (k, v) => { A11Y[k] = v; a11ySave(); };
      ov.querySelectorAll("[data-a11y-on]").forEach(b => b.onclick = () => { a11yToggle(b.dataset.a11yOn === "1"); ov.querySelectorAll("[data-a11y-on]").forEach(x => x.setAttribute("aria-pressed", String((x.dataset.a11yOn === "1") === A11Y.on))); });
      ov.querySelector("#a1Lang").onchange = e => a11ySetLang(e.target.value);
      ov.querySelector("#a1Engine").onchange = e => set("engine", e.target.value);
      ov.querySelector("#a1Voice").onchange = e => set("voice", e.target.value);
      ov.querySelector("#a1VoiceEn").onchange = e => set("voiceEn", e.target.value);
      ov.querySelector("#a1Rate").onchange = e => { set("rate", +e.target.value); a11ySpeak(lg => LG(lg, "ความเร็ว ", "Speed ") + e.target.value, "state", true); };
      ov.querySelector("#a1Hover").onchange = e => set("hover", e.target.checked);
      ov.querySelector("#a1Notes").onchange = e => set("notes", e.target.checked);
      ov.querySelector("#a1Toasts").onchange = e => set("toasts", e.target.checked);
      ov.querySelector("#a1Test").onclick = () => a11ySpeak(lg => LG(lg, "ทดลองเสียงนำทาง NOTA STUDIO, โน้ต C 5 ตัวดำ, ห้อง 1 จังหวะ 1", "Testing the NOTA STUDIO spoken guide, note C 5 quarter note, measure 1, beat 1"), "state", true);
    });
}

/* ---------- wiring ---------- */
function a11yInit() {
  a11yLoad();
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { }; } catch (e) { } }
  (async () => { try { a11yTTS = window.claude && typeof window.claude.use === "function" ? await window.claude.use("tts") : null; } catch (e) { a11yTTS = null; } })();
  const _refresh = refreshPanels; refreshPanels = function () { _refresh.apply(this, arguments); a11yQueue(); };
  const _ribbon = renderRibbon; renderRibbon = function () { _ribbon.apply(this, arguments); a11yQueue(); };
  const _play = play; play = function () { _play.apply(this, arguments); a11yQueue(); };
  const _stop = stop; stop = function () { _stop.apply(this, arguments); a11yQueue(); };
  const _toast = toast; toast = function (m) { _toast(m); if (A11Y.on && A11Y.toasts) setTimeout(() => a11ySpeak(m, "queue"), 5); };
  const _status = renderStatus; renderStatus = function () {
    _status.apply(this, arguments);
    const st = document.getElementById("status");
    if (st) st.insertAdjacentHTML("beforeend", `<button class="vbtn" data-act="a11yset" aria-pressed="${A11Y.on}" title="ตั้งค่าเสียงนำทางสำหรับผู้พิการทางสายตา">🔊 เสียงนำทาง${A11Y.on ? ": " + A11Y_LANGNAME[A11Y.lang] : ""}</button>`);
  };
  const _open = openModal; openModal = function (title) {
    const prevFocus = document.activeElement; _open.apply(this, arguments);
    if (!document.getElementById("modal")) return;
    a11yReturnFocus = prevFocus;
    if (A11Y.on) {
      const m = document.querySelector("#modal .modal");
      const first = m && (a11yFocusables(m.querySelector(".body") || m)[0] || a11yFocusables(m)[0]);
      a11ySuppressFocus = true; if (first) first.focus(); a11ySuppressFocus = false;
      a11ySpeak(lg => LG(lg, "หน้าต่าง ", "Dialog, ") + (lg === "en" ? (a11yTr(title) || a11yStripThai(title) || title) : title) + (first ? ", " + a11yDescribe(first, lg) : ""), "state");
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
    if (a === "a11ylang") return a11yCycleLang();
    if (a && a.startsWith("a11ylang:")) return a11ySetLang(a.slice(9), true);
    return _do.apply(this, arguments);
  };
  COMMANDS.push(["Spoken guide เสียงนำทาง เปิดปิด (ผู้พิการทางสายตา)", "F2", "a11y"], ["Spoken guide settings ตั้งค่าเสียงนำทาง", "", "a11yset"], ["Where am I ตำแหน่งปัจจุบัน", "Shift+F2", "whereami"],
    ["Spoken guide language: Thai เสียงนำทางภาษาไทย", "", "a11ylang:th"], ["Spoken guide language: English เสียงนำทางภาษาอังกฤษ", "", "a11ylang:en"], ["Spoken guide language: Thai + English เสียงนำทางสองภาษา", "Ctrl+F2", "a11ylang:both"]);

  window.addEventListener("keydown", e => {
    if (e.key === "F2" && !e.altKey && !e.metaKey) {
      e.preventDefault(); e.stopPropagation();
      if (e.ctrlKey) { if (!A11Y.on) a11yToggle(true); a11yCycleLang(); }
      else if (e.shiftKey) a11yWhere(); else a11yToggle();
      return;
    }
    if (!A11Y.on) return;
    if ((e.key === "F6" || e.key === "F8") && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); a11yCycle(e.shiftKey ? -1 : 1); return; }
    if (e.key.startsWith("Arrow") && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && a11yRove(e)) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === "Escape" && !document.getElementById("modal") && !document.getElementById("pop")) {
      const ae = document.activeElement;
      if (ae && ae !== document.body && ae.id !== "canvas" && !["INPUT", "SELECT", "TEXTAREA"].includes(ae.tagName)) { e.preventDefault(); e.stopPropagation(); a11ySuppressFocus = true; document.getElementById("canvas").focus(); a11ySuppressFocus = false; a11ySpeak(lg => LG(lg, "กลับสู่กระดาษโน้ต, ", "Back to the score, ") + a11ySelText(lg), "state"); }
    }
  }, true);
  document.addEventListener("pointerdown", () => { a11yLastPointer = Date.now(); if (A11Y.on && !a11yGreeted) a11yGreet(); }, true);
  document.addEventListener("keydown", () => { if (A11Y.on && !a11yGreeted) a11yGreet(); }, true);
  const HOVER_SEL = 'button,a[href],input,select,textarea,[role="button"],[role="tab"],li[data-i],h3,h4,h5,.kv>span,.note,.big,.clock,.toast,.strip b';
  document.addEventListener("pointerover", e => {
    if (!A11Y.on || !A11Y.hover || e.pointerType === "touch") return;
    if (e.target.closest && e.target.closest("#pages .page")) { if (!e.target.closest(".mtools,.addend,.pop")) return; }
    const el = e.target.closest && e.target.closest(HOVER_SEL);
    if (!el || el === a11yLastHoverEl) return;
    a11yLastHoverEl = el;
    clearTimeout(a11yHoverT);
    a11yHoverT = setTimeout(() => a11ySpeak(lg => a11yDescribe(el, lg), "hover"), 160);
  });
  document.addEventListener("pointerout", e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(HOVER_SEL)) a11yLastHoverEl = null; });
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
      a11yLastScoreKey = hit.key; a11ySpeak(hit.msg, "hover");
    }, 140);
  });
  pagesEl.addEventListener("pointerleave", () => { a11yLastScoreKey = ""; });
  document.addEventListener("focusin", e => {
    if (!A11Y.on || a11ySuppressFocus || Date.now() - a11yLastPointer < 400) return;
    const el = e.target; a11ySpeak(lg => a11yDescribe(el, lg), "state");
  });
  document.addEventListener("change", e => { if (!A11Y.on) return; const el = e.target; if (el.id === "a1Lang") return; if (el.matches && el.matches("select,input[type=checkbox],input[type=number],input[type=color]")) a11ySpeak(lg => a11yDescribe(el, lg), "state"); });
  let rangeT = 0; document.addEventListener("input", e => { if (!A11Y.on || !e.target.matches || !e.target.matches("input[type=range]")) return; clearTimeout(rangeT); const v = e.target.value; rangeT = setTimeout(() => a11ySpeak(lg => LG(lg, "ค่า ", "value ") + v, "state"), 200); });
  let palT = 0;
  document.addEventListener("keyup", e => {
    if (!A11Y.on || e.target.id !== "palIn") return;
    clearTimeout(palT);
    palT = setTimeout(() => {
      const li = document.querySelector('#palList li[aria-selected="true"]'); const n = document.querySelectorAll("#palList li[data-i]").length;
      const name = lg => li ? (lg === "en" ? a11yStripThai(li.textContent) : li.textContent) : "";
      if (e.key.startsWith("Arrow")) { if (li) a11ySpeak(lg => name(lg), "state"); }
      else a11ySpeak(lg => n ? LG(lg, `พบ ${n} คำสั่ง, `, `${n} commands found, `) + name(lg) : LG(lg, "ไม่พบคำสั่ง", "No commands found"), "state");
    }, e.key.startsWith("Arrow") ? 40 : 350);
  });
  a11yPrev = a11ySig();
  const b = document.getElementById("btnA11y"); if (b) b.setAttribute("aria-pressed", String(A11Y.on));
  renderStatus(); a11yLangButtons();
}
function a11yGreet() { a11yGreeted = true; setTimeout(() => a11ySpeak(lg => LG(lg, "เสียงนำทางพร้อมใช้งาน. กด Shift F2 เพื่อฟังตำแหน่ง, F2 เพื่อปิด", "Spoken guide ready. Press Shift F2 to hear your position, F2 to turn it off"), "queue"), 150); }
if (window.Vex) a11yInit(); else window.addEventListener("load", () => { if (window.Vex) a11yInit(); });
