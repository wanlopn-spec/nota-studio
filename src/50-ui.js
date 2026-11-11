/* ================= UI ================= */
const $ = id => document.getElementById(id);
const h = (s) => s; // template passthrough
const TABS = [["write", "บันทึกโน้ต"], ["notations", "สัญลักษณ์"], ["text", "ข้อความ"], ["score", "เครื่องดนตรี & ห้อง"], ["layout", "จัดหน้า"], ["play", "เล่น"], ["export", "ส่งออก"]];
const NOTEGLYPH = { w: "𝅝", h: "𝅗𝅥", q: "♩", "8": "♪", "16": "𝅘𝅥𝅯", "32": "𝅘𝅥𝅰", "64": "𝅘𝅥𝅱" };
const RESTGLYPH = { w: "𝄻", h: "𝄼", q: "𝄽", "8": "𝄾", "16": "𝄿" };
const ACTIONS = {};
let VUI = { 1: "#e9a15b", 2: "#5cc08a", 3: "#79a8f0", 4: "#c690ea" };
function act(name, fn) { ACTIONS[name] = fn; }
function rb(action, glyph, label, opts = {}) {
  return `<button class="rb${opts.sm ? " sm" : ""}" data-act="${action}" ${opts.pressed != null ? `aria-pressed="${!!opts.pressed}"` : ""} title="${opts.title || label}${opts.key ? " (" + opts.key + ")" : ""}" aria-label="${opts.title || label || ""}${opts.key ? " (" + opts.key + ")" : ""}"><i class="${opts.cls || ""}">${glyph}</i>${label}</button>`;
}
function grp(label, inner, right = "") { return `<div class="grp"><label><span>${label}</span><span>${right}</span></label><div class="row">${inner}</div></div>`; }

