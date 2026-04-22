/**
 * LootPicker.ts — 奖励遗物挑选算法（纯函数）
 *
 * 职责（SRP）：从 ALL_RELICS 中随机挑选 N 个候选遗物作为 Loot 奖励。
 *   约束：
 *     - 排除玩家已持有的遗物（相同 id 不重复给）
 *     - 按稀有度加权：common 60% / uncommon 25% / rare 12% / legendary 3%（初版权重，Designer 可调）
 *     - N 张卡不重复（同一池内不重复抽）
 *     - 候选不足 N 时返回实际能抽到的数量（不抛异常）
 *
 * 设计决策：
 *   - 纯函数，无 scene / registry / 副作用依赖，便于单测和复用（未来商店系统也能用）
 *   - 随机源用 Math.random()，足够 MVP；未来如果需要可复现 seed 可注入 rng 参数
 *   - 权重表提取为 const，Designer 改数值不动代码
 */

import { ALL_RELICS } from '../../data/relics';
import type { Relic, RelicRarity } from '../../types/game';

/**
 * 稀有度权重表（MVP 初版）。
 * 数值来自原版 Loot 落库参考（components/LootScreen 等价）；精确平衡留给 Designer 单。
 */
const RARITY_WEIGHT: Record<RelicRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  legendary: 3,
};

/**
 * 按权重随机抽取 1 个元素。
 * 前置：pool 非空；weights 非空且与 pool 等长。
 * 返回：被抽中的元素在 pool 中的索引（调用方负责从 pool 中取出并移除）。
 */
function weightedPickIndex(weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0; // 保底：所有权重为 0 时回退到首项
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * 从 ALL_RELICS 中挑选 N 个不重复且未被持有的遗物，按稀有度加权。
 *
 * @param ownedRelicIds 玩家已持有遗物的 id 集合（用于排除）
 * @param count 需要抽取的数量（默认 3）
 * @returns 抽中的 Relic 数组（实际数量 ≤ count，池耗尽时自然停止）
 */
export function pickLootCandidates(
  ownedRelicIds: ReadonlySet<string>,
  count: number = 3,
): Relic[] {
  // 构造候选池（排除已持有）
  const pool: Relic[] = Object.values(ALL_RELICS).filter((r) => !ownedRelicIds.has(r.id));
  const picked: Relic[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    // 动态权重：每轮根据剩余 pool 重算（避免移除元素后权重数组错位）
    const weights = pool.map((r) => RARITY_WEIGHT[r.rarity] ?? 1);
    const idx = weightedPickIndex(weights);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return picked;
}
