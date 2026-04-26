
import J from 'jetterjs';
import {Const, Size, Game} from './store';
import {Bullet, setBulletSpeed} from './object/bullet';
import {Player} from './object/player';
import {Enemy, setEnemySpeed, addEnemySpeed, initEnemySpeed} from './object/enemy';
import {initResources} from './resource';
import {hideInfo, showInfo} from './util';
import {Animation} from './object/animation';
import {initLeaderboardUI} from './leaderboard';

import cnchar from 'cnchar';
import poly from 'cnchar-poly';
cnchar.use(poly);

window.J = J;

function initDifficulty () {
    const saved = localStorage.getItem('_typeDifficulty');
    const d = saved ? parseInt(saved) : 3;
    Game.difficulty = (d === 0 || d === 1 || d === 2 || d === 3) ? d : 3;
    const select = document.getElementById('difficultySelect');
    if (select) {
        select.value = String(Game.difficulty);
        select.addEventListener('change', function () {
            const v = parseInt(select.value);
            Game.difficulty = (v === 0 || v === 1 || v === 2 || v === 3) ? v : 3;
            localStorage.setItem('_typeDifficulty', String(Game.difficulty));
            showInfo('难度已切换', true, 800);
            restart();
        });
    }
}

J.ready(function () {
    if (J.isMobile()) {
        setBulletSpeed(15);
        setEnemySpeed(0.3, 1.5);
        Game.addEnemyTime = 10000;
        Game.baseAddEnemyTime = 10000;
        Game.minAddEnemyTime = 2500;
    } else {
        Game.baseAddEnemyTime = 4000;
        Game.minAddEnemyTime = 800;
    }
    initDifficulty();
    initCanvas();
    initObjects();
    start();
    geneEnemy();
});

function initCanvas () {
    Game.canvas = J.id('gameCanvas');
    setPos();
    Game.ctx = Game.canvas.getContext('2d');
    Game.ctx.fillStyle = '#fff';
    Game.ctx.textBaseline = 'middle';
    Game.ctx.textAlign = 'center';
}
function setPos () {
    Size.gameWidth = J.id('gameWrapper').wid();
    Size.gameHeight = J.height();
    if (J.isMobile()) {
        J.id('keyboard').css('display', 'block');
        Size.gameHeight -= J.id('keyboard').hei();
    } else {
        J.id('keyboard').css('display', 'none');
    }
    Game.canvas.width = Size.gameWidth;
    Game.canvas.height = Size.gameHeight;
}
function initObjects () {
    initResources();
    initLeaderboardUI();
    Game.player = new Player();
    Game.enemys = new Array();
    Game.bullets = new Array();
    window._clear = function () {
        Game.player.clear();
    };
    J.id('protect').clk('_clear()');
    window._pause = function () {
        pause();
    };
    J.id('pause').clk('_pause()');
    window._restart = function () {
        restart();
    };
    J.id('restart').clk('_restart()');
    window._sendBullet = function (a) {
        sendBullet(a);
    };
    J.cls('key-item').clk('_sendBullet(this.txt())');
    J.id('help').clk('J.id("helpPage").fadeIn()');
    J.id('helpPage').clk('this.fadeOut()');
    Game.bgMoveAni = new Animation({
        ctx: Game.ctx,
        host: J.id('background'),
        max: J.id('background').hei() / 2,
        per: 0.3,
        singleCall: function (a) {
            a.host.css('bottom', ( - a.index) + 'px');
        }
    });
}
function geneEnemy () {
    if (Game.enemySpawnTimer) {
        clearTimeout(Game.enemySpawnTimer);
        Game.enemySpawnTimer = null;
    }
    const schedule = function () {
        if (!Game.isStop && !Game.isPause) {
            Game.enemys.append(new Enemy());
        }
        // 随时间逐步加快刷怪：每 ~9.6s（600 帧）减少 200ms，直到 minAddEnemyTime
        const step = Math.floor((Game.loopIndex || 0) / 600);
        const base = (Game.baseAddEnemyTime ?? Game.addEnemyTime ?? 4000);
        const min = (Game.minAddEnemyTime ?? 800);
        Game.addEnemyTime = Math.max(min, base - step * 200);
        Game.enemySpawnTimer = setTimeout(schedule, Game.addEnemyTime);
    };
    schedule();
}

const start = window.requestAnimationFrame ? () => {
    // debugger;
    gameFrame();
    requestAnimationFrame(start);
} : () => {
    setInterval(gameFrame, Const.LoopTime);
};

function gameFrame () {
    if (!Game.isStop && !Game.isPause) {
        Game.ctx.clearRect(0, 0, Size.gameWidth, Size.gameHeight);
        Game.player.act();
        Game.enemys.each(function (a) {
            a.act();
        });
        Game.bullets.each(function (a) {
            a.act();
        });
    }
    Game.bgMoveAni.act();
    Game.loopIndex ++;
    addEnemySpeed();
}

function pause () {
    if (!Game.isStop) {
        if (!Game.isPause) {
            Game.isPause = true;
            J.id('pause').child(0).attr('src', 'https://cdn.jsdelivr.net/gh/theajack/type/docs/images/start.png');
            showInfo('暂停中');
        } else {
            Game.isPause = false;
            J.id('pause').child(0).attr('src', 'https://cdn.jsdelivr.net/gh/theajack/type/docs/images/pause.png');
            hideInfo();
        }
    }
}
function sendBullet (a) {
    if (Game.enemys.length > 0) {
        Game.bullets.append(new Bullet(a));
    } else {
        showInfo('没有找到目标', true, 1000);
        Game.player.setErr();
    }
}
function restart () {
    Game.isStop = false;
    if (Game.isPause) {
        pause();
    }
    Game.loopIndex = 0;
    Game.enemys.empty();
    Game.bullets.empty();
    Game.player.restart();
    initEnemySpeed();
    hideInfo();
    geneEnemy();
}
window.onkeydown = function (a) {
    const b = a.keyCode;
    if (b == 53) {
        restart();
    } else if (!Game.isStop && b == 32) {
        pause();
    } else if (!Game.isStop && !Game.isPause) {
        if (b >= 65 && b <= 90) {
            sendBullet(String.fromCharCode(b + 32));
        } else if (b == 13) {
            Game.player.clear();
        } else {
            showInfo('按键错误', true, 1000);
            Game.player.setErr();
        }
    }
};
window.onresize = function () {
    setPos();
    Game.ctx.fillStyle = '#fff';
    Game.ctx.textBaseline = 'middle';
    Game.ctx.textAlign = 'center';
    Game.player.resetPos();
    Game.enemys.each(function (a) {
        a.resetDeg();
    });
};

export default {};