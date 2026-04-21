/**
 * lootHandler.ts — 战利品构建逻辑
 * 
 * 从 DiceHeroGame.tsx handleVictory 函数中提取的战利品生成模块。
 * 包含：战利品列表构建、胜利后阶段转换判断。
 * 
 * 设计原则：纯函数，不依赖 React state，输入 game 数据输出计算结果。
 */

import type { Enemy, GameState, LootItem, Relic } from '../types/game';
import { getRelicRewardPool, pickRandomRelics, RELICS_BY_RARITY } from '../data/relics';
import { DICE_BY_RARITY } from '../data/dice';
import { LOOT_CONFIG, CHAPTER_CONFIG } from '../config';

// === 纯函数：战利品列表构建 ===

/**
 * 构建战利品列表（纯函数）
 * 
 * 根据：战斗类型、敌人数据、洞察弱点状态、已有遗物 → 生成 LootItem[]
 */
export function buildLootItems(params: {
  game: GameState;
  enemies: Enemy[];
  allWaveEnemies: Enemy[];
  /** on_battle_end 遗物带来的额外金币 */
  bonusGold: number;
}): LootItem[] {
  const { game, enemies, allWaveEnemies, bonusGold } = params;
  
  const baseGold = enemies.reduce((s, e) => s + e.dropGold, 0) + bonusGold;
  const loot: LootItem[] = [
    { id: 'gold', type: 'gold', value: baseGold, collected: false }
  ];

  // Boss rewards: +1 draw count (手牌上限+1)
  const victoryNode = game.map.find(n => n.id === game.currentNodeId);
  if (victoryNode?.type === 'boss') {
    loot.push({ id: 'bossDrawCount', type: 'diceCount', value: 1, collected: false });
  }

  // Elite rewards: +1 Dice, +2 Global Rerolls, or +1 Free Reroll per turn
  // 中Boss(非终Boss)也走骰子奖励，不随机给重roll
  const mapMaxDepth = Math.max(...game.map.map(n => n.depth));
  const isMidBoss = victoryNode?.type === 'boss' && victoryNode.depth < mapMaxDepth;
  if (isMidBoss) {
    // 中Boss必给+1骰子（额外的，在diceReward阶段选新骰子之外再加一颗手牌）
    // 不走随机elite奖励
  } else if (enemies.find(e => e.rerollReward)?.rerollReward) {
    const eliteRewards = LOOT_CONFIG.eliteRewards;
    const selectedReward = eliteRewards[Math.floor(Math.random() * eliteRewards.length)];
    
    if (selectedReward.type === 'freeRerollPerTurn') {
      loot.push({ id: 'freeReroll', type: 'reroll', value: selectedReward.value, collected: false });
    } else {
      loot.push({ id: selectedReward.type, type: selectedReward.type as LootItem['type'], value: selectedReward.value, collected: false });
    }
  }

  // 一击必杀挑战奖励：额外宝箱（点击后随机开启）
  if (game.instakillCompleted) {
    loot.push({ id: 'challenge_chest', type: 'challengeChest', value: 0, collected: false });
  }

  // 遗物掉落：精英战/Boss战必掉，普通战0%概率
  const battleType = allWaveEnemies.some(e => e.name.includes('Boss')) ? 'boss' : 
                     allWaveEnemies.some(e => e.rerollReward) ? 'elite' : 'enemy';
  const relicDropChance = battleType === 'enemy' ? 0 : 1.0;
  if (Math.random() < relicDropChance) {
    const relicPool = getRelicRewardPool(battleType as 'elite' | 'boss');
    const ownedRelicIds = game.relics.map(r => r.id);
    const newRelics = pickRandomRelics(relicPool, 1, ownedRelicIds);
    if (newRelics.length > 0) {
      const newRelic = newRelics[0];
      loot.push({ id: 'relic-' + newRelic.id, type: 'relic', value: 0, collected: false, relicData: newRelic });
    }
  }

  return loot;
}

// === 纯函数：胜利后阶段转换判断 ===

export type PostVictoryPhase = 
  | { phase: 'victory'; bossesWon: number }
  | { phase: 'chapterTransition'; bossesWon: number }
  | { phase: 'diceReward' };

/**
 * 判断胜利后应进入哪个阶段（纯函数）
 * 
 * 逻辑：最终Boss → victory/chapterTransition，其余 → diceReward
 */
export function resolvePostVictoryPhase(game: GameState): PostVictoryPhase {
  const currentNode = game.map.find(n => n.id === game.currentNodeId);
  
  if (currentNode?.type === 'boss') {
    const mapMaxDepth = Math.max(...game.map.map(n => n.depth));
    // 最终Boss = 当前地图最大深度的Boss节点
    if (currentNode.depth >= mapMaxDepth) {
      // 判断是否为最终章
      if (game.chapter >= CHAPTER_CONFIG.totalChapters) {
        return { phase: 'victory', bossesWon: (game.stats.bossesWon || 0) + 1 };
      } else {
        return { phase: 'chapterTransition', bossesWon: (game.stats.bossesWon || 0) + 1 };
      }
    }
    // 中层Boss：继续走正常战利品流程
  }

  return { phase: 'diceReward' };
}

// === 挑战宝箱开启逻辑 ===

/**
 * 开启挑战宝箱（纯函数，返回状态变更）
 */
export function openChallengeChest(state: {
  souls: number;
  ownedDice: { defId: string; level: number }[];
  relics: Relic[];
}): { souls: number; ownedDice: { defId: string; level: number }[]; relics: Relic[]; result: { type: 'gold' | 'dice' | 'relic'; name: string; value: number } } {
  const roll = Math.random();
  
  if (roll < 0.4) {
    const gold = 30 + Math.floor(Math.random() * 40);
    return { 
      souls: state.souls + gold, 
      ownedDice: state.ownedDice, 
      relics: state.relics,
      result: { type: 'gold', name: `${gold} 金币`, value: gold }
    };
  } else if (roll < 0.75) {
    const pool = [...(DICE_BY_RARITY.uncommon || []), ...(DICE_BY_RARITY.rare || [])];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      return { 
        souls: state.souls, 
        ownedDice: [...state.ownedDice, { defId: pick.id, level: 1 }], 
        relics: state.relics,
        result: { type: 'dice', name: pick.name, value: 0 }
      };
    } else {
      return { 
        souls: state.souls + 50, 
        ownedDice: state.ownedDice, 
        relics: state.relics,
        result: { type: 'gold', name: '50 金币', value: 50 }
      };
    }
  } else {
    const relicPool = [...(RELICS_BY_RARITY.common || []), ...(RELICS_BY_RARITY.uncommon || [])];
    const ownedIds = state.relics.map(r => r.id);
    const available = relicPool.filter(r => !ownedIds.includes(r.id));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      return { 
        souls: state.souls, 
        ownedDice: state.ownedDice, 
        relics: [...state.relics, { ...pick }],
        result: { type: 'relic', name: pick.name, value: 0 }
      };
    } else {
      return { 
        souls: state.souls + 60, 
        ownedDice: state.ownedDice, 
        relics: state.relics,
        result: { type: 'gold', name: '60 金币', value: 60 }
      };
    }
  }
}
