const express = require('express');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const CACHE_DIR = './cache';
const DATA_DIR = './data';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERNAME = 'admin';
const PASSWORD = 'admin123';
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;
const sessions = {};

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

function randomUA() { return userAgents[Math.floor(Math.random() * userAgents.length)]; }

function loadPlaylists(username) {
    const file = path.join(DATA_DIR, `${username}_playlists.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file));
    return { "我的最愛": [] };
}
function savePlaylists(username, data) {
    fs.writeFileSync(path.join(DATA_DIR, `${username}_playlists.json`), JSON.stringify(data, null, 2));
}

function authMiddleware(req, res, next) {
    const token = req.headers.authorization;
    if (!token || !sessions[token] || sessions[token].expires < Date.now()) {
        return res.status(401).json({ error: '請登入' });
    }
    req.username = sessions[token].username;
    next();
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME && password === PASSWORD) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions[token] = { username, expires: Date.now() + SESSION_TIMEOUT };
        return res.json({ token, username });
    }
    res.status(401).json({ error: '帳號或密碼錯誤' });
});

app.post('/api/logout', (req, res) => {
    const token = req.headers.authorization;
    if (token) delete sessions[token];
    res.json({ success: true });
});

app.use('/api', authMiddleware);

app.get('/api/playlists', (req, res) => {
    res.json(loadPlaylists(req.username));
});

app.post('/api/playlists', (req, res) => {
    const data = req.body;
    savePlaylists(req.username, data);
    res.json({ success: true });
});

app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: '請輸入關鍵字' });
    try {
        const filters = await ytsr.getFilters(q);
        const f = filters.get('Type').get('Video');
        const r = await ytsr(f.url, { limit: 20 });
        const songs = r.items.map(i => ({ id: i.id, title: i.title, artist: i.author?.name || '' }));
        res.json(songs);
    } catch (e) { res.status(500).json({ error: '搜尋失敗' }); }
});

app.get('/api/audio/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: '缺少 ID' });
    try {
        const cachePath = path.join(CACHE_DIR, `${id}.m4a`);
        res.setHeader('Content-Type', 'audio/mp4');
        if (fs.existsSync(cachePath)) return fs.createReadStream(cachePath).pipe(res);
        const stream = ytdl(id, { quality: 'highestaudio', requestOptions: { headers: { 'User-Agent': randomUA() } } });
        const file = fs.createWriteStream(cachePath);
        stream.pipe(file);
        stream.pipe(res);
    } catch (e) { res.status(500).json({ error: '播放失敗' }); }
});

app.delete('/api/cache', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '請提供 ID 陣列' });
    const deleted = [], notFound = [];
    ids.forEach(id => {
        const p = path.join(CACHE_DIR, `${id}.m4a`);
        if (fs.existsSync(p)) { fs.unlinkSync(p); deleted.push(id); }
        else notFound.push(id);
    });
    res.json({ deleted, notFound });
});

app.get('/api/cache/stats', (req, res) => {
    const files = fs.readdirSync(CACHE_DIR);
    let size = 0;
    files.forEach(f => { size += fs.statSync(path.join(CACHE_DIR, f)).size; });
    res.json({ totalFiles: files.length, totalSizeMB: (size / 1024 / 1024).toFixed(2) });
});

app.delete('/api/cache/all', (req, res) => {
    const files = fs.readdirSync(CACHE_DIR);
    files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
    res.json({ success: true, deleted: files.length });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
