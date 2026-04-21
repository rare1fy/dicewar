/**
 * aoeDetection.ts — AOE 检测 & 嗜血狂战多选普通攻击警告
 *
 * ARCH-I: 从 useBattleCombat.tsx 的 useMemo / toggleSelect 中提取的纯计算逻辑。
 * 本模块不含任何 React 副作用，仅做数据判断。
 */
import type { Die, HandResult } from '../types/game';
import { getDiceDef } from '../data/dice';

/**
 * 检测当前选择是否触发 AOE 效果
 *
 * @param selected   已选中的未消耗骰子
 * @param currentHands 当前牌型结果
 * @param isNormalAttackMulti 是否为多骰普通攻击
 */
export function detectAoeActive(
  selected: Die[],
  currentHands: HandResult,
  isNormalAttackMulti: boolean,
): boolean {
  if (selected.length === 0) return false;

  const hasDiceAoe = !isNormalAttackMulti && selected.some(d => {
    const def = getDiceDef(d.diceDefId);
    return def.onPlay?.aoe;
  });
  const hasThunderDice = selected.some(d => d.element === 'thunder');
  if (hasDiceAoe || hasThunderDice) return true;

  if (currentHands.activeHands.some(h => ['顺子', '4顺', '5顺', '6顺'].includes(h))) return true;

  const { activeHands } = currentHands;
  if (activeHands.some(h => h.includes('元素') || h.includes('皇家'))) return true;

  return false;
}

/**
 * 嗜血狂战多选普通攻击时，判断是否需要弹出"特殊骰子效果将被禁用"警告
 *
 * 条件：嗜血狂战职业 + 新选中骰子后超过1个 + 有特殊骰子 + 当前只有普通攻击
 *
 * @param newSelected 选中且未消耗的骰子列表（已经 toggle 后的）
 */
export function shouldWarnWarriorMultiNormal(newSelected: Die[]): boolean {
  if (newSelected.length <= 1) return false;
  const hasSpecial = newSelected.some(d => {
    const def = getDiceDef(d.diceDefId);
    return def.element !== 'normal' || !!def.onPlay;
  });
  return hasSpecial;
}
