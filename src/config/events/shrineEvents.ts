import type { EventConfig } from '../events';

/**
 * 祭坛/铸造/泉水类事件配置
 */
export const SHRINE_EVENTS: EventConfig[] = [
  // ============================================================
  // 2. 古老祭坛 — 献血换牌型升级 or 金币
  // ============================================================
  {
    id: 'ancient_altar',
    title: '古老祭坛',
    desc: '你发现了一个被遗忘的祭坛，上面刻着两种不同的符文。你只能选择其中一种力量。',
    iconId: 'star',
    options: [
      {
        label: '贪婪符文',
        sub: '+30 金币，但 -10 HP（献血祭祀）',
        color: 'bg-amber-600 hover:bg-amber-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifySouls', value: 30 }, { type: 'modifyHp', value: -10 }], toast: '获得30金币，损失10HP', toastType: 'gold', log: '在祭坛献血获得了 30 金币，损失 10 HP。' },
        ]},
      },
      {
        label: '力量符文',
        sub: '获得一件遗物，但 -15 HP（剧痛刻印）',
        color: 'bg-purple-600 hover:bg-purple-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'grantRelic' }, { type: 'modifyHp', value: -15 }], toast: '获得遗物！但损失15HP', toastType: 'buff', log: '在祭坛忍受剧痛，获得了一件遗物。' },
        ]},
      },
    ],
  },

  // ============================================================
  // 3. 虚空交易 — 强化牌型 or 安全离开
  // ============================================================
  {
    id: 'void_trade',
    title: '虚空交易',
    desc: '一个虚幻的身影出现在你面前，向你展示了禁忌的知识。但代价是你的生命力。',
    iconId: 'skull',
    needsRandomHandType: true,
    options: [
      {
        label: '强化「{handType}」',
        sub: '提升该牌型的基础威力，代价 -15 HP',
        color: 'bg-purple-600 hover:bg-purple-500',
        action: { type: 'upgradeHandType', value: -15, toast: '禁忌知识的代价 -15 HP', toastType: 'damage', log: '消耗 15 生命，「{handType}」升级了！' },
      },
      {
        label: '拒绝交易',
        sub: '安全离开，保存实力',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'noop', log: '拒绝了虚空交易，安全离开。' },
      },
    ],
  },

  // ============================================================
  // 7. 诅咒之泉 — 回血但降最大HP or 花钱净化
  // ============================================================
  {
    id: 'cursed_spring',
    title: '诅咒之泉',
    desc: '一汪散发着诡异紫光的泉水出现在你面前。泉水能恢复伤口，但也会留下诅咒。',
    iconId: 'heart',
    options: [
      {
        label: '饮用泉水',
        sub: '+40 HP，但最大生命永久 -5',
        color: 'bg-emerald-600 hover:bg-emerald-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifyHp', value: 40 }, { type: 'modifyMaxHp', value: -5 }], toast: '+40HP, 最大生命-5', toastType: 'heal', log: '饮用诅咒之泉，恢复40HP但最大生命永久-5。' },
        ]},
      },
      {
        label: '净化泉水',
        sub: '-15 金币净化后安全饮用，+20 HP',
        color: 'bg-blue-600 hover:bg-blue-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifySouls', value: -15 }, { type: 'modifyHp', value: 20 }], toast: '-15金币, +20HP', toastType: 'heal', log: '花费15金币净化泉水，安全回复20HP。' },
        ]},
      },
    ],
  },

  // ============================================================
  // 9. 遗忘铸炉 — 新事件：强化牌型 or 获取遗物
  // ============================================================
  {
    id: 'forgotten_forge',
    title: '遗忘铸炉',
    desc: '一座仍在燃烧的古老铸炉隐藏在洞穴深处。炉火中似乎蕴含着某种力量。',
    iconId: 'flame',
    needsRandomHandType: true,
    options: [
      {
        label: '投入金币淬炼',
        sub: '-30 金币，强化「{handType}」牌型',
        color: 'bg-orange-600 hover:bg-orange-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifySouls', value: -30 }, { type: 'upgradeHandType', value: 0 }], toast: '-30金币，牌型强化！', toastType: 'buff', log: '花费30金币在铸炉中淬炼，「{handType}」升级了！' },
        ]},
      },
      {
        label: '探索铸炉遗迹',
        sub: '70%概率找到遗物，30%概率被烫伤(-12HP)',
        color: 'bg-amber-600 hover:bg-amber-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 0.7, actions: [{ type: 'grantRelic' }], toast: '在遗迹中找到了遗物！', toastType: 'buff', log: '在铸炉遗迹中发现了一件遗物！' },
          { weight: 0.3, actions: [{ type: 'modifyHp', value: -12 }], toast: '被铸炉烫伤 -12HP', toastType: 'damage', log: '探索时被铸炉烫伤，损失12HP。' },
        ]},
      },
      {
        label: '离开',
        sub: '安全离开',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'noop', log: '你选择离开铸炉。' },
      },
    ],
  },

  // ============================================================
  // 神秘熔炉 — 删骰子事件（伴随代价）
  // ============================================================
  {
    id: 'mystic_furnace',
    title: '神秘熔炉',
    desc: '你发现了一座燃烧着异火的古老熔炉。火焰似乎可以熔炼一切。你可以将一颗骰子投入其中，但熔炉的火焰会灼伤你。',
    iconId: 'flame',
    options: [
      {
        label: '投入骰子',
        sub: '移除一颗非基础骰子，但 -12 HP',
        color: 'bg-red-600 hover:bg-red-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'removeDice' }, { type: 'modifyHp', value: -12 }], toast: '骰子已熔炼，-12HP', toastType: 'damage', log: '将一颗骰子投入熔炉，火焰灼伤了你 12 HP。' },
        ]},
      },
      {
        label: '离开',
        sub: '不冒险，安全离开',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'noop', toast: '你谨慎地离开了熔炉。', log: '没有使用神秘熔炉。' },
      },
    ],
  },
];
