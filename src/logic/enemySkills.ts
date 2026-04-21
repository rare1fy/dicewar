/**
 * enemySkills.ts — 敌人技能逻辑（Priest / Caster）+ 状态辅助
 * 从 enemyAI.ts 拆分，ARCH-6 Round 2
 *
 * 职责：Priest 治疗/增益/减益逻辑、Caster 毒雾/火球/诅咒逻辑、状态递减
 * 纯逻辑函数，不依赖 React
 */

import type { Enemy, GameState, StatusEffect } from '../types/game';
import { PRIEST_CONFIG, CASTER_CONFIG } from '../config';

// === 状态辅助 ===

/** 状态持续期递减 */
export function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map(s => {
      if (s.type === 'poison' || s.type === 'burn') return s;
      if (s.duration !== undefined) return { ...s, duration: s.duration - 1 };
      return { ...s, value: s.value - 1 };
    })
    .filter(s => {
      if (s.type === 'poison' || s.type === 'burn') return s.value > 0;
      if (s.duration !== undefined) return s.duration > 0;
      return s.value > 0;
    });
}

// === 辅助：状态效果 upsert ===

/** 向状态列表中追加或叠加指定状态 */
function upsertStatus(
  statuses: StatusEffect[],
  type: StatusEffect['type'],
  value: number,
  duration?: number,
): StatusEffect[] {
  const existing = statuses.find(s => s.type === type);
  if (existing) {
    return statuses.map(s =>
      s.type === type
        ? { ...s, value: s.value + value, ...(duration !== undefined ? { duration } : {}) }
        : s,
    );
  }
  const newStatus: StatusEffect = { type, value };
  if (duration !== undefined) newStatus.duration = duration;
  return [...statuses, newStatus];
}

// === Priest 技能 ===

export interface PriestSkillResult {
  /** 更新后的 game state 片段 */
  gameUpdates: {
    /** 状态更新函数（始终是函数形式，接收当前 statuses 返回新的；默认 identity） */
    statuses: (gameStatuses: StatusEffect[]) => StatusEffect[];
    /** 骰子库更新（可选，与 statuses 互斥时覆盖） */
    ownedDice?: GameState['ownedDice'];
    /** 骰子袋更新（可选） */
    diceBag?: GameState['diceBag'];
  };
  /** 更新后的 enemies */
  enemyUpdates: Map<string, Partial<Enemy>>;
  /** 日志消息 */
  logs: string[];
  /** 浮动文字 */
  floats: Array<{ text: string; color: string; target: string }>;
  /** 音效 */
  sound?: string;
}

/**
 * 执行 Priest 的技能决策
 *
 * 优先级：治疗盟友 > 自疗 > 增益队友 > 减益玩家
 */
