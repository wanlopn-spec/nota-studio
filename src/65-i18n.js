
/* ================= Menu language (UI translation) =================
   The app is written in Thai. This layer translates what is on screen into the chosen
   language, keeps the original Thai so switching back is exact, and never touches the score. */
const I18N_PAT = [
  // pattern rows: Thai with {0},{1}… then en, zh, ja, ko, es, fr, de, pt, ru, vi, id (missing → English)
  ["เพิ่ม {0} ห้องท้ายเพลง — ตอนนี้มี {1} ห้อง", "Added {0} measure(s) at the end — now {1} measures", "已在末尾添加 {0} 个小节 — 现在共 {1} 个", "末尾に {0} 小節追加 — 現在 {1} 小節", "끝에 {0}마디 추가 — 현재 {1}마디", "Se añadieron {0} compases al final — ahora hay {1}", "{0} mesure(s) ajoutée(s) à la fin — {1} au total", "{0} Takt(e) am Ende angefügt — jetzt {1} Takte", "{0} compasso(s) adicionado(s) no fim — agora {1}", "Добавлено тактов в конец: {0} — всего {1}", "Đã thêm {0} ô ở cuối — hiện có {1} ô", "Ditambahkan {0} birama di akhir — sekarang {1} birama"],
  ["แทรก {0} ห้องที่ตำแหน่งห้อง {1}", "Inserted {0} measure(s) at measure {1}", "已在第 {1} 小节插入 {0} 个小节", "小節 {1} に {0} 小節挿入", "{1}마디 위치에 {0}마디 삽입", "Se insertaron {0} compases en el compás {1}", "{0} mesure(s) insérée(s) à la mesure {1}", "{0} Takt(e) bei Takt {1} eingefügt", "{0} compasso(s) inserido(s) no compasso {1}", "Вставлено тактов: {0} в позиции {1}", "Đã chèn {0} ô tại ô {1}", "Disisipkan {0} birama di birama {1}"],
  ["ลบห้อง {0} แล้ว — Ctrl+Z เพื่อย้อน", "Deleted measure {0} — Ctrl+Z to undo", "已删除第 {0} 小节 — Ctrl+Z 撤销", "小節 {0} を削除 — Ctrl+Z で元に戻す", "{0}마디 삭제 — Ctrl+Z로 되돌리기", "Compás {0} eliminado — Ctrl+Z para deshacer", "Mesure {0} supprimée — Ctrl+Z pour annuler", "Takt {0} gelöscht — Strg+Z zum Rückgängigmachen", "Compasso {0} excluído — Ctrl+Z para desfazer", "Такт {0} удалён — Ctrl+Z для отмены", "Đã xóa ô {0} — Ctrl+Z để hoàn tác", "Birama {0} dihapus — Ctrl+Z untuk urungkan"],
  ["ทรานสโพส {0} ครึ่งเสียง", "Transposed {0} semitones", "已移调 {0} 个半音", "{0} 半音移調", "{0}반음 이조", "Transportado {0} semitonos", "Transposé de {0} demi-tons", "Um {0} Halbtöne transponiert", "Transposto {0} semitons", "Транспонировано на {0} полутонов", "Đã dịch giọng {0} nửa cung", "Ditransposisi {0} semiton"],
  ["คัดลอก {0} ห้อง × {1} บรรทัด", "Copied {0} measures × {1} staves", "已复制 {0} 小节 × {1} 行", "{0} 小節 × {1} 段をコピー", "{0}마디 × {1}보표 복사", "Copiados {0} compases × {1} pentagramas", "{0} mesures × {1} portées copiées", "{0} Takte × {1} Systeme kopiert", "Copiados {0} compassos × {1} pautas", "Скопировано: {0} тактов × {1} станов", "Đã sao chép {0} ô × {1} khuông", "Disalin {0} birama × {1} paranada"],
  ["คัดลอกโน้ต {0} ตัว", "Copied {0} notes", "已复制 {0} 个音符", "{0} 音符をコピー", "음표 {0}개 복사", "Copiadas {0} notas", "{0} notes copiées", "{0} Noten kopiert", "Copiadas {0} notas", "Скопировано нот: {0}", "Đã sao chép {0} nốt", "Disalin {0} not"],
  ["จัดหน้า {0} ห้องต่อบรรทัดทุกบรรทัด", "Layout: {0} measures on every line", "版面：每行 {0} 小节", "レイアウト: 各段 {0} 小節", "레이아웃: 모든 줄 {0}마디", "Diseño: {0} compases por línea", "Mise en page : {0} mesures par ligne", "Layout: {0} Takte pro Zeile", "Layout: {0} compassos por linha", "Макет: {0} тактов в строке", "Bố cục: {0} ô mỗi dòng", "Tata letak: {0} birama per baris"],
  ["{0} ห้อง · {1} บรรทัด · {2} หน้า · {3} โน้ต", "{0} measures · {1} staves · {2} pages · {3} notes", "{0} 小节 · {1} 行 · {2} 页 · {3} 音符", "{0} 小節 · {1} 段 · {2} ページ · {3} 音符", "{0}마디 · {1}보표 · {2}페이지 · 음표 {3}", "{0} compases · {1} pentagramas · {2} páginas · {3} notas", "{0} mesures · {1} portées · {2} pages · {3} notes", "{0} Takte · {1} Systeme · {2} Seiten · {3} Noten", "{0} compassos · {1} pautas · {2} páginas · {3} notas", "{0} тактов · {1} станов · {2} стр. · {3} нот", "{0} ô · {1} khuông · {2} trang · {3} nốt", "{0} birama · {1} paranada · {2} halaman · {3} not"],
  ["ห้อง 1–{0}", "Measures 1–{0}", "小节 1–{0}", "小節 1–{0}", "마디 1–{0}", "Compases 1–{0}", "Mesures 1–{0}", "Takte 1–{0}", "Compassos 1–{0}", "Такты 1–{0}", "Ô 1–{0}", "Birama 1–{0}"],
  ["{0} หน้า", "{0} pages", "{0} 页", "{0} ページ", "{0}페이지", "{0} páginas", "{0} pages", "{0} Seiten", "{0} páginas", "Страниц: {0}", "{0} trang", "{0} halaman"],
  ["{0} ห้อง", "{0} measures", "{0} 小节", "{0} 小節", "{0}마디", "{0} compases", "{0} mesures", "{0} Takte", "{0} compassos", "Тактов: {0}", "{0} ô", "{0} birama"],
  ["{0} บรรทัด", "{0} staves", "{0} 行谱表", "{0} 段", "{0}보표", "{0} pentagramas", "{0} portées", "{0} Systeme", "{0} pautas", "Станов: {0}", "{0} khuông", "{0} paranada"],
  ["ห้องที่ {0}", "Measure {0}", "第 {0} 小节", "小節 {0}", "{0}마디", "Compás {0}", "Mesure {0}", "Takt {0}", "Compasso {0}", "Такт {0}", "Ô nhịp {0}", "Birama {0}"],
  ["ห้อง {0}", "Measure {0}", "第 {0} 小节", "小節 {0}", "{0}마디", "Compás {0}", "Mesure {0}", "Takt {0}", "Compasso {0}", "Такт {0}", "Ô {0}", "Birama {0}"],
  ["เสียง {0}", "Voice {0}", "声部 {0}", "声部 {0}", "성부 {0}", "Voz {0}", "Voix {0}", "Stimme {0}", "Voz {0}", "Голос {0}", "Bè {0}", "Suara {0}"],
  ["เขบ็ต {0} ชั้น", "{0}-flag note", "{0} 条符尾音符", "旗 {0} 本の音符", "꼬리 {0}개 음표", "nota de {0} corchetes", "note à {0} crochets", "Note mit {0} Fähnchen", "nota de {0} colchetes", "нота с {0} флажками", "nốt {0} móc", "not {0} bendera"],
  ["{0} ห้องต่อบรรทัด", "{0} measures per line", "每行 {0} 小节", "1段 {0} 小節", "줄당 {0}마디", "{0} compases por línea", "{0} mesures par ligne", "{0} Takte pro Zeile", "{0} compassos por linha", "{0} тактов в строке", "{0} ô mỗi dòng", "{0} birama per baris"],
  ["สร้าง “{0}” แล้ว — กด N เพื่อเริ่มใส่โน้ต", "Created “{0}” — press N to start entering notes", "已创建“{0}” — 按 N 开始输入音符", "「{0}」を作成 — N で音符入力開始", "“{0}” 생성됨 — N을 눌러 음표 입력", "Se creó “{0}” — pulsa N para escribir notas", "« {0} » créée — N pour saisir des notes", "„{0}“ erstellt — N für Noteneingabe", "“{0}” criada — pressione N para inserir notas", "Создано «{0}» — нажмите N для ввода нот", "Đã tạo “{0}” — nhấn N để nhập nốt", "“{0}” dibuat — tekan N untuk input not"],
  ["เปิด “{0}” แล้ว", "Opened “{0}”", "已打开“{0}”", "「{0}」を開きました", "“{0}” 열림", "Se abrió “{0}”", "« {0} » ouvert", "„{0}“ geöffnet", "“{0}” aberto", "Открыто «{0}»", "Đã mở “{0}”", "“{0}” dibuka"],
  ["ไม่พบ “{0}”", "No results for “{0}”", "未找到“{0}”", "「{0}」は見つかりません", "“{0}” 없음", "Sin resultados para “{0}”", "Aucun résultat pour « {0} »", "Keine Treffer für „{0}“", "Nada encontrado para “{0}”", "Ничего не найдено: «{0}»", "Không tìm thấy “{0}”", "Tidak ditemukan “{0}”"],
  ["บันทึกลงเครื่องแล้ว: {0}", "Saved to computer: {0}", "已保存到电脑：{0}", "PCに保存: {0}", "컴퓨터에 저장됨: {0}", "Guardado en el equipo: {0}", "Enregistré : {0}", "Gespeichert: {0}", "Salvo no computador: {0}", "Сохранено: {0}", "Đã lưu vào máy: {0}", "Tersimpan: {0}"],
  ["เปิดไฟล์ไม่ได้: {0}", "Could not open the file: {0}", "无法打开文件：{0}", "ファイルを開けません: {0}", "파일을 열 수 없음: {0}", "No se pudo abrir el archivo: {0}", "Impossible d’ouvrir le fichier : {0}", "Datei konnte nicht geöffnet werden: {0}", "Não foi possível abrir: {0}", "Не удалось открыть файл: {0}", "Không mở được tệp: {0}", "Gagal membuka file: {0}"],
  ["ทำไม่สำเร็จ: {0}", "Could not do that: {0}", "操作失败：{0}", "実行できません: {0}", "실행 실패: {0}", "No se pudo: {0}", "Échec : {0}", "Fehlgeschlagen: {0}", "Não foi possível: {0}", "Не удалось: {0}", "Không thực hiện được: {0}", "Gagal: {0}"],
  ["เชื่อมต่อ MIDI แล้ว พบ {0} พอร์ต", "MIDI connected — {0} port(s) found", "MIDI 已连接 — 找到 {0} 个端口", "MIDI 接続 — {0} ポート検出", "MIDI 연결됨 — 포트 {0}개", "MIDI conectado — {0} puertos", "MIDI connecté — {0} port(s)", "MIDI verbunden — {0} Port(s)", "MIDI conectado — {0} porta(s)", "MIDI подключён — портов: {0}", "Đã kết nối MIDI — {0} cổng", "MIDI terhubung — {0} port"],
  ["ระดับเสียง {0}", "Volume {0}", "音量 {0}", "音量 {0}", "볼륨 {0}", "Volumen {0}", "Volume {0}", "Lautstärke {0}", "Volume {0}", "Громкость {0}", "Âm lượng {0}", "Volume {0}"],
  ["แพนซ้ายขวา {0}", "Pan {0}", "声像 {0}", "パン {0}", "팬 {0}", "Panorama {0}", "Pan {0}", "Panorama {0}", "Pan {0}", "Панорама {0}", "Cân bằng {0}", "Pan {0}"],
  ["เอาต์พุต {0}", "Output {0}", "输出 {0}", "出力 {0}", "출력 {0}", "Salida {0}", "Sortie {0}", "Ausgang {0}", "Saída {0}", "Выход {0}", "Đầu ra {0}", "Keluaran {0}"],
  ["เพิ่มเอฟเฟกต์ให้ {0}", "Add effect to {0}", "为 {0} 添加效果", "{0} にエフェクト追加", "{0}에 효과 추가", "Añadir efecto a {0}", "Ajouter un effet à {0}", "Effekt für {0} hinzufügen", "Adicionar efeito a {0}", "Добавить эффект: {0}", "Thêm hiệu ứng cho {0}", "Tambah efek ke {0}"],
  ["ชนิดเอฟเฟกต์ช่อง {0}", "Effect type, slot {0}", "效果类型 槽 {0}", "エフェクト種類 スロット {0}", "효과 종류 슬롯 {0}", "Tipo de efecto, ranura {0}", "Type d’effet, emplacement {0}", "Effekttyp, Slot {0}", "Tipo de efeito, slot {0}", "Тип эффекта, слот {0}", "Loại hiệu ứng, ô {0}", "Jenis efek, slot {0}"],
  ["แปลงหน้า {0} เป็นภาพ…", "Rendering page {0}…", "正在转换第 {0} 页…", "ページ {0} を画像化中…", "{0}페이지 변환 중…", "Convirtiendo página {0}…", "Conversion de la page {0}…", "Seite {0} wird umgewandelt…", "Convertendo página {0}…", "Обработка страницы {0}…", "Đang chuyển trang {0}…", "Mengonversi halaman {0}…"],
  ["Claude กำลังอ่านส่วนที่ {0} จาก {1}…", "Claude is reading part {0} of {1}…", "Claude 正在识读第 {0}/{1} 部分…", "Claude が {1} 中 {0} を読み取り中…", "Claude가 {1}개 중 {0}번째 판독 중…", "Claude está leyendo la parte {0} de {1}…", "Claude lit la partie {0} sur {1}…", "Claude liest Teil {0} von {1}…", "Claude está lendo a parte {0} de {1}…", "Claude читает часть {0} из {1}…", "Claude đang đọc phần {0}/{1}…", "Claude membaca bagian {0} dari {1}…"],
  ["อ่านเฉพาะ {0} หน้าแรกจาก {1} หน้า", "Reading only the first {0} of {1} pages"],
  ["ลบห้อง {0}–{1} แล้ว — Ctrl+Z เพื่อย้อน", "Deleted measures {0}–{1} — Ctrl+Z to undo"],
  ["{0} ครึ่งเสียง", "{0} semitones"],
  ["อัตโนมัติ (ตอนนี้: {0})", "Auto (now: {0})"]
];
const I18N = { lang: "th", map: null, pats: [], idx: 1, obs: null, busy: false, txt: new WeakMap() };
const I18N_ATTRS = ["title", "aria-label", "placeholder"];
const I18N_SKIP = "#pages,script,style,textarea,[contenteditable],[data-noi18n],#docTitle,.sr-only,code,kbd";

