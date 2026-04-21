/**
 * soulCrystalCalc.ts — 魂晶计算纯函数
 * 从 DiceHeroGame.tsx 提取，ARCH-6
 */

import type { Enemy, MapNode } from '../types/game';

/** 击杀数据 */
export interface KillData {
  uid: string;
  overkill: number;
}

/**
 * 计算击杀敌人获得的魂晶总量
 * - 每个被击杀的敌人：溢出伤害（上限为敌人maxHp）× 深度倍率 × 0.15
 * - 深度倍率 = soulCrystalMultiplier + depth × 0.1
 *
 * @returns 魂晶获取总量（≥0）
 */
export function calculateSoulCrystalGain(params: {
  killedEnemies: KillData[];
  enemies: Enemy[];
  currentNode: MapNode | undefined;
  soulCrystalMultiplier: number;
}): number {
  const { killedEnemies, enemies, currentNode, soulCrystalMultiplier } = params;
  if (killedEnemies.length === 0) return 0;

  const currentDepth = currentNode?.depth || 0;
  const depthMult = soulCrystalMultiplier + currentDepth * 0.1;

  let totalSoulGain = 0;
  killedEnemies.forEach(killedData => {
    if (killedData.overkill > 0) {
      const enemy = enemies.find(e => e.uid === killedData.uid);
      const cappedOverkill = Math.min(killedData.overkill, enemy?.maxHp || 50);
      // 基础系数0.15，通过商店涨价控制产销比
      const gain = Math.max(1, Math.ceil(cappedOverkill * depthMult * 0.15));
      totalSoulGain += gain;
    }
  });

  return totalSoulGain;
}
