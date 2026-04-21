/**
 * enemyTypes.ts - 敌人配置数据结构定义
 */

export type IntentType = '攻击' | '防御' | '技能';

export interface PatternAction {
  type: IntentType;
  baseValue: number;
  description?: string;
  scalable?: boolean;
  curseDice?: 'cursed' | 'cracked';
  curseDiceCount?: number;
}

export interface PhaseConfig {
  hpThreshold?: number;
  actions: PatternAction[];
}

export interface EnemyQuotes {
  enter?: string[];
  death?: string[];
  attack?: string[];
  hurt?: string[];
  lowHp?: string[];
  defend?: string[];
  skill?: string[];
  heal?: string[];
}

export interface EnemyConfig {
  id: string;
  name: string;
  emoji: string;
  baseHp: number;
  baseDmg: number;
  phases: PhaseConfig[];
  category: 'normal' | 'elite' | 'boss';
  combatType: 'warrior' | 'guardian' | 'ranger' | 'caster' | 'priest';
  chapter?: number; // 1-5, undefined = 通用
  drops: { gold: number; relic: boolean; rerollReward?: number; };
  quotes?: EnemyQuotes;
}
