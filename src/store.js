/*
 * @Author: tackchen
 * @Date: 2021-11-17 15:14:34
 * @LastEditors: Please set LastEditors
 * @FilePath: \type\src\store.js
 * @Description: Coding something
 */

export const Size = {
    gameWidth: 0,
    gameHeight: 0,
};

export const Game = {
    canvas: null,
    ctx: null,
    player: null,
    enemys: [],
    bullets: [],
    addEnemyTime: 4000,
    isStop: false,
    isPause: false,
    bgMoveAni: null,
    loopIndex: 0,
    // 0: 单字母/重复字母  1: 字母串  2: 常用英文单词  3: 汉字（拼音）
    difficulty: 3,
};

export const Const = {
    LoopTime: 16,
};