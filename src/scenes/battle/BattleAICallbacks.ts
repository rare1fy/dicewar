/**
 * BattleAICallbacks.ts — UI-01-δ-3b logic/enemyAI 接线工厂
 *
 * 职责（SRP）：把 logic/enemyAI.executeEnemyTurn 需要的 25+ cb 字段
 * 桥接到 Phaser 战场的四件家底上：BattleState / BattleFx / BattleGlue / scene。
 *
 * 范围收窄（自动化默认推荐路线）：
 *   - **仍保持 MVP 单敌 scope**（不扩 Designer 已给边界）
 *   - 台词系统（showEnemyQuote / getEnemyQuotes / pickQuote / scheduleDelayedQuote / enemyPreAction）
 *     全部 no-op / 返回固定值，MVP 不做台词
 *   - addToast / addLog → 仅 console.log 兜底
 *   - playSound → 空桩（与 utils/sound.ts 策略一致，登记 PHASER-SOUND-01）
 *   - setRerollCount / setDice / rollAllDice / setWaveAnnouncement / setEnemyEffects /
 *     setDyingEnemies → 接 BattleState.setters，enemyAI 用到就正常生效
 *   - addFloatingText → 接 BattleFx.playDamageFloat（颜色字符串 → 简单映射）
 *   - handleVictory → 由调方 runner 处理，这里 no-op
 *
 * δ-3b 不做：
 *   - 不接 tryWaveTransition 的真实换波 UI（MVP 单波战斗）
 *   - 不接 setBossEntrance 相关的 UI
 *   - 不做 enemy 数组的显式桥接 UI（EnemyView 仍显示 enemies[0]）
 *
 * 依赖：
 *   - BattleState.refs.enemies（δ-3b 预埋）：提供 enemiesRef 给 enemyAI 读最新数组
 *   - BattleState.refs.game：提供 gameRef
 *   - BattleState.setters：21+ 字段 setter
 *   - BattleFx.playDamageFloat / shakeOnPlayerHit：UI 反馈
 *   - BattleGlue 已有的 triggerRelics 门路不在这里用（enemyAI 内部直接 import engine/relicQueries）
 */

import Phaser from 'phaser';
import type { EnemyAICallbacks } from '../../logic/enemyAI';
import type { Enemy } from '../../types/game';
import { buildRelicContext } from '../../engine/buildRelicContext';
import { hasFatalProtection } from '../../engine/relicQueries';
import { triggerHourglass } from '../../engine/relicUpdates';
import { BattleState } from './BattleState';
import { playDamageFloat, playLabelFloat, shakeOnPlayerHit } from './BattleFx';
import { PlayerView } from './view/PlayerView';
import { EnemyView } from './view/EnemyView';

/**
 * 把 Tailwind color class（'text-red-500' / 'text-orange-500' / ...）映射到 BattleFx kind。
 * enemyAI 历史代码约定用 Tailwind class 名字传颜色，不改动 logic 端，这里做转译。
 */
function colorToFxKind(color: string): 'normal' | 'aoe' | 'crit' | 'heal' {
  if (color.includes('green')) return 'heal';
  if (color.includes('orange') || color.includes('yellow')) return 'aoe';
  if (color.includes('purple') || color.includes('cyan')) return 'crit';
  return 'normal';
}

/**
 * 构造 BattleAICallbacksBundle。
 *
 * @param scene      Phaser 场景，用于 FX / 定时器
 * @param state      BattleState（必须已通过 δ-3b 预埋 refs.enemies）
 * @param playerView 玩家面板，用于飘字锚点
 * @param enemyView  敌人面板，用于飘字锚点
 * @param onVictory  胜利回调（由 runner 传入）
 *
 * ⚠️ 强约束：enemiesRef 必须传入（修复 PHASER-FIX-ENEMYAI-STALE-ENEMIES 的 Verify WARN-A）。
 *   本工厂自动从 state.refs.enemies 取，调方无需处理。
 */
