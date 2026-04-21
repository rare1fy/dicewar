/**
 * settlement/index.ts — 结算演出主编排
 *
 * ARCH-17 从 settlementAnimation.ts 拆出
 * 职责：调度 Phase 1 → 2 → 3 → 4 顺序执行，返回 Phase 2 产物
 *
 * 原文件签名完全保持：runSettlementAnimation(ctx): Promise<{ settleDice, splitOccurred }>
 * 调用方 useBattleCombat.tsx 仅需改 import 路径：'./settlementAnimation' → './settlement'
 */

import type { Die } from '../../types/game';
import type { SettlementContext } from './types';
import { runPhase1HandDisplay } from './phase1_handDisplay';
import { runPhase2DiceScoring } from './phase2_diceScoring';
import { runPhase3Effects } from './phase3_effects';
import { runPhase4FinalDamage } from './phase4_finalDamage';

// 类型 re-export，保持对外接口兼容
export type { SettlementContext, SettlementData } from './types';

// ============================================================
// 主函数
// ============================================================

export async function runSettlementAnimation(ctx: SettlementContext): Promise<{
  settleDice: Die[];
  splitOccurred: boolean;
}> {
  await runPhase1HandDisplay(ctx);
  const { settleDice, splitOccurred } = await runPhase2DiceScoring(ctx);
  await runPhase3Effects(ctx);
  await runPhase4FinalDamage(ctx);
  return { settleDice, splitOccurred };
}