/**
 * buildSettlementInputs.ts — 从遗物推导结算/出牌阶段所需的标量输入
 *
 * 职责（SRP）：
 *   把"从 relics 查询出的标量配置"集中成一个对象，避免胶水层（BattleCombatGlue / useBattleCombat）
 *   零散调用 `getXxx(relics)` 时漏掉某个字段。
 *
 * 使用方式（UI-01 构建 PostPlayContext / SettlementContext 时必须走这里）：
 *   const inputs = buildSettlementInputs(game.relics);
 *   const ctx: PostPlayContext = { ...otherFields, straightUpgrade: inputs.straightUpgrade };
 *
 * 新增字段规则：
 *   只在"输出值 = 纯函数(relics) 且用于 checkHands / settlement / postPlay 链路"时加进来。
 *   需要更多上下文（currentCombo 等）的派生值走各自专属计算函数（例：calcComboFinisherBonus）。
 */

import type { Relic } from '../types/game';
import { getStraightUpgrade } from './relicQueries';

/**
 * 结算/出牌阶段的"遗物派生标量"集合
 *
 * 字段契约见 `logic/settlement/types.ts` 的 SettlementContext
 * 以及 `logic/postPlayEffects.ts` 的 PostPlayContext。
 */
export interface SettlementInputs {
  /**
   * 顺子长度升档量（0 或 1，取决于是否持有 dimension_crush 遗物）
   *
   * 由 `utils/handEvaluator.ts` 的 checkHands(dice, { straightUpgrade }) 消费：
   * 已成立的顺子 straightLen += straightUpgrade，封顶 6顺。
   */
  straightUpgrade: number;
}

/**
 * 唯一合法的 SettlementInputs 构建入口
 *
 * @param relics 玩家当前持有的遗物列表
 */
export function buildSettlementInputs(relics: Relic[]): SettlementInputs {
  return {
    straightUpgrade: getStraightUpgrade(relics),
  };
}
