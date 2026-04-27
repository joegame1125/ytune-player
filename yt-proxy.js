const http = require('http');
const https = require('https');

const PORT = 3000;

// 隨機 User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
];

function randomUA() { return userAgents[Math.floor(Math.random() * userAgents.length)]; }

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/audio')) {
        const videoId = new URL(req.url, 'http://localhost').searchParams.get('id');
        if (!videoId) {
            res.writeHead(400);
            return res.end('Missing video ID');
        }

        // 使用 Piped API 拿貨（因為這是從你手機發出的請求，不會被封）
        const pipedUrl = `https://pipedapi.kavin.rocks/latest_version?id=${videoId}&itag=140`;

        https.get(pipedUrl, { headers: { 'User-Agent': randomUA() } }, (pipedRes) => {
            let data = '';
            pipedRes.on('data', chunk => data += chunk);
            pipedRes.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.url) {
                        // 代理音訊請求
                        https.get(json.url, { headers: { 'User-Agent': randomUA() } }, (audioRes) => {
                            res.writeHead(200, { 'Content-Type': 'audio/mp4' });
                            audioRes.pipe(res);
                        });
                    } else {
                        res.writeHead(500);
                        res.end('No audio URL found');
                    }
                } catch (e) {
                    res.writeHead(500);
                    res.end('Failed to parse response');
                }
            });
        }).on('error', () => {
            res.writeHead(500);
            res.end('Failed to fetch audio');
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
