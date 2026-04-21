/**
 * 骰子特殊效果处理 - 元素坍缩 + 小丑随机 + 法师元素操控
 */
import type { Die, DiceElement } from '../types/game';
import { getDiceDef, collapseElement, ELEMENTAL_COLLAPSE_ELEMENTS } from '../data/dice';

export const applyDiceSpecialEffects = (diceArr: Die[], options?: { hasLimitBreaker?: boolean; lockedElement?: string }): Die[] => {
  const hasElemental = diceArr.some(d => getDiceDef(d.diceDefId).isElemental);
  const sharedElement = hasElemental ? (options?.lockedElement as DiceElement || collapseElement()) : null;
  // 第二元素（给棱镜骰子用）
  let secondElement: DiceElement | null = null;
  if (sharedElement) {
    const others = ELEMENTAL_COLLAPSE_ELEMENTS.filter(e => e !== sharedElement);
    secondElement = others[Math.floor(Math.random() * others.length)] as DiceElement;
  }

  let result = diceArr.map(d => {
    const def = getDiceDef(d.diceDefId);
    if (def.isElemental && sharedElement) {
      // 棱镜骰子：双元素坍缩
      if (def.onPlay?.dualElement && secondElement) {
        return { ...d, element: sharedElement as DiceElement, collapsedElement: sharedElement as DiceElement, secondElement: secondElement };
      }
      return { ...d, element: sharedElement as DiceElement, collapsedElement: sharedElement as DiceElement };
    }
    if (d.diceDefId === 'joker') {
      const maxVal = options?.hasLimitBreaker ? 100 : 9;
      const val = Math.floor(Math.random() * maxVal) + 1;
      return { ...d, value: val };
    }
    return d;
  });

  // 共鸣骰子(copyMajorityElement)：复制手牌中数量最多的元素
  const resonanceDice = result.filter(d => getDiceDef(d.diceDefId).onPlay?.copyMajorityElement && getDiceDef(d.diceDefId).isElemental);
  if (resonanceDice.length > 0) {
    const elemCounts: Record<string, number> = {};
    result.forEach(d => {
      if (d.collapsedElement && d.collapsedElement !== 'normal' && !getDiceDef(d.diceDefId).onPlay?.copyMajorityElement) {
        elemCounts[d.collapsedElement] = (elemCounts[d.collapsedElement] || 0) + 1;
      }
    });
    const majorityElem = Object.entries(elemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as DiceElement | undefined;
    if (majorityElem) {
      result = result.map(d => {
        if (getDiceDef(d.diceDefId).onPlay?.copyMajorityElement) {
          return { ...d, element: majorityElem, collapsedElement: majorityElem };
        }
        return d;
      });
    }
  }

  return result;
};
