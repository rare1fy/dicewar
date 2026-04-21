/**
 * settlement/types.ts — 结算演出接口定义
 *
 * ARCH-17 从 settlementAnimation.ts 拆出
 * 原文件 L20-L72：SettlementContext + SettlementData
 */

import type { Die, GameState, Enemy, HandResult, StatusEffect } from '../../types/game';
import type { MutableRef, StateSetter } from '../../types/battleContexts';
import type { ExpectedOutcomeResult } from '../expectedOutcomeTypes';

// ============================================================
// Context 接口
// ============================================================

export interface SettlementContext {
  // State 快照
  game: GameState;
  gameRef: MutableRef<GameState>;
  enemies: Enemy[];
  dice: Die[];
  currentHands: HandResult;
  selected: Die[];
  outcome: ExpectedOutcomeResult;
  targetEnemy: Enemy;
  comboFinisherBonus: number;
  /**
   * 顺子长度升档量（消费方：utils/handEvaluator.ts 的 checkHands）
   * 契约：必须通过 engine/buildSettlementInputs.ts 的 buildSettlementInputs(game.relics).straightUpgrade 注入，禁止散写。
   */
  straightUpgrade: number;
  isAoeActive: boolean;

  // Callbacks — React setState 稳定引用
  setSettlementData: StateSetter<SettlementData | null>;
  setSettlementPhase: StateSetter<string | null>;
  setShowRelicPanel: StateSetter<boolean>;
  setShowDamageOverlay: StateSetter<{ damage: number; armor: number; heal: number } | null>;
  setScreenShake: StateSetter<boolean>;
  setFlashingRelicIds: StateSetter<string[]>;
  setGame: StateSetter<GameState>;
  addLog: (msg: string) => void;
  addToast: (msg: string, type?: string) => void;
  addFloatingText: (text: string, color: string, iconKey?: string, target?: string, persistent?: boolean) => void;
  playSound: (id: string) => void;
  playSettlementTick: (idx: number) => void;
  playMultiplierTick: (idx: number) => void;
  playHeavyImpact: (intensity: number) => void;
}

/** 结算面板数据（与 DiceHeroGame 中 useState 内联类型一致） */
export interface SettlementData {
  bestHand: string;
  selectedDice: Die[];
  diceScores: number[];
  baseValue: number;
  mult: number;
  currentBase: number;
  currentMult: number;
  triggeredEffects: { name: string; detail: string; icon?: string; type: 'damage' | 'mult' | 'status' | 'heal' | 'armor'; rawValue?: number; rawMult?: number; relicId?: string }[];
  currentEffectIdx: number;
  finalDamage: number;
  finalArmor: number;
  finalHeal: number;
  statusEffects: StatusEffect[];
  isSameElement?: boolean;
}