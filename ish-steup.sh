#!/bin/sh
echo "正在安裝必要套件..."
apk add nodejs npm
echo "正在安裝 localtunnel..."
npm install -g localtunnel
echo "正在下載中轉站後端..."
curl -o /root/yt-proxy.js https://raw.githubusercontent.com/joegame1125/ytune-player/main/yt-proxy.js
echo "啟動中轉站..."
npx localtunnel --port 3000 &
node /root/yt-proxy.js
