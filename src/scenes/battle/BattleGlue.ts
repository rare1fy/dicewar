/**
 * BattleGlue.ts — UI-01-γ 胶水层
 *
 * 职责（SRP）：将 Phaser BattleScene 的用户行为翻译成对 logic/ 层纯函数的调用，
 *   并把结果打包成 State Patch 返回。**自身不持有状态，不直接 setState。**
 *
 * γ 段范围（谨守最小闭环）：
 *   - ✅ 出牌真实结算：checkHands → 牌型倍率 → 真实伤害 + AOE 分支
 *   - ✅ 敌人反击真实计算：attackCalc.getEffectiveAttackDmg
 *   - ❌ 遗物触发链：δ 段再接（executePostPlayEffects 需要 15+ setter，本轮先挂空）
 *   - ❌ 结算演出：δ 段再接（runSettlementAnimation 需要完整 SettlementContext）
 *
 * 不向 BattleScene 暴露"如何结算"的细节，只暴露 3 个业务动词：
 *   - evaluateHand(selected, extras)           → HandResult
 *   - computePlayOutcome(hand, dice, enemies)  → PlayOutcomePatch
 *   - computeEnemyAttack(enemy, playerStatuses) → EnemyAttackPatch
 */

import type { Die, Enemy, StatusEffect, HandResult } from '../../types/game';
import { checkHands } from '../../utils/handEvaluator';
import { HAND_TYPES } from '../../data/handTypes';
import { getEffectiveAttackDmg } from '../../logic/attackCalc';

// ============================================================
// 出牌结算
// ============================================================

export interface PlayOutcomePatch {
  /** 对主目标造成的伤害 */
  primaryDamage: number;
  /** 对其它敌人造成的 AOE 伤害（顺子系）；无 AOE 则为 0 */
  aoeDamage: number;
  /** 是否触发 AOE（用于 UI 反馈） */
  isAoe: boolean;
  /** 牌型中文名 */
  handName: string;
  /** 骰点总和（调试/UI 展示） */
  diceSum: number;
  /** 牌型倍率（调试/UI 展示） */
  multiplier: number;
}

/**
 * 评估选中骰组成的最佳牌型。
 * γ 段不注入 straightUpgrade（MVP 三件遗物中无 straightUpgrade 相关，δ 段接遗物触发时再用 engine/buildSettlementInputs）。
 */
export function evaluateHand(selected: Die[]): HandResult {
  return checkHands(selected);
}

/**
 * 计算出牌后的伤害分布（不含遗物触发，不含状态施加）。
 *
 * 伤害公式（见 data/handTypes.ts 表头注释）：
 *   伤害 = 骰点和 × 牌型倍率
 *
 * AOE 判定：顺子系（顺子/4顺/5顺/6顺/元素顺/皇家元素顺）对非主目标造成同等伤害。
 */
export function computePlayOutcome(
  selected: Die[],
  hand: HandResult,
): PlayOutcomePatch {
  const diceSum = selected.reduce((sum, d) => sum + d.value, 0);
  const handName = hand.bestHand;
  const handDef = HAND_TYPES.find((h) => h.name === handName);
  const multiplier = handDef?.mult ?? 1.0;
  const rawDamage = Math.floor(diceSum * multiplier);

  const isAoe = isAoeHand(handName);

  return {
    primaryDamage: rawDamage,
    aoeDamage: isAoe ? rawDamage : 0,
    isAoe,
    handName,
    diceSum,
    multiplier,
  };
}

/**
 * 顺子系 AOE 判定。
 * 收口处：未来新增 AOE 牌型只改这里。
 */
function isAoeHand(handName: string): boolean {
  return (
    handName === '顺子' ||
    handName === '4顺' ||
    handName === '5顺' ||
    handName === '6顺' ||
    handName === '元素顺' ||
    handName === '皇家元素顺'
  );
}

/**
 * 应用伤害到敌人列表（纯函数，返回新数组）。
 * 先吃护甲再扣 HP。
 */
export function applyDamageToEnemies(
  enemies: Enemy[],
  targetIndex: number,
  outcome: PlayOutcomePatch,
): Enemy[] {
  return enemies.map((e, i) => {
    const dmg = i === targetIndex ? outcome.primaryDamage : (outcome.isAoe ? outcome.aoeDamage : 0);
    if (dmg <= 0 || e.hp <= 0) return e;
    const armorSoak = Math.min(e.armor, dmg);
    const hpHit = dmg - armorSoak;
    return {
      ...e,
      armor: e.armor - armorSoak,
      hp: Math.max(0, e.hp - hpHit),
    };
  });
}

// ============================================================
// 敌人反击
// ============================================================

export interface EnemyAttackPatch {
  /** 有效伤害（已计算 combatType/状态修正） */
  effectiveDamage: number;
  /** 实际进到玩家 HP 的伤害（扣护甲后） */
  hpDamage: number;
  /** 消耗掉的玩家护甲 */
  armorConsumed: number;
}

/**
 * 计算敌人反击。**仅处理单个敌人的基础攻击**，不走 enemyAI 的技能分支。
 * γ 段 MVP 敌人（训练木桩）无技能，够用。
 * δ 段改为调 enemyAI.executeEnemyAI 走完整技能分支。
 */
export function computeEnemyAttack(
  enemy: Enemy,
  playerArmor: number,
  playerStatuses: StatusEffect[],
): EnemyAttackPatch {
  if (enemy.hp <= 0) {
    return { effectiveDamage: 0, hpDamage: 0, armorConsumed: 0 };
  }

  const effectiveDamage = getEffectiveAttackDmg(enemy, playerStatuses);
  const armorConsumed = Math.min(playerArmor, effectiveDamage);
  const hpDamage = effectiveDamage - armorConsumed;

  return { effectiveDamage, hpDamage, armorConsumed };
}