function renderTabs() {
  $("tabs").innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${l}</button>`).join("") +
    `<span class="chip" title="เทมเพลต">${esc(S.template || "Custom")}</span><span class="chip ${ui.concert ? "" : "off"}" data-act="concert" role="button" tabindex="0">${ui.concert ? "Concert pitch" : "Transposed"}</span>`;
}
function renderRibbon() {
  const r = $("ribbon"); let x = "";
  if (ui.tab === "write") {
    x += grp("โหมด", rb("input", "✎", "ใส่โน้ต", { pressed: ui.input, key: "N", cls: "u" }) + rb("select", "⌖", "เลือก", { pressed: !ui.input, key: "Esc", cls: "u" }));
    x += grp("ห้องเพลง", measureButtons());
    x += grp("เสียง (Voice)", [1, 2, 3, 4].map(v => `<button class="rb sm vb" data-act="voice:${v}" aria-pressed="${ui.voice === v}" title="เสียง ${v} (Ctrl+Alt+${v})" style="--vc:${VUI[v]}"><i class="u" style="color:${VUI[v]}">${v}</i>${v % 2 ? "ก้านขึ้น" : "ก้านลง"}</button>`).join(""), "Ctrl+Alt+1–4");
    x += grp("ค่าตัวโน้ต", DORDER.map((d, k) => rb("dur:" + d, NOTEGLYPH[d], DTH[d].replace("เขบ็ต ", "").replace(" ชั้น", "ชั้น"), { pressed: ui.dur === d, key: String(7 - k), sm: true, title: DTH[d] })).join("") +
      rb("dot", "𝅭", "จุด", { pressed: !!ui.dots, key: ".", sm: true }) + rb("tup", "³", "Triplet", { pressed: ui.tup, key: "Ctrl+3", sm: true, cls: "u" }), "1–7 · .");
    x += grp("ตัวหยุด & เครื่องหมาย", rb("rest", "𝄽", "หยุด", { key: "0", sm: true }) + rb("acc:sharp", "♯", "ชาร์ป", { sm: true, key: "↑" }) + rb("acc:flat", "♭", "แฟลต", { sm: true, key: "↓" }) + rb("acc:natural", "♮", "เนเชอรัล", { sm: true }) + rb("acc:dsharp", "𝄪", "ดับเบิล♯", { sm: true }) + rb("acc:dflat", "𝄫", "ดับเบิล♭", { sm: true }) + rb("tie", "‿", "Tie", { sm: true, key: "T" }));
    x += grp("ระดับเสียง", rb("up", "▲", "+½", { sm: true, cls: "u", key: "↑" }) + rb("down", "▼", "−½", { sm: true, cls: "u", key: "↓" }) + rb("octup", "⇑", "ออกเทฟ", { sm: true, cls: "u", key: "Ctrl+↑" }) + rb("octdown", "⇓", "ออกเทฟ", { sm: true, cls: "u", key: "Ctrl+↓" }));
    x += grp("ใส่ด้วยตัวอักษร", LET.split("").map(L => rb("letter:" + L, L, "", { sm: true, cls: "u", key: L, title: "ใส่โน้ต " + L })).join(""), "Shift = คอร์ด");
  } else if (ui.tab === "notations") {
    x += grp("Articulation", Object.entries(ARTS).map(([k, a]) => rb("art:" + k, a.g, a.n, { sm: true })).join(""));
    x += grp("Dynamics", DYNS.slice(0, 8).map(d => rb("dyn:" + d, d, "", { sm: true, cls: "t", title: "ไดนามิก " + d })).join("") + DYNS.slice(8).map(d => rb("dyn:" + d, d, "", { sm: true, cls: "t", title: "ไดนามิก " + d })).join(""));
    x += grp("เส้น", rb("slur", "⌒", "Slur", { key: "S" }) + rb("cresc", "𝆒", "Cresc.", { key: "<" }) + rb("dim", "𝆓", "Dim.", { key: ">" }));
    x += grp("เส้นกั้นห้อง & ย้อน", rb("bar:double", "𝄁", "คู่") + rb("bar:end", "𝄂", "จบ") + rb("bar:repBeg", "𝄆", "เริ่มย้อน") + rb("bar:repEnd", "𝄇", "จบย้อน") + rb("bar:single", "𝄀", "ปกติ"));
  } else if (ui.tab === "text") {
    x += grp("หัวเพลง", rb("edit:title", "T", "ชื่อเพลง", { cls: "u" }) + rb("edit:subtitle", "t", "ชื่อรอง", { cls: "u" }) + rb("edit:composer", "✍", "ผู้ประพันธ์", { cls: "u" }) + rb("edit:lyricist", "✎", "ผู้แต่งคำร้อง", { cls: "u" }));
    x += grp("ข้อความบนโน้ต", rb("lyric", "ล", "เนื้อร้อง", { cls: "u", key: "Ctrl+L" }) + rb("chordsym", "C⁷", "คอร์ด", { cls: "u", key: "Ctrl+Shift+K" }) + rb("stafftext", "Aa", "ข้อความ", { cls: "u", key: "Ctrl+T" }));
    x += grp("ข้อความระดับห้อง", rb("reh", "Ⓐ", "Rehearsal", { cls: "u", key: "Ctrl+M" }) + rb("tempo", "♩=", "Tempo", { key: "Alt+T" }) + rb("systext", "✦", "System text", { cls: "u" }));
  } else if (ui.tab === "score") {
    x += grp("เครื่องดนตรี", rb("addinst", "＋", "เพิ่ม", { cls: "u", key: "I" }) + rb("rtab:inst", "≣", "จัดการ", { cls: "u" }) + rb("transpose", "⇅", "Transpose", { cls: "u" }) + rb("concert", "♮", "Concert", { pressed: ui.concert }));
    x += grp("ห้องเพลง", measureButtons() + rb("appendm", "⊕", "หลายห้อง…", { cls: "u" }));
    x += grp("กุญแจ & อัตราจังหวะ", rb("pick:key", "♯♭", "บันไดเสียง", { cls: "u" }) + rb("pick:time", "𝄴", "อัตราจังหวะ") + rb("clef:treble", "𝄞", "Treble", { sm: true }) + rb("clef:bass", "𝄢", "Bass", { sm: true }) + rb("clef:alto", "𝄡", "Alto", { sm: true }) + rb("clef:tenor", "𝄡", "Tenor", { sm: true }) + rb("clef:treble8vb", "𝄠", "Tr. 8vb", { sm: true }));
  } else if (ui.tab === "layout") {
    x += grp("มุมมอง", rb("view:page", "▭", "หน้า", { pressed: ui.view === "page", cls: "u" }) + rb("view:cont", "⇥", "ต่อเนื่อง", { pressed: ui.view === "cont", cls: "u" }));
    x += grp("ซูม", rb("zoomout", "−", "ย่อ", { cls: "u", sm: true, key: "Ctrl+-" }) + `<div class="field" style="padding:0 6px;font-family:var(--f-mono)">${Math.round(ui.zoom * 100)}%</div>` + rb("zoomin", "+", "ขยาย", { cls: "u", sm: true, key: "Ctrl+=" }) + rb("zoomfit", "⤢", "พอดี", { cls: "u", sm: true }));
    x += grp("ระบบบรรทัด", rb("break", "↵", "ตัดบรรทัด", { cls: "u", key: "Enter" }) + rb("hideempty", "⊘", "ซ่อนว่าง", { pressed: ui.hideEmpty, cls: "u" }) + rb("names", "Ab", "ชื่อเครื่อง", { pressed: ui.names, cls: "u" }));
    { const n = perSys(), std = [4, 5, 6, 8];
      x += grp("ห้องต่อบรรทัด", rb("persys:0", "⇔", "อัตโนมัติ", { pressed: !n, cls: "u", sm: true }) + std.map(k => rb("persys:" + k, String(k), "ห้อง", { pressed: n === k, cls: "u", sm: true })).join("") +
        rb("persys:custom", n && !std.includes(n) ? String(n) : "…", "อื่น ๆ", { pressed: !!(n && !std.includes(n)), cls: "u", sm: true }) +
        rb("equalw", "▥", "กว้างเท่ากัน", { pressed: !!n && equalW(), cls: "u", sm: true, title: "ทุกห้องกว้างเท่ากัน เส้นกั้นห้องตรงกันทุกบรรทัด" }), "จัดเท่ากันทุกบรรทัด"); }
    x += grp("ระยะ", `<div style="display:flex;flex-direction:column;gap:4px;padding:2px 6px;min-width:200px">
      <label class="field">บรรทัด <input type="range" id="rgStaff" min="70" max="150" value="${ui.staffDist}"></label>
      <label class="field">โน้ต&nbsp;&nbsp; <input type="range" id="rgSpace" min="70" max="180" value="${Math.round(ui.spacing * 100)}"></label>
</div>`);
    x += grp("Part", `<div style="padding:4px 6px"><select class="sel" id="selPart"><option value="all">Full score</option>${partOptions()}</select></div>`);
  } else if (ui.tab === "play") {
    x += grp("Transport", rb("play", playing ? "❚❚" : "▶", playing ? "หยุด" : "เล่น", { cls: "u", key: "Space" }) + rb("stop", "■", "หยุด", { cls: "u" }) + rb("loop", "⟲", "วนช่วง", { pressed: ui.loop, cls: "u" }) + rb("metro", "◭", "เมโทรนอม", { pressed: ui.metro, cls: "u" }));
    x += grp("การตีความ", rb("swing", "♫", "Swing 8ths", { pressed: ui.swing }) + `<label class="field" style="padding:0 8px">Tempo ♩ = <input class="inp num" id="tempoIn2" type="number" min="20" max="320" value="${S.tempo}"></label>`);
    x += grp("มิกเซอร์", rb("rtab:mix", "☰", "เปิดมิกเซอร์", { cls: "u" }));
  } else if (ui.tab === "export") {
    x += grp("แพ็กเกจ", rb("exp:zip", "⬇", "ทั้งหมด .zip", { cls: "u" }), "MusicXML + MIDI + SVG");
    x += grp("รูปแบบเดี่ยว", rb("exp:musicxml", "𝄞", "MusicXML") + rb("exp:midi", "♪", "MIDI") + rb("exp:svg", "◇", "SVG", { cls: "u" }) + rb("exp:png", "▣", "PNG", { cls: "u" }) + rb("exp:json", "{}", "โปรเจกต์", { cls: "u" }));
    x += grp("นำเข้า", rb("open", "⇪", "MusicXML / โปรเจกต์", { cls: "u", key: "Ctrl+O" }) + rb("openpdf", "📄", "PDF / รูปโน้ต → ฟัง", { cls: "u" }), "Claude ช่วยอ่าน PDF");
    x += grp("อื่น ๆ", rb("copyxml", "⧉", "คัดลอก MusicXML", { cls: "u" }));
  }
  r.innerHTML = x;
  const rs = $("rgStaff"); if (rs) rs.oninput = () => { ui.staffDist = +rs.value; render(); };
  const sp = $("rgSpace"); if (sp) sp.oninput = () => { ui.spacing = sp.value / 100; render(); };
  const pt = $("selPart"); if (pt) { pt.value = ui.part; pt.onchange = () => { ui.part = pt.value; ui.sel = ui.range = ui.anchor = null; render(); refreshPanels(); }; }
  const t2 = $("tempoIn2"); if (t2) t2.onchange = () => setTempo(+t2.value);
}
function setPerSys(n) {
  commit(() => { S.layout = { ...(S.layout || {}), perSys: n }; });
  renderRibbon();
  toast(n ? `จัดหน้า ${n} ห้องต่อบรรทัดทุกบรรทัด` : "จัดห้องต่อบรรทัดอัตโนมัติ");
}
function perSysDialog() {
  openModal("จำนวนห้องต่อบรรทัด", `<div class="kv"><span>ห้องต่อบรรทัด</span><input class="inp num" id="psN" type="number" min="1" max="16" value="${perSys() || 4}"></div>
    <label class="toggle"><input type="checkbox" id="psEq" ${equalW() ? "checked" : ""}> ให้ทุกห้องกว้างเท่ากัน (เส้นกั้นห้องตรงกันทุกบรรทัด)</label>
    <p class="note">ใส่ 1–16 ห้อง · การตัดบรรทัดเอง (Enter) ยังใช้ได้ และจะเริ่มนับใหม่จากห้องถัดไป</p>`,
    [{ label: "ยกเลิก" }, { label: "ใช้", pri: true, fn: () => { const n = Math.max(1, Math.min(16, Math.round(+$("psN").value || 4))); const eq = $("psEq").checked; commit(() => { S.layout = { ...(S.layout || {}), perSys: n, equalW: eq }; }); renderRibbon(); toast(`จัดหน้า ${n} ห้องต่อบรรทัดทุกบรรทัด`); } }],
    () => setTimeout(() => { const i = $("psN"); i.focus(); i.select(); }, 30));
}
function measureButtons() {
  return rb("addm:end", "＋", "เพิ่มท้ายเพลง", { cls: "u", key: "Ctrl+B" }) + rb("addm:before", "⇤", "แทรกก่อน", { cls: "u", key: "Ins" }) + rb("addm:after", "⇥", "แทรกหลัง", { cls: "u", key: "Ctrl+Ins" }) + rb("deletem", "🗑", "ลบห้อง", { cls: "u", key: "Ctrl+Del" });
}
function selMeasures() { return ui.range ? { m1: ui.range.m1, m2: ui.range.m2 } : ui.sel ? { m1: ui.sel.m, m2: ui.sel.m } : null; }
function addMeasureAt(where) {
  if (where === "end") return appendMeasures(1);
  const r = selMeasures(); if (!r) return toast("เลือกห้องก่อน แล้วจึงแทรก");
  insertMeasures(where === "before" ? r.m1 : r.m2 + 1, 1);
}
function drawMeasureTools() {
  document.querySelectorAll(".mtools,.addend").forEach(e => e.remove());
  if (!S || !nM()) return;
  const z = ui.zoom;
  // add-at-end button after the last measure
  const last = LAY.mpos[nM() - 1];
  if (last && LAY.pages[last.page]) {
    const b = document.createElement("button"); b.className = "addend"; b.dataset.act = "addm:end"; b.title = "เพิ่มห้องท้ายเพลง (Ctrl+B)"; b.setAttribute("aria-label", "เพิ่มห้องท้ายเพลง");
    b.textContent = "＋";
    b.addEventListener("pointerdown", e => e.stopPropagation());
    b.style.left = (last.x2 + 8) * z + "px"; b.style.top = (last.yTop + 18) * z + "px";
    LAY.pages[last.page].el.appendChild(b);
  }
  // floating toolbar for selected measures
  if (!ui.range || ui.input) return;
  const mp = LAY.mpos[ui.range.m1]; if (!mp || !LAY.pages[mp.page]) return;
  const n = ui.range.m2 - ui.range.m1 + 1;
  const t = document.createElement("div"); t.className = "mtools"; t.setAttribute("role", "toolbar"); t.setAttribute("aria-label", "เครื่องมือห้องเพลง");
  t.innerHTML = `<span>${n > 1 ? `ห้อง ${ui.range.m1 + 1}–${ui.range.m2 + 1}` : `ห้อง ${ui.range.m1 + 1}`}</span><button data-act="addm:before" title="แทรกห้องก่อน (Ins)">⇤ แทรกก่อน</button><button data-act="addm:after" title="แทรกห้องหลัง (Ctrl+Ins)">แทรกหลัง ⇥</button><button data-act="deletem" class="del" title="ลบห้อง (Ctrl+Del)">🗑 ลบ${n > 1 ? " " + n + " ห้อง" : "ห้อง"}</button>`;
  t.style.left = Math.max(4, mp.mx * z) + "px"; t.style.top = Math.max(4, (mp.yTop - 26) * z - 34) + "px";
  t.addEventListener("pointerdown", e => e.stopPropagation());
  LAY.pages[mp.page].el.appendChild(t);
}
function partOptions() {
  const seen = new Set(); return S.staves.filter(s => { if (s.group) { if (seen.has(s.group)) return false; seen.add(s.group); } return true; }).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
}
function setTempo(v) { if (!v || v < 20 || v > 400) return; commit(() => { S.tempo = Math.round(v); }); $("tempoIn").value = S.tempo; }

/* ---------- palettes (left) ---------- */
const PALETTES = [
  { t: "กุญแจประจำหลัก (Clefs)", items: [["clef:treble", "𝄞", "Treble"], ["clef:bass", "𝄢", "Bass"], ["clef:alto", "𝄡", "Alto"], ["clef:tenor", "𝄡", "Tenor"], ["clef:treble8vb", "𝄠", "Treble 8vb"]] },
  { t: "บันไดเสียง (Key signatures)", items: [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(f => ["key:" + f, f === 0 ? "♮" : (f > 0 ? "♯" : "♭") + Math.abs(f), KEYNAMES[f] + " / " + KEYMINOR[f] + "m", "u"]) },
  { t: "อัตราจังหวะ (Time)", items: [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 2], [3, 8], [6, 8], [7, 8], [9, 8], [12, 8]].map(([a, b]) => ["time:" + a + "/" + b, a + "/" + b, b === 2 && a === 2 ? "Cut" : "", "u"]) },
  { t: "เครื่องหมายแปลงเสียง", items: [["acc:sharp", "♯", "Sharp"], ["acc:flat", "♭", "Flat"], ["acc:natural", "♮", "Natural"], ["acc:dsharp", "𝄪", "Double ♯"], ["acc:dflat", "𝄫", "Double ♭"]] },
  { t: "Articulations", items: Object.entries(ARTS).map(([k, a]) => ["art:" + k, a.g, a.n]) },
  { t: "Dynamics", items: DYNS.map(d => ["dyn:" + d, d, "", "t"]) },
  { t: "เส้น (Lines)", items: [["slur", "⌒", "Slur"], ["cresc", "𝆒", "Crescendo"], ["dim", "𝆓", "Diminuendo"], ["tie", "‿", "Tie"]] },
  { t: "เส้นกั้นห้อง & การย้อน", items: [["bar:single", "𝄀", "Single"], ["bar:double", "𝄁", "Double"], ["bar:end", "𝄂", "Final"], ["bar:repBeg", "𝄆", "Start repeat"], ["bar:repEnd", "𝄇", "End repeat"]] },
  { t: "ข้อความ & Tempo", items: [["reh", "A", "Rehearsal", "u"], ["tempo", "♩=", "Tempo"], ["stafftext", "Aa", "Staff text", "u"], ["systext", "✦", "System text", "u"], ["chordsym", "C⁷", "Chord", "u"], ["lyric", "la", "Lyrics", "u"], ["navtext:D.C. al Fine", "D.C.", "Da Capo", "u"], ["navtext:D.S. al Coda", "D.S.", "Dal Segno", "u"], ["navtext:Fine", "Fine", "Fine", "u"], ["navtext:𝄋", "𝄋", "Segno"], ["navtext:𝄌", "𝄌", "Coda"]] },
  { t: "ห้อง (Measures)", items: [["addm:end", "＋", "เพิ่มท้าย", "u"], ["addm:before", "⇤", "แทรกก่อน", "u"], ["addm:after", "⇥", "แทรกหลัง", "u"], ["deletem", "🗑", "ลบห้อง", "u"], ["appendm", "⊕", "หลายห้อง…", "u"], ["break", "↵", "ตัดบรรทัด", "u"]] }
];
const palOpen = {};
function renderPalettes() {
  const q = ($("palSearch").value || "").trim().toLowerCase();
  $("palettes").innerHTML = PALETTES.map((p, k) => {
    const items = p.items.filter(it => !q || (it[2] + " " + it[1] + " " + it[0] + " " + p.t).toLowerCase().includes(q));
    if (!items.length) return "";
    const open = q || palOpen[k] !== false;
    return `<div class="pal"><h4 data-pal="${k}"><span>${open ? "▾" : "▸"} ${p.t}</span><em>${items.length}</em></h4>${open ? `<div class="cells">${items.map(([a, g, l, c]) => `<button class="cell ${c || ""}" data-act="${a}" title="${esc(l || g)}" aria-label="${esc(l || g)}">${g}${l && c !== "t" ? `<small>${esc(l)}</small>` : ""}</button>`).join("")}</div>` : ""}</div>`;
  }).join("") || `<p class="note">ไม่พบ “${esc(q)}”</p>`;
}

/* ---------- inspector (right) ---------- */
function renderRTabs() {
  const t = [["props", "คุณสมบัติ"], ["inst", "เครื่องดนตรี"], ["mix", "มิกเซอร์"], ["page", "หน้า"]];
  $("rtabs").innerHTML = t.map(([k, l]) => `<button class="stab" data-rtab="${k}" aria-selected="${ui.rtab === k}">${l}</button>`).join("") + `<button class="stab" id="closeRight" hidden>✕</button>`;
}
function refreshPanels() { renderRTabs(); renderInspector(); renderStatus(); updateStrip(); $("docTitle").textContent = S.title || "Untitled"; renderTabs(); }
function renderInspector() {
  const el = $("inspector"); let x = "";
  if (ui.rtab === "props") {
    const e = ui.sel ? evAt(ui.sel) : null, st = ui.sel ? S.staves[ui.sel.s] : null;
    if (!ui.sel && !ui.range) x += `<div class="sec"><h5>ไม่มีสิ่งที่เลือก</h5><p class="note">คลิกโน้ตเพื่อเลือก · คลิกพื้นที่ว่างในห้องเพื่อเลือกทั้งห้อง · Shift+คลิกเพื่อเลือกเป็นช่วง · กด <b>N</b> เพื่อเริ่มใส่โน้ต แล้วพิมพ์ A–G</p>
      <p class="note">ปุ่มลัด: 1–7 ค่าตัวโน้ต · 0 ตัวหยุด · ↑↓ ครึ่งเสียง · Ctrl+↑↓ ออกเทฟ · T tie · S slur · Ctrl+L เนื้อร้อง · Ctrl+K ค้นหาคำสั่ง · Space เล่น</p></div>`;
    if (ui.range) { const r = ui.range; x += `<div class="sec"><h5>ช่วงที่เลือก</h5><div class="big">ห้อง ${r.m1 + 1}–${r.m2 + 1}</div><p class="note">${r.s2 - r.s1 + 1} บรรทัด · Ctrl+C / Ctrl+V คัดลอก-วาง · Del ล้างโน้ต</p><div class="btns"><button class="b" data-act="copy">คัดลอก</button><button class="b" data-act="paste">วาง</button><button class="b" data-act="del">ล้าง</button><button class="b" data-act="transpose">Transpose…</button></div></div>`; }
    if (e && !ui.range) {
      const wf = writtenKey(st, ui.sel.m);
      const names = e.t === "n" ? (st.clef === "percussion" ? e.keys.map(k => (DRUMBY[k] || { n: k }).n).join(" + ") : e.keys.map((k, j) => spellWritten(k, st, ui.sel.m, e.pf ? e.pf[j] : 0).name).join(" · ")) : "ตัวหยุด";
      const concertNames = e.t === "n" && st.tr && !ui.concert && st.clef !== "percussion" ? e.keys.map(k => midiName(k, keyAt(ui.sel.m))).join(" · ") : "";
      x += `<div class="sec"><h5>${esc(st.name)} · ห้อง ${ui.sel.m + 1}</h5><div class="big">${names}</div>
        <p class="note"><b style="color:${VUI[ui.sel.v || 1]}">เสียง ${ui.sel.v || 1}</b> · ${DTH[e.d]}${e.dots ? " มีจุด" : ""}${e.tup ? " · triplet" : ""}${concertNames ? " · เสียงจริง " + concertNames : ""}</p>
        <div class="btns" style="margin-top:6px"><button class="b" data-act="up">+½</button><button class="b" data-act="down">−½</button><button class="b" data-act="octup">+8va</button><button class="b" data-act="octdown">−8va</button><button class="b" data-act="tie" aria-pressed="${!!e.tie}">Tie</button></div></div>`;
      x += `<div class="sec"><h5>Articulation</h5><div class="btns">${Object.entries(ARTS).map(([k, a]) => `<button class="b" data-act="art:${k}" aria-pressed="${!!(e.art && e.art.includes(k))}">${a.n}</button>`).join("")}</div></div>`;
      x += `<div class="sec"><h5>ข้อความบนโน้ต</h5><div class="kv">
        <span>Dynamic</span><select class="sel" id="pDyn"><option value="">—</option>${DYNS.map(d => `<option ${e.dyn === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        <span>คอร์ด</span><input class="inp" id="pChord" value="${esc(e.chord || "")}" placeholder="Cmaj7, F#m7b5">
        <span>เนื้อร้อง</span><input class="inp" id="pLyr" value="${esc(e.lyr || "")}" placeholder="ลา">
        <span>Staff text</span><input class="inp" id="pTx" value="${esc(e.tx || "")}" placeholder="pizz., solo">
      </div></div>`;
      x += `<div class="sec"><h5>ย้ายไปเสียง</h5><div class="btns">${[1, 2, 3, 4].map(v => `<button class="b" data-act="voice:${v}" aria-pressed="${(ui.sel.v || 1) === v}" style="color:${VUI[v]}">เสียง ${v}</button>`).join("")}</div><p class="note">เลือกโน้ตแล้วกด Ctrl+Alt+1–4 เพื่อย้ายไปอีกเสียง · ในโหมดใส่โน้ต ปุ่มเหล่านี้สลับเสียงที่กำลังเขียน</p></div>`;
    }
    const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : null;
    if (m != null) {
      const meta = S.meta[m], ts = timeAt(m);
      x += `<div class="sec"><h5>ห้องที่ ${m + 1}</h5><div class="kv">
        <span>บันไดเสียง</span><select class="sel" id="pKey">${[-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(f => `<option value="${f}" ${keyAt(m) === f ? "selected" : ""}>${KEYNAMES[f]} major / ${KEYMINOR[f]} minor</option>`).join("")}</select>
        <span>อัตราจังหวะ</span><span style="display:flex;gap:4px;align-items:center"><input class="inp num" id="pTn" type="number" min="1" max="16" value="${ts[0]}" style="width:64px;flex:none">/<select class="sel" id="pTd">${[2, 4, 8, 16].map(d => `<option ${ts[1] === d ? "selected" : ""}>${d}</option>`).join("")}</select><button class="b" data-act="applytime">ใช้</button></span>
        <span>Rehearsal</span><input class="inp" id="pReh" value="${esc(meta.reh || "")}" placeholder="A, B, Intro">
        <span>Tempo</span><span style="display:flex;gap:4px"><input class="inp num" id="pBpm" type="number" placeholder="—" value="${m === 0 ? S.tempo : meta.tempo ? meta.tempo.bpm : ""}"><input class="inp" id="pTt" placeholder="Allegro" value="${esc(m === 0 ? S.tempoText : meta.tempo ? meta.tempo.text : "")}"></span>
        <span>System text</span><input class="inp" id="pSys" value="${esc(meta.text || "")}" placeholder="Shout chorus">
        <span>เส้นกั้นท้าย</span><select class="sel" id="pBar">${[["", "ปกติ"], ["double", "คู่"], ["end", "จบ"], ["repEnd", "จบย้อน"]].map(([v, l]) => `<option value="${v}" ${(meta.bar || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      </div><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        <label class="toggle"><input type="checkbox" id="pRep" ${meta.repBeg ? "checked" : ""}> เริ่มย้อน (start repeat)</label>
        <label class="toggle"><input type="checkbox" id="pBrk" ${meta.brk ? "checked" : ""}> ตัดบรรทัดหลังห้องนี้</label></div>
      <div class="btns" style="margin-top:10px"><button class="b" data-act="addm:before">⇤ แทรกก่อน</button><button class="b" data-act="addm:after">แทรกหลัง ⇥</button><button class="b" data-act="deletem" style="color:var(--danger)">🗑 ลบห้อง</button></div></div>`;
    }
  } else if (ui.rtab === "inst") {
    x += `<div class="sec"><h5>เครื่องดนตรีในสกอร์</h5>`;
    const seen = new Set();
    S.staves.forEach((st, i) => {
      if (st.group) { if (seen.has(st.group)) return; seen.add(st.group); }
      const tr = st.tr ? ` · ${st.tr > 0 ? "+" : ""}${st.tr}` : "";
      x += `<div class="inst"><input class="nm" data-rename="${i}" value="${esc(st.name)}" aria-label="ชื่อเครื่องดนตรี"><small class="note" style="font-family:var(--f-mono)">${st.group ? "2 บรรทัด" : st.clef}${tr}</small>
        <button class="ib" data-act="mvup:${i}" title="ขึ้น">↑</button><button class="ib" data-act="mvdn:${i}" title="ลง">↓</button><button class="ib" data-act="rm:${i}" title="ลบ">✕</button></div>`;
    });
    x += `<div class="btns" style="margin-top:8px"><button class="b pri" data-act="addinst">＋ เพิ่มเครื่องดนตรี</button><button class="b" data-act="transpose">Transpose…</button></div></div>`;
    x += `<div class="sec"><h5>การแสดงระดับเสียง</h5><label class="toggle"><input type="checkbox" id="pConcert" ${ui.concert ? "checked" : ""}> Concert pitch (แสดงเสียงจริง)</label><p class="note">ปิดไว้ = แสดงโน้ตตามที่ผู้เล่นอ่าน (เช่น Trumpet in B♭ สูงขึ้นหนึ่งเสียงเต็ม)</p></div>`;
  } else if (ui.rtab === "mix") {
    x += `<div class="sec"><h5>มิกเซอร์</h5>`;
    S.staves.forEach((st, i) => {
      x += `<div class="mix"><div class="h"><span>${esc(st.name)}${st.group ? (st.gpos ? " (L.H.)" : " (R.H.)") : ""}</span><button class="ib" data-act="mute:${i}" aria-pressed="${st.mute}" title="Mute">M</button><button class="ib" data-act="solo:${i}" aria-pressed="${st.solo}" title="Solo">S</button></div>
        <input type="range" min="0" max="100" value="${Math.round(st.vol * 100)}" data-vol="${i}" aria-label="ระดับเสียง ${esc(st.name)}"></div>`;
    });
    x += `</div>`;
  } else if (ui.rtab === "page") {
    x += `<div class="sec"><h5>ข้อมูลเพลง</h5><div class="kv">
      <span>ชื่อเพลง</span><input class="inp" data-field="title" value="${esc(S.title)}">
      <span>ชื่อรอง</span><input class="inp" data-field="subtitle" value="${esc(S.subtitle)}">
      <span>ผู้ประพันธ์</span><input class="inp" data-field="composer" value="${esc(S.composer)}">
      <span>คำร้อง</span><input class="inp" data-field="lyricist" value="${esc(S.lyricist)}">
      <span>Tempo text</span><input class="inp" data-field="tempoText" value="${esc(S.tempoText)}">
    </div></div>
    <div class="sec"><h5>จัดหน้า</h5><div class="kv">
      <span>ห้อง/บรรทัด</span><select class="sel" id="pPerSys">${[0, 2, 3, 4, 5, 6, 8, 10, 12].map(n => `<option value="${n}" ${perSys() === n ? "selected" : ""}>${n ? n + " ห้อง" : "อัตโนมัติ"}</option>`).join("")}${perSys() && ![2, 3, 4, 5, 6, 8, 10, 12].includes(perSys()) ? `<option value="${perSys()}" selected>${perSys()} ห้อง</option>` : ""}</select>
      <span>เลขห้อง</span><select class="sel" id="pMnum"><option value="sys" ${ui.mnum === "sys" ? "selected" : ""}>ต้นบรรทัด</option><option value="all" ${ui.mnum === "all" ? "selected" : ""}>ทุกห้อง</option><option value="none" ${ui.mnum === "none" ? "selected" : ""}>ไม่แสดง</option></select>
      <span>ระยะบรรทัด</span><input type="range" id="pStaff" min="70" max="150" value="${ui.staffDist}">
      <span>ระยะระบบ</span><input type="range" id="pGap" min="10" max="90" value="${ui.sysGap}">
    </div><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
      <label class="toggle"><input type="checkbox" id="pHide" ${ui.hideEmpty ? "checked" : ""}> ซ่อนบรรทัดว่าง (ยกเว้นระบบแรก)</label>
      <label class="toggle"><input type="checkbox" id="pNames" ${ui.names ? "checked" : ""}> แสดงชื่อเครื่องดนตรี</label></div></div>
    <div class="sec"><h5>สถิติ</h5><p class="note">${nM()} ห้อง · ${S.staves.length} บรรทัด · ${LAY.pages.length} หน้า · ${S.staves.reduce((a, st) => a + st.measures.reduce((b, ms) => b + allEvs(ms).filter(e => e.t === "n").length, 0), 0)} โน้ต</p></div>`;
  }
  el.innerHTML = x;
  bindInspector();
}
function bindInspector() {
  const on = (id, ev, fn) => { const n = $(id); if (n) n.addEventListener(ev, fn); };
  const evEdit = (field, val) => { const e = evAt(ui.sel); if (!e) return; commit(() => { if (val) e[field] = val; else delete e[field]; }); };
  on("pDyn", "change", ev => evEdit("dyn", ev.target.value));
  on("pChord", "change", ev => evEdit("chord", ev.target.value.trim()));
  on("pLyr", "change", ev => evEdit("lyr", ev.target.value.trim()));
  on("pTx", "change", ev => evEdit("tx", ev.target.value.trim()));
  const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : null;
  on("pKey", "change", ev => setKeySig(+ev.target.value, m));
  on("pReh", "change", ev => commit(() => { const v = ev.target.value.trim(); if (v) S.meta[m].reh = v; else delete S.meta[m].reh; }));
  const tempoCh = () => { const b = +$("pBpm").value, t = $("pTt").value.trim(); commit(() => { if (m === 0) { if (b) S.tempo = b; S.tempoText = t; } else if (b) S.meta[m].tempo = { bpm: b, text: t }; else delete S.meta[m].tempo; }); $("tempoIn").value = S.tempo; };
  on("pBpm", "change", tempoCh); on("pTt", "change", tempoCh);
  on("pSys", "change", ev => commit(() => { const v = ev.target.value.trim(); if (v) S.meta[m].text = v; else delete S.meta[m].text; }));
  on("pBar", "change", ev => commit(() => { if (ev.target.value) S.meta[m].bar = ev.target.value; else delete S.meta[m].bar; }));
  on("pRep", "change", ev => commit(() => { S.meta[m].repBeg = ev.target.checked; }));
  on("pBrk", "change", ev => commit(() => { S.meta[m].brk = ev.target.checked; }));
  on("pConcert", "change", ev => { ui.concert = ev.target.checked; render(); refreshPanels(); renderRibbon(); });
  on("pMnum", "change", ev => { ui.mnum = ev.target.value; render(); });
  on("pPerSys", "change", ev => setPerSys(+ev.target.value));
  on("pStaff", "input", ev => { ui.staffDist = +ev.target.value; render(); });
  on("pGap", "input", ev => { ui.sysGap = +ev.target.value; render(); });
  on("pHide", "change", ev => { ui.hideEmpty = ev.target.checked; render(); renderRibbon(); });
  on("pNames", "change", ev => { ui.names = ev.target.checked; render(); renderRibbon(); });
  document.querySelectorAll("[data-field]").forEach(inp => inp.addEventListener("change", () => commit(() => { S[inp.dataset.field] = inp.value; })));
  document.querySelectorAll("[data-rename]").forEach(inp => inp.addEventListener("change", () => { const i = +inp.dataset.rename; commit(() => { staffBlock(i).forEach(k => S.staves[k].name = inp.value); }); }));
  document.querySelectorAll("[data-vol]").forEach(inp => inp.addEventListener("input", () => { S.staves[+inp.dataset.vol].vol = inp.value / 100; autosave(); }));
}
function renderStatus() {
  const e = ui.sel ? evAt(ui.sel) : null;
  let selTxt = "ไม่ได้เลือก";
  if (ui.range) selTxt = `ห้อง ${ui.range.m1 + 1}–${ui.range.m2 + 1} · ${ui.range.s2 - ui.range.s1 + 1} บรรทัด`;
  else if (e) selTxt = `${S.staves[ui.sel.s].name} · ห้อง ${ui.sel.m + 1} · ${e.t === "n" ? "โน้ต" : "ตัวหยุด"} ${DTH[e.d]}`;
  const m = ui.sel ? ui.sel.m : 0;
  $("status").innerHTML = `<span class="mode ${ui.input ? "on" : ""}"><b style="color:inherit">${ui.input ? "● โหมดใส่โน้ต" : "โหมดเลือก"}</b></span><span>${selTxt}</span><span>บันไดเสียง: <b>${KEYNAMES[keyAt(m)]} major</b></span><span>${timeAt(m).join("/")}</span><span>เสียง <b style="color:${VUI[ui.voice]}">${ui.voice}</b></span>
    <span class="sp"></span><span>${nM()} ห้อง</span>
    <button class="vbtn" data-act="zoomout">−</button><span style="font-family:var(--f-mono)">${Math.round(ui.zoom * 100)}%</span><button class="vbtn" data-act="zoomin">+</button>
    <button class="vbtn" data-act="view:page" aria-pressed="${ui.view === "page"}">▭ หน้า</button><button class="vbtn" data-act="view:cont" aria-pressed="${ui.view === "cont"}">⇥ ต่อเนื่อง</button><button class="vbtn" data-act="concert" aria-pressed="${ui.concert}">Concert</button>`;
}
function updateStrip() {
  const st = ui.part === "all" ? null : S.staves.find(s => s.id === ui.part);
  $("strip").innerHTML = `<b>${st ? esc(st.name).toUpperCase() : "FULL SCORE"} · ${ui.concert ? "CONCERT PITCH" : "TRANSPOSED"}</b><span>${ui.view === "page" ? "Page view" : "Continuous view"}</span><span>ห้อง 1–${nM()}</span><span>${LAY.pages.length} หน้า</span><span class="sp"></span>${ui.input ? `<span class="pill" style="color:var(--accent);border-color:var(--accent-line)">✎ ${DTH[ui.dur]}${ui.dots ? " ." : ""}${ui.tup ? " ³" : ""}</span>` : ""}<span>${ui.sel || ui.range ? "เลือกอยู่" : "ไม่ได้เลือก"}</span>`;
}

/* ---------- modals ---------- */
function openModal(title, body, buttons, onOpen) {
  closeModal();
  const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "modal";
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${title}</h3><button class="ib" data-close>✕</button></header><div class="body">${body}</div><footer>${buttons.map((b, i) => `<button class="b ${b.pri ? "pri" : ""}" data-bi="${i}">${b.label}</button>`).join("")}</footer></div>`;
  document.body.appendChild(ov);
  ov.addEventListener("pointerdown", e => { if (e.target === ov) closeModal(); });
  ov.querySelector("[data-close]").onclick = closeModal;
  ov.querySelectorAll("[data-bi]").forEach(b => b.onclick = () => { const bt = buttons[+b.dataset.bi]; if (bt.fn) { if (bt.fn() !== false) closeModal(); } else closeModal(); });
  if (onOpen) onOpen(ov);
}
function closeModal() { const m = $("modal"); if (m) m.remove(); }
const TEMPLATES = [
  { k: "Solo piano", d: "Piano", insts: ["piano"] },
  { k: "Lead sheet", d: "Voice + chord symbols", insts: ["soprano"] },
  { k: "String quartet", d: "2 Vln, Vla, Vc", insts: ["violin", "violin", "viola", "cello"] },
  { k: "SATB choir", d: "S, A, T, B + Piano", insts: ["soprano", "alto", "tenor", "bassv", "piano"] },
  { k: "Jazz combo", d: "A.Sax, Tpt, Tbn, Pno, Bass, Drums", insts: ["altosax", "trumpet", "trombone", "piano", "contrabass", "drums"] },
  { k: "Big band", d: "5 Sax, 4 Tpt, 4 Tbn, rhythm", insts: ["altosax", "altosax", "tenorsax", "tenorsax", "barisax", "trumpet", "trumpet", "trumpet", "trumpet", "trombone", "trombone", "trombone", "basstbn", "eguitar", "piano", "contrabass", "drums"] },
  { k: "Rock band", d: "Vocal, Gtr ×2, Bass, Drums", insts: ["soprano", "eguitar", "eguitar", "ebass", "drums"] },
  { k: "Orchestra", d: "Woodwinds, brass, timp, strings", insts: ["flute", "oboe", "clarinet", "bassoon", "horn", "trumpet", "trombone", "timpani", "violin", "violin", "viola", "cello", "contrabass"] },
  { k: "Wind quintet", d: "Fl, Ob, Cl, Hn, Bsn", insts: ["flute", "oboe", "clarinet", "horn", "bassoon"] },
  { k: "ว่าง", d: "เริ่มด้วย Flute หนึ่งเครื่อง", insts: ["flute"] }
];
function newScoreDialog() {
  let pick = 0;
  const keyOpts = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(f => `<option value="${f}" ${f === 0 ? "selected" : ""}>${KEYNAMES[f]} major / ${KEYMINOR[f]} minor</option>`).join("");
  openModal("สกอร์ใหม่", `<div class="tmpl" id="tmpl">${TEMPLATES.map((t, i) => `<button data-t="${i}" aria-pressed="${i === 0}"><b>${t.k}</b><small>${t.d}</small></button>`).join("")}</div>
    <div class="kv"><span>ชื่อเพลง</span><input class="inp" id="nTitle" value="เพลงใหม่"><span>ผู้ประพันธ์</span><input class="inp" id="nComp" placeholder="ชื่อของคุณ">
    <span>บันไดเสียง</span><select class="sel" id="nKey">${keyOpts}</select>
    <span>อัตราจังหวะ</span><span style="display:flex;gap:4px;align-items:center"><input class="inp num" id="nTn" type="number" value="4" min="1" max="16">/<select class="sel" id="nTd"><option>2</option><option selected>4</option><option>8</option></select></span>
    <span>Tempo</span><input class="inp num" id="nTempo" type="number" value="100" min="20" max="320">
    <span>จำนวนห้อง</span><input class="inp num" id="nMeas" type="number" value="32" min="1" max="500"></div>`,
    [{ label: "ยกเลิก" }, { label: "สร้างสกอร์", pri: true, fn: () => {
      const t = TEMPLATES[pick];
      const prev = S ? snapshot() : null;
      newScore({ title: $("nTitle").value || "Untitled", composer: $("nComp").value, key: +$("nKey").value, time: [Math.max(1, +$("nTn").value || 4), +$("nTd").value], tempo: +$("nTempo").value || 100, measures: Math.max(1, Math.min(500, +$("nMeas").value || 32)), insts: t.insts, template: t.k });
      if (prev) { undoStack.push(prev); redoStack.length = 0; }
      ui.sel = { s: 0, m: 0, i: 0 }; ui.range = ui.anchor = null; ui.part = "all"; ui.input = false;
      afterChange(); renderRibbon(); toast("สร้าง “" + S.title + "” แล้ว — กด N เพื่อเริ่มใส่โน้ต");
    } }],
    ov => ov.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { pick = +b.dataset.t; ov.querySelectorAll("[data-t]").forEach(x => x.setAttribute("aria-pressed", x === b)); }));
}
function addInstDialog() {
  const fams = {}; Object.entries(CAT).forEach(([k, c]) => (fams[c.fam] = fams[c.fam] || []).push([k, c]));
  openModal("เพิ่มเครื่องดนตรี", `<label class="search"><span>⌕</span><input id="instQ" placeholder="ค้นหา: trumpet, cello, drum…"></label><div id="instList"></div>`, [{ label: "เสร็จ" }], ov => {
    const draw = () => {
      const q = $("instQ").value.toLowerCase();
      $("instList").innerHTML = Object.entries(fams).map(([f, list]) => { const l = list.filter(([k, c]) => !q || c.name.toLowerCase().includes(q) || k.includes(q)); if (!l.length) return ""; return `<h5 style="margin:10px 0 6px;font-size:10.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase">${FAMNAME[f]}</h5><div class="catalog">${l.map(([k, c]) => `<button data-inst="${k}"><span>${c.name}</span><small>${c.grand ? "𝄞𝄢" : c.clef === "percussion" ? "perc" : c.tr ? (c.tr > 0 ? "+" : "") + c.tr : ""}</small></button>`).join("")}</div>`; }).join("");
      ov.querySelectorAll("[data-inst]").forEach(b => b.onclick = () => addInstrument(b.dataset.inst));
    };
    $("instQ").oninput = draw; draw(); setTimeout(() => $("instQ").focus(), 30);
  });
}
function transposeDialog() {
  const iv = [[0, "Unison"], [1, "ไมเนอร์ 2nd"], [2, "เมเจอร์ 2nd"], [3, "ไมเนอร์ 3rd"], [4, "เมเจอร์ 3rd"], [5, "เพอร์เฟกต์ 4th"], [6, "Tritone"], [7, "เพอร์เฟกต์ 5th"], [8, "ไมเนอร์ 6th"], [9, "เมเจอร์ 6th"], [10, "ไมเนอร์ 7th"], [11, "เมเจอร์ 7th"], [12, "ออกเทฟ"]];
  openModal("Transpose", `<div class="kv"><span>ทิศทาง</span><select class="sel" id="tDir"><option value="1">ขึ้น</option><option value="-1">ลง</option></select>
    <span>ขั้นคู่</span><select class="sel" id="tIv">${iv.map(([s, n]) => `<option value="${s}" ${s === 2 ? "selected" : ""}>${n} (${s})</option>`).join("")}</select>
    <span>ขอบเขต</span><select class="sel" id="tScope"><option value="all">ทั้งสกอร์</option><option value="sel" ${ui.range ? "selected" : ""}>ช่วงที่เลือก</option></select></div>
    <label class="toggle"><input type="checkbox" id="tKey" checked> ย้ายบันไดเสียงตามด้วย</label>
    <p class="note">คอร์ดสัญลักษณ์ถูกย้ายตามอัตโนมัติ · Drum Set ไม่ถูกย้าย</p>`,
    [{ label: "ยกเลิก" }, { label: "Transpose", pri: true, fn: () => { transposeScore(+$("tDir").value * +$("tIv").value, $("tKey").checked, $("tScope").value); } }]);
}
function keyDialog() {
  const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0;
  openModal("บันไดเสียงที่ห้อง " + (m + 1), `<div class="cells" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">${[-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(f => `<button class="cell u" data-k="${f}" style="height:52px">${KEYNAMES[f]} / ${KEYMINOR[f]}m<small>${f === 0 ? "ไม่มี ♯♭" : Math.abs(f) + (f > 0 ? " ♯" : " ♭")}</small></button>`).join("")}</div>`, [{ label: "ปิด" }],
    ov => ov.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { setKeySig(+b.dataset.k, m); closeModal(); }));
}
function timeDialog() {
  const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0, ts = timeAt(m);
  openModal("อัตราจังหวะที่ห้อง " + (m + 1), `<div class="kv"><span>จำนวนจังหวะ</span><input class="inp num" id="tdN" type="number" min="1" max="16" value="${ts[0]}"><span>ตัวโน้ตต่อจังหวะ</span><select class="sel" id="tdD">${[2, 4, 8, 16].map(d => `<option ${d === ts[1] ? "selected" : ""}>${d}</option>`).join("")}</select></div><p class="note">โน้ตที่เกินความยาวห้องใหม่จะถูกตัดออก</p>`,
    [{ label: "ยกเลิก" }, { label: "ใช้", pri: true, fn: () => setTimeSig(Math.max(1, +$("tdN").value), +$("tdD").value, m) }]);
}
function measuresDialog(insert) {
  openModal(insert ? "แทรกห้อง" : "ต่อท้ายห้อง", `<div class="kv"><span>จำนวน</span><input class="inp num" id="mN" type="number" min="1" max="200" value="${insert ? 1 : 4}"></div>${insert ? `<p class="note">แทรกก่อนห้องที่เลือก (ห้อง ${(ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0) + 1})</p>` : ""}`,
    [{ label: "ยกเลิก" }, { label: insert ? "แทรก" : "เพิ่ม", pri: true, fn: () => { const n = Math.max(1, Math.min(200, +$("mN").value || 1)); if (insert) insertMeasures(ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0, n); else appendMeasures(n); } }],
    () => setTimeout(() => { const n = $("mN"); n.focus(); n.select(); }, 30));
}

/* ---------- text popover ---------- */
function openTextPop(kind) {
  closePop();
  let anchor = null, value = "", label = "", commitFn, nextFn;
  const metaM = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : null;
  if (["title", "subtitle", "composer", "lyricist"].includes(kind)) {
    const pg = LAY.pages[0]; if (!pg) return;
    const hit = pg.hits.find(hh => hh.kind === "text" && hh.field === kind);
    anchor = { page: 0, x: hit ? hit.x : 60, y: hit ? hit.y + hit.h : 120 };
    value = S[kind] || ""; label = { title: "ชื่อเพลง", subtitle: "ชื่อรอง", composer: "ผู้ประพันธ์", lyricist: "ผู้แต่งคำร้อง" }[kind];
    commitFn = v => commit(() => { S[kind] = v; });
  } else if (["reh", "systext", "tempo"].includes(kind) || kind.startsWith("navtext")) {
    if (metaM == null) return toast("เลือกห้องก่อน");
    const e = S.staves[visibleStaves()[0]].measures[metaM].ev[0]; const p = e && LAY.evPos[e.id];
    anchor = p ? { page: p.page, x: p.x - 10, y: p.top - 40 } : null;
    if (kind === "reh") { value = S.meta[metaM].reh || nextReh(metaM); label = "Rehearsal mark"; commitFn = v => commit(() => { if (v) S.meta[metaM].reh = v; else delete S.meta[metaM].reh; }); }
    else if (kind === "tempo") { const t = metaM === 0 ? { bpm: S.tempo, text: S.tempoText } : (S.meta[metaM].tempo || { bpm: tempoAt(metaM), text: "" }); value = (t.text ? t.text + " " : "") + t.bpm; label = "Tempo เช่น “Allegro 132” หรือ “96”"; commitFn = v => { const mm = /^(.*?)(\d+)\s*$/.exec(v.trim()); commit(() => { if (!v.trim()) { if (metaM) delete S.meta[metaM].tempo; return; } const bpm = mm ? +mm[2] : tempoAt(metaM), text = mm ? mm[1].trim() : v.trim(); if (metaM === 0) { S.tempo = bpm; S.tempoText = text; } else S.meta[metaM].tempo = { bpm, text }; }); $("tempoIn").value = S.tempo; }; }
    else { value = kind.startsWith("navtext") ? kind.slice(8) : (S.meta[metaM].text || ""); label = "System text"; commitFn = v => commit(() => { if (v) S.meta[metaM].text = v; else delete S.meta[metaM].text; }); }
  } else {
    if (!ui.sel) return toast("เลือกโน้ตก่อน");
    const field = { lyric: "lyr", chordsym: "chord", stafftext: "tx" }[kind];
    const e = evAt(ui.sel); if (!e) return;
    const p = LAY.evPos[e.id];
    anchor = p ? { page: p.page, x: p.x - 8, y: field === "lyr" ? p.bot + 52 : p.top - 46 } : null;
    value = e[field] || ""; label = { lyr: "เนื้อร้อง — Space/Tab ไปโน้ตถัดไป, - ตัดพยางค์", chord: "คอร์ด — Space ไปตัวถัดไป", tx: "Staff text" }[field];
    commitFn = v => commit(() => { const ee = evAt(ui.sel); if (!ee) return; if (v) ee[field] = v; else delete ee[field]; });
    if (field !== "tx") nextFn = () => { const vv = ui.sel.v || 1; let p = nextEvPos(ui.sel.s, ui.sel.m, ui.sel.i, vv); if (field === "lyr") while (p && evAt(p) && evAt(p).t !== "n") p = nextEvPos(p.s, p.m, p.i, vv); if (p) { ui.sel = p; render(); refreshPanels(); scrollToSel(); setTimeout(() => openTextPop(kind), 10); } };
  }
  const pg = anchor ? LAY.pages[anchor.page] : null; if (!pg) return;
  const pop = document.createElement("div"); pop.className = "pop"; pop.id = "pop";
  pop.innerHTML = `<small>${label}</small><input id="popIn" autocomplete="off" spellcheck="false"><small>Enter = ตกลง · Esc = ยกเลิก</small>`;
  pop.style.left = Math.max(4, anchor.x * ui.zoom) + "px"; pop.style.top = Math.max(4, anchor.y * ui.zoom) + "px";
  pg.el.appendChild(pop);
  const inp = $("popIn"); inp.value = value; inp.focus(); inp.select();
  let done = false;
  inp.addEventListener("keydown", ev => {
    ev.stopPropagation();
    if (ev.key === "Enter") { done = true; const v = inp.value.trim(); closePop(); commitFn(v); }
    else if (ev.key === "Escape") { done = true; closePop(); }
    else if (nextFn && (ev.key === "Tab" || (ev.key === " " && kind !== "stafftext") || (ev.key === "-" && kind === "lyric"))) {
      ev.preventDefault(); done = true; let v = inp.value.trim(); if (ev.key === "-") v += "-"; closePop(); commitFn(v); nextFn();
    }
  });
  inp.addEventListener("blur", () => setTimeout(() => { if (!done && $("pop")) { done = true; const v = inp.value.trim(); closePop(); if (v !== value) commitFn(v); } }, 120));
}
function closePop() { const p = $("pop"); if (p) p.remove(); }
function nextReh(m) { const used = S.meta.slice(0, m).filter(x => x.reh && /^[A-Z]$/.test(x.reh)).map(x => x.reh); return used.length ? String.fromCharCode(used[used.length - 1].charCodeAt(0) + 1) : "A"; }

/* ---------- command palette ---------- */
const COMMANDS = [
  ["ใส่โน้ต / Note input", "N", "input"], ["Slur", "S", "slur"], ["Crescendo hairpin", "<", "cresc"], ["Diminuendo hairpin", ">", "dim"], ["Tie", "T", "tie"],
  ["Tempo marking", "Alt+T", "tempo"], ["Rehearsal mark", "Ctrl+M", "reh"], ["Lyrics เนื้อร้อง", "Ctrl+L", "lyric"], ["Chord symbol คอร์ด", "Ctrl+Shift+K", "chordsym"], ["Staff text", "Ctrl+T", "stafftext"], ["System text", "", "systext"],
  ["Transpose ทรานสโพส", "", "transpose"], ["Concert pitch toggle", "", "concert"], ["Key signature บันไดเสียง", "", "pick:key"], ["Time signature อัตราจังหวะ", "", "pick:time"],
  ["Add instrument เพิ่มเครื่องดนตรี", "I", "addinst"], ["Add measure at end เพิ่มห้องท้ายเพลง", "Ctrl+B", "addm:end"], ["Insert measure before แทรกห้องก่อน", "Ins", "addm:before"], ["Insert measure after แทรกห้องหลัง", "Ctrl+Ins", "addm:after"], ["Add several measures เพิ่มหลายห้อง", "", "appendm"], ["Insert several measures แทรกหลายห้อง", "", "insertm"], ["Delete measures ลบห้อง", "Ctrl+Del", "deletem"],
  ["System break ตัดบรรทัด", "Enter", "break"], ["4 measures per line ห้องต่อบรรทัด 4", "", "persys:4"], ["5 measures per line ห้องต่อบรรทัด 5", "", "persys:5"], ["6 measures per line ห้องต่อบรรทัด 6", "", "persys:6"], ["8 measures per line ห้องต่อบรรทัด 8", "", "persys:8"], ["Measures per line (custom) ห้องต่อบรรทัด อื่นๆ", "", "persys:custom"], ["Auto measures per line ห้องต่อบรรทัด อัตโนมัติ", "", "persys:0"], ["Equal measure widths กว้างเท่ากัน", "", "equalw"], ["Page view", "", "view:page"], ["Continuous view", "", "view:cont"], ["Zoom in", "Ctrl+=", "zoomin"], ["Zoom out", "Ctrl+-", "zoomout"], ["Hide empty staves", "", "hideempty"],
  ["Play / Stop เล่น", "Space", "play"], ["Swing eighths", "", "swing"], ["Metronome", "", "metro"], ["Loop selection", "", "loop"], ["Mixer มิกเซอร์", "", "rtab:mix"],
  ["Export all (.zip)", "", "exp:zip"], ["Export MusicXML", "", "exp:musicxml"], ["Export MIDI", "", "exp:midi"], ["Export SVG", "", "exp:svg"], ["Export PNG", "", "exp:png"], ["Save project (.json)", "Ctrl+S", "exp:json"], ["Copy MusicXML", "", "copyxml"],
  ["Open / import file เปิดไฟล์", "Ctrl+O", "open"], ["Import PDF / image sheet music นำเข้า PDF รูปโน้ต แล้วฟัง", "", "openpdf"], ["New score สกอร์ใหม่", "Ctrl+N", "new"], ["Load sample score เพลงตัวอย่าง", "", "sample"], ["Undo", "Ctrl+Z", "undo"], ["Redo", "Ctrl+Shift+Z", "redo"],
  ["Select all เลือกทั้งหมด", "Ctrl+A", "selall"], ["Copy", "Ctrl+C", "copy"], ["Paste", "Ctrl+V", "paste"], ["Triplet", "Ctrl+3", "tup"], ["Voice 1 เสียง 1", "Ctrl+Alt+1", "voice:1"], ["Voice 2 เสียง 2", "Ctrl+Alt+2", "voice:2"], ["Voice 3 เสียง 3", "Ctrl+Alt+3", "voice:3"], ["Voice 4 เสียง 4", "Ctrl+Alt+4", "voice:4"], ["Edit title", "", "edit:title"],
  ...Object.entries(ARTS).map(([k, a]) => [a.n, "", "art:" + k]), ...DYNS.map(d => ["Dynamic " + d, "", "dyn:" + d]),
  ["Theme ธีม ปรับโทนสี", "", "theme"], ["Treble clef", "", "clef:treble"], ["Bass clef", "", "clef:bass"], ["Alto clef", "", "clef:alto"], ["Double barline", "", "bar:double"], ["Final barline", "", "bar:end"], ["Start repeat", "", "bar:repBeg"], ["End repeat", "", "bar:repEnd"],
  ["Notehead / pitch up", "↑", "up"], ["Pitch down", "↓", "down"], ["Sharp ♯", "", "acc:sharp"], ["Flat ♭", "", "acc:flat"], ["Natural ♮", "", "acc:natural"]
];
function openPalette() {
  closeModal();
  const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "modal";
  ov.innerHTML = `<div class="palette" role="dialog" aria-label="ค้นหาคำสั่ง"><input id="palIn" placeholder="จะเปลี่ยนอะไร? พิมพ์ “notehead”, “slur”, “tempo”…" autocomplete="off"><ul id="palList" role="listbox"></ul></div>`;
  document.body.appendChild(ov);
  ov.addEventListener("pointerdown", e => { if (e.target === ov) closeModal(); });
  let idx = 0, list = [];
  const draw = () => {
    const q = $("palIn").value.trim().toLowerCase();
    list = COMMANDS.filter(c => !q || q.split(/\s+/).every(w => (c[0] + " " + c[2]).toLowerCase().includes(w))).slice(0, 40);
    idx = Math.min(idx, Math.max(0, list.length - 1));
    $("palList").innerHTML = list.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${i === idx}"><span>${esc(c[0])}</span><small>${c[1]}</small></li>`).join("") || `<li>ไม่พบคำสั่ง</li>`;
    $("palList").querySelectorAll("[data-i]").forEach(li => li.onclick = () => run(+li.dataset.i));
  };
  const run = i => { const c = list[i]; if (!c) return; closeModal(); doAction(c[2]); };
  const inp = $("palIn");
  inp.oninput = () => { idx = 0; draw(); };
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === "ArrowDown") { idx = Math.min(list.length - 1, idx + 1); draw(); e.preventDefault(); } else if (e.key === "ArrowUp") { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); } else if (e.key === "Enter") run(idx); else if (e.key === "Escape") closeModal(); };
  draw(); inp.focus();
}

