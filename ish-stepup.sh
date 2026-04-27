#!/bin/sh
echo "Installing packages..."
apk add nodejs npm
echo "Installing localtunnel..."
npm install -g localtunnel
echo "Downloading proxy..."
curl -o /root/yt-proxy.js https://raw.githubusercontent.com/joegame1125/ytune-player/main/yt-proxy.js
echo "Starting tunnel and proxy..."
npx localtunnel --port 3000 &
sleep 3
node /root/yt-proxy.js