function i18nNorm(s) { return String(s).replace(/&amp;/g, "&").replace(/&nbsp;| /g, " ").replace(/\s+/g, " ").trim(); }
function i18nBuild() {
  const li = I18N_LANGS.findIndex(l => l[0] === I18N.lang); I18N.idx = li;
  const pick = r => r[li] || r[1];
  I18N.map = new Map();
  for (const r of I18N_ROWS) { const k = i18nNorm(r[0]); if (!I18N.map.has(k)) I18N.map.set(k, pick(r)); }
  I18N.pats = I18N_PAT.map(r => {
    const parts = r[0].split(/\{\d\}/), esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const order = (r[0].match(/\{(\d)\}/g) || []).map(x => +x[1]);
    return { re: new RegExp("^" + parts.map(esc).join("(.+?)") + "$"), order, out: pick(r) };
  });
}
const I18N_THAI = /[฀-๿]/;
function i18nStr(s, depth = 0) {
  if (!s || !I18N_THAI.test(s) || I18N.lang === "th") return s;
  const n = i18nNorm(s); if (!n) return s;
  let r = I18N.map.get(n); if (r != null) return r;
  for (const p of I18N.pats) {
    const mm = p.re.exec(n);
    if (mm) { let out = p.out; p.order.forEach((k, j) => { out = out.split("{" + k + "}").join(i18nStr(mm[j + 1], depth + 1)); }); return out; }
  }
  // strip leading/trailing symbols, emoji, digits and punctuation
  const m = /^([^\p{L}]*)(.*?)([^\p{L}]*)$/u.exec(n);
  if (m && (m[1] || m[3]) && m[2]) {
    const lead = m[1], core = n.slice(lead.length).trim();
    if (lead && (r = I18N.map.get(core)) != null) return lead + r;
    if ((r = I18N.map.get(m[2])) != null) return lead + r + m[3];
  }
  if (depth < 4) {
    const par = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(n);
    if (par && par[1]) return i18nStr(par[1], depth + 1) + " (" + i18nStr(par[2], depth + 1) + ")";
    for (const sep of [" · ", " — ", " / ", ": ", ", "]) {
      if (n.includes(sep)) { const bits = n.split(sep), tr = bits.map(b => i18nStr(b, depth + 1)); if (tr.some((t, i) => t !== bits[i])) return tr.join(sep); }
    }
  }
  // bilingual labels like "Lyrics เนื้อร้อง": keep the English half
  const latin = n.replace(/[฀-๿]+/g, " ").replace(/\s+/g, " ").replace(/\s+([,.)])/g, "$1").trim();
  if (/[A-Za-z]{3}/.test(latin)) return latin.replace(/^[\s/·—-]+|[\s/·—-]+$/g, "");
  if (typeof A11Y_RULES !== "undefined" && (I18N.idx === 1 || depth === 0)) for (const [re, en] of A11Y_RULES) if (re.test(n)) return n.replace(re, en);
  return s;
}
function i18nSkip(el) { return !el || (el.closest && el.closest(I18N_SKIP)); }
function i18nText(node) {
  const cur = node.nodeValue, rec = I18N.txt.get(node);
  let orig = cur;
  if (rec && cur === rec.t) orig = rec.o;
  if (I18N.lang === "th") { if (rec) { I18N.txt.delete(node); if (cur !== orig) node.nodeValue = orig; } return; }
  if (!I18N_THAI.test(orig)) { if (rec) I18N.txt.delete(node); return; }
  const lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
  const t = lead + i18nStr(orig) .trim() + trail;
  I18N.txt.set(node, { o: orig, t });
  if (cur !== t) node.nodeValue = t;
}
function i18nAttrs(el) {
  for (const a of I18N_ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a), k = "data-i18o-" + a, kt = "data-i18t-" + a;
    let orig = cur; if (el.hasAttribute(k) && el.getAttribute(kt) === cur) orig = el.getAttribute(k);
    if (I18N.lang === "th" || !I18N_THAI.test(orig)) { if (el.hasAttribute(k)) { el.removeAttribute(k); el.removeAttribute(kt); if (cur !== orig) el.setAttribute(a, orig); } continue; }
    const t = i18nStr(orig); el.setAttribute(k, orig); el.setAttribute(kt, t); if (cur !== t) el.setAttribute(a, t);
  }
}
function i18nWalk(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!i18nSkip(root.parentElement)) i18nText(root); return; }
  if (root.nodeType !== 1 || i18nSkip(root)) return;
  i18nAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.nodeType === 1 && n.matches(I18N_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) i18nText(n); else i18nAttrs(n); }
}
function i18nApply(fn) {
  I18N.busy = true;
  try { fn(); } finally { if (I18N.obs) I18N.obs.takeRecords(); I18N.busy = false; }
}
function i18nObserve() {
  if (I18N.obs || typeof MutationObserver === "undefined") return;
  I18N.obs = new MutationObserver(recs => {
    if (I18N.busy || I18N.lang === "th") return;
    i18nApply(() => {
      for (const r of recs) {
        if (r.type === "childList") r.addedNodes.forEach(i18nWalk);
        else if (r.type === "characterData") { if (!i18nSkip(r.target.parentElement)) i18nText(r.target); }
        else if (r.type === "attributes" && !i18nSkip(r.target)) i18nAttrs(r.target);
      }
    });
  });
  I18N.obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}
