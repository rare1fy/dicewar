/**
 * BattleTurnRunner.ts — UI-01-δ-3c 敌人回合执行器
 *
 * 职责（SRP）：封装 executeEnemyTurn 的完整调用流程 + 胜负判定，
 *   把 BattleScene.handleEndTurn 的敌人反击逻辑抽成独立单元。
 *
 * 不做：
 *   - 结算分阶段动画（runSettlementAnimation 4 phase）→ 依赖 15+ setter，留 δ-3+
 *   - 多敌目标选择 → δ-3d 接 UI 选目标能力
 *   - 换波（tryWaveTransition / setBossEntrance）→ δ-3d
 *
 * δ-3c 交付标准：
 *   - BattleScene.handleEndTurn 直接调 runEnemyTurn，不再内联敌人 AI 逻辑
 *   - Runner 返回回合后玩家 HP（0 = 死亡）
 *   - 胜负判定集成在内部，通过返回值桥接到 BattleScene 的横幅逻辑
 */

import type { Die, Enemy, GameState } from '../../types/game';
import type { EnemyAICallbacks } from '../../logic/enemyAI';
import { executeEnemyTurn } from '../../logic/enemyAI';

/**
 * 敌人回合结果
 *
 * - playerHp: 回合结束时玩家 HP（0 = 已死亡）
 * - victory: 全部敌人已消灭（应触发胜利横幅）
 * - defeat: 玩家已死亡（应触发失败横幅）
 *
 * 互斥：victory 和 defeat 不会同时为 true。
 * 若两者都为 false，表示战斗仍在继续。
 */
export interface EnemyTurnResult {
  playerHp: number;
  victory: boolean;
  defeat: boolean;
}

/**
 * 执行敌人完整回合
 *
 * 流程（对齐 enemyAI.executeEnemyTurn）：
 *   1. 标记进入敌人回合
 *   2. 玩家中毒结算
 *   3. 敌人灼烧结算（含全灭→转波）
 *   4. 敌人中毒结算（含全灭→转波）
 *   5. 每个存活敌人执行 AI 决策
 *   6. 精英/Boss 塞废骰子
 *   7. 精英/Boss 叠护甲
 *   8. 敌人回合结束→玩家回合
 *
 * @param game 当前游戏状态
 * @param enemies 敌人数组（快照）
 * @param dice 骰子数组（快照）
 * @param rerollCount 当前重投次数
 * @param cb EnemyAICallbacks 回调包（由 BattleAICallbacks 工厂构建）
 * @returns 回合结果（含玩家 HP 和胜负标志）
 */
export async function runEnemyTurn(
  game: GameState,
  enemies: Enemy[],
  dice: Die[],
  rerollCount: number,
  cb: EnemyAICallbacks,
): Promise<EnemyTurnResult> {
  // 调用核心 AI 逻辑（enemyAI.ts 已包含完整 8 步流程）
  const returnHp = await executeEnemyTurn(game, enemies, dice, rerollCount, cb);

  // 判定胜负（从 gameRef 读取最新状态，兼容 DOT/AI 内部对 game 的修改）
  const currentEnemies = cb.enemiesRef ? [...cb.enemiesRef.current] : [...enemies];
  const anyAlive = currentEnemies.some((e) => e.hp > 0);

  const victory = !anyAlive && returnHp > 0;
  const defeat = returnHp <= 0;

  return { playerHp: returnHp, victory, defeat };
}
