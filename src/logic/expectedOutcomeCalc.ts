/**
 * expectedOutcome 纯计算逻辑
 * 
 * 从 DiceHeroGame.tsx 的 useMemo 中提取的战斗预览计算。
 * 本模块只做纯计算，所有副作用（setGame等）通过返回值传递给调用方。
 * 
 * [RULES-A4] 所有遗物触发走 buildRelicContext，禁止手拼 ctx
 * 
 * ARCH-12: 从 621 行拆分 → 类型提取到 expectedOutcomeTypes.ts
 *          骰子效果提取到 diceOnPlayCalc.ts
 *          副作用执行提取到 expectedOutcomeApply.ts
 */

import type { StatusEffect } from '../types/game';
import type { PendingSideEffect, ExpectedOutcomeResult, CalculateExpectedOutcomeParams } from './expectedOutcomeTypes';
import { HAND_TYPES } from '../data/handTypes';
import { getDiceDef } from '../data/dice';
import { buildRelicContext } from '../engine/buildRelicContext';
import { FURY_CONFIG } from '../config/gameBalance';
import { processDiceOnPlayEffects } from './diceOnPlay';

// 重新导出类型和副作用执行，保持消费方 import 路径不变
export type { PendingSideEffect, ExpectedOutcomeResult, CalculateExpectedOutcomeParams } from './expectedOutcomeTypes';
export { applyPendingSideEffects } from './expectedOutcomeApply';

/** 手牌效果查找表：手牌名 → { baseArmor, statusEffect } */
const HAND_EFFECT_TABLE: Record<string, { baseArmor?: number; statusEffect?: StatusEffect }> = {
  '普通攻击': {},
  '对子': {},
  '顺子': {},
  '连对': { baseArmor: 5 },
  '三连对': { baseArmor: 8 },
  '三条': { statusEffect: { type: 'vulnerable', value: 1, duration: 2 } },
  '4顺': { statusEffect: { type: 'weak', value: 1, duration: 2 } },
  '同元素': {},
  '葫芦': { baseArmor: 15 },
  '5顺': { statusEffect: { type: 'weak', value: 2, duration: 2 } },
  '四条': { statusEffect: { type: 'vulnerable', value: 2, duration: 2 } },
  '6顺': { baseArmor: 10, statusEffect: { type: 'weak', value: 3, duration: 2 } },
  '元素顺': {},
  '元素葫芦': { baseArmor: 25 },
  '五条': { statusEffect: { type: 'vulnerable', value: 3, duration: 2 } },
  '六条': { statusEffect: { type: 'vulnerable', value: 5, duration: 3 } },
  '皇家元素顺': { baseArmor: 50 },
};

/** 同元素手牌列表 */
const SAME_ELEMENT_HANDS = ['同元素', '元素顺', '元素葫芦', '皇家元素顺'];

/**
 * 计算预期出牌结果（纯函数，无副作用）
 * 
 * 从 DiceHeroGame.tsx 的 expectedOutcome useMemo 中提取。
 * 所有 setGame/setRerollCount 调用改为返回 PendingSideEffect[]。
 */
