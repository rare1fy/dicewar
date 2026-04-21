/**
 * buildRelicContext.ts — 统一构建 RelicContext
 *
 * 核心目标：永远不会再遗漏 RelicContext 字段。
 * 所有 RelicContext 构建点统一走这个函数，新增字段只改这一处。
 *
 * SRP: 只负责"从游戏状态构建上下文"，不负责触发效果。
 */

import type { RelicContext, GameState, Enemy } from '../types/game';
import { getDiceDef } from '../data/dice';
import { getFloorsCleared } from './relicQueries';

/** 遗物上下文构建参数 */
export interface BuildRelicContextParams {
  game: GameState;
  dice: { value: number; diceDefId: string; spent: boolean }[];
  targetEnemy: Enemy | null;
  rerollsThisTurn: number;
  /** 出牌相关 */
  handType?: string;
  selectedDice?: { value: number; diceDefId: string; spent: boolean }[];
  pointSum?: number;
  /** 是否出了牌（用于 didNotPlay 判断） */
  hasPlayedThisTurn: boolean;
  /** 溢出伤害（on_kill 触发时传入） */
  overkillDamage?: number;
  /** 本次重投是否为卖血重投（on_reroll 触发时传入） */
  isBloodReroll?: boolean;
}

/**
 * 统一构建 RelicContext
 *
 * 新增字段只需要改这一个地方，不用满项目搜 r.id。
 */
export const buildRelicContext = (params: BuildRelicContextParams): RelicContext => {
  const {
    game, dice, targetEnemy, rerollsThisTurn,
    handType, selectedDice, pointSum, hasPlayedThisTurn,
    overkillDamage, isBloodReroll,
  } = params;

  const selected = selectedDice || dice.filter(d => !d.spent);

  return {
    // 出牌信息
    handType,
    diceCount: selected.length,
    diceValues: selected.map(d => d.value),
    diceDefIds: selected.map(d => d.diceDefId),
    pointSum,

    // 战斗状态
    rerollsThisTurn,
    hpLostThisTurn: game.hpLostThisTurn || 0,
    hpLostThisBattle: game.hpLostThisBattle || 0,
    currentHp: game.hp,
    maxHp: game.maxHp,
    currentGold: game.souls,
    enemiesKilledThisBattle: game.enemiesKilledThisBattle || 0,
    overkillDamage,

    // 元素追踪
    elementsUsedThisBattle: new Set(game.elementsUsedThisBattle || []),

    // 特殊骰子追踪
    hasSplitDice: selected.some(d => getDiceDef(d.diceDefId).id === 'split'),
    splitDiceValue: selected.find(d => getDiceDef(d.diceDefId).id === 'split')?.value || 0,
    hasLoadedDice: selected.some(d => getDiceDef(d.diceDefId).id === 'heavy'),
    loadedDiceCount: selected.filter(d => getDiceDef(d.diceDefId).id === 'heavy').length,
    hasSpecialDice: selected.some(d => !['standard', 'heavy'].includes(getDiceDef(d.diceDefId).id)),
    cursedDiceInHand: dice.filter(d => getDiceDef(d.diceDefId).isCursed).length,
    crackedDiceInHand: dice.filter(d => getDiceDef(d.diceDefId).isCracked).length,

    // 连续普攻追踪
    consecutiveNormalAttacks: game.consecutiveNormalAttacks || 0,

    // 免费重Roll追踪
    freeRerollsUsed: Math.max(0, (game.freeRerollsPerTurn || 0) - (game.freeRerollsLeft || 0)),
    selectedDiceCount: selected.length,

    // 地图进度
    currentDepth: game.map?.find(n => n.id === game.currentNodeId)?.depth || 0,
    floorsCleared: getFloorsCleared(game.relics),

    // P0-4 补全字段
    didNotPlay: !hasPlayedThisTurn,
    handSize: dice.filter(d => !d.spent).length,
    isComboPlay: (game.comboCount || 0) >= 1,
    targetPoisonStacks: targetEnemy?.statuses?.find(s => s.type === 'poison')?.value || 0,
    playsThisTurn: (game.comboCount || 0) + 1,

    // 重投类型标记
    isBloodReroll,
  };
};