/* ---------- action dispatcher ---------- */
function doAction(a) {
  const [k, arg] = a.includes(":") ? [a.slice(0, a.indexOf(":")), a.slice(a.indexOf(":") + 1)] : [a, null];
  switch (k) {
    case "input": return setInput(!ui.input);
    case "select": return setInput(false);
    case "theme": return themeDialog();
    case "persys": return arg === "custom" ? perSysDialog() : setPerSys(+arg);
    case "equalw": if (!perSys()) { toast("เลือกจำนวนห้องต่อบรรทัดก่อน (4, 5, 6, 8 หรืออื่น ๆ)"); return; } commit(() => { S.layout = { ...(S.layout || {}), equalW: !equalW() }; }); renderRibbon(); return;
    case "dur": return setDuration(arg);
    case "voice": return chooseVoice(+arg);
    case "dot": return toggleDot();
    case "tup": ui.tup = !ui.tup; renderRibbon(); updateStrip(); return;
    case "rest": if (!needSel()) return; return enterRest();
    case "acc": return setAccidental(arg);
    case "tie": return toggleTie();
    case "up": return shiftPitch(1);
    case "down": return shiftPitch(-1);
    case "octup": return shiftPitch(12);
    case "octdown": return shiftPitch(-12);
    case "letter": if (!ui.sel) return toast("เลือกตำแหน่งก่อน"); return enterPitchWritten(pitchFromLetter(arg, S.staves[ui.sel.s]), false);
    case "art": return toggleArt(arg);
    case "dyn": return setDyn(arg);
    case "slur": case "cresc": case "dim": return addSpan(k);
    case "bar": return setBar(arg);
    case "edit": return openTextPop(arg);
    case "lyric": case "chordsym": case "stafftext": case "reh": case "tempo": case "systext": return openTextPop(k);
    case "navtext": return openTextPop(a);
    case "addinst": return addInstDialog();
    case "rtab": ui.rtab = arg; renderRTabs(); renderInspector(); $("right").classList.add("open"); return;
    case "transpose": return transposeDialog();
    case "concert": ui.concert = !ui.concert; render(); refreshPanels(); renderRibbon(); return;
    case "appendm": return measuresDialog(false);
    case "addm": return addMeasureAt(arg);
    case "insertm": return measuresDialog(true);
    case "deletem": return deleteMeasures();
    case "pick": return arg === "key" ? keyDialog() : timeDialog();
    case "key": { const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0; return setKeySig(+arg, m); }
    case "time": { const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0; const [n, d] = arg.split("/").map(Number); return setTimeSig(n, d, m); }
    case "clef": return setClef(arg);
    case "view": ui.view = arg; render(); refreshPanels(); renderRibbon(); return;
    case "zoomin": ui.zoom = Math.min(3, +(ui.zoom + .1).toFixed(2)); render(); renderStatus(); renderRibbon(); return;
    case "zoomout": ui.zoom = Math.max(.4, +(ui.zoom - .1).toFixed(2)); render(); renderStatus(); renderRibbon(); return;
    case "zoomfit": { const w = $("canvas").clientWidth - 56; ui.zoom = Math.max(.4, Math.min(2, +(w / PW).toFixed(2))); render(); renderStatus(); renderRibbon(); return; }
    case "break": return toggleBreak();
    case "hideempty": ui.hideEmpty = !ui.hideEmpty; render(); renderRibbon(); return;
    case "names": ui.names = !ui.names; render(); renderRibbon(); return;
    case "play": play(); renderRibbon(); return;
    case "stop": stop(); renderRibbon(); return;
    case "loop": ui.loop = !ui.loop; $("tpLoop").setAttribute("aria-pressed", ui.loop); renderRibbon(); return;
    case "metro": ui.metro = !ui.metro; $("tpMetro").setAttribute("aria-pressed", ui.metro); renderRibbon(); return;
    case "swing": ui.swing = !ui.swing; renderRibbon(); toast(ui.swing ? "Swing 8ths: เปิด" : "Swing 8ths: ปิด"); return;
    case "exp": return arg === "zip" ? exportZip() : exportOne(arg);
    case "copyxml": return copyMusicXML();
    case "open": return $("fileIn").click();
    case "openpdf": { const f = $("fileIn"); f.setAttribute("accept", ".pdf,.png,.jpg,.jpeg,.webp"); f.click(); setTimeout(() => f.setAttribute("accept", ".musicxml,.xml,.mxl,.json,.pdf,.png,.jpg,.jpeg,.webp"), 1500); return; }
    case "new": return newScoreDialog();
    case "sample": { const prev = snapshot(); loadSample(); undoStack.push(prev); ui.sel = ui.range = ui.anchor = null; ui.part = "all"; afterChange(); renderRibbon(); $("tempoIn").value = S.tempo; return; }
    case "undo": return undo();
    case "redo": return redo();
    case "copy": return copySel();
    case "paste": return pasteSel();
    case "del": return deleteSel();
    case "selall": ui.range = { s1: 0, s2: S.staves.length - 1, m1: 0, m2: nM() - 1 }; ui.sel = { s: 0, m: 0, i: 0 }; ui.anchor = null; render(); refreshPanels(); return;
    case "mvup": return moveStaffBlock(+arg, -1);
    case "mvdn": return moveStaffBlock(+arg, 1);
    case "rm": return removeStaff(+arg);
    case "mute": S.staves[+arg].mute = !S.staves[+arg].mute; renderInspector(); autosave(); return;
    case "solo": S.staves[+arg].solo = !S.staves[+arg].solo; renderInspector(); autosave(); return;
    case "applytime": { const m = ui.range ? ui.range.m1 : ui.sel ? ui.sel.m : 0; return setTimeSig(Math.max(1, +$("pTn").value || 4), +$("pTd").value, m); }
  }
}

