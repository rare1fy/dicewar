/**
 * expectedOutcome 副作用执行 — 从 expectedOutcomeCalc.ts 提取，ARCH-12
 *
 * 职责：执行 calculateExpectedOutcome 返回的 PendingSideEffect[]
 * 注意：本模块依赖 Dispatch（非纯函数），与纯计算逻辑分离。
 */

import type { GameState } from '../types/game';
import type { StateSetter } from '../types/battleContexts';
import type { PendingSideEffect } from './expectedOutcomeTypes';

/**
 * 执行 pendingSideEffects — 在 useMemo 之后调用
 */
export function applyPendingSideEffects(
  effects: PendingSideEffect[],
  setGame: StateSetter<GameState>,
  setRerollCount: StateSetter<number>,
) {
  effects.forEach(eff => {
    switch (eff.type) {
      case 'setRelicCounter':
        setGame(prev => ({ ...prev, relics: prev.relics.map(r => r.id === eff.relicId ? { ...r, counter: eff.counter } : r) }));
        break;
      case 'resetRelicCounter':
        setGame(prev => ({ ...prev, relics: prev.relics.map(r => r.id === eff.relicId ? { ...r, counter: 0 } : r) }));
        break;
      case 'setRelicTempDrawBonus':
        setGame(prev => ({ ...prev, relicTempDrawBonus: (prev.relicTempDrawBonus || 0) + (eff.value || 0) }));
        break;
      case 'grantExtraPlay':
        setGame(prev => ({ ...prev, playsLeft: prev.playsLeft + (eff.value || 0) }));
        break;
      case 'grantFreeReroll':
        setRerollCount(prev => Math.max(0, prev - (eff.value || 0)));
        break;
      case 'setRelicKeepHighest':
        setGame(prev => ({ ...prev, relicKeepHighest: (prev.relicKeepHighest || 0) + (eff.value || 0) }));
        break;
      case 'consumeRageFire':
        setGame(prev => ({ ...prev, rageFireBonus: 0 }));
        break;
    }
  });
}
