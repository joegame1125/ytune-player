import socket
import threading
import urllib.request
import json
import random

# 极简HTTP服务器 + YouTube音频转发器
def handle_client(client_socket):
    request = client_socket.recv(1024).decode()
    
    # 检查是否是音频请求
    if '/audio/' in request:
        try:
            # 从请求中提取视频ID
            video_id = request.split('/audio/')[1].split(' ')[0].split('?')[0]
            
            # 使用 Piped API 获取音频链接
            instances = [
                'https://pipedapi.kavin.rocks',
                'https://pipedapi.adminforge.de', 
                'https://pipedapi.syncpundit.io'
            ]
            
            for instance in instances:
                try:
                    # 获取音频流URL
                    url = f"{instance}/streams/{video_id}"
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    response = urllib.request.urlopen(req, timeout=10)
                    data = json.loads(response.read())
                    
                    # 找到140 itag的音频流
                    for stream in data.get('audioStreams', []):
                        if stream.get('itag') == 140:
                            audio_url = stream['url']
                            
                            # 代理音频请求
                            audio_req = urllib.request.Request(audio_url, headers={'User-Agent': 'Mozilla/5.0'})
                            audio_res = urllib.request.urlopen(audio_req, timeout=30)
                            
                            # 发送HTTP响应
                            client_socket.send(b'HTTP/1.1 200 OK\r\nContent-Type: audio/mp4\r\n\r\n')
                            
                            # 流式传输音频
                            while True:
                                chunk = audio_res.read(8192)
                                if not chunk:
                                    break
                                client_socket.send(chunk)
                            
                            client_socket.close()
                            return
                except:
                    continue
            
            # 如果都失败了
            client_socket.send(b'HTTP/1.1 500 Internal Server Error\r\n\r\nFailed to fetch audio')
        except:
            client_socket.send(b'HTTP/1.1 500 Internal Server Error\r\n\r\nError processing request')
    else:
        # 健康检查
        client_socket.send(b'HTTP/1.1 200 OK\r\n\r\nYT Forwarder Running')
    
    client_socket.close()

# 启动服务器
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(('0.0.0.0', 8080))
server.listen(5)
print("YT Forwarder running on port 8080")

while True:
    client, addr = server.accept()
    thread = threading.Thread(target=handle_client, args=(client,))
    thread.start()
