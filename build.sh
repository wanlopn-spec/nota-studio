#!/usr/bin/env bash
# รวมไฟล์ใน src/ เป็น index.html ไฟล์เดียว
set -euo pipefail
cd "$(dirname "$0")"
{
  echo '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="NOTA STUDIO (GW) — โปรแกรมเขียนโน้ตดนตรีสากลบนเว็บ"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  cat src/00-head.html
  echo '<script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.3/build/cjs/vexflow.js"></script>'
  echo '<script>'
  cat src/10-engine.js src/20-render.js src/30-edit.js src/40-io.js src/50-ui.js
  echo '</script>'
  echo '</body></html>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