export function calculateExpectedOutcome(params: CalculateExpectedOutcomeParams): ExpectedOutcomeResult | null {
  const {
    selected, dice, activeHands, bestHand, game,
    targetEnemy, rerollCount,
    furyBonusDamage, bloodRerollCount, warriorRageMult, mageOverchargeMult,
  } = params;

  if (selected.length === 0) return null;

  const X = selected.reduce((sum, d) => sum + d.value, 0);
  let baseDamage = 0;
  let baseArmor = 0;
  let handMultiplier = 1;
  let baseHandValue = 0;
  let statusEffects: StatusEffect[] = [];
  const pendingSideEffects: PendingSideEffect[] = [];

  // ─── 手牌效果 ───
  activeHands.forEach(handName => {
    const handDef = HAND_TYPES.find(h => h.name === handName);
    if (handDef) {
      const level = game.handLevels[handName] || 1;
      const levelBonusMult = (level - 1) * 0.3;
      handMultiplier += ((handDef.mult || 1) - 1) + levelBonusMult;
    }

    const effect = HAND_EFFECT_TABLE[handName];
    if (effect?.baseArmor) baseArmor += effect.baseArmor;
    if (effect?.statusEffect) statusEffects.push({ ...effect.statusEffect });
  });

  baseDamage = Math.floor(X * handMultiplier);

  // 同元素手牌：护甲 += 基础伤害
  if (activeHands.some((h: string) => SAME_ELEMENT_HANDS.includes(h))) {
    baseArmor += baseDamage;
  }

  // ─── 累加变量 ───
  let extraDamage = 0;
  let extraArmor = 0;
  let extraHeal = 0;
  let holyPurify = 0;
  let pierceDamage = 0;
  let armorBreak = false;
  let multiplier = 1;
  let goldBonus = 0;
  const triggeredAugments: { name: string, details: string, rawDamage?: number, rawMult?: number, relicId?: string, icon?: string }[] = [];

  // ─── 遗物 on_play 效果 ───
  game.relics.filter(r => r.trigger === 'on_play').forEach(relic => {
    // counter 机制（铁血战旗等计数型遗物）
    if (relic.maxCounter !== undefined) {
      const currentCounter = game.relics.find(r2 => r2.id === relic.id)?.counter || 0;
      const newCounter = currentCounter + 1;
      if (newCounter < relic.maxCounter) {
        pendingSideEffects.push({ type: 'setRelicCounter', relicId: relic.id, counter: newCounter });
        return;
      }
      pendingSideEffects.push({ type: 'resetRelicCounter', relicId: relic.id, counter: 0 });
    }
    const relicCtx = buildRelicContext({
      game,
      dice,
      targetEnemy,
      rerollsThisTurn: rerollCount,
      handType: bestHand,
      selectedDice: selected,
      pointSum: X,
      hasPlayedThisTurn: (game.comboCount || 0) > 0,
    });
    const res = relic.effect(relicCtx);
    const details = [];
    if (res.damage) { extraDamage += res.damage; details.push(`伤害+${res.damage}`); }
    if (res.armor) { extraArmor += res.armor; details.push(`护甲+${res.armor}`); }
    if (res.heal) { extraHeal += res.heal; details.push(`回复+${res.heal}`); }
    if (res.multiplier && res.multiplier !== 1) { multiplier *= res.multiplier; details.push(`倍率${Math.round(res.multiplier * 100)}%`); }
    if (res.pierce) { pierceDamage += res.pierce; details.push(`穿透+${res.pierce}`); }
    if (res.goldBonus) { goldBonus += res.goldBonus; details.push(`金币+${res.goldBonus}`); }
    if (res.goldBonus) { /* toast will be shown in playHand */ }
    if (res.purifyDebuff) {
      holyPurify += (typeof res.purifyDebuff === 'number' ? res.purifyDebuff : 1);
      details.push('净化');
    }
    if (res.tempDrawBonus) {
      pendingSideEffects.push({ type: 'setRelicTempDrawBonus', value: res.tempDrawBonus });
      details.push('下回合+1手牌');
    }
    if (res.grantExtraPlay) {
      pendingSideEffects.push({ type: 'grantExtraPlay', value: res.grantExtraPlay });
      details.push(`+${res.grantExtraPlay}出牌`);
    }
    if (res.grantFreeReroll) {
      pendingSideEffects.push({ type: 'grantFreeReroll', value: res.grantFreeReroll });
      details.push(`+${res.grantFreeReroll}免费重投`);
    }
    if (res.keepHighestDie) {
      pendingSideEffects.push({ type: 'setRelicKeepHighest', value: res.keepHighestDie });
      details.push('保留最高点骰子');
    }
    if (details.length > 0) {
      triggeredAugments.push({ name: relic.name, details: details.join(', '), rawDamage: (res.damage || 0) + (res.pierce || 0), rawMult: res.multiplier && res.multiplier !== 1 ? res.multiplier : undefined, relicId: relic.id, icon: relic.icon });
    }
  });

  // ─── 怒火燎原 ───
  if ((game.rageFireBonus || 0) > 0) {
    extraDamage += game.rageFireBonus!;
    triggeredAugments.push({ name: '怒火燎原', details: `伤害+${game.rageFireBonus}`, rawDamage: game.rageFireBonus!, relicId: 'rage_fire_relic', icon: 'blade' });
    pendingSideEffects.push({ type: 'consumeRageFire' });
  }

  // ─── 骰子 onPlay 效果（委托给 diceOnPlayCalc） ───
  const skipOnPlay = selected.length > 1 && activeHands.includes('普通攻击') && activeHands.length === 1;
  const isSameElementHand = activeHands.some((h: string) => SAME_ELEMENT_HANDS.includes(h));
  const isRoyalElement = activeHands.some((h) => h === '皇家元素顺');
  const elementBonus = isRoyalElement ? 3.0 : (isSameElementHand ? 2.0 : 1.0);

  const hasUnify = selected.some(d => getDiceDef(d.diceDefId).onPlay?.unifyElement);
  // 确定性选择：统一为第一个被选骰子的元素（预览需要确定性，避免 Math.random 导致 UI 闪烁）
  const unifiedElement = hasUnify && !skipOnPlay ? (selected.find(d => d.element && d.element !== 'normal')?.element || 'fire') : null;

  selected.forEach(d => {
    const diceResult = processDiceOnPlayEffects(d, {
      selected,
      dice,
      activeHands,
      game,
      targetEnemy,
      elementBonus,
      skipOnPlay,
      unifiedElement,
      furyBonusDamage,
    });

    // 归并增量到主累加器
    extraDamage += diceResult.extraDamage;
    extraArmor += diceResult.extraArmor;
    extraHeal += diceResult.extraHeal;
    pierceDamage += diceResult.pierceDamage;
    if (diceResult.armorBreak) armorBreak = true;
    multiplier *= diceResult.multiplier;
    holyPurify += diceResult.holyPurify;
    statusEffects.push(...diceResult.statusEffects);
  });

  // ─── 法师过充倍率加成 ───
  if (game.playerClass === 'mage' && mageOverchargeMult > 0) {
    multiplier *= (1 + mageOverchargeMult);
    triggeredAugments.push({ name: '过充吟唱', details: `伤害×${Math.round((1 + mageOverchargeMult) * 100)}%`, rawMult: 1 + mageOverchargeMult });
  }

  // ─── 最终伤害计算 ───
  const totalDamage = Math.floor(baseDamage * multiplier) + extraDamage + pierceDamage;

  let modifiedDamage = totalDamage;
  const playerWeak = game.statuses.find(s => s.type === 'weak');
  if (playerWeak) modifiedDamage = Math.floor(modifiedDamage * 0.75);

  const enemyVulnerable = targetEnemy?.statuses.find(s => s.type === 'vulnerable');
  if (enemyVulnerable) modifiedDamage = Math.floor(modifiedDamage * 1.5);

  // 战士【血怒战意】（封顶走 FURY_CONFIG）
  const effectiveFuryStacks = game.playerClass === 'warrior' ? Math.min(bloodRerollCount, FURY_CONFIG.maxStack) : 0;
  if (effectiveFuryStacks > 0) {
    modifiedDamage = Math.floor(modifiedDamage * (1 + effectiveFuryStacks * FURY_CONFIG.damagePerStack));
  }
  // 战士【狂暴本能】
  if (game.playerClass === 'warrior' && warriorRageMult > 0) {
    modifiedDamage = Math.floor(modifiedDamage * (1 + warriorRageMult));
  }
  // 盗贼【连击加成】
  if (game.playerClass === 'rogue' && (game.comboCount || 0) >= 1 && bestHand !== '普通攻击') {
    modifiedDamage = Math.floor(modifiedDamage * 1.2);
  }

  return {
    damage: modifiedDamage,
    armor: Math.floor(baseArmor + extraArmor),
    heal: extraHeal,
    baseDamage,
    baseHandValue,
    handMultiplier,
    extraDamage: modifiedDamage - baseDamage - pierceDamage,
    pierceDamage,
    armorBreak,
    multiplier,
    triggeredAugments,
    bestHand,
    statusEffects,
    X,
    selectedValues: selected.map(d => d.value),
    goldBonus,
    holyPurify,
    pendingSideEffects,
  };
}
