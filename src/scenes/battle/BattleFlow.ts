/**
 * BattleFlow.ts — 战斗流程控制（纯函数 + 状态操作）
 *
 * @module battle/BattleFlow
 */

import type { BattleState } from './BattleState';
import type { Die } from '../../types/game';
import { drawFromBag, discardDice } from '../../data/diceBag';
import { applyDamageToEnemies } from './BattleGlue';
import { playSound } from '../../utils/sound';

/** 抽牌结果 */
export interface DrawHandResult {
  dice: Die[];
  newBag: string[];
  newDiscard: string[];
}

/**
 * 执行抽牌 — 从 diceBag 抽出 drawCount 个骰子。
 */
export function drawHandLogic(
  bag: string[],
  discard: string[],
  drawCount: number
): DrawHandResult {
  const { drawn, newBag, newDiscard } = drawFromBag(bag, discard, drawCount);
  return { dice: drawn, newBag: newBag, newDiscard: newDiscard };
}

/**
 * 播放抽牌音效
 */
export function playDrawSfx(): void {
  playSound('roll');
}

/** 回收手牌到弃骰库 + 刷新回合数 + 恢复弃牌次数 */
export function recycleAndRefresh(
  battleState: BattleState,
  currentDice: Die[]
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): void {
  battleState.setters.game((g) => ({
    ...g,
    discardPile: discardDice(currentDice, g.discardPile),
    playsLeft: g.maxPlays,
  }));
  battleState.setters.discardLeft(battleState.getSnapshot().discardsPerTurn);
}

import type { PlayOutcomePatch } from './BattleGlue';

/** 应用出牌结果到 BattleState（更新敌人 HP 等） */
export function applyPlayOutcome(
  battleState: BattleState,
  outcome: PlayOutcomePatch
): void {
  const snap = battleState.getSnapshot();
  const targetIndex = snap.enemies.findIndex((e) => e.hp > 0);
  if (targetIndex < 0) return;

  battleState.setters.enemies((prev) => applyDamageToEnemies(prev, targetIndex, outcome));
}