/* ---------- pointer on score ---------- */
function pagePoint(ev, P) { const r = P.svg.getBoundingClientRect(); return { x: (ev.clientX - r.left) * P.w / r.width, y: (ev.clientY - r.top) * P.h / r.height }; }
function onPagePointer(ev, P) {
  if (ev.target.closest && ev.target.closest(".pop")) return;
  const { x, y } = pagePoint(ev, P);
  const inside = hh => x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h;
  const notes = P.hits.filter(hh => hh.kind === "note" && inside(hh)).sort((a, b) => a.w * a.h - b.w * b.h);
  const stave = P.hits.find(hh => hh.kind === "stave" && inside(hh));
  if (ui.input && stave) {
    // place note at pitch under pointer
    const st = S.staves[stave.s];
    const vv = ui.voice, list = stave.evxBy && stave.evxBy[vv];
    if (list) { let best = list[0]; for (const p of list) if (p.x - 8 <= x) best = p; ui.sel = { s: stave.s, m: stave.m, i: best.i, v: vv }; }
    else { let best = stave.evx[0]; for (const p of stave.evx) if (p.x - 8 <= x) best = p; ui.sel = { s: stave.s, m: stave.m, i: evAtTick(vList(st, stave.m, vv), best.tick), v: vv }; }
    const steps = Math.round((y - stave.topY) / 5);
    const dia = CLEFDIA[st.clef] - steps;
    const wf = writtenKey(st, stave.m);
    const wm = st.clef === "percussion" ? (() => { let b = DRUMS[0]; for (const d of DRUMS) if (Math.abs(drumDia(d.k) - dia) < Math.abs(drumDia(b.k) - dia)) b = d; return b.m; })() : diaToMidi(dia, wf);
    if (st.clef === "percussion") { ui.lastPitch = 60; enterEvent([wm]); playPreview(60, st); }
    else enterPitchWritten(wm, ev.shiftKey);
    return;
  }
  if (notes.length) { const n = notes[0]; if (!ev.shiftKey && ui.voice !== (n.v || 1)) { ui.voice = n.v || 1; renderRibbon(); } selectEv({ s: n.s, m: n.m, i: n.i, v: n.v || 1 }, ev.shiftKey); const e = evAt(ui.sel); if (e && e.t === "n") playPreview(e.keys[e.keys.length - 1], S.staves[n.s]); return; }
  if (stave) return selectMeasure(stave.s, stave.m, ev.shiftKey);
  const t = P.hits.find(hh => hh.kind === "text" && inside(hh));
  if (t) return;
  if (!ev.shiftKey) clearSel();
}
function onPageDbl(ev, P) {
  const { x, y } = pagePoint(ev, P);
  const t = P.hits.find(hh => hh.kind === "text" && x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h);
  if (t) openTextPop(t.field);
}

