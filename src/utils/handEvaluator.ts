import { Die, HandType, HandResult } from '../types/game';
import { getDiceDef } from '../data/dice';

export const checkHands = (dice: Die[], options?: { straightUpgrade?: number; pairAsTriplet?: boolean }): HandResult => {
  // [FIXED PHASER-FIX-STRAIGHT-UPGRADE 2026-04-21] 消费 straightUpgrade：顺子长度升档，6顺封顶。
  // Designer 裁定口径：仅做顺子系长度升档（顺子→4顺→5顺→6顺封顶），不可升成元素顺/皇家元素顺。
  const straightUpgrade = Math.max(0, options?.straightUpgrade ?? 0);
  // PHASER-FIX-STRAIGHT-PENDING-2：对子满足三条判型门槛（万象归一遗物）
  const hasPairAsTriplet = options?.pairAsTriplet ?? false;
  if (dice.length === 0) return { bestHand: '普通攻击', allHands: [], activeHands: ['普通攻击'] };

  // ignoreForHandType: 镜像骰子等不参与牌型判定，但其点数仍计入总点数
  const handDice = dice.filter(d => !getDiceDef(d.diceDefId).onPlay?.ignoreForHandType);
  const values = (handDice.length > 0 ? handDice : dice).map(d => d.value).sort((a, b) => a - b);
  const elements = dice.map(d => d.element);
  const uniqueElements = new Set(elements);

  // 同元素: 所有选中骰子同一元素，且至少4颗，且非normal
  const isSameElement = uniqueElements.size === 1 && dice.length >= 4 && elements[0] !== 'normal';

  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const sortedCounts = Object.values(counts).sort((a, b) => b - a);
  const maxCount = sortedCounts[0];
  const isTwoPair = sortedCounts.length >= 2 && sortedCounts[0] === 2 && sortedCounts[1] === 2;
  const isThreePair = sortedCounts.length >= 3 && sortedCounts[0] === 2 && sortedCounts[1] === 2 && sortedCounts[2] === 2;
  const isFullHouse = sortedCounts.length >= 2 && sortedCounts[0] >= 3 && sortedCounts[1] >= 2;

  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
  let isStraight = false;
  let straightLen = 0;
  // 顺子：至少 3 颗连续点数
  if (uniqueValues.length === dice.length && dice.length >= 3) {
    if (uniqueValues[uniqueValues.length - 1] - uniqueValues[0] === dice.length - 1) {
      isStraight = true;
      straightLen = dice.length;
    }
  }

  // 消费 straightUpgrade：仅对已成立的顺子生效，按档位升级，封顶 6顺
  if (isStraight && straightUpgrade > 0) {
    straightLen = Math.min(6, straightLen + straightUpgrade);
  }

  const hands: Set<HandType> = new Set();

  // 基础牌型检测
  if (maxCount === 6 && dice.length === 6) hands.add('六条');
  if (maxCount === 5 && dice.length === 5) hands.add('五条');
  if (maxCount === 4 && dice.length === 4) hands.add('四条');
  if (maxCount === 3 && dice.length === 3) hands.add('三条');
  // 3+3 = 6颗骰子，两种点数各3颗 → 识别为葫芦（超级三条）
  if (maxCount >= 3 && sortedCounts.length >= 2 && sortedCounts[1] >= 3 && dice.length === 6) hands.add('葫芦');
  if (maxCount === 2 && dice.length === 2) hands.add('对子');
  // PHASER-FIX-STRAIGHT-PENDING-2：对子满足三条判型门槛
  if (hasPairAsTriplet && maxCount === 2 && dice.length === 2) hands.add('三条');
  if (isFullHouse && dice.length === 5) hands.add('葫芦');
  // 4+2 = 6颗葫芦
  if (sortedCounts.length >= 2 && sortedCounts[0] === 4 && sortedCounts[1] === 2 && dice.length === 6) hands.add('葫芦');
  if (isTwoPair && dice.length === 4) hands.add('连对');
  if (isThreePair && dice.length === 6) hands.add('三连对');
  
  // 顺子按长度区分
  if (isStraight && straightLen === 6) hands.add('6顺');
  else if (isStraight && straightLen === 5) hands.add('5顺');
  else if (isStraight && straightLen === 4) hands.add('4顺');
  else if (isStraight && straightLen >= 3) hands.add('顺子');
  
  if (isSameElement) hands.add('同元素');
  if (isStraight && isSameElement) hands.add('元素顺');
  if (isStraight && isSameElement && values[0] === 1 && values[values.length - 1] === 6) hands.add('皇家元素顺');
  if (isSameElement && isFullHouse) hands.add('元素葫芦');

  if (hands.size === 0) {
    if (dice.length === 1) {
      hands.add('普通攻击');
    } else {
      return { bestHand: '普通攻击', allHands: ['普通攻击'], activeHands: ['普通攻击'] };
    }
  }

  const allHands = Array.from(hands);

  // 确定生效牌型
  const activeHands: HandType[] = [];
  let hasBaseHand = false;

  // N条 / 葫芦 / 连对 / 对子 互斥，取最高
  if (maxCount === 6 && dice.length === 6) { activeHands.push('六条'); hasBaseHand = true; }
  else if (maxCount === 5 && dice.length === 5) { activeHands.push('五条'); hasBaseHand = true; }
  else if (maxCount === 4 && dice.length === 4) { activeHands.push('四条'); hasBaseHand = true; }
  else if (isFullHouse && dice.length === 5) { activeHands.push('葫芦'); hasBaseHand = true; }
  // 3+3 = 6颗骰子两种各3个 → 葫芦
  else if (maxCount >= 3 && sortedCounts.length >= 2 && sortedCounts[1] >= 3 && dice.length === 6) { activeHands.push('葫芦'); hasBaseHand = true; }
  // 4+2 = 6颗葫芦
  else if (sortedCounts.length >= 2 && sortedCounts[0] === 4 && sortedCounts[1] === 2 && dice.length === 6) { activeHands.push('葫芦'); hasBaseHand = true; }
  else if (maxCount === 3 && dice.length === 3) { activeHands.push('三条'); hasBaseHand = true; }
  else if (isThreePair && dice.length === 6) { activeHands.push('三连对'); hasBaseHand = true; }
  else if (isTwoPair && dice.length === 4) { activeHands.push('连对'); hasBaseHand = true; }
  else if (maxCount === 2 && dice.length === 2) { activeHands.push('对子'); hasBaseHand = true; }
  // PHASER-FIX-STRAIGHT-PENDING-2：对子视为三条结算
  if (hasPairAsTriplet && maxCount === 2 && dice.length === 2 && !activeHands.includes('三条')) { activeHands.push('三条'); hasBaseHand = true; }

  // 顺子可叠加（按长度取最高）
  if (isStraight) {
    if (straightLen === 6) activeHands.push('6顺');
    else if (straightLen === 5) activeHands.push('5顺');
    else if (straightLen === 4) activeHands.push('4顺');
    else activeHands.push('顺子');
    hasBaseHand = true;
  }
  
  // 同元素可叠加
  if (isSameElement) { activeHands.push('同元素'); hasBaseHand = true; }

  // 组合牌型
  if (isStraight && isSameElement && values[0] === 1 && values[values.length - 1] === 6) { activeHands.push('皇家元素顺'); }
  else if (isStraight && isSameElement) { activeHands.push('元素顺'); }
  if (isSameElement && isFullHouse) { activeHands.push('元素葫芦'); }

  if (!hasBaseHand && dice.length === 1) {
    activeHands.push('普通攻击');
  }

  // 按优先级排序
  const priority: HandType[] = [
    '皇家元素顺', '元素葫芦', '元素顺', '六条', '五条', '四条', '葫芦', '同元素', '6顺', '5顺', '4顺', '顺子', '三条', '三连对', '连对', '对子', '普通攻击'
  ];
  activeHands.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

  const bestHand = activeHands.join(' + ');

  return { bestHand, allHands, activeHands };
};

