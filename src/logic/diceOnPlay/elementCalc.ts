/**
 * 骰子 onPlay 元素效果 — ARCH-19 从 diceOnPlayCalc.ts 拆出
 *
 * 职责：处理元素骰子的主元素、双元素（棱镜）、棱镜爆炸。
 * 所有函数原地修改 out（引用传递），零对象创建开销。
 */

import type { Die, StatusEffect, Enemy } from '../../types/game';
import type { DiceOnPlayResult } from './types';

/**
 * 主元素效果
 */
export function applyElementEffect(
  activeElement: string,
  diceValue: number,
  totalElementBonus: number,
  elementBonus: number,
  targetEnemy: Enemy | null,
  out: DiceOnPlayResult,
): void {
  switch (activeElement) {
    case 'fire':
      out.pierceDamage += Math.floor(diceValue * 2 * totalElementBonus);
      out.armorBreak = true;
      out.statusEffects.push({ type: 'burn', value: diceValue });
      break;
    case 'ice':
      if (!targetEnemy?.statuses?.some(s => (s.type as string) === 'freeze_immune')) {
        out.statusEffects.push({ type: 'freeze', value: 1, duration: 1 });
      }
      break;
    case 'thunder':
      out.pierceDamage += Math.floor(diceValue * 2 * totalElementBonus);
      break;
    case 'poison': {
      const poisonStacks = Math.floor((diceValue + 2) * totalElementBonus);
      const existingPoison = out.statusEffects.find(es => es.type === 'poison');
      if (existingPoison) existingPoison.value += poisonStacks;
      else out.statusEffects.push({ type: 'poison', value: poisonStacks });
      break;
    }
    case 'holy':
      out.extraHeal += Math.floor(diceValue * elementBonus);
      out.holyPurify += 1;
      break;
  }
}

/**
 * 处理第二元素（棱镜骰子）效果
 */
export function applySecondElementEffect(
  secondElement: string,
  diceValue: number,
  totalElementBonus: number,
  elementBonus: number,
  targetEnemy: Enemy | null,
  out: DiceOnPlayResult,
): void {
  switch (secondElement) {
    case 'fire':
      out.pierceDamage += Math.floor(diceValue * totalElementBonus);
      out.statusEffects.push({ type: 'burn', value: Math.max(1, Math.floor(diceValue / 2)) });
      break;
    case 'ice':
      if (!targetEnemy?.statuses?.some(s => (s.type as string) === 'freeze_immune')) {
        out.statusEffects.push({ type: 'freeze', value: 1, duration: 1 });
      }
      break;
    case 'thunder':
      out.pierceDamage += Math.floor(diceValue * totalElementBonus);
      break;
    case 'poison': {
      const pStacks = Math.floor((diceValue + 1) * totalElementBonus);
      const ep = out.statusEffects.find(es => es.type === 'poison');
      if (ep) ep.value += pStacks; else out.statusEffects.push({ type: 'poison', value: pStacks });
      break;
    }
    case 'holy':
      out.extraHeal += Math.floor(diceValue * 0.5 * elementBonus);
      break;
  }
}

/**
 * 累加毒层到 statusEffects（跨职业共享工具函数）
 */
export function addPoisonStacks(statusEffects: StatusEffect[], poisonVal: number): void {
  const existing = statusEffects.find(es => es.type === 'poison');
  if (existing) { existing.value += poisonVal; }
  else { statusEffects.push({ type: 'poison', value: poisonVal }); }
}

/**
 * 处理元素风暴（multiElementBlast）— 每颗选中骰子各触发确定性轮转元素
 */
export function applyMultiElementBlast(
  selected: Die[],
  totalElementBonus: number,
  out: DiceOnPlayResult,
): void {
  const elements = ['fire', 'ice', 'thunder', 'poison', 'holy'];
  selected.forEach((sd, idx) => {
    // 确定性轮转：按骰子索引选元素，避免 Math.random 导致预览闪烁
    const randElem = elements[idx % elements.length];
    const dv = sd.value;
    switch (randElem) {
      case 'fire': out.pierceDamage += Math.floor(dv * totalElementBonus); out.statusEffects.push({ type: 'burn', value: Math.max(1, Math.floor(dv / 2)) }); break;
      case 'ice': out.statusEffects.push({ type: 'freeze', value: 1, duration: 1 }); break;
      case 'thunder': out.pierceDamage += Math.floor(dv * totalElementBonus); break;
      case 'poison': {
        const ps = Math.floor((dv + 1) * totalElementBonus);
        const ep = out.statusEffects.find(es => es.type === 'poison');
        if (ep) ep.value += ps; else out.statusEffects.push({ type: 'poison', value: ps });
        break;
      }
      case 'holy': out.extraHeal += Math.floor(dv * 0.5); break;
    }
  });
}
