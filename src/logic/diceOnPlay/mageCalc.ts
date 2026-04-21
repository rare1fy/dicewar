/**
 * 骰子 onPlay 法师效果 — ARCH-19 从 diceOnPlayCalc.ts 拆出
 *
 * 职责：处理法师职业骰子的 onPlay 效果（reverseValue / copyHighestValue / overrideValue / 元素联动 / chargeStacks / swapWithUnselected / multiElementBlast 等）。
 */

import type { Die, DiceDef } from '../../types/game';
import type { DiceOnPlayContext, DiceOnPlayResult } from './types';
import { applySecondElementEffect, applyMultiElementBlast } from './elementCalc';

/**
 * 应用法师效果（原 L295-363 块迁移）
 */
export function applyMageCalc(
  op: NonNullable<DiceDef['onPlay']>,
  d: Die,
  ctx: DiceOnPlayContext,
  out: DiceOnPlayResult,
  def: DiceDef,
  totalElementBonus: number,
): void {
  const { selected, dice, game, targetEnemy, elementBonus } = ctx;

  if (op.reverseValue) {
    const reversed = 7 - d.value;
    if (reversed > d.value) out.extraDamage += (reversed - d.value);
  }
  if (op.copyHighestValue) {
    const maxVal = Math.max(...selected.map(sd => sd.value));
    if (maxVal > d.value) out.extraDamage += (maxVal - d.value);
  }
  if (op.overrideValue) {
    if (op.overrideValue > d.value) out.extraDamage += (op.overrideValue - d.value);
  }
  if (op.bonusDamagePerElement) {
    const elemCount = dice.filter(dd => !dd.spent && dd.element !== 'normal').length;
    out.extraDamage += elemCount * op.bonusDamagePerElement;
  }
  if (op.multPerElement) {
    const elemCount = dice.filter(dd => !dd.spent && dd.element !== 'normal').length;
    out.multiplier *= (1 + elemCount * op.multPerElement);
  }
  if (op.burnEcho && targetEnemy) {
    const burnStacks = targetEnemy.statuses.find(s => s.type === 'burn')?.value || 0;
    if (burnStacks > 0) out.extraDamage += burnStacks * 5;
  }
  if (op.frostEchoDamage && targetEnemy) {
    const wasFrozen = targetEnemy.statuses.some(s => (s.type as string) === 'was_frozen');
    if (wasFrozen) out.multiplier *= (1 + op.frostEchoDamage);
  }
  if (op.damageShield) out.extraArmor += d.value * 2;
  if (op.armorFromHandSize) {
    const handSize = dice.filter(dd => !dd.spent).length;
    out.extraArmor += handSize * op.armorFromHandSize;
  }
  if (op.requiresCharge && op.bonusMult) {
    if ((game.chargeStacks || 0) >= op.requiresCharge) {
      const extraChargeLayers = Math.max(0, (game.chargeStacks || 0) - op.requiresCharge);
      const extraMult = op.bonusMultPerExtraCharge ? extraChargeLayers * op.bonusMultPerExtraCharge : 0;
      out.multiplier *= (op.bonusMult + extraMult);
    }
  }
  if (op.chainBolt) out.extraDamage += Math.floor(d.value * elementBonus);
  if (op.removeBurn) out.holyPurify += 1;
  if (op.healPerCleanse) {
    const negCount = game.statuses.filter(s => ['poison', 'burn', 'vulnerable', 'weak'].includes(s.type)).length;
    out.extraHeal += negCount * op.healPerCleanse;
  }
  // 双元素（棱镜骰子）— 非元素骰子不会走到这里，但保险起见
  if (def.isElemental && d.secondElement && d.secondElement !== d.collapsedElement) {
    applySecondElementEffect(d.secondElement, d.value, totalElementBonus, elementBonus, targetEnemy, out);
  }
  if (op.swapWithUnselected) {
    const unselected = dice.filter(dd => !dd.spent && !dd.selected);
    if (unselected.length > 0) {
      const best = unselected.reduce((a, b) => a.value > b.value ? a : b);
      if (best.value > d.value) out.extraDamage += (best.value - d.value);
    }
  }
  if (op.freezeBonus) {
    const existingFreeze = out.statusEffects.find(es => es.type === 'freeze');
    if (existingFreeze) { existingFreeze.value += op.freezeBonus; }
    else { out.statusEffects.push({ type: 'freeze', value: 1 + op.freezeBonus }); }
  }
  if (op.triggerAllElements) {
    const elementsInHand = new Set(dice.filter(dd => !dd.spent && dd.element !== 'normal').map(dd => dd.element));
    out.extraDamage += elementsInHand.size * 5;
  }
  if (op.multiElementBlast) {
    applyMultiElementBlast(selected, totalElementBonus, out);
  }
}
