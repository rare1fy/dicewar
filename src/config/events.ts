/**
 * events.ts - 事件配置表
 * 
 * 定义所有随机事件的纯数据配置。
 * 事件的实际效果由 EventScreen 根据 action 字段解释执行。
 * 
 * 可用action类型：
 * - startBattle: 触发战斗
 * - modifyHp: 修改当前HP
 * - modifySouls: 修改金币
 * - modifyMaxHp: 修改最大HP
 * - upgradeHandType: 强化牌型（需要 needsRandomHandType）
 * - grantRelic: 获得一个随机遗物
 * - randomOutcome: 随机结果
 * - noop: 无操作
 */

export interface EventOptionConfig {
  label: string;
  sub: string;
  color: string;
  /** 动作类型，由 EventScreen 解释执行 */
  action: {
    type: 'startBattle'
      | 'modifyHp'
      | 'modifySouls'
      | 'upgradeHandType'
      | 'modifyMaxHp'
      | 'grantRelic'
      | 'randomOutcome'
      | 'removeDice'
      | 'noop';
    value?: number;
    /** 随机结果配置（仅 randomOutcome 类型使用） */
    outcomes?: {
      weight: number;
      actions: EventOptionConfig['action'][];
      toast?: string;
      toastType?: 'gold' | 'buff' | 'damage' | 'heal';
      log?: string;
    }[];
    toast?: string;
    toastType?: 'gold' | 'buff' | 'damage' | 'heal';
    log?: string;
  };
}

export interface EventConfig {
  id: string;
  title: string;
  desc: string;
  /** 图标ID，由 EventScreen 映射为实际组件 */
  iconId: 'skull' | 'star' | 'flame' | 'heart' | 'shopBag' | 'refresh' | 'question';
  options: EventOptionConfig[];
  /** 是否需要随机牌型参数 */
  needsRandomHandType?: boolean;
}

import { COMBAT_EVENTS } from './events/combatEvents';
import { SHRINE_EVENTS } from './events/shrineEvents';
import { TRADE_EVENTS } from './events/tradeEvents';

/**
 * 事件配置池
 */
export const EVENTS_POOL: EventConfig[] = [
  ...COMBAT_EVENTS,
  ...SHRINE_EVENTS,
  ...TRADE_EVENTS,
];
