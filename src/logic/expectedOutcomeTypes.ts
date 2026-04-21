/**
 * expectedOutcome 相关类型定义
 *
 * 从 expectedOutcomeCalc.ts 提取，ARCH-12
 * 纯类型定义，无运行时逻辑。
 */

import type { Die, GameState, Enemy, StatusEffect } from '../types/game';

/** 计算结果的副作用指令 — 调用方应在 useMemo 之后执行 */
export interface PendingSideEffect {
  type: 'setRelicCounter' | 'resetRelicCounter' | 'setRelicTempDrawBonus' | 'grantExtraPlay' | 'grantFreeReroll' | 'setRelicKeepHighest' | 'consumeRageFire';
  relicId?: string;
  counter?: number;
  value?: number;
}

/** 预期出牌结果 */
export interface ExpectedOutcomeResult {
  damage: number;
  armor: number;
  heal: number;
  baseDamage: number;
  baseHandValue: number;
  handMultiplier: number;
  extraDamage: number;
  pierceDamage: number;
  armorBreak: boolean;
  multiplier: number;
  triggeredAugments: { name: string; details: string; rawDamage?: number; rawMult?: number; relicId?: string; icon?: string }[];
  bestHand: string;
  statusEffects: StatusEffect[];
  X: number;
  selectedValues: number[];
  goldBonus: number;
  holyPurify: number;
  /** 副作用指令列表 — 调用方需执行 */
  pendingSideEffects: PendingSideEffect[];
}

/** 计算参数 */
export interface CalculateExpectedOutcomeParams {
  selected: Die[];
  dice: Die[];
  activeHands: string[];
  bestHand: string;
  game: GameState;
  targetEnemy: Enemy | null;
  rerollCount: number;
  /** gameRef.current.furyBonusDamage */
  furyBonusDamage: number;
  /** gameRef.current.bloodRerollCount */
  bloodRerollCount: number;
  /** gameRef.current.warriorRageMult */
  warriorRageMult: number;
  /** gameRef.current.mageOverchargeMult */
  mageOverchargeMult: number;
}