export const canFormValidHand = (_selected: Die[], _candidate: Die, _available: Die[]): boolean => {
  return true; // Any combination is valid: non-hand = 普通攻击
};

/**
 * 对手中所有未使用的骰子，检测哪些可以参与组成牌型（对子以上）。
 * 返回一个 Set<number>，包含所有"能组成牌型"的骰子ID。
 * 
 * 如果传入了 selectedId，则只返回能和该骰子一起组成牌型的骰子ID集合。
 */
export const findHandCandidates = (allDice: Die[], selectedId?: number): Set<number> => {
  const available = allDice.filter(d => !d.spent && !d.rolling);
  if (available.length < 2) return new Set();

  const result = new Set<number>();

  if (selectedId !== undefined) {
    // 模式B：找能和selectedId一起组成牌型的骰子
    const anchor = available.find(d => d.id === selectedId);
    if (!anchor) return result;
    result.add(selectedId); // 自己总是候选

    for (const other of available) {
      if (other.id === selectedId) continue;
      // 检测 anchor + other 能否组成对子以上
      const pair = [anchor, other];
      const hand = checkHands(pair);
      if (hand.activeHands.some(h => h !== '普通攻击')) {
        result.add(other.id);
        continue;
      }
      // 也检测 anchor + other + 其他已选的骰子 是否能组合
      const selected = available.filter(d => d.selected && d.id !== selectedId);
      if (selected.length > 0) {
        const combo = [anchor, ...selected, other];
        const comboHand = checkHands(combo);
        if (comboHand.activeHands.some(h => h !== '普通攻击')) {
          result.add(other.id);
        }
      }
    }
    return result;
  }

  // 模式A：没有选中骰子时，找所有可以和任意其他骰子组成牌型的骰子
  // 检查对子：相同点数
  const valueCounts: Record<number, number[]> = {};
  available.forEach(d => {
    if (!valueCounts[d.value]) valueCounts[d.value] = [];
    valueCounts[d.value].push(d.id);
  });
  for (const ids of Object.values(valueCounts)) {
    if (ids.length >= 2) ids.forEach(id => result.add(id));
  }

  // 检查顺子：连续3+个不同值
  const uniqueVals = [...new Set(available.map(d => d.value))].sort((a, b) => a - b);
  for (let i = 0; i < uniqueVals.length - 2; i++) {
    if (uniqueVals[i + 1] === uniqueVals[i] + 1 && uniqueVals[i + 2] === uniqueVals[i] + 2) {
      // 找到3连续，标记这些值的骰子
      const seqVals = new Set([uniqueVals[i], uniqueVals[i + 1], uniqueVals[i + 2]]);
      // 扩展连续序列
      let j = i + 3;
      while (j < uniqueVals.length && uniqueVals[j] === uniqueVals[j - 1] + 1) {
        seqVals.add(uniqueVals[j]);
        j++;
      }
      available.filter(d => seqVals.has(d.value)).forEach(d => result.add(d.id));
    }
  }

  // 检查同元素(4+颗同元素非normal)
  const elemCounts: Record<string, number[]> = {};
  available.forEach(d => {
    const elem = d.collapsedElement || d.element;
    if (elem !== 'normal') {
      if (!elemCounts[elem]) elemCounts[elem] = [];
      elemCounts[elem].push(d.id);
    }
  });
  for (const ids of Object.values(elemCounts)) {
    if (ids.length >= 4) ids.forEach(id => result.add(id));
  }

  return result;
};

/**
 * 从 activeHands 推导"升档后的真实顺子长度"。
 *   activeHands 中 `6顺/5顺/4顺/顺子(=3顺)` 是互斥的，最多出现一个。
 *   不是顺子返回 0。
 *
 * 用途：修复 `arithmetic_gauge` + `dimension_crush` 组合场景下
 *   `buildRelicContext.diceCount` 仍然是原始 `selected.length`（未升档）
 *   导致 arithmetic_gauge 按原始档位取倍率的 bug。
 *
 * PHASER-FIX-ARITHMETIC-GAUGE-DICECOUNT：diceCount 应代表最终有效牌型长度，
 *   非 selected.length。此函数提供跨消费点的一致推导。
 */
export function deriveStraightLen(activeHands: readonly string[]): number {
  if (activeHands.includes('6顺')) return 6;
  if (activeHands.includes('5顺')) return 5;
  if (activeHands.includes('4顺')) return 4;
  if (activeHands.includes('顺子')) return 3;
  return 0;
}