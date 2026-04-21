/**
 * BattleGlue.ts — UI-01-γ/δ 胶水层
 *
 * 职责（SRP）：将 Phaser BattleScene 的用户行为翻译成对 logic/ 层纯函数的调用，
 *   并把结果打包成 State Patch 返回。**自身不持有状态，不直接 setState。**
 *
 * γ 段范围（已完工）：
 *   - ✅ 出牌真实结算：checkHands → activeHands 累计倍率 → 真实伤害 + AOE（对齐正式规则）
 *   - ✅ 敌人基础反击：attackCalc.getEffectiveAttackDmg（基础分支，不含 ranger/slow 多段）
 *
 * δ-1 段范围（本轮新增）：
 *   - ✅ 遗物触发链最小闭环：on_play 聚合 `{multiplier, heal}` 字段
 *   - ✅ straightUpgrade 注入：走 engine/buildSettlementInputs（唯一合法入口）
 *   - ✅ 遗物 multiplier 合并到最终伤害公式
 *
 * δ-1 作用域限制（重要）：
 *   - 本轮仅处理 MVP 三件遗物依赖的 3 个字段：multiplier / heal / straightUpgrade
 *   - 其它 RelicEffect 字段（armor/pierce/statusEffects/purifyDebuff/…）一律 **忽略**
 *     未来扩展遗物时必须在 applyRelicAggregateOnPlay 里追加对应字段的映射
 *   - 不接 executePostPlayEffects（仍需 15+ setter，留给完整结算链）
 *   - 不接结算演出（δ-2 再做）
 *
 * γ 修订（2026-04-21 Verify 打回）：
 *   - 伤害公式修正：从 `bestHand 单查` 改为 `activeHands 累计`（对齐 expectedOutcomeCalc.ts L74-87）
 *   - AOE 判定收口：直接复用 logic/battleHelpers.isAoeHand，不再维护第二份字符串表
 *   - 基础攻击函数改名：`computeEnemyAttack` → `computeBasicEnemyAttack`，诚实标注不覆盖 ranger/slow 多段
 */

import type { Die, Enemy, StatusEffect, HandResult, GameState, Relic } from '../../types/game';
import type { RelicEffect } from '../../types/relics';
import { checkHands } from '../../utils/handEvaluator';
import { HAND_TYPES } from '../../data/handTypes';
import { getEffectiveAttackDmg } from '../../logic/attackCalc';
import { isAoeHand } from '../../logic/battleHelpers';
import { buildRelicContext } from '../../engine/buildRelicContext';
import { buildSettlementInputs } from '../../engine/buildSettlementInputs';

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
 *
 * δ-1 起：**必须**传 relics 参数，由 buildSettlementInputs(relics).straightUpgrade 注入。
 *   - dimension_crush 通过此路径影响顺子长度判定
 *   - 走 engine/buildSettlementInputs 唯一入口（契约见 logic/postPlayEffects.ts PostPlayContext 注释）
 */
export function evaluateHand(selected: Die[], relics: Relic[]): HandResult {
  const { straightUpgrade } = buildSettlementInputs(relics);
  return checkHands(selected, { straightUpgrade });
}

/**
 * 计算出牌后的伤害分布（不含状态施加）。
 *
 * δ-1 起接入 on_play 遗物的 multiplier 聚合：
 *   finalMultiplier = handMultiplier × relicMultiplier
 *
 * 伤害公式（对齐 logic/expectedOutcomeCalc.ts L74-87，正式规则）：
 *   handMultiplier = 1
 *   for handName in activeHands:
 *     level = handLevels[handName] ?? 1
 *     levelBonusMult = (level - 1) * 0.3
 *     handMultiplier += (handDef.mult - 1) + levelBonusMult
 *   伤害 = floor(骰点和 × handMultiplier × relicMultiplier)
 *
 * 为何必须用 activeHands 而不是 bestHand：
 *   checkHands 返回的 bestHand 可能是组合字符串（如 "元素顺 + 同元素"），
 *   直接用它去 HAND_TYPES.find 永远匹配不到 → 退化成 1.0 倍率 → 高阶组合牌变成接近普攻。
 */
