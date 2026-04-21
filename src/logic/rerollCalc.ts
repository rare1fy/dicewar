/**
 * rerollCalc.ts — 重投代价计算纯函数
 * 从 DiceHeroGame.tsx 提取，ARCH-6
 */

import type { Relic } from '../types/game';
import { sumPassiveRelicValue, hasBloodRerollRelic } from '../engine/relicQueries';

/**
 * 计算重投的HP代价
 * - 前 N 次免费（免费次数 = freeRerollsPerTurn + 遗物额外次数）
 * - 非战士无嗜血遗物时：超过免费次数返回 -1（不可重投）
 * - 嗜血代价：当前最大HP × 2^n%（第1次2%, 第2次4%, 第3次8%...）
 * - 非战士嗜血代价翻倍
 * @returns 0=免费, 正数=HP代价, -1=不可重投
 */
export function getRerollHpCost(
  count: number,
  relics: Relic[],
  freeRerollsPerTurn: number,
  maxHp: number,
  playerClass: string,
): number {
  const extraFreeRerolls = sumPassiveRelicValue(relics, 'extraReroll');
  const freeCount = (freeRerollsPerTurn || 1) + extraFreeRerolls;
  if (count < freeCount) return 0;
  // 嗜血骰袋遗物：非战士也能嗜血（代价2倍）
  const hasBloodRerollRelicCheck = hasBloodRerollRelic(relics);
  if (playerClass !== 'warrior' && !hasBloodRerollRelicCheck) return -1;
  const paidIndex = count - freeCount;
  // 嗜血代价：当前最大HP × 2^n%（第1次2%, 2次4%, 3次8%...）
  const baseCost = Math.ceil(maxHp * Math.pow(2, paidIndex + 1) / 100);
  return playerClass !== 'warrior' ? baseCost * 2 : baseCost; // 非战士代价翻倍
}
