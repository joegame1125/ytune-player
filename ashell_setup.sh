#!/bin/sh
echo "正在下载转发器..."
curl -o ~/Documents/yt_forwarder.py https://raw.githubusercontent.com/joegame1125/ytune-player/main/yt_forwarder.py
echo "正在启动转发器..."
python3 ~/Documents/yt_forwarder.py &
sleep 2
echo "正在建立 Serveo 隧道..."
ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 serveo.net