export function computePlayOutcome(
  selected: Die[],
  hand: HandResult,
  game: Pick<GameState, 'handLevels'>,
  relicAggregate: RelicEffectAggregate = EMPTY_RELIC_AGGREGATE,
): PlayOutcomePatch {
  const diceSum = selected.reduce((sum, d) => sum + d.value, 0);

  // activeHands 累计牌型倍率（对齐正式规则）
  let handMultiplier = 1;
  for (const handName of hand.activeHands) {
    const handDef = HAND_TYPES.find((h) => h.name === handName);
    if (!handDef) continue;
    const level = game.handLevels[handName] ?? 1;
    const levelBonusMult = (level - 1) * 0.3;
    handMultiplier += (handDef.mult - 1) + levelBonusMult;
  }

  // δ-1：叠加遗物 multiplier（arithmetic_gauge / crimson_grail / …）
  const finalMultiplier = handMultiplier * relicAggregate.multiplier;
  const rawDamage = Math.floor(diceSum * finalMultiplier);

  // AOE 判定收口到 logic/battleHelpers.isAoeHand（正式规则唯一真相）
  const aoe = isAoeHand(hand.activeHands);

  return {
    primaryDamage: rawDamage,
    aoeDamage: aoe ? rawDamage : 0,
    isAoe: aoe,
    handName: hand.bestHand,
    diceSum,
    multiplier: finalMultiplier,
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

// ============================================================
// δ-1：遗物 on_play 聚合触发
// ============================================================

/**
 * on_play 遗物触发后聚合出来的"需要应用到 BattleState"的净值
 *
 * ⚠️ 作用域限制：δ-1 只覆盖 MVP 三件遗物用到的字段。
 *   未来扩展遗物时，若 effect 返回了本类型未声明的字段（armor/pierce/statusEffects/purifyDebuff/…）
 *   必须在此类型和 triggerOnPlayRelics 里同步增加，并评估消费点。
 */
export interface RelicEffectAggregate {
  /** 伤害倍率累乘（初值 1） */
  multiplier: number;
  /** 净回血量（healing_breeze 等累加） */
  heal: number;
}

export const EMPTY_RELIC_AGGREGATE: RelicEffectAggregate = { multiplier: 1, heal: 0 };

/**
 * 从牌型结果推导"升档后的真实顺子长度"。
 *   activeHands 中 `6顺/5顺/4顺/顺子(=3顺)` 是互斥的，最多出现一个。
 *   不是顺子返回 0。
 *
 * 用途：修复 `arithmetic_gauge` + `dimension_crush` 组合场景下
 *   `buildRelicContext.diceCount` 仍然是原始 `selected.length`（未升档）
 *   导致 arithmetic_gauge 按原始档位取倍率的 bug（Verify δ-1 抓到）。
 */
function deriveStraightLen(hand: HandResult): number {
  if (hand.activeHands.includes('6顺')) return 6;
  if (hand.activeHands.includes('5顺')) return 5;
  if (hand.activeHands.includes('4顺')) return 4;
  if (hand.activeHands.includes('顺子')) return 3;
  return 0;
}

/**
 * 触发所有 on_play 遗物并聚合返回值。
 *
 * 收口原则（对齐铁律 C2 / C3）：
 *   - ctx 统一走 buildRelicContext（C3）
 *   - 触发入口集中在本函数（C2 的 Phaser 仓最小实现；若未来补齐 engine/triggerRelics 请迁移此处）
 *
 * δ-1 作用域：只聚合 multiplier / heal 两个字段。其它字段被静默丢弃（未来扩展遗物时同步追加映射）。
 *
 * diceCount 修正（Verify δ-1 REJECT 修复）：
 *   - `dimension_crush` 升档后，`hand.activeHands` 可能把 3 颗骰子的顺子认定为 `4顺`；
 *   - 若直接把 `selectedDice.length` 喂给 `buildRelicContext.diceCount`，
 *     `arithmetic_gauge` 会按原始档位（3顺系数 1.5x）取倍率，而不是升档后（4顺系数 2.0x）。
 *   - 当 handType 含"顺"时用升档后的真实顺子长度覆盖 diceCount。
 *   - ⚠️ 这与原版 dicehero2 的 expectedOutcomeCalc.ts / postPlayEffects.ts 行为**不一致**（那边也传原始 selected.length），
 *     Phaser 仓在此点**领先修复**。见 TASKS.md 的 PHASER-FIX-ARITHMETIC-GAUGE-DICECOUNT（待 Designer 追认）。
 */
export function triggerOnPlayRelics(params: {
  relics: Relic[];
  game: GameState;
  dice: Die[];
  selectedDice: Die[];
  hand: HandResult;
  targetEnemy: Enemy | null;
  pointSum: number;
}): RelicEffectAggregate {
  const { relics, game, dice, selectedDice, hand, targetEnemy, pointSum } = params;

  // 升档后的真实顺子长度（非顺子为 0）
  const straightLen = deriveStraightLen(hand);

  const ctx = buildRelicContext({
    game,
    dice,
    targetEnemy,
    rerollsThisTurn: 0, // δ-1 暂不跟踪本回合重投次数（δ-2 接入）
    handType: hand.bestHand,
    selectedDice,
    pointSum,
    hasPlayedThisTurn: false, // 触发时机：本次出牌"即将"结算，此前未出过
  });

  // diceCount 修正：若是顺子且升档后长度 > 选骰数，override 为真实顺子长度
  // （buildRelicContext 目前没独立 straightLen 字段，用 ctx 派生值后覆盖是零侵入方案）
  if (straightLen > selectedDice.length) {
    ctx.diceCount = straightLen;
  }

  const agg: RelicEffectAggregate = { multiplier: 1, heal: 0 };

  for (const relic of relics) {
    if (relic.trigger !== 'on_play') continue;
    const eff: RelicEffect = relic.effect(ctx) ?? {};

    if (typeof eff.multiplier === 'number') agg.multiplier *= eff.multiplier;
    if (typeof eff.heal === 'number') agg.heal += eff.heal;
    // 其它字段（armor/pierce/statusEffects/purifyDebuff/…）δ-1 作用域外静默丢弃
  }

  return agg;
}
