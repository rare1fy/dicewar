/**
 * 骰子 onPlay 效果计算主编排器 — ARCH-19 从 diceOnPlayCalc.ts 瘦身为调度层
 *
 * 职责：
 *   1. 导出 DiceOnPlayContext / DiceOnPlayResult 接口 + emptyDiceOnPlayResult 工厂
 *   2. 编排 processDiceOnPlayEffects：元素 → 基础效果 → 战士 → 法师 → 盗贼
 *   3. 所有业务逻辑下沉到 elementCalc / warriorCalc / mageCalc / rogueCalc 子模块
 *
 * 纯函数，无副作用。通过 DiceOnPlayContext 传入所有依赖，通过 DiceOnPlayResult 返回增量。
 */

import type { Die } from '../../types/game';
import { getDiceDef, getUpgradedOnPlay, getElementLevelBonus } from '../../data/dice';

import {
  applyElementEffect,
  applySecondElementEffect,
} from './elementCalc';
import { applyWarriorCalc } from './warriorCalc';
import { applyMageCalc } from './mageCalc';
import { applyRogueCalc } from './rogueCalc';

import type { DiceOnPlayContext, DiceOnPlayResult } from './types';
import { emptyDiceOnPlayResult } from './types';

// 类型 re-export，保持调用方零改动
export type { DiceOnPlayContext, DiceOnPlayResult } from './types';
export { emptyDiceOnPlayResult } from './types';

/**
 * 单颗骰子 onPlay 效果的完整计算编排
 *
 * 执行顺序：元素效果 → 基础效果（跨职业通用）→ 战士效果 → 法师效果 → 盗贼效果
 * 所有增量通过 DiceOnPlayResult 返回，由调用方归并。
 */
export function processDiceOnPlayEffects(
  d: Die,
  ctx: DiceOnPlayContext,
): DiceOnPlayResult {
  const out = emptyDiceOnPlayResult();
  const { game, targetEnemy, elementBonus, skipOnPlay, unifiedElement } = ctx;

  if (skipOnPlay) return out;

  const def = getDiceDef(d.diceDefId);
  const diceLevel = game.ownedDice.find(od => od.defId === d.diceDefId)?.level || 1;
  const levelBonus = getElementLevelBonus(diceLevel);
  const totalElementBonus = elementBonus * levelBonus;

  // ─── 元素骰子效果（元素骰子直接 return，不走职业分支）───
  const activeElement = unifiedElement || d.collapsedElement;
  if (def.isElemental && activeElement) {
    applyElementEffect(activeElement, d.value, totalElementBonus, elementBonus, targetEnemy, out);
    // 双元素（棱镜骰子）
    if (d.secondElement && d.secondElement !== d.collapsedElement) {
      applySecondElementEffect(d.secondElement, d.value, totalElementBonus, elementBonus, targetEnemy, out);
    }
    return out;
  }

  // ─── 反噬（selfDamage）— 非 upgraded onPlay，用 def.onPlay 原始值 ───
  if (def.onPlay?.selfDamage) {
    if (game.hp + out.extraHeal > def.onPlay.selfDamage) {
      out.extraHeal -= def.onPlay.selfDamage;
    }
  }

  if (!def.onPlay) return out;
  const upgradedOp = getUpgradedOnPlay(def, diceLevel);
  const op = upgradedOp || def.onPlay;

  // [ARCH] depth 字段已从 GameState 移除 — 使用地图节点深度近似
  const currentDepth = game.map.find(n => n.id === game.currentNodeId)?.depth ?? 0;
  const depthDmgBonus = 1 + Math.floor(currentDepth / 3) * 0.15;
  const depthMultBonus = Math.floor(currentDepth / 5) * 0.05;

  // ─── 基础效果（跨职业通用字段：bonusDamage / bonusMult / heal / pierce / statusToEnemy）───
  if (op.bonusDamage && !op.firstPlayOnly && !op.requiresTriple) {
    out.extraDamage += Math.floor(op.bonusDamage * elementBonus * depthDmgBonus);
  }
  if (op.bonusMult && !op.requiresCharge) out.multiplier *= (1 + (op.bonusMult - 1 + depthMultBonus) * elementBonus);
  if (op.heal) out.extraHeal += Math.floor(op.heal * elementBonus);
  if (op.pierce) out.pierceDamage += Math.floor(op.pierce * elementBonus);
  if (op.statusToEnemy) {
    const boostedValue = Math.floor(op.statusToEnemy.value * elementBonus);
    const existing = out.statusEffects.find(es => es.type === op.statusToEnemy!.type);
    if (existing) { existing.value += boostedValue; }
    else { out.statusEffects.push({ ...op.statusToEnemy, value: boostedValue }); }
  }

  // ─── 战士 / 法师 / 盗贼效果 ───
  applyWarriorCalc(op, d, ctx, out);
  applyMageCalc(op, d, ctx, out, def, totalElementBonus);
  applyRogueCalc(op, d, ctx, out);

  return out;
}
