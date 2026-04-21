import type { EventConfig } from '../events';

/**
 * 战斗类事件配置
 */
export const COMBAT_EVENTS: EventConfig[] = [
  // ============================================================
  // 1. 阴影中的怪物 — 经典战or逃
  // ============================================================
  {
    id: 'shadow_creature',
    title: '阴影中的怪物',
    desc: '你在一处阴影中发现了一只落单的怪物，它似乎正在守护着一个散发着微光的宝箱。',
    iconId: 'skull',
    options: [
      {
        label: '发起战斗',
        sub: '击败它以获取战利品（需要消耗资源战斗）',
        color: 'bg-red-600 hover:bg-red-500',
        action: { type: 'startBattle' },
      },
      {
        label: '悄悄绕过',
        sub: '避免战斗，但穿越荆棘受伤 (-8 HP)',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'modifyHp', value: -8, toast: '穿过荆棘受伤 -8 HP', toastType: 'damage', log: '悄悄绕过了怪物，但受到了 8 点伤害。' },
      },
    ],
  },
];
