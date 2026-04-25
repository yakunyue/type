const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({limit: '32kb'}));

const DATA_FILE = path.resolve(__dirname, 'leaderboard.json');

function readData () {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const json = JSON.parse(raw || '{}');
        if (json && typeof json === 'object') return json;
    } catch (e) {}
    return {scores: {}};
}

function writeData (data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeName (name) {
    name = (name || '').toString().trim();
    if (name.length > 24) name = name.slice(0, 24);
    return name;
}

function toIntScore (score) {
    const n = parseInt(score);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
}

function toLeaderboard (data, limit = 20) {
    const scores = (data && data.scores) ? data.scores : {};
    return Object.keys(scores)
        .map((name) => ({name, score: scores[name]}))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

app.get('/api/leaderboard', (req, res) => {
    const data = readData();
    res.json({
        ok: true,
        leaderboard: toLeaderboard(data),
    });
});

app.post('/api/score', (req, res) => {
    const name = normalizeName(req.body && req.body.name);
    const score = toIntScore(req.body && req.body.score);

    if (!name) {
        res.status(400).json({ok: false, message: 'name required'});
        return;
    }

    const data = readData();
    if (!data.scores) data.scores = {};

    const prev = toIntScore(data.scores[name]);
    if (score > prev) {
        data.scores[name] = score;
        data.updatedAt = new Date().toISOString();
        writeData(data);
    }

    res.json({
        ok: true,
        saved: Math.max(prev, score),
        leaderboard: toLeaderboard(readData()),
    });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log('[leaderboard] listening on http://localhost:' + PORT);
});

