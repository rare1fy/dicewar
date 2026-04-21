/**
 * elites.ts — 精英 / Boss 增强逻辑与判定
 * 从 enemyAI.ts 拆分，ARCH-6 Round 2
 *
 * 职责：
 * - isElite / isBoss 纯判定函数
 * - 精英/Boss 塞废骰子逻辑
 * - 精英/Boss 叠护甲逻辑
 */

import type { Enemy, GameState } from '../types/game';
import { ELITE_CONFIG } from '../config';

// === 判定函数 ===

/** 判断敌人是否为精英（HP 阈值内） */
export function isElite(enemy: Enemy): boolean {
  return enemy.maxHp > ELITE_CONFIG.hpThreshold && enemy.maxHp <= ELITE_CONFIG.bossHpThreshold;
}

/** 判断敌人是否为 Boss */
export function isBoss(enemy: Enemy): boolean {
  return enemy.maxHp > ELITE_CONFIG.bossHpThreshold;
}

// === 精英/Boss 塞废骰子 ===

export interface EliteDiceResult {
  /** 需要更新的 game 字段 */
  gameUpdates: Partial<Pick<GameState, 'ownedDice' | 'diceBag'>>;
  /** 日志消息 */
  logs: string[];
  /** 浮动文字 */
  floats: Array<{ text: string; color: string; target: string }>;
  /** 音效 */
  sound?: string;
  /** 是否触发了效果（需要延时等待） */
  triggered: boolean;
}

/**
 * 精英/Boss 塞废骰子
 * - 精英：每 eliteDiceCycle 回合塞碎裂骰子
 * - Boss：低HP时塞诅咒骰子（bossCurseCycle周期），否则每 bossCrackedDiceCycle 回合塞碎裂骰子
 */
export function processEliteDice(
  enemy: Enemy,
  game: GameState,
): EliteDiceResult {
  const result: EliteDiceResult = {
    gameUpdates: {},
    logs: [],
    floats: [],
    triggered: false,
  };

  const elite = isElite(enemy);
  const boss = isBoss(enemy);

  if (elite && game.battleTurn % ELITE_CONFIG.eliteDiceCycle === 0) {
    result.gameUpdates.ownedDice = [...(game.ownedDice || []), { defId: 'cracked', level: 1 }];
    result.gameUpdates.diceBag = [...(game.diceBag || []), 'cracked'];
    result.logs.push(`${enemy.name} 向你的骰子库塞入了一颗碎裂骰子！`);
    result.floats.push({ text: '+碎裂骰子', color: 'text-red-400', target: 'player' });
    result.sound = 'enemy_skill';
    result.triggered = true;
    return result;
  }

  if (boss) {
    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio < ELITE_CONFIG.bossCurseHpRatio && game.battleTurn % ELITE_CONFIG.bossCurseCycle === 0) {
      result.gameUpdates.ownedDice = [...(game.ownedDice || []), { defId: 'cursed', level: 1 }];
      result.gameUpdates.diceBag = [...(game.diceBag || []), 'cursed'];
      result.logs.push(`${enemy.name} 施放诅咒，向你的骰子库塞入了一颗诅咒骰子！`);
      result.floats.push({ text: '+诅咒骰子', color: 'text-purple-400', target: 'player' });
      result.sound = 'enemy_skill';
      result.triggered = true;
      return result;
    }
    if (game.battleTurn % ELITE_CONFIG.bossCrackedDiceCycle === 0) {
      result.gameUpdates.ownedDice = [...(game.ownedDice || []), { defId: 'cracked', level: 1 }];
      result.gameUpdates.diceBag = [...(game.diceBag || []), 'cracked'];
      result.logs.push(`${enemy.name} 向你的骰子库塞入了一颗碎裂骰子！`);
      result.floats.push({ text: '+碎裂骰子', color: 'text-red-400', target: 'player' });
      result.sound = 'enemy_skill';
      result.triggered = true;
      return result;
    }
  }

  return result;
}

// === 精英/Boss 叠护甲 ===

export interface EliteArmorResult {
  /** 护甲增加量 */
  armorVal: number;
  /** 日志消息 */
  log: string;
  /** 浮动文字 */
  float: { text: string; color: string; target: string };
  /** 音效 */
  sound: string;
  /** 是否触发 */
  triggered: boolean;
  /** 是否为 Boss */
  isBossResult: boolean;
}

/**
 * 精英/Boss 叠护甲
 * - 精英：每 eliteArmorCycle 回合叠 attackDmg × ELITE_CONFIG.armorMult
 * - Boss：每 bossArmorCycle 回合叠 attackDmg × ELITE_CONFIG.bossArmorMult
 */
export function processEliteArmor(
  enemy: Enemy,
  game: GameState,
): EliteArmorResult {
  const elite = isElite(enemy);
  const boss = isBoss(enemy);

  if (elite && game.battleTurn % ELITE_CONFIG.eliteArmorCycle === 0 && game.battleTurn > 0) {
    const armorVal = Math.floor(enemy.attackDmg * ELITE_CONFIG.armorMult);
    return {
      armorVal,
      log: `${enemy.name} 凝聚了护甲（+${armorVal}）！`,
      float: { text: `护甲+${armorVal}`, color: 'text-cyan-400', target: 'enemy' },
      sound: 'enemy_defend',
      triggered: true,
      isBossResult: false,
    };
  }

  if (boss && game.battleTurn % ELITE_CONFIG.bossArmorCycle === 0 && game.battleTurn > 0) {
    const armorVal = Math.floor(enemy.attackDmg * ELITE_CONFIG.bossArmorMult);
    return {
      armorVal,
      log: `${enemy.name} 释放了护盾（+${armorVal}护甲）！`,
      float: { text: `护盾+${armorVal}`, color: 'text-cyan-300', target: 'enemy' },
      sound: 'enemy_defend',
      triggered: true,
      isBossResult: true,
    };
  }

  return {
    armorVal: 0,
    log: '',
    float: { text: '', color: '', target: 'enemy' },
    sound: '',
    triggered: false,
    isBossResult: false,
  };
}
