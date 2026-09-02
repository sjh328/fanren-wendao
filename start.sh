#!/usr/bin/env bash
# 凡人问道 · 一键启动（Git Bash / macOS / Linux）
# 用法：./start.sh 或 bash start.sh
cd "$(dirname "$0")" || exit 1

PORT=8341
URL="http://localhost:$PORT/index.html"

echo ""
echo " ============================================"
echo "   凡人问道 · 一键启动"
echo " ============================================"
echo ""

# ---- 检查 Node.js ----
if ! command -v node >/dev/null 2>&1; then
    echo " [错误] 未检测到 Node.js，请先安装：https://nodejs.org/"
    exit 1
fi

# ---- 若端口已有服务在跑，直接打开浏览器 ----
if command -v curl >/dev/null 2>&1 && curl -s -o /dev/null --max-time 1 "http://localhost:$PORT"; then
    echo " [提示] 服务器已在运行，直接打开游戏页面：$URL"
    if command -v cmd >/dev/null 2>&1; then cmd //c start "" "$URL";      # Git Bash on Windows
    elif command -v open >/dev/null 2>&1; then open "$URL";               # macOS
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL";       # Linux
    else echo " 请手动打开：$URL"; fi
    exit 0
fi

echo " [启动] 服务器运行中：$URL"
echo " [提示] 浏览器将自动打开；停止游戏请按 Ctrl+C。"
echo ""

# ---- 延迟 1 秒后用默认浏览器打开 ----
( sleep 1
  if command -v cmd >/dev/null 2>&1; then cmd //c start "" "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  else echo " 请手动打开：$URL"; fi ) &

node server.mjs
