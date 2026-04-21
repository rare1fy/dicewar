/**
 * 骰子 onPlay 盗贼效果 — ARCH-19 从 diceOnPlayCalc.ts 拆出
 *
 * 职责：处理盗贼职业骰子的 onPlay 效果（poison 系列 / combo 系列 / stealArmor / phantom / wildcard / transferDebuff / detonateAll 等）。
 */

import type { Die, DiceDef } from '../../types/game';
import type { DiceOnPlayContext, DiceOnPlayResult } from './types';
import { addPoisonStacks } from './elementCalc';
import { getDiceDef } from '../../data/dice';

/**
 * 应用盗贼效果（原 L365-440 块迁移）
 */
export function applyRogueCalc(
  op: NonNullable<DiceDef['onPlay']>,
  d: Die,
  ctx: DiceOnPlayContext,
  out: DiceOnPlayResult,
): void {
  const { selected, dice, game, targetEnemy } = ctx;

  if (op.comboBonus) out.multiplier *= (1 + op.comboBonus);
  if (op.poisonFromValue) {
    addPoisonStacks(out.statusEffects, d.value);
  }
  if (op.poisonInverse) {
    addPoisonStacks(out.statusEffects, Math.max(1, 7 - d.value));
  }
  if (op.poisonBase) {
    let poisonVal = d.value + op.poisonBase;
    if (op.poisonBonusIfPoisoned && targetEnemy?.statuses.some(s => s.type === 'poison')) {
      poisonVal += op.poisonBonusIfPoisoned;
    }
    addPoisonStacks(out.statusEffects, poisonVal);
  }
  if (op.critOnSecondPlay && (game.comboCount || 0) >= 1) out.multiplier *= op.critOnSecondPlay;
  if (op.comboScaleDamage) out.multiplier *= (1 + (game.comboCount || 0) * op.comboScaleDamage);
  if (op.poisonScaleDamage && targetEnemy) {
    const targetPoison = targetEnemy.statuses.find(s => s.type === 'poison')?.value || 0;
    out.extraDamage += targetPoison * op.poisonScaleDamage;
  }
  if (op.comboDetonatePoison && (game.comboCount || 0) >= 1 && targetEnemy) {
    const targetPoison = targetEnemy.statuses.find(s => s.type === 'poison')?.value || 0;
    out.extraDamage += Math.floor(targetPoison * op.comboDetonatePoison);
  }
  if (op.multOnThirdPlay && (game.comboCount || 0) >= 2) out.multiplier *= op.multOnThirdPlay;
  if (op.bonusDamageOnSecondPlay && (game.comboCount || 0) >= 1) out.extraDamage += op.bonusDamageOnSecondPlay;
  if (op.bonusMultOnSecondPlay && (game.comboCount || 0) >= 1) out.multiplier *= op.bonusMultOnSecondPlay;
  if (op.stealArmor && targetEnemy) {
    const stolen = Math.min(targetEnemy.armor, op.stealArmor);
    out.extraArmor += stolen;
  }
  if (op.poisonFromPoisonDice) {
    const poisonDiceCount = selected.filter(sd => {
      const dd = getDiceDef(sd.diceDefId);
      return dd.onPlay?.poisonInverse || dd.onPlay?.poisonBase || dd.onPlay?.statusToEnemy?.type === 'poison';
    }).length;
    const poisonVal = poisonDiceCount * op.poisonFromPoisonDice;
    if (poisonVal > 0) {
      addPoisonStacks(out.statusEffects, poisonVal);
    }
  }
  if (op.detonatePoisonPercent && targetEnemy) {
    const currentPoison = targetEnemy.statuses.find(s => s.type === 'poison')?.value || 0;
    const extraPlays = Math.max(0, (game.comboCount || 0) - 1);
    const detonateRate = Math.min(1, op.detonatePoisonPercent + (op.detonateExtraPerPlay || 0) * extraPlays);
    out.extraDamage += Math.floor(currentPoison * detonateRate);
  }
  if (op.escalateDamage) out.multiplier *= (1 + (game.comboCount || 0) * op.escalateDamage);
  if (op.phantomFromShadowDice) {
    const shadowCount = dice.filter(dd => !dd.spent && dd.diceDefId === 'temp_rogue').length;
    const phantomVal = Math.max(2, shadowCount * 2);
    if (phantomVal > d.value) out.extraDamage += (phantomVal - d.value);
  }
  if (op.wildcard) {
    if (d.value < 6) out.extraDamage += (6 - d.value);
  }
  if (op.purifyOne) out.holyPurify += 1;
  if (op.comboHeal && (game.comboCount || 0) >= 1) out.extraHeal += op.comboHeal;
  if (op.transferDebuff) {
    const negativeStatuses = game.statuses.filter(s => ['poison', 'burn', 'vulnerable', 'weak'].includes(s.type));
    if (negativeStatuses.length > 0) {
      out.holyPurify += 1;
      const transferred = negativeStatuses[0];
      out.statusEffects.push({ type: transferred.type, value: transferred.value });
    }
  }
  if (op.detonateAllOnLastPlay && game.playerClass === 'rogue') {
    if ((game.comboCount || 0) >= 1 && targetEnemy) {
      const totalDebuffs = targetEnemy.statuses.reduce((sum, s) => {
        if (['poison', 'burn', 'vulnerable', 'weak'].includes(s.type)) return sum + s.value;
        return sum;
      }, 0);
      out.extraDamage += totalDebuffs * 2;
    }
  }
}
