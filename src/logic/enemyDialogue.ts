/**
 * enemyDialogue.ts — 敌人台词系统
 * 从 enemyAI.ts 拆分，ARCH-6 Round 2
 *
 * 职责：攻击台词、高伤台词的触发判定与显示
 *
 * [ARCH-6 Round 3] 逻辑层不直接调度 setTimeout，
 * 延迟展示由返回的 DelayedQuoteAction 描述对象交由调用方执行。
 */

import type { Enemy } from '../types/game';
import { ENEMY_TAUNT_CONFIG } from '../config';

/** 台词回调接口 */
export interface DialogueCallbacks {
  getEnemyQuotes: (enemyId: string) => {
    attack?: string[];
    defend?: string[];
    skill?: string[];
    heal?: string[];
    enter?: string[];
    hurt?: string[];
  } | undefined;
  pickQuote: (arr?: string[]) => string | null;
  showEnemyQuote: (uid: string, text: string, duration?: number) => void;
}

/** 延迟台词动作描述（由调用方决定何时执行） */
export interface DelayedQuoteAction {
  /** 延迟毫秒数 */
  delayMs: number;
  /** 敌人 uid */
  uid: string;
  /** 台词文本 */
  text: string;
  /** 展示时长（ms） */
  duration: number;
}

/**
 * 尝试触发攻击台词
 *
 * @returns 延迟台词动作数组，由调用方在 UI 层用 setTimeout 执行
 */
export function tryAttackTaunt(
  enemy: Enemy,
  damage: number,
  cb: DialogueCallbacks,
): DelayedQuoteAction[] {
  const delayed: DelayedQuoteAction[] = [];

  // 攻击台词（立即触发，不需要延迟）
  if (Math.random() < ENEMY_TAUNT_CONFIG.attackChance) {
    const quotes = cb.getEnemyQuotes(enemy.configId);
    const line = cb.pickQuote(quotes?.attack);
    if (line) cb.showEnemyQuote(enemy.uid, line, 1800);
  }

  // 高伤台词（延迟触发，返回描述对象）
  if (damage >= ENEMY_TAUNT_CONFIG.highDmgThreshold) {
    const quotes = cb.getEnemyQuotes(enemy.configId);
    const line = cb.pickQuote(quotes?.hurt);
    if (line) {
      delayed.push({
        delayMs: ENEMY_TAUNT_CONFIG.highDmgQuoteDelay,
        uid: enemy.uid,
        text: line,
        duration: ENEMY_TAUNT_CONFIG.highDmgQuoteDuration,
      });
    }
  }

  return delayed;
}
