import type { EventConfig } from '../events';

/**
 * 交易/赌博/陷阱类事件配置
 */
export const TRADE_EVENTS: EventConfig[] = [
  // ============================================================
  // 5. 神秘旅商 — 买药 or 买最大HP or 讨价还价
  // ============================================================
  {
    id: 'mysterious_merchant',
    title: '神秘旅商',
    desc: '一位戴着面具的旅商从暗处走来，他的背包里似乎有些不寻常的东西。',
    iconId: 'shopBag',
    options: [
      {
        label: '购买生命药剂',
        sub: '-25 金币，回复 35 HP',
        color: 'bg-emerald-600 hover:bg-emerald-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifySouls', value: -25 }, { type: 'modifyHp', value: 35 }], toast: '-25金币, +35HP', toastType: 'heal', log: '购买了生命药剂，回复 35 HP。' },
        ]},
      },
      {
        label: '购买强化药水',
        sub: '-35 金币，永久 +10 最大生命',
        color: 'bg-blue-600 hover:bg-blue-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifySouls', value: -35 }, { type: 'modifyMaxHp', value: 10 }], toast: '-35金币, 最大HP+10', toastType: 'buff', log: '购买了强化药水，最大生命 +10！' },
        ]},
      },
      {
        label: '讨价还价',
        sub: '50%概率免费获得药剂，50%概率被赶走',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 0.5, actions: [{ type: 'modifyHp', value: 25 }], toast: '讨价成功！免费回复25HP', toastType: 'heal', log: '讨价还价成功，免费获得药剂！' },
          { weight: 0.5, actions: [{ type: 'noop' }], toast: '旅商不悦，拒绝交易', toastType: 'damage', log: '旅商被激怒，拒绝了你的交易。' },
        ]},
      },
    ],
  },

  // ============================================================
  // 6. 命运之轮 — 赌金币 or 安全离开
  // ============================================================
  {
    id: 'wheel_of_fate',
    title: '命运之轮',
    desc: '你发现了一个古老的命运之轮，轮盘上刻满了神秘的符号。转动它需要付出代价。',
    iconId: 'refresh',
    options: [
      {
        label: '献血转动（-10 HP）',
        sub: '60%概率+40金币，40%概率获得一件遗物',
        color: 'bg-cyan-600 hover:bg-cyan-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 0.6, actions: [{ type: 'modifyHp', value: -10 }, { type: 'modifySouls', value: 40 }], toast: '幸运！-10HP, +40金币', toastType: 'gold', log: '命运之轮转出了 40 金币！' },
          { weight: 0.4, actions: [{ type: 'modifyHp', value: -10 }, { type: 'grantRelic' }], toast: '大吉！-10HP, 获得遗物！', toastType: 'buff', log: '命运之轮赐予了一件遗物！' },
        ]},
      },
      {
        label: '观望离开',
        sub: '安全但错过机会',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'noop', log: '你选择了安全离开。' },
      },
    ],
  },

  // ============================================================
  // 4. 致命陷阱 — 硬扛换金币 or 花钱避开
  // ============================================================
  {
    id: 'deadly_trap',
    title: '致命陷阱',
    desc: '你触发了一个隐藏的机关！无数毒箭从墙壁中射出。',
    iconId: 'flame',
    options: [
      {
        label: '硬扛毒箭',
        sub: '-15 HP，但在残骸中找到 25 金币',
        color: 'bg-orange-600 hover:bg-orange-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifyHp', value: -15 }, { type: 'modifySouls', value: 25 }], toast: '-15HP, +25金币', toastType: 'damage', log: '踩中陷阱受伤，但在残骸中找到了 25 金币。' },
        ]},
      },
      {
        label: '舍财保命',
        sub: '-20 金币触发备用机关，完全避开',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'modifySouls', value: -20, log: '丢弃了 20 金币以避开陷阱。' },
      },
    ],
  },

  // ============================================================
  // 8. 骰子赌徒 — 赌金币 or 赌HP or 离开
  // ============================================================
  {
    id: 'dice_gambler',
    title: '骰子赌徒',
    desc: '一个神秘的赌徒向你发起挑战：用你的资源赌一把，赢了翻倍，输了全无。',
    iconId: 'question',
    options: [
      {
        label: '赌上 30 金币',
        sub: '50%概率+60金币，50%概率-30金币',
        color: 'bg-amber-600 hover:bg-amber-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 0.5, actions: [{ type: 'modifySouls', value: 60 }], toast: '赢了！+60金币', toastType: 'gold', log: '赌赢了！获得60金币！' },
          { weight: 0.5, actions: [{ type: 'modifySouls', value: -30 }], toast: '输了...-30金币', toastType: 'damage', log: '赌输了，损失30金币。' },
        ]},
      },
      {
        label: '赌上生命力',
        sub: '50%概率获得遗物，50%概率-20HP',
        color: 'bg-red-600 hover:bg-red-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 0.5, actions: [{ type: 'grantRelic' }], toast: '赢了！获得遗物！', toastType: 'buff', log: '赌赢了！获得一件遗物！' },
          { weight: 0.5, actions: [{ type: 'modifyHp', value: -20 }], toast: '输了...-20HP', toastType: 'damage', log: '赌输了，损失20HP。' },
        ]},
      },
      {
        label: '拒绝赌博',
        sub: '安全离开',
        color: 'bg-zinc-700 hover:bg-zinc-600',
        action: { type: 'noop', log: '你拒绝了赌徒的挑战。' },
      },
    ],
  },

  // ============================================================
  // 10. 灵魂裂隙 — 新事件：高风险高收益
  // ============================================================
  {
    id: 'soul_rift',
    title: '灵魂裂隙',
    desc: '空间中出现了一道闪烁的裂隙，另一侧传来强大的能量波动。踏入其中可能改变命运。',
    iconId: 'star',
    options: [
      {
        label: '踏入裂隙',
        sub: '-20 HP，但获得遗物 + 30金币',
        color: 'bg-purple-600 hover:bg-purple-500',
        action: { type: 'randomOutcome', outcomes: [
          { weight: 1.0, actions: [{ type: 'modifyHp', value: -20 }, { type: 'grantRelic' }, { type: 'modifySouls', value: 30 }], toast: '-20HP, 获得遗物+30金币！', toastType: 'buff', log: '踏入灵魂裂隙，付出20HP的代价，获得遗物和30金币。' },
        ]},
      },
      {
        label: '谨慎观察',
        sub: '从裂隙边缘拾取散落的金币 (+15金币)',
        color: 'bg-amber-600 hover:bg-amber-500',
        action: { type: 'modifySouls', value: 15, toast: '+15金币', toastType: 'gold', log: '从裂隙边缘拾取了15金币。' },
      },
    ],
  },
];
