/**
 * 骰子 onPlay 战士效果 — ARCH-19 从 diceOnPlayCalc.ts 拆出
 *
 * 职责：处理战士职业骰子的 onPlay 效果（armor / armorBreak / berserk / execute / firstPlay / scaleWithLostHp / 等）。
 * 注意：字段标签不绑定职业，法师的 mage_missile 也会走 armorBreak/armorToDamage——这是现有设计，非 bug。
 */

import type { Die, DiceDef } from '../../types/game';
import type { DiceOnPlayContext, DiceOnPlayResult } from './types';

/**
 * 应用战士效果（按原 L229-293 块迁移，签名 + ctx + out 引用）
 *
 * @param op     NonNullable<DiceDef['onPlay']>，调用方须保证已 && 判空
 * @param d      当前骰子
 * @param ctx    只读上下文
 * @param out    增量结果（原地修改）
 */
export function applyWarriorCalc(
  op: NonNullable<DiceDef['onPlay']>,
  d: Die,
  ctx: DiceOnPlayContext,
  out: DiceOnPlayResult,
): void {
  const { selected, game, targetEnemy, elementBonus, furyBonusDamage, activeHands } = ctx;

  // [ARCH] depth 字段已从 GameState 移除 — 使用地图节点深度近似
  const currentDepth = game.map.find(n => n.id === game.currentNodeId)?.depth ?? 0;
  const depthDmgBonus = 1 + Math.floor(currentDepth / 3) * 0.15;

  if (op.selfDamagePercent) {
    const selfDmg = Math.ceil(game.maxHp * op.selfDamagePercent);
    if (game.hp + out.extraHeal > selfDmg) {
      out.extraHeal -= selfDmg;
    }
  }
  if (op.armor) out.extraArmor += op.armor;
  if (op.armorFromValue) out.extraArmor += d.value;
  if (op.armorFromTotalPoints) out.extraArmor += selected.reduce((sum, sd) => sum + sd.value, 0);
  if (op.armorBreak) out.armorBreak = true;
  if (op.armorToDamage && targetEnemy) out.extraDamage += (targetEnemy.armor || 0);
  if (op.scaleWithHits) out.extraDamage += furyBonusDamage;
  if (op.firstPlayOnly && op.bonusDamage) {
    const isFirstPlay = (game.comboCount || 0) === 0 && game.battleTurn <= 1;
    if (isFirstPlay) out.extraDamage += Math.floor(op.bonusDamage * elementBonus * depthDmgBonus);
  }
  if (op.scaleWithLostHp) {
    const lostHp = game.maxHp - game.hp;
    out.extraDamage += Math.floor(lostHp * op.scaleWithLostHp);
  }
  if (op.executeThreshold && op.executeMult && targetEnemy) {
    if (targetEnemy.hp / targetEnemy.maxHp < op.executeThreshold) {
      out.multiplier *= op.executeMult;
      if (op.executeHeal) out.extraHeal += op.executeHeal;
    }
  }
  if (op.aoeDamage) out.extraDamage += op.aoeDamage;
  if (op.healFromValue) out.extraHeal += d.value;
  if (op.maxHpBonus) out.extraHeal += op.maxHpBonus;
  if (op.healOrMaxHp) {
    if (game.hp < game.maxHp) out.extraHeal += d.value;
  }
  if (op.lowHpOverrideValue && op.lowHpThreshold) {
    if (game.hp / game.maxHp < op.lowHpThreshold && d.value < op.lowHpOverrideValue) {
      out.extraDamage += (op.lowHpOverrideValue - d.value);
    }
  }
  if (op.requiresTriple && op.bonusDamageFromPoints) {
    const tripleHands = ['三条', '四条', '五条', '六条', '葫芦'];
    if (activeHands.some((h: string) => tripleHands.includes(h))) {
      const totalPoints = selected.reduce((sum, sd) => sum + sd.value, 0);
      out.extraDamage += Math.floor(totalPoints * op.bonusDamageFromPoints);
    }
  }
  if (op.scaleWithBloodRerolls && game.bloodRerollCount) {
    const faceBonus = Math.min(game.bloodRerollCount, 3);
    out.extraDamage += faceBonus;
  }
  if (op.selfBerserk) {
    out.multiplier *= 1.3;
    const berserkDmg = Math.ceil(game.maxHp * 0.05);
    if (game.hp + out.extraHeal > berserkDmg) {
      out.extraHeal -= berserkDmg;
    }
  }
  if (op.scaleWithSelfDamage) {
    const selfDmgThisTurn = (game.bloodRerollCount || 0) * 2;
    out.multiplier *= (1 + selfDmgThisTurn * 0.02);
  }
  if (op.damageFromArmor) {
    out.extraDamage += Math.floor((game.armor + out.extraArmor) * op.damageFromArmor);
  }
  if (op.purifyAll) out.holyPurify += 99;
  if (op.tauntAll) { /* 在出牌后实际应用时处理 */ }
}