/* ---------- keyboard ---------- */
function onKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
  if ($("modal")) { if (e.key === "Escape") closeModal(); return; }
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  const go = (a) => { e.preventDefault(); doAction(a); };
  if (mod && e.altKey && /^Digit[1-4]$/.test(e.code)) return go("voice:" + e.code.slice(5));
  if (mod && k.toLowerCase() === "k" && !e.shiftKey) return go("cmd") || openPalette();
  if (mod && e.shiftKey && k.toLowerCase() === "k") return go("chordsym");
  if (mod && k.toLowerCase() === "z") return go(e.shiftKey ? "redo" : "undo");
  if (mod && k.toLowerCase() === "y") return go("redo");
  if (mod && k.toLowerCase() === "c") return go("copy");
  if (mod && k.toLowerCase() === "v") return go("paste");
  if (mod && k.toLowerCase() === "a") return go("selall");
  if (mod && k.toLowerCase() === "l") return go("lyric");
  if (mod && k.toLowerCase() === "t") return go("stafftext");
  if (mod && k.toLowerCase() === "m") return go("reh");
  if (mod && k.toLowerCase() === "b") return go("addm:end");
  if (mod && k === "Insert") return go("addm:after");
  if (mod && k.toLowerCase() === "s") return go("exp:json");
  if (mod && k.toLowerCase() === "o") return go("open");
  if (mod && k.toLowerCase() === "n") return go("new");
  if (mod && k === "3") return go("tup");
  if (mod && (k === "=" || k === "+")) return go("zoomin");
  if (mod && k === "-") return go("zoomout");
  if (mod && k === "ArrowUp") return go("octup");
  if (mod && k === "ArrowDown") return go("octdown");
  if (mod && (k === "Delete" || k === "Backspace")) return go("deletem");
  if (mod && k === "ArrowRight") { e.preventDefault(); return moveSel(1, true, e.shiftKey); }
  if (mod && k === "ArrowLeft") { e.preventDefault(); return moveSel(-1, true, e.shiftKey); }
  if (e.altKey && k.toLowerCase() === "t") return go("tempo");
  if (e.altKey && k === "ArrowUp") { e.preventDefault(); return moveStaff(-1); }
  if (e.altKey && k === "ArrowDown") { e.preventDefault(); return moveStaff(1); }
  if (mod || e.altKey) return;
  if (k === " ") return go("play");
  if (k === "Escape") { e.preventDefault(); closePop(); if (ui.input) return setInput(false); return clearSel(); }
  if (k.toLowerCase() === "n" && !e.shiftKey) return go("input");
  if (k === "ArrowRight") { e.preventDefault(); return moveSel(1, false, e.shiftKey); }
  if (k === "ArrowLeft") { e.preventDefault(); return moveSel(-1, false, e.shiftKey); }
  if (k === "ArrowUp") return go("up");
  if (k === "ArrowDown") return go("down");
  if (k === "Delete" || k === "Backspace") return go("del");
  if (k === "Insert") return go("addm:before");
  if (k === "Enter") return go("break");
  if (/^[1-7]$/.test(k)) return go("dur:" + DORDER[7 - +k]);
  if (k === ".") return go("dot");
  if (k === "0") return go("rest");
  if (k === "t" || k === "T" || k === "+") return go("tie");
  if (k === "s" || k === "S") { if (!/[a-g]/i.test(k) || true) return go("slur"); }
  if (k === "<") return go("cresc");
  if (k === ">") return go("dim");
  if (k.toLowerCase() === "i") return go("addinst");
  if (k === "#") return go("acc:sharp");
  if (/^[a-gA-G]$/.test(k)) {
    e.preventDefault();
    if (!ui.sel) { if (ui.range) ui.sel = { s: ui.range.s1, m: ui.range.m1, i: 0 }; else return toast("เลือกตำแหน่งก่อน หรือกด N"); }
    if (!ui.input && !ui.range) { /* MuseScore: typing a letter on a selection enters input mode */ ui.input = true; renderRibbon(); }
    if (ui.range) { ui.sel = { s: ui.range.s1, m: ui.range.m1, i: 0 }; ui.range = null; ui.input = true; renderRibbon(); }
    const L = k.toUpperCase();
    return enterPitchWritten(pitchFromLetter(L, S.staves[ui.sel.s]), e.shiftKey);
  }
}

