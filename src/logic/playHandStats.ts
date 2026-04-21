/**
 * playHandStats.ts — 出牌统计更新 & 连击处理
 *
 * ARCH-I: 从 useBattleCombat.tsx playHand 中提取的纯计算/状态变换逻辑。
 */

import type { Die, GameState } from '../types/game';
import type { ExpectedOutcomeResult } from './expectedOutcomeTypes';

/** 出牌统计更新的输入参数 */
export interface PlayStatsUpdateParams {
  prev: GameState;
  outcome: ExpectedOutcomeResult;
  bestHand: string;
  selected: Die[];
}

/**
 * 计算出牌后的统计更新（纯函数，返回新的 stats 对象）
 *
 * 包含：总出牌次数、总伤害、最高单次伤害、总治疗、总护甲、牌型计数、最佳牌型、骰子使用计数
 */
export function computePlayStatsUpdate(params: PlayStatsUpdateParams): GameState['stats'] {
  const { prev, outcome, bestHand, selected } = params;
  const newStats = { ...prev.stats };
  newStats.totalPlays += 1;
  newStats.totalDamageDealt += outcome.damage;
  if (outcome.damage > newStats.maxSingleHit) newStats.maxSingleHit = outcome.damage;
  newStats.totalHealing += (outcome.heal || 0);
  newStats.totalArmorGained += (outcome.armor || 0);
  newStats.handTypeCounts[bestHand] = (newStats.handTypeCounts[bestHand] || 0) + 1;
  if (!newStats.bestHandPlayed || outcome.handMultiplier > (prev.stats.handTypeCounts[newStats.bestHandPlayed] || 0)) {
    newStats.bestHandPlayed = bestHand;
  }
  selected.forEach(d => {
    const defId = d.diceDefId;
    newStats.diceUsageCounts[defId] = (newStats.diceUsageCounts[defId] || 0) + 1;
  });
  return newStats;
}

/** 连击终击加成计算 */
export interface ComboFinisherParams {
  playerClass: string;
  currentCombo: number;
  lastHandType: string | undefined;
  thisHandType: string;
}

/**
 * 计算影锋刺客连击终击加成倍率
 *
 * 条件：影锋刺客 + 已有1+连击 + 上次牌型与本次相同 + 非普通攻击
 * 返回加成倍率（0 或 0.25）
 */
export function calcComboFinisherBonus(params: ComboFinisherParams): number {
  const { playerClass, currentCombo, lastHandType, thisHandType } = params;
  if (playerClass === 'rogue' && currentCombo >= 1 && lastHandType && lastHandType === thisHandType && thisHandType !== '普通攻击') {
    return 0.25;
  }
  return 0;
}
