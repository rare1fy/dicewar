/**
 * attackCalc.ts — 敌人攻击力计算纯函数
 * 从 DiceHeroGame.tsx / enemyAI.ts 提取，ARCH-6
 *
 * 职责：计算敌人的有效攻击伤害值
 * - combatType 乘数修正（近战/远程）
 * - 减速(slow)修正
 * - 虚弱(weak)修正
 * - 玩家易伤(vulnerable)修正
 * - 力量(strength)加成
 */

import type { Enemy, StatusEffect } from '../types/game';
import { STATUS_EFFECT_MULT, ENEMY_ATTACK_MULT } from '../config';

/** 攻击力计算的额外参数 */
export interface AttackCalcExtras {
  /** 敌人攻击计数（ranger 用） */
  attackCount?: number;
  /** 是否被减速 */
  isSlowed?: boolean;
}

/**
 * 计算敌人的有效攻击力（考虑 combatType 乘数 + 状态效果修正）
 *
 * 修正顺序：
 * 1. combatType 乘数（warrior ×1.3, ranger ×0.4 + hitCount 递增）
 * 2. 力量(strength): 攻击力 + strength.value
 * 3. 虚弱(weak): 攻击力 ×STATUS_EFFECT_MULT.weak（下限1）
 * 4. 玩家易伤(vulnerable): 攻击力 ×STATUS_EFFECT_MULT.vulnerable
 * 5. 减速(slow): 仅 ranger 受影响，攻击力 ×ENEMY_ATTACK_MULT.slow
 */
export function getEffectiveAttackDmg(
  enemy: Enemy,
  playerStatuses: StatusEffect[],
  extras: AttackCalcExtras = {},
): number {
  let val = enemy.attackDmg;

  // 1. combatType 乘数
  if (enemy.combatType === 'warrior') {
    val = Math.floor(val * ENEMY_ATTACK_MULT.warrior);
  }
  if (enemy.combatType === 'ranger') {
    const hitCount = extras.attackCount ?? 0;
    val = Math.max(1, Math.floor(val * ENEMY_ATTACK_MULT.rangerHit) + hitCount);
    if (extras.isSlowed) {
      val = Math.floor(val * ENEMY_ATTACK_MULT.slow);
    }
  }

  // 2. 力量加成
  const strength = enemy.statuses.find(s => s.type === 'strength');
  if (strength) val += strength.value;

  // 3. 虚弱修正（下限1）
  const weak = enemy.statuses.find(s => s.type === 'weak');
  if (weak) val = Math.max(1, Math.floor(val * STATUS_EFFECT_MULT.weak));

  // 4. 玩家易伤修正
  const playerVuln = playerStatuses.find(s => s.type === 'vulnerable');
  if (playerVuln) val = Math.floor(val * STATUS_EFFECT_MULT.vulnerable);

  return val;
}

/**
 * 计算 ranger 追击伤害（第二击）
 * 追击伤害 = max(1, floor(attackDmg × rangerHit) + attackCount + 1)
 */
export function getRangerFollowUpDmg(
  enemy: Enemy,
  attackCount: number,
): number {
  return Math.max(1, Math.floor(enemy.attackDmg * ENEMY_ATTACK_MULT.rangerHit) + attackCount + 1);
}