export function executePriestSkill(
  e: Enemy,
  allies: Enemy[],
  game: GameState,
): PriestSkillResult {
  const result: PriestSkillResult = {
    gameUpdates: {
      statuses: (s) => s,  // 默认不做变更
    },
    enemyUpdates: new Map(),
    logs: [],
    floats: [],
  };

  const damagedAllies = allies.filter(en => en.hp < en.maxHp);
  const selfDamaged = e.hp < e.maxHp;

  if (damagedAllies.length > 0) {
    const lowestAlly = damagedAllies.reduce((a, b) =>
      a.hp / a.maxHp < b.hp / b.maxHp ? a : b,
    );
    const healVal = Math.floor(e.attackDmg * PRIEST_CONFIG.healAllyMult);
    result.enemyUpdates.set(lowestAlly.uid, {
      hp: Math.min(lowestAlly.maxHp, lowestAlly.hp + healVal),
    });
    result.logs.push(`${e.name} 治疗了 ${lowestAlly.name} ${healVal} HP。`);
    result.floats.push({ text: `+${healVal}`, color: 'text-emerald-500', target: 'enemy' });
    result.sound = 'enemy_heal';
  } else if (selfDamaged) {
    const healVal = Math.floor(e.attackDmg * PRIEST_CONFIG.healSelfMult);
    result.enemyUpdates.set(e.uid, {
      hp: Math.min(e.maxHp, e.hp + healVal),
    });
    result.logs.push(`${e.name} 治疗自己 ${healVal} HP。`);
    result.sound = 'enemy_heal';
  } else if (allies.length > 0) {
    const target = allies[Math.floor(Math.random() * allies.length)];
    if (game.battleTurn % PRIEST_CONFIG.buffCycle === 0) {
      const existing = target.statuses.find(s => s.type === 'strength');
      if (existing) {
        const newStatuses = target.statuses.map(s =>
          s.type === 'strength'
            ? { ...s, value: s.value + PRIEST_CONFIG.strengthBonus }
            : s,
        );
        result.enemyUpdates.set(target.uid, { statuses: newStatuses });
      } else {
        const newStatuses: StatusEffect[] = [
          ...target.statuses,
          { type: 'strength', value: PRIEST_CONFIG.strengthBonus },
        ];
        result.enemyUpdates.set(target.uid, { statuses: newStatuses });
      }
      result.logs.push(`${e.name} 为 ${target.name} 施加了力量强化！`);
      result.floats.push({
        text: `力量+${PRIEST_CONFIG.strengthBonus}`,
        color: 'text-red-400',
        target: 'enemy',
      });
    } else {
      const armorVal = Math.floor(e.attackDmg * PRIEST_CONFIG.armorBoostMult);
      result.enemyUpdates.set(target.uid, {
        armor: target.armor + armorVal,
      });
      result.logs.push(`${e.name} 为 ${target.name} 施加了护甲祝福（+${armorVal}护甲）！`);
      result.floats.push({ text: `护甲+${armorVal}`, color: 'text-cyan-400', target: 'enemy' });
    }
  } else {
    const debuffRoll = Math.random();
    if (debuffRoll < PRIEST_CONFIG.weakChance) {
      result.gameUpdates.statuses = (gameStatuses: StatusEffect[]): StatusEffect[] =>
        upsertStatus(gameStatuses, 'weak', 1, PRIEST_CONFIG.weakDuration);
      result.logs.push(`${e.name} 对你施加了虚弱！`);
      result.floats.push({ text: '虚弱!', color: 'text-purple-400', target: 'player' });
    } else if (debuffRoll < PRIEST_CONFIG.vulnerableThreshold) {
      result.gameUpdates.statuses = (gameStatuses: StatusEffect[]): StatusEffect[] =>
        upsertStatus(gameStatuses, 'vulnerable', 1, PRIEST_CONFIG.vulnerableDuration);
      result.logs.push(`${e.name} 对你施加了易伤！`);
      result.floats.push({ text: '易伤!', color: 'text-orange-400', target: 'player' });
    } else {
      const curseDice = Math.random() < PRIEST_CONFIG.curseChance ? 'cursed' : 'cracked';
      const curseName = curseDice === 'cursed' ? '诅咒骰子' : '碎裂骰子';
      result.gameUpdates.ownedDice = [...(game.ownedDice || []), { defId: curseDice, level: 1 }];
      result.gameUpdates.diceBag = [...(game.diceBag || []), curseDice];
      result.logs.push(`${e.name} 向你的骰子库塞入了一颗${curseName}！`);
      result.floats.push({ text: `+${curseName}`, color: 'text-red-400', target: 'player' });
      result.sound = 'enemy_skill';
    }
  }

  return result;
}

// === Caster 技能 ===

export interface CasterSkillResult {
  /** 需要对 game.statuses 做的更新（函数形式，接收当前 statuses） */
  updateStatuses: (statuses: StatusEffect[]) => StatusEffect[];
  /** 日志消息 */
  logs: string[];
  /** 浮动文字 */
  floats: Array<{ text: string; color: string; target: string; delay?: number }>;
}

/**
 * 执行 Caster 的 DoT 技能决策
 *
 * 随机选择：毒雾 / 火球 / 诅咒
 */
export function executeCasterSkill(e: Enemy): CasterSkillResult {
  const dotRoll = Math.random();

  if (dotRoll < CASTER_CONFIG.poisonChance) {
    const poisonVal = Math.max(CASTER_CONFIG.poisonMin, Math.floor(e.attackDmg * CASTER_CONFIG.poisonMult));
    return {
      updateStatuses: (statuses: StatusEffect[]) => upsertStatus(statuses, 'poison', poisonVal),
      logs: [`${e.name} 释放毒雾，施加了 ${poisonVal} 层毒素！`],
      floats: [{ text: `毒素+${poisonVal}`, color: 'text-emerald-400', target: 'player' }],
    };
  }

  if (dotRoll < CASTER_CONFIG.fireballThreshold) {
    const burnVal = Math.max(CASTER_CONFIG.burnMin, Math.floor(e.attackDmg * CASTER_CONFIG.fireballMult));
    return {
      updateStatuses: (statuses: StatusEffect[]) => upsertStatus(statuses, 'burn', burnVal, CASTER_CONFIG.fireballBurnDuration),
      logs: [`${e.name} 释放火球，施加了灼烧！`],
      floats: [{ text: `灼烧+${burnVal}`, color: 'text-orange-400', target: 'player' }],
    };
  }

  const poisonVal = Math.max(CASTER_CONFIG.curseMin, Math.floor(e.attackDmg * CASTER_CONFIG.curseToxinMult));
  return {
    updateStatuses: (statuses: StatusEffect[]) => {
      let updated = upsertStatus(statuses, 'poison', poisonVal);
      updated = upsertStatus(updated, 'weak', 1, CASTER_CONFIG.curseWeakDuration);
      return updated;
    },
    logs: [`${e.name} 施放诅咒，施加了毒素和虚弱！`],
    floats: [
      { text: `毒素+${poisonVal}`, color: 'text-emerald-400', target: 'player' },
      { text: '虚弱', color: 'text-purple-400', target: 'player', delay: 200 },
    ],
  };
}