/* ---------- theme ---------- */
const THEMES = [
  { k: "mubito", n: "MuBiTo ส้ม", mode: "dark", accent: "#e9a15b", base: "#151311", paper: "#f6f0e2" },
  { k: "midnight", n: "Midnight น้ำเงิน", mode: "dark", accent: "#6ea8ff", base: "#10131b", paper: "#f4f5f7" },
  { k: "forest", n: "Forest เขียว", mode: "dark", accent: "#6cc58f", base: "#111613", paper: "#f3f1e7" },
  { k: "rose", n: "Rose ชมพู", mode: "dark", accent: "#f08bb0", base: "#171113", paper: "#faf3f4" },
  { k: "violet", n: "Violet ม่วง", mode: "dark", accent: "#a98bff", base: "#13111a", paper: "#f5f3fa" },
  { k: "graphite", n: "Graphite เทา", mode: "dark", accent: "#d9d9d9", base: "#131313", paper: "#ffffff" },
  { k: "contrast", n: "High contrast", mode: "dark", accent: "#ffd400", base: "#000000", paper: "#ffffff" },
  { k: "daylight", n: "Daylight สว่าง", mode: "light", accent: "#c4661a", base: "#efe9e1", paper: "#fffdf8" },
  { k: "ocean", n: "Ocean ฟ้า", mode: "light", accent: "#1f6fd1", base: "#e7edf5", paper: "#ffffff" },
  { k: "mint", n: "Mint มินต์", mode: "light", accent: "#16936a", base: "#e6f0ec", paper: "#ffffff" }
];
let THEME = { ...THEMES[0] };
function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
const hsl = (h, s, l) => `hsl(${h.toFixed(1)} ${Math.max(0, s).toFixed(1)}% ${Math.max(0, Math.min(100, l)).toFixed(1)}%)`;
function lum(hex) { const c = hexToRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function applyTheme(t) {
  THEME = { ...t };
  const [bh, bs0] = rgbToHsl(hexToRgb(t.base)); const bs = Math.min(bs0, 30);
  const [ah, as, al] = rgbToHsl(hexToRgb(t.accent));
  const dark = t.mode !== "light";
  const v = dark ? {
    bg: hsl(bh, bs, 6.5), chrome: hsl(bh, bs, 10.5), panel: hsl(bh, bs, 13), "panel-2": hsl(bh, bs, 15.5), raise: hsl(bh, bs, 19), line: hsl(bh, bs, 21), "line-2": hsl(bh, bs, 27),
    fg: hsl(bh, Math.min(bs, 20), 89), muted: hsl(bh, Math.min(bs, 12), 61), dim: hsl(bh, Math.min(bs, 10), 43), desk: hsl(bh, bs, 5), "accent-hi": hsl(ah, as, Math.min(92, al + 8))
  } : {
    bg: hsl(bh, bs, 86), chrome: hsl(bh, bs, 96.5), panel: hsl(bh, bs, 99), "panel-2": hsl(bh, bs, 93.5), raise: hsl(bh, bs, 91), line: hsl(bh, bs, 86), "line-2": hsl(bh, bs, 77),
    fg: hsl(bh, Math.min(bs, 25), 13), muted: hsl(bh, Math.min(bs, 12), 38), dim: hsl(bh, Math.min(bs, 10), 56), desk: hsl(bh, bs, 80), "accent-hi": hsl(ah, as, Math.max(18, al - 8))
  };
  const r = document.documentElement.style;
  for (const k in v) r.setProperty("--" + k, v[k]);
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-ink", lum(t.accent) > .35 ? "#1b1206" : "#ffffff");
  r.setProperty("--accent-soft", rgba(t.accent, dark ? .15 : .12));
  r.setProperty("--accent-line", rgba(t.accent, .5));
  r.setProperty("--paper", t.paper);
  r.setProperty("--paper-shadow", dark ? "rgba(0,0,0,.45)" : "rgba(40,30,20,.18)");
  r.setProperty("color-scheme", dark ? "dark" : "light");
  // selection colour on the white-ish paper: a deeper version of the accent
  SEL = hsl(ah, Math.max(as, 55), Math.min(46, al)); VCOL[1] = SEL;
  VUI = { ...VUI, 1: t.accent };
}
function loadTheme() { try { const o = JSON.parse(localStorage.getItem("nota-theme") || "null"); if (o && o.accent && o.base) { applyTheme(o); return; } } catch (e) { } applyTheme(THEMES[0]); }
function saveTheme() { try { localStorage.setItem("nota-theme", JSON.stringify(THEME)); } catch (e) { } }
function refreshAll() { renderTabs(); renderRibbon(); render(); refreshPanels(); }
function themeDialog() {
  const before = { ...THEME };
  const body = () => `<div><h5 style="margin:0 0 8px;font-size:10.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase">ธีมสำเร็จรูป</h5>
    <div class="presets">${THEMES.map(t => { const p = THEME.k === t.k; return `<button class="preset" data-th="${t.k}" aria-pressed="${p}"><span class="sw"><i style="background:${t.base}"></i><i style="background:${t.accent}"></i><i style="background:${t.paper}"></i></span><b>${t.n}</b></button>`; }).join("")}</div></div>
    <div><h5 style="margin:6px 0 8px;font-size:10.5px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase">ปรับเอง</h5>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="colorrow"><span>โหมด</span><span class="seg"><button data-mode="dark" aria-pressed="${THEME.mode !== "light"}">มืด</button><button data-mode="light" aria-pressed="${THEME.mode === "light"}">สว่าง</button></span><span></span></div>
      <label class="colorrow"><span>สีหลัก (accent)</span><input type="color" id="thAccent" value="${THEME.accent}"><code>${THEME.accent}</code></label>
      <label class="colorrow"><span>โทนพื้นหลัง</span><input type="color" id="thBase" value="${THEME.base}"><code>${THEME.base}</code></label>
      <label class="colorrow"><span>สีกระดาษโน้ต</span><input type="color" id="thPaper" value="${THEME.paper}"><code>${THEME.paper}</code></label>
    </div><p class="note">เปลี่ยนแล้วเห็นผลทันที และจำไว้ในเบราว์เซอร์นี้ · สีโน้ตบนกระดาษยังเป็นสีดำเพื่อให้อ่านง่าย</p></div>`;
  openModal("ปรับโทนสีแอป", `<div id="thBody" style="display:flex;flex-direction:column;gap:14px">${body()}</div>`,
    [{ label: "คืนค่าเริ่มต้น", fn: () => { applyTheme(THEMES[0]); saveTheme(); refreshAll(); toast("กลับไปใช้ธีม MuBiTo ส้ม"); } },
     { label: "ยกเลิก", fn: () => { applyTheme(before); saveTheme(); refreshAll(); } },
     { label: "เสร็จ", pri: true, fn: () => { saveTheme(); toast("บันทึกธีมแล้ว"); } }],
    ov => {
      const wire = () => {
        const tb = ov.querySelector("#thBody");
        tb.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { applyTheme(THEMES.find(t => t.k === b.dataset.th)); saveTheme(); refreshAll(); tb.innerHTML = body(); wire(); });
        tb.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
          const mode = b.dataset.mode; if (mode === (THEME.mode === "light" ? "light" : "dark")) return;
          const [h, s] = rgbToHsl(hexToRgb(THEME.base));
          const base = mode === "light" ? hslToHex(h, Math.min(s, 25), 91) : hslToHex(h, Math.min(s, 25), 7);
          const [ah, as, al] = rgbToHsl(hexToRgb(THEME.accent));
          const accent = mode === "light" ? hslToHex(ah, as, Math.min(al, 45)) : hslToHex(ah, as, Math.max(al, 62));
          applyTheme({ ...THEME, k: "custom", mode, base, accent }); saveTheme(); refreshAll(); tb.innerHTML = body(); wire();
        });
        const live = (id, key) => { const inp = tb.querySelector(id); inp.oninput = () => { applyTheme({ ...THEME, k: "custom", [key]: inp.value }); inp.nextElementSibling.textContent = inp.value; tb.querySelectorAll("[data-th]").forEach(x => x.setAttribute("aria-pressed", "false")); }; inp.onchange = () => { saveTheme(); refreshAll(); }; };
        live("#thAccent", "accent"); live("#thBase", "base"); live("#thPaper", "paper");
      };
      wire();
      ov.querySelector("[data-close]").onclick = () => { applyTheme(before); saveTheme(); refreshAll(); closeModal(); };
    });
}
function hslToHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); }