function i18nRestore(root) { const keep = I18N.lang; I18N.lang = "th"; i18nWalk(root); I18N.lang = keep; }
function i18nSetLang(code, quiet) {
  if (!I18N_LANGS.some(l => l[0] === code)) code = "th";
  const prev = I18N.lang; I18N.lang = code;
  try { localStorage.setItem("nota-ui-lang", code); } catch (e) {}
  document.documentElement.lang = code;
  i18nBuild();
  i18nApply(() => i18nWalk(document.body));
  const sel = document.getElementById("uiLang"); if (sel && sel.value !== code) sel.value = code;
  if (!quiet && prev !== code) {
    const name = (I18N_LANGS.find(l => l[0] === code) || [])[1];
    if (typeof toast === "function") toast("ภาษาเมนู: " + name);
  }
}
function i18nPicker() {
  if (document.getElementById("uiLang")) return;
  const wrap = document.createElement("label"); wrap.className = "uilang"; wrap.title = "ภาษาเมนู";
  wrap.innerHTML = '<i aria-hidden="true">🌐</i><select id="uiLang" aria-label="ภาษาเมนู" data-noi18n>' +
    I18N_LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join("") + "</select>";
  const anchor = document.getElementById("btnTheme"), bar = document.querySelector(".topacts");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor); else if (bar) bar.appendChild(wrap); else return;
  const sel = wrap.querySelector("select"); sel.value = I18N.lang;
  sel.addEventListener("change", () => i18nSetLang(sel.value));
}
function i18nWire() {
  const _do = doAction; doAction = function (act) {
    if (act && /^uilang:/.test(act)) return i18nSetLang(act.slice(7));
    if (act === "uilang") { const s = document.getElementById("uiLang"); if (s) { s.focus(); if (s.showPicker) try { s.showPicker(); } catch (e) {} } return; }
    return _do.apply(this, arguments);
  };
  if (typeof COMMANDS !== "undefined" && Array.isArray(COMMANDS)) {
    COMMANDS.push(["Menu language ภาษาเมนู 🌐", "", "uilang"]);
    for (const [c, n] of I18N_LANGS) COMMANDS.push([`Menu language: ${n}`, "", "uilang:" + c]);
  }
  // spoken guide: describe controls from their original Thai labels so both Thai and English speech stay correct
  if (typeof a11yDescribe === "function") {
    const _desc = a11yDescribe;
    a11yDescribe = function (el, lg) {
      if (I18N.lang === "th" || !el || !el.closest) return _desc.apply(this, arguments);
      const root = (el.closest(".field,.kv,label,.colorrow,.tempo,.fxp") || el).parentElement || el;
      let out;
      i18nApply(() => { i18nRestore(root); try { out = _desc.call(this, el, lg); } finally { i18nWalk(root); } });
      return out;
    };
  }
}
function i18nBoot() {
  let code = "th";
  try { code = localStorage.getItem("nota-ui-lang") || "th"; } catch (e) {}
  I18N.lang = code; i18nBuild();
  i18nPicker(); i18nWire(); i18nObserve();
  if (code !== "th") i18nSetLang(code, true);
}
i18nBoot();
