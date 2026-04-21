/**
 * lootProcessor.ts — 战利品处理逻辑
 * 
 * 从 DiceHeroGame.tsx collectLoot 提取的战利品处理模块。
 * 
 * 设计原则：
 * - 核心状态更新逻辑为纯函数，返回变更后的状态
 * - UI副作用（音效、toast）由调用方处理
 * - 日志消息随状态变更一并返回，供调用方统一记录
 */

import type { GameState } from '../types/game';
import { getDiceDef } from '../data/dice';
import { openChallengeChest } from './lootHandler';

// ============================================================
// 类型定义
// ============================================================

/** 战利品收集结果 */
export interface CollectLootResult {
  /** 更新后的游戏状态 */
  state: GameState;
  /** 是否成功处理 */
  success: boolean;
  /** 需要记录的日志消息 */
  logs: string[];
  /** 需要显示的 toast 消息 */
  toasts: { message: string; type?: 'gold' | 'buff' }[];
}

// ============================================================
// 纯函数：战利品收集
// ============================================================

/**
 * 收集战利品（纯函数）
 * 
 * @param state 当前游戏状态
 * @param lootId 要收集的战利品ID
 * @returns 收集结果，包含新状态和UI消息
 */
export function processCollectLoot(
  state: GameState,
  lootId: string
): CollectLootResult {
  const item = state.lootItems.find(i => i.id === lootId);
  
  // 未找到或已收集
  if (!item || item.collected) {
    return { state, success: false, logs: [], toasts: [] };
  }

  const logs: string[] = [];
  const toasts: { message: string; type?: 'gold' | 'buff' }[] = [];
  
  // 标记为已收集
  const nextLoot = state.lootItems.map(i => 
    i.id === lootId ? { ...i, collected: true } : i
  );
  
  let nextState: GameState = { ...state, lootItems: nextLoot };

  // 处理不同类型的战利品
  switch (item.type) {
    case 'gold': {
      const gold = item.value || 0;
      nextState.souls += gold;
      logs.push(`获得了 ${gold} 金币。`);
      break;
    }

    case 'reroll': {
      const value = item.value || 0;
      if (item.id === 'freeReroll') {
        nextState.freeRerollsPerTurn += value;
        logs.push(`获得了每回合 +${value} 免费重骰。`);
      } else {
        nextState.freeRerollsPerTurn += value;
        logs.push(`获得了 ${value} 次全局重骰机会。`);
      }
      break;
    }

    case 'maxPlays': {
      const value = item.value || 0;
      nextState.maxPlays += value;
      logs.push(`获得了 ${value} 次出牌机会。`);
      break;
    }

    case 'specialDice': {
      if (item.diceDefId) {
        nextState.ownedDice = [...nextState.ownedDice, { defId: item.diceDefId, level: 1 }];
        const ddef = getDiceDef(item.diceDefId);
        logs.push(`获得了特殊骰子: ${ddef.name}。`);
        toasts.push({ message: `获得了特殊骰子: ${ddef.name}` });
      }
      break;
    }

    case 'diceCount': {
      const oldDrawCount = nextState.drawCount;
      const value = item.value || 0;
      nextState.drawCount = Math.min(6, nextState.drawCount + value);
      if (nextState.drawCount > oldDrawCount) {
        nextState.enemyHpMultiplier += 0.25;
        logs.push(`获得了 ${value} 颗骰子。`);
        logs.push("获得诅咒之力，敌人血量提升 25%。");
        toasts.push({ message: "获得诅咒之力，敌人也都变强了" });
      }
      break;
    }

    case 'relic': {
      if (item.relicData) {
        nextState.relics = [...nextState.relics, { ...item.relicData }];
        logs.push(`获得遗物: ${item.relicData.name}`);
        toasts.push({ message: ` 获得遗物: ${item.relicData.name}!`, type: 'buff' });
      }
      break;
    }

    default: {
      // challengeChest 等扩展类型 — 通过 lootHandler 处理
      const chestResult = openChallengeChest({
        souls: nextState.souls,
        ownedDice: nextState.ownedDice,
        relics: nextState.relics
      });
      nextState.souls = chestResult.souls;
      nextState.ownedDice = chestResult.ownedDice;
      nextState.relics = chestResult.relics;
      logs.push(`开启挑战宝箱：获得 ${chestResult.result.name}`);
      toasts.push({
        message: `🎁 挑战宝箱：${chestResult.result.name}`,
        type: chestResult.result.type === 'gold' ? 'gold' : 'buff'
      });
      break;
    }
  }

  return { state: nextState, success: true, logs, toasts };
}

// ============================================================
// 纯函数：完成战利品收集（返回地图阶段）
// ============================================================

export function processFinishLoot(state: GameState): GameState {
  return {
    ...state,
    phase: 'map'
  };
}
