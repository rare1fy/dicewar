/**
 * handHintCalc.ts — handHintIds 计算逻辑
 *
 * ARCH-I: 从 useBattleCombat.tsx 的 useMemo 中提取的纯计算逻辑。
 * 本模块不含任何 React 副作用，仅做数据判断。
 */
import type { Die } from '../types/game';
import { checkHands, findHandCandidates } from '../utils/handEvaluator';

/** computeHandHintIds 的输入参数 */
export interface HandHintParams {
  phase: string;
  isEnemyTurn: boolean;
  playsLeft: number;
  dice: Die[];
}

/**
 * 计算当前应高亮提示的骰子 ID 集合
 *
 * - 战斗阶段、玩家回合、仍有出牌次数时才计算
 * - 无选中骰子时委托给 findHandCandidates（模式A）
 * - 有选中骰子时，逐个测试未选中可用骰子能否与已选组成非普通攻击牌型
 */
export function computeHandHintIds(params: HandHintParams): Set<number> {
  const { phase, isEnemyTurn, playsLeft, dice } = params;
  if (phase !== 'battle' || isEnemyTurn || playsLeft <= 0) return new Set<number>();

  const selected = dice.filter(d => d.selected && !d.spent);
  if (selected.length === 0) {
    return findHandCandidates(dice);
  }

  const available = dice.filter(d => !d.spent && !d.rolling && !d.selected);
  const result = new Set<number>();
  for (const other of available) {
    const combo = [...selected, other];
    const hand = checkHands(combo);
    if (hand.activeHands.some(h => h !== '普通攻击')) {
      result.add(other.id);
    }
  }
  return result;
}