/* ---------- boot ---------- */
function bindStatic() {
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]"); if (t) { doAction(t.dataset.act); return; }
    const tab = e.target.closest("[data-tab]"); if (tab) { ui.tab = tab.dataset.tab; renderTabs(); renderRibbon(); return; }
    const rt = e.target.closest("[data-rtab]"); if (rt) { ui.rtab = rt.dataset.rtab; renderRTabs(); renderInspector(); return; }
    const pal = e.target.closest("[data-pal]"); if (pal) { const k = +pal.dataset.pal; palOpen[k] = palOpen[k] === false; renderPalettes(); return; }
  });
  $("palSearch").oninput = renderPalettes;
  $("cmdBtn").onclick = openPalette; $("cmdBtn2").onclick = openPalette;
  $("btnNew").onclick = newScoreDialog;
  $("btnOpen").onclick = () => $("fileIn").click();
  $("btnUndo").onclick = undo; $("btnRedo").onclick = redo;
  $("fileIn").onchange = () => { const f = $("fileIn").files[0]; if (f) importFile(f); $("fileIn").value = ""; };
  $("tpPlay").onclick = () => { play(); renderRibbon(); };
  $("tpStop").onclick = () => { stop(); renderRibbon(); updateClock(0, 0); };
  $("tpLoop").onclick = () => doAction("loop");
  $("tpMetro").onclick = () => doAction("metro");
  $("tempoIn").value = S.tempo; $("tempoIn").onchange = () => setTempo(+$("tempoIn").value);
  $("openLeft").onclick = () => $("left").classList.toggle("open");
  $("openRight").onclick = () => $("right").classList.toggle("open");
  document.addEventListener("pointerdown", e => {
    if (window.innerWidth > 860) return;
    for (const id of ["left", "right"]) { const el = $(id); if (el.classList.contains("open") && !el.contains(e.target) && !e.target.closest("#openLeft,#openRight")) el.classList.remove("open"); }
  });
  const canvas = $("canvas");
  canvas.addEventListener("wheel", e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); doAction(e.deltaY < 0 ? "zoomin" : "zoomout"); } }, { passive: false });
  canvas.addEventListener("dragover", e => { e.preventDefault(); });
  canvas.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) importFile(f); });
}
function boot() {
  loadTheme();
  let restored = false;
  try { const raw = localStorage.getItem("nota-score-v1"); if (raw) { const o = JSON.parse(raw); if (o && o.staves && o.meta) { S = o; syncIds(); restored = true; } } } catch (e) { }
  if (!restored) loadSample();
  if (window.innerWidth < 600) ui.zoom = .4; else if (window.innerWidth < 1200) ui.zoom = .65; else ui.zoom = .8;
  bindStatic();
  renderTabs(); renderRibbon(); renderPalettes();
  render(); refreshPanels();
  if (!restored) toast("เปิดเพลงตัวอย่าง — คลิกโน้ตเพื่อแก้ หรือกด Space เพื่อฟัง");
}
if (window.Vex) boot(); else window.addEventListener("load", () => { if (window.Vex) boot(); else document.getElementById("pages").innerHTML = '<div class="empty">โหลดเอนจินโน้ตไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วรีโหลด</div>'; });
