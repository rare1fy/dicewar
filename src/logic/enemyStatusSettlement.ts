/**
 * enemyStatusSettlement.ts — 敌人状态（DOT）结算子模块
 *
 * 从 enemyAI.ts 提取的敌人回合灼烧/中毒结算逻辑。
 * 纯数据计算模块，不执行任何副作用（不调用 setEnemyEffectForUid / playSound / setDyingEnemies）。
 * 副作用由调用方 (enemyAI.ts) 在 setState updater 之外执行。
 *
 * 包含：
 * - settleEnemyBurn: 敌人灼烧结算（原 Step 2）
 * - settleEnemyPoison: 敌人中毒结算（原 Step 3）
 */

import type { Enemy } from '../types/game';
import { tickStatuses } from './enemySkills';

/** 单个敌人的 DOT 日志条目 */
export interface DotLogEntry {
  uid: string;
  name: string;
  damage: number;
  color: string;
  died: boolean;
}

/** DOT 结算结果（纯数据，无副作用） */
export interface SettlementResult {
  /** 结算后的敌人列表 */
  updatedEnemies: Enemy[];
  /**
   * 本次DOT是否有击杀且场上已无存活敌人。
   * 语义：allDead = "本次结算导致至少1人死亡 + 场上已无存活"，
   * 用于判定是否需要立即转波/胜利。
   * 若之前所有敌人已死（本回合无新击杀），不会重复触发。
   */
  allDead: boolean;
  /** 本次结算产生的日志条目（由调用方在updater外执行副作用） */
  logs: DotLogEntry[];
}

/**
 * 敌人灼烧结算
 *
 * 遍历所有存活敌人，对其施加灼烧伤害。
 * 灼烧状态在结算后移除，护甲清零。
 * 纯函数：不执行任何副作用。
 */
export function settleEnemyBurn(prev: Enemy[]): SettlementResult {
  const logs: DotLogEntry[] = [];
  const result = prev.map(e => {
    if (e.hp <= 0) return e;
    const burn = e.statuses.find(s => s.type === 'burn');
    if (burn && burn.value > 0) {
      const dmg = burn.value;
      const nextStatuses = e.statuses.filter(s => s.type !== 'burn');
      const newHp = Math.max(0, e.hp - dmg);
      const died = newHp <= 0;
      logs.push({ uid: e.uid, name: e.name, damage: dmg, color: 'text-orange-500', died });
      return { ...e, hp: newHp, statuses: nextStatuses, armor: 0 };
    }
    return { ...e, armor: 0 };
  });
  const allDead = result.filter(e => e.hp > 0).length === 0 && logs.some(l => l.died);
  return { updatedEnemies: result, allDead, logs };
}

/**
 * 敌人中毒结算
 *
 * 遍历所有存活敌人，对其施加中毒伤害。
 * 中毒层数在结算后递减 1，层数归零时移除。
 * 所有敌人（含无中毒者）的 statuses 也会经过 tickStatuses 递减。
 * 纯函数：不执行任何副作用。
 */
export function settleEnemyPoison(prev: Enemy[]): SettlementResult {
  const logs: DotLogEntry[] = [];
  const result = prev.map(e => {
    if (e.hp <= 0) return e;
    let nextStatuses = [...e.statuses];
    const poison = nextStatuses.find(s => s.type === 'poison');
    if (poison && poison.value > 0) {
      const dmg = poison.value;
      nextStatuses = nextStatuses.map(s => s.type === 'poison' ? { ...s, value: s.value - 1 } : s).filter(s => s.value > 0);
      const newHp = Math.max(0, e.hp - dmg);
      const died = newHp <= 0;
      logs.push({ uid: e.uid, name: e.name, damage: dmg, color: 'text-purple-400', died });
      nextStatuses = tickStatuses(nextStatuses);
      return { ...e, hp: newHp, statuses: nextStatuses };
    }
    nextStatuses = tickStatuses(nextStatuses);
    return { ...e, statuses: nextStatuses };
  });
  const allDead = result.filter(e => e.hp > 0).length === 0 && logs.some(l => l.died);
  return { updatedEnemies: result, allDead, logs };
}
