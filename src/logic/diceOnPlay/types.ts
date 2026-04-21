/**
 * 骰子 onPlay 计算的共享接口 — ARCH-19
 *
 * 所有 calc 模块共用的上下文/结果类型，避免循环依赖。
 */

import type { Die, StatusEffect, Enemy, GameState } from '../../types/game';

/** 骰子 onPlay 计算的上下文（只读快照） */
export interface DiceOnPlayContext {
  selected: Die[];
  dice: Die[];
  activeHands: string[];
  game: GameState;
  targetEnemy: Enemy | null;
  /** 基础元素倍率 */
  elementBonus: number;
  /** 是否跳过 onPlay（普通攻击单手牌时） */
  skipOnPlay: boolean;
  /** 统一元素（统一骰子效果） */
  unifiedElement: string | null;
  /** 法师怒火燎原 bonus */
  furyBonusDamage: number;
}

/** 骰子 onPlay 计算的增量输出 */
export interface DiceOnPlayResult {
  extraDamage: number;
  extraArmor: number;
  extraHeal: number;
  pierceDamage: number;
  armorBreak: boolean;
  multiplier: number;
  holyPurify: number;
  statusEffects: StatusEffect[];
}

/**
 * 初始化一个空的 DiceOnPlayResult
 */
export function emptyDiceOnPlayResult(): DiceOnPlayResult {
  return {
    extraDamage: 0,
    extraArmor: 0,
    extraHeal: 0,
    pierceDamage: 0,
    armorBreak: false,
    multiplier: 1,
    holyPurify: 0,
    statusEffects: [],
  };
}
