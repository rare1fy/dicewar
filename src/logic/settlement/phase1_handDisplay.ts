/**
 * settlement/phase1_handDisplay.ts — Phase 1 牌型展示
 *
 * ARCH-17 从 settlementAnimation.ts L89-L112 拆出
 * 原行为：setShowRelicPanel(true) → setSettlementPhase('hand') → 铺数据 → 0.6s 展示
 */

import type { SettlementContext } from './types';

export async function runPhase1HandDisplay(ctx: SettlementContext): Promise<void> {
  const {
    currentHands, selected, outcome,
    setSettlementData, setSettlementPhase, setShowRelicPanel,
    playSound,
  } = ctx;

  // Phase 1: 牌型展示 (0.6s)
  // ========================================
  setShowRelicPanel(true); // 结算时展开遗物面板
  setSettlementPhase('hand');
  setSettlementData({
    bestHand: outcome.bestHand,
    selectedDice: selected,
    diceScores: selected.map(d => d.value),
    baseValue: outcome.baseHandValue,
    mult: outcome.handMultiplier,
    currentBase: outcome.baseHandValue,
    currentMult: outcome.handMultiplier,
    triggeredEffects: [],
    currentEffectIdx: -1,
    finalDamage: outcome.damage,
    finalArmor: outcome.armor,
    finalHeal: outcome.heal,
    statusEffects: outcome.statusEffects,
    isSameElement: currentHands.activeHands.some(h => ['同元素', '元素顺', '元素葫芦', '皇家元素顺'].includes(h)),
  });
  playSound('relic_activate');
  await new Promise(r => setTimeout(r, 600));
}