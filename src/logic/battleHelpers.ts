/**
 * battleHelpers.ts — 战斗相关辅助函数和常量
 * 
 * 从 DiceHeroGame.tsx 提取的战斗辅助逻辑。
 */

import type { StatusEffect } from '../types/game';

/** 战斗类型描述（用于UI显示） */
export const COMBAT_TYPE_DESC: Record<string, { name: string; icon: string; color: string; desc: string }> = {
  warrior: { name: '战士', icon: '', color: 'var(--pixel-red)', desc: '近战类型，需要接近后才能攻击。每回合逼近1步，到达后每回合普通攻击。' },
  guardian: { name: '守护者', icon: '', color: 'var(--pixel-blue)', desc: '重装近战类型，需要接近后才能攻击。交替攻击和举盾防御，获得额外护甲。' },
  ranger: { name: '游侠', icon: '', color: 'var(--pixel-green)', desc: '远程弓箭手，直接攻击两次。每次伤害较低但持续输出。' },
  caster: { name: '术士', icon: '', color: 'var(--pixel-purple)', desc: '远程施法者，不会直接攻击。专注施加毒素、灼烧等持续伤害效果。' },
  priest: { name: '牧师', icon: '', color: 'var(--pixel-gold)', desc: '支援型，不会攻击玩家。为队友治疗、加甲、加力量，或给玩家施加虚弱、易伤等减益。' },
};

/** 状态效果回合递减 */
export function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map(s => {
      if (s.duration !== undefined && s.duration > 0) {
        return { ...s, duration: s.duration - 1 };
      }
      return s;
    })
    .filter(s => {
      // 保留没有duration限制的（永久效果）
      if (s.duration === undefined) return true;
      // 保留duration > 0 的
      return s.duration > 0;
    });
}

/** 判断是否为AOE牌型 */
export function isAoeHand(activeHands: string[]): boolean {
  return activeHands.some(h => ['顺子', '4顺', '5顺', '6顺', '元素顺', '元素葫芦', '皇家元素顺'].includes(h));
}

/** 获取敌人距离对应的视觉缩放参数 */
export function getDepthVisuals(distance: number) {
  const depthScale = distance === 0 ? 1.25 : distance === 1 ? 0.95 : distance === 2 ? 0.75 : 0.6;
  const depthY = distance >= 3 ? -50 : distance === 2 ? -25 : distance === 1 ? -5 : 30;
  const depthBrightness = distance >= 3 ? 0.82 : distance === 2 ? 0.9 : distance === 1 ? 0.95 : 1.0;
  const depthZ = distance >= 3 ? 1 : distance === 2 ? 3 : distance === 1 ? 5 : 7;
  return { depthScale, depthY, depthBrightness, depthZ };
}