export function buildBattleAICallbacks(
  scene: Phaser.Scene,
  state: BattleState,
  playerView: PlayerView,
  enemyView: EnemyView,
  onVictory: () => void,
): EnemyAICallbacks {
  return {
    // ---- 状态 setter：直接透传 BattleState ----
    setGame: state.setters.game,
    setEnemies: state.setters.enemies,
    setEnemyEffects: state.setters.enemyEffects,
    setDyingEnemies: state.setters.dyingEnemies,
    setRerollCount: state.setters.rerollCount,
    setScreenShake: state.setters.screenShake,
    setPlayerEffect: state.setters.playerEffect,
    setWaveAnnouncement: state.setters.waveAnnouncement,
    setDice: state.setters.dice,

    // ---- ref：直接透传（含 δ-3a 修复的 enemiesRef）----
    gameRef: state.refs.game,
    enemiesRef: state.refs.enemies,

    // ---- 单敌专用 setter：桥接 enemyEffects map ----
    setEnemyEffectForUid: (uid, effect) => {
      state.setters.enemyEffects((prev) => ({ ...prev, [uid]: effect }));
    },

    // ---- 台词系统 no-op（MVP 不做台词）----
    showEnemyQuote: () => { /* no-op */ },
    getEnemyQuotes: () => undefined,
    pickQuote: () => null,
    scheduleDelayedQuote: () => { /* no-op */ },
    enemyPreAction: async () => true,  // 返回 true = 允许后续动作，不做预演动画

    // ---- UI 反馈：桥到 BattleFx ----
    addFloatingText: (text, color, _icon, target = 'enemy') => {
      const center = target === 'player'
        ? playerView.getWorldCenter()
        : enemyView.getWorldCenter();
      // 尝试抽取数字：优先匹配带 ± 的整数（如 '-5' / '+3'）
      const match = /^([+-]?)(\d+)$/.exec(text.trim());
      if (match) {
        const amount = parseInt(match[2], 10);
        if (amount > 0) {
          // 有符号的整数伤害/回血：走 playDamageFloat
          const kind = colorToFxKind(color);
          playDamageFloat(scene, center.x, center.y, amount, kind);
        } else {
          // 伤害 0（如被护甲完全吸收）：用 label 飘字显示"0"，颜色由 color hint 决定
          playLabelFloat(scene, center.x, center.y, '0', color);
        }
      } else {
        // 非数字文本（'冻结' / '怒火+X' / 自定义标签）：走 playLabelFloat
        playLabelFloat(scene, center.x, center.y, text, color);
      }
    },

    // ---- 日志 / 提示：console 兜底 ----
    addLog: (msg) => console.log(`[BattleLog] ${msg}`),
    addToast: (msg, type) => console.log(`[Toast:${type}] ${msg}`),

    // ---- 音效：空桩（等 PHASER-SOUND-01）----
    playSound: () => { /* no-op，等 Designer 提供音源 */ },

    // ---- 摇屏：部分场景 enemyAI 会显式调 setScreenShake(true/false)，
    //      这里 setScreenShake 已接 BattleState，但**真实摇屏**额外由 BattleFx 触发。
    //      enemyAI 内部 setScreenShake(true) 时我们主动触发一次 shake，false 时 no-op。
    //      做法：在 setters.screenShake 外再包一层。
    //      实现在 state.setters.screenShake 透传处已处理；这里仍保留原字段，
    //      真实 shake 由本 callbacks 之外的 BattleScene.subscribe 监听器触发。

    // ---- 骰子 reroll：MVP 不会被 enemyAI 主动 reroll（无 guardian/priest 触发重投的场景），
    //      接 no-op 占位。如果将来 priest.skill 真的推 rollAllDice，需在这里接 DiceTray 的真实 roll。----
    rollAllDice: () => { /* no-op，MVP 不应触发 */ },

    // ---- 遗物辅助：直接 re-export engine 层 ----
    buildRelicContext,
    hasFatalProtection,
    triggerHourglass,

    // ---- 胜利：由 runner 注入 ----
    handleVictory: onVictory,
  };
}

/**
 * 辅助：当 enemyAI 通过 setScreenShake(true) 触发震屏时，**边沿触发**一次 shake。
 *
 * 为什么必须边沿触发：
 *   enemyAI 的 setScreenShake 模式是
 *     setScreenShake(true) → (其它 setGame/setEnemies 多次触发 subscribe) → setScreenShake(false)
 *   如果简单订阅 snap.screenShake==true 就 shake，每次 subscribe 通知都会再 shake 一次，
 *   产生重复震屏。
 *   修正：记录上一次 screenShake 值，只在 false→true 的上升沿触发。
 *
 * Verify δ-3b [FAIL-F] 修复。
 */
export function bridgeScreenShake(
  scene: Phaser.Scene,
  state: BattleState,
): () => void {
  let lastShake = state.getSnapshot().screenShake;
  return state.subscribe((snap) => {
    if (snap.screenShake && !lastShake) {
      // 上升沿：false → true，触发一次
      shakeOnPlayerHit(scene);
    }
    lastShake = snap.screenShake;
  });
}

/**
 * 辅助：enemies 数组空了就触发胜利。由 runner 或 BattleScene 使用。
 */
export function isAllEnemiesDead(enemies: Enemy[]): boolean {
  return enemies.every((e) => e.hp <= 0);
}
