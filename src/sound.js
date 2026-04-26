let audioCtx = null;
let masterGain = null;
let masterComp = null;
let muted = false;
const fileSfx = Object.create(null);

const SFX_FILES = {
    shoot: '/sound/shoot.mp3',
    hit: '/sound/hit.mp3',
    kill: '/sound/kill.mp3',
    error: '/sound/error.mp3',
    shield: '/sound/shield.mp3',
    gameover: '/sound/gameover.mp3',
};

const SFX_MAX_MS = {
    // 用户提供的 kill 偏长：只放前 700ms
    kill: 800,
    // hit 也截断：只放前 500ms
    hit: 500,
};

function getCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
        masterGain = audioCtx.createGain();
        // 整体音量（会再经过压缩器，避免爆音）
        masterGain.gain.value = 0.55;

        masterComp = audioCtx.createDynamicsCompressor();
        masterComp.threshold.value = -20;
        masterComp.knee.value = 18;
        masterComp.ratio.value = 8;
        masterComp.attack.value = 0.003;
        masterComp.release.value = 0.12;

        masterGain.connect(masterComp);
        masterComp.connect(audioCtx.destination);
    }
    return audioCtx;
}

function resumeIfNeeded() {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
    }
}

function playFile(name) {
    if (muted) return true;
    const a = fileSfx[name];
    if (!a) return false;
    try {
        // 允许快速连续触发：重置播放位置
        clearTimeout(a._stopTimer);
        clearTimeout(a._fadeTimer);
        a.volume = 1;
        a.currentTime = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => { });

        const maxMs = SFX_MAX_MS[name];
        if (maxMs) {
            a._stopTimer = setTimeout(() => {
                // 淡出再停止，避免“硬切断”听感突兀
                const fadeMs = 220;
                const steps = 10;
                const stepMs = Math.max(10, Math.floor(fadeMs / steps));
                let i = 0;
                const startVol = a.volume || 1;
                const tick = () => {
                    i++;
                    const v = Math.max(0, startVol * (1 - i / steps));
                    a.volume = v;
                    if (i >= steps) {
                        try {
                            a.pause();
                            a.currentTime = 0;
                            a.volume = 1;
                        } catch (e) { }
                    } else {
                        a._fadeTimer = setTimeout(tick, stepMs);
                    }
                };
                a._fadeTimer = setTimeout(tick, stepMs);
            }, Math.max(0, maxMs - 120));
        }
        return true;
    } catch (e) {
        return false;
    }
}

function beep({ freq = 440, type = 'sine', dur = 0.07, gain = 0.12, slideTo, slideTime = 0.04, at = 0 } = {}) {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx || !masterGain) return;
    resumeIfNeeded();

    const t0 = ctx.currentTime + (at || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
        osc.frequency.linearRampToValueAtTime(slideTo, t0 + slideTime);
    }

    // 轻微滤波，减少方波锯齿波的刺耳感
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(9000, t0);
    filter.Q.setValueAtTime(0.7, t0);

    // 快速起音 + 衰减
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, dur));

    osc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + Math.max(0.02, dur) + 0.02);
}

function noiseBurst({ dur = 0.05, gain = 0.08, at = 0, hp = 900 } = {}) {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx || !masterGain) return;
    resumeIfNeeded();

    const t0 = ctx.currentTime + (at || 0);
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * Math.max(0.01, dur)));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        // 简单白噪声 + 衰减包络
        const env = 1 - i / len;
        data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(hp, t0);
    filter.Q.setValueAtTime(0.8, t0);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.01, dur));

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);

    src.start(t0);
    src.stop(t0 + Math.max(0.01, dur) + 0.02);
}

export function initSound() {
    const saved = localStorage.getItem('_typeMute');
    muted = saved === '1';

    // 预加载音效文件（若存在则优先播放文件）
    Object.keys(SFX_FILES).forEach((k) => {
        try {
            const a = new Audio();
            a.src = SFX_FILES[k];
            a.preload = 'auto';
            a.volume = 1;
            fileSfx[k] = a;
        } catch (e) { }
    });
}

export function isMuted() {
    return muted;
}

export function setMuted(m) {
    muted = !!m;
    localStorage.setItem('_typeMute', muted ? '1' : '0');
}

export function toggleMuted() {
    setMuted(!muted);
    return muted;
}

export function playSound(name) {
    // 有对应音效文件则优先播放；找不到则回退到合成音
    if (playFile(name)) return;

    switch (name) {
        case 'shoot':
            // 更“脆”的激光：一小段下滑 + 轻微嘶声
            beep({ freq: 980, type: 'square', dur: 0.03, gain: 0.16, slideTo: 520, slideTime: 0.03 });
            noiseBurst({ dur: 0.02, gain: 0.05, hp: 2200 });
            break;
        case 'hit':
            // 命中：短促“啪”
            beep({ freq: 640, type: 'triangle', dur: 0.04, gain: 0.16, slideTo: 420, slideTime: 0.03 });
            noiseBurst({ dur: 0.025, gain: 0.06, hp: 1400 });
            break;
        case 'kill':
            // 击毁：两段下降 + 爆裂噪声
            beep({ freq: 520, type: 'sawtooth', dur: 0.06, gain: 0.18, slideTo: 220, slideTime: 0.06 });
            beep({ freq: 320, type: 'sawtooth', dur: 0.07, gain: 0.14, slideTo: 140, slideTime: 0.07, at: 0.03 });
            noiseBurst({ dur: 0.07, gain: 0.10, hp: 900 });
            break;
        case 'score':
            // 得分：更清晰的“叮”
            beep({ freq: 1320, type: 'sine', dur: 0.045, gain: 0.12 });
            beep({ freq: 1760, type: 'sine', dur: 0.03, gain: 0.08, at: 0.02 });
            break;
        case 'error':
            // 错误：低沉“嘟”
            beep({ freq: 200, type: 'square', dur: 0.11, gain: 0.14, slideTo: 130, slideTime: 0.08 });
            break;
        case 'shield':
            // 护盾：上扬“嗖”
            beep({ freq: 420, type: 'triangle', dur: 0.06, gain: 0.14, slideTo: 980, slideTime: 0.06 });
            noiseBurst({ dur: 0.03, gain: 0.04, hp: 3000 });
            break;
        case 'pause':
            beep({ freq: 320, type: 'triangle', dur: 0.06, gain: 0.11 });
            break;
        case 'resume':
            beep({ freq: 520, type: 'triangle', dur: 0.06, gain: 0.11 });
            break;
        case 'gameover':
            // 失败：下坠 + 低频收尾
            beep({ freq: 420, type: 'sawtooth', dur: 0.14, gain: 0.18, slideTo: 120, slideTime: 0.14 });
            beep({ freq: 140, type: 'sine', dur: 0.16, gain: 0.10, at: 0.08 });
            break;
        default:
            break;
    }
}

