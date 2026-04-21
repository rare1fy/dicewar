/**
 * BattleGlue.ts — UI-01-γ 胶水层
 *
 * 职责（SRP）：将 Phaser BattleScene 的用户行为翻译成对 logic/ 层纯函数的调用，
 *   并把结果打包成 State Patch 返回。**自身不持有状态，不直接 setState。**
 *
 * γ 段范围（谨守最小闭环）：
 *   - ✅ 出牌真实结算：checkHands → activeHands 累计倍率 → 真实伤害 + AOE（对齐正式规则）
 *   - ✅ 敌人基础反击：attackCalc.getEffectiveAttackDmg（基础分支，不含 ranger/slow 多段）
 *   - ❌ 遗物触发链：δ 段再接（executePostPlayEffects 需要 15+ setter，本轮先挂空）
 *   - ❌ 结算演出：δ 段再接（runSettlementAnimation 需要完整 SettlementContext）
 *
 * γ 修订（2026-04-21 Verify 打回）：
 *   - 伤害公式修正：从 `bestHand 单查` 改为 `activeHands 累计`（对齐 expectedOutcomeCalc.ts L74-87）
 *   - AOE 判定收口：直接复用 logic/battleHelpers.isAoeHand，不再维护第二份字符串表
 *   - 基础攻击函数改名：`computeEnemyAttack` → `computeBasicEnemyAttack`，诚实标注不覆盖 ranger/slow 多段
 */

import type { Die, Enemy, StatusEffect, HandResult, GameState } from '../../types/game';
import { checkHands } from '../../utils/handEvaluator';
import { HAND_TYPES } from '../../data/handTypes';
import { getEffectiveAttackDmg } from '../../logic/attackCalc';
import { isAoeHand } from '../../logic/battleHelpers';

// ============================================================
// 出牌结算
// ============================================================

export interface PlayOutcomePatch {
  /** 对主目标造成的伤害 */
  primaryDamage: number;
  /** 对其它敌人造成的 AOE 伤害（顺子系 / 元素葫芦）；无 AOE 则为 0 */
  aoeDamage: number;
  /** 是否触发 AOE（用于 UI 反馈） */
  isAoe: boolean;
  /** 牌型中文名（bestHand，仅展示用） */
  handName: string;
  /** 骰点总和（调试/UI 展示） */
  diceSum: number;
  /** 复合牌倍率（activeHands 累计后） */
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
 * 伤害公式（对齐 logic/expectedOutcomeCalc.ts L74-87，正式规则）：
 *   handMultiplier = 1
 *   for handName in activeHands:
 *     level = handLevels[handName] ?? 1
 *     levelBonusMult = (level - 1) * 0.3
 *     handMultiplier += (handDef.mult - 1) + levelBonusMult
 *   伤害 = floor(骰点和 × handMultiplier)
 *
 * 为何必须用 activeHands 而不是 bestHand：
 *   checkHands 返回的 bestHand 可能是组合字符串（如 "元素顺 + 同元素"），
 *   直接用它去 HAND_TYPES.find 永远匹配不到 → 退化成 1.0 倍率 → 高阶组合牌变成接近普攻。
 */
export function computePlayOutcome(
  selected: Die[],
  hand: HandResult,
  game: Pick<GameState, 'handLevels'>,
): PlayOutcomePatch {
  const diceSum = selected.reduce((sum, d) => sum + d.value, 0);

  // activeHands 累计倍率（对齐正式规则）
  let handMultiplier = 1;
  for (const handName of hand.activeHands) {
    const handDef = HAND_TYPES.find((h) => h.name === handName);
    if (!handDef) continue;
    const level = game.handLevels[handName] ?? 1;
    const levelBonusMult = (level - 1) * 0.3;
    handMultiplier += (handDef.mult - 1) + levelBonusMult;
  }

  const rawDamage = Math.floor(diceSum * handMultiplier);

  // AOE 判定收口到 logic/battleHelpers.isAoeHand（正式规则唯一真相）
  const aoe = isAoeHand(hand.activeHands);

  return {
    primaryDamage: rawDamage,
    aoeDamage: aoe ? rawDamage : 0,
    isAoe: aoe,
    handName: hand.bestHand,
    diceSum,
    multiplier: handMultiplier,
  };
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
// 敌人反击（γ 段仅基础分支）
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
 * 计算敌人基础反击（**仅基础分支**）。
 *
 * ⚠️ γ 段作用域：
 *   - 覆盖：warrior / guardian / caster / priest 的基础 attackDmg 公式
 *   - **不覆盖**：ranger 的二连击（需 attackCount）、slow 降速衰减（需 isSlowed）
 *   - **不覆盖**：enemySkills.ts 的 AI 技能分支
 *
 * MVP 木桩 combatType='warrior' 无技能，本函数够用。
 * δ 段引入 ranger/slow/AI 敌人时必须换成 logic/enemyAI.ts 的完整链路，而不是在此打补丁。
 */
export function computeBasicEnemyAttack(
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
