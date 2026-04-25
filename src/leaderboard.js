import {showInfo} from './util';

function qs (id) {
    return document.getElementById(id);
}

function escapeHtml (s) {
    return (s || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderList (list) {
    const el = qs('leaderboardList');
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = '<div class="lb-empty">暂无记录</div>';
        return;
    }
    el.innerHTML = list.map((it, idx) => {
        return '<div class="lb-row">' +
            '<span class="lb-rank">' + (idx + 1) + '</span>' +
            '<span class="lb-name">' + escapeHtml(it.name) + '</span>' +
            '<span class="lb-score">' + escapeHtml(it.score) + '</span>' +
        '</div>';
    }).join('');
}

async function fetchLeaderboard () {
    const res = await fetch('/api/leaderboard', {method: 'GET'});
    const json = await res.json();
    if (json && json.ok) return json.leaderboard || [];
    return [];
}

async function openLeaderboard (score, mode) {
    const mask = qs('leaderboardMask');
    const scoreEl = qs('leaderboardScore');
    const input = qs('leaderboardName');
    const submitSection = qs('leaderboardSubmitSection');
    const titleEl = qs('leaderboardTitle');
    if (!mask) return;

    const m = mode || 'view'; // view | submit
    if (titleEl) titleEl.textContent = (m === 'submit') ? '游戏结束' : '排行榜';

    if (submitSection) {
        submitSection.style.display = (m === 'submit') ? 'block' : 'none';
    }

    if (m === 'submit') {
        if (!scoreEl || !input) return;
        scoreEl.textContent = String(score || 0);
        const savedName = localStorage.getItem('_typeName');
        input.value = savedName ? savedName : '';
    }
    mask.style.display = 'block';

    try {
        const list = await fetchLeaderboard();
        renderList(list);
    } catch (e) {}

    if (m === 'submit' && input) {
        setTimeout(function () {
            input.focus();
            input.select();
        }, 0);
    }
}

async function postScore (name, score) {
    const res = await fetch('/api/score', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, score}),
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error((json && json.message) ? json.message : 'submit failed');
    }
    return json;
}

export function initLeaderboardUI () {
    const closeBtn = qs('leaderboardClose');
    const skipBtn = qs('leaderboardSkip');
    const submitBtn = qs('leaderboardSubmit');
    const mask = qs('leaderboardMask');
    const input = qs('leaderboardName');
    const openBtn = qs('leaderboardBtn');

    function hide () {
        if (mask) mask.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (skipBtn) skipBtn.addEventListener('click', hide);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function () {
            const name = (input ? input.value : '').trim();
            const score = parseInt((qs('leaderboardScore') || {}).textContent || '0');
            if (!name) {
                showInfo('请输入名字', true, 1200);
                return;
            }
            submitBtn.disabled = true;
            try {
                localStorage.setItem('_typeName', name);
                const json = await postScore(name, score);
                renderList(json.leaderboard || []);
                showInfo('提交成功', true, 1000);
                hide();
            } catch (e) {
                showInfo('提交失败', true, 1500);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e && e.key === 'Enter' && submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', function () {
            openLeaderboard(0, 'view');
        });
    }

    fetchLeaderboard().then(renderList).catch(function () {});
}

export async function showGameOverLeaderboard (score) {
    openLeaderboard(score, 'submit');
}

