/**
 * relicsCore.ts - 遗物定义：基础打工 / 倍率起飞 / 经济续航
 *
 * 从 relics.ts 拆分而来，包含：
 * - 体系一：基础打工类 (Flat/Chips)
 * - 体系二：倍率起飞类 (Multiplier)
 * - 体系三：经济与续航类 (Economy & Health)
 */

import type { Relic } from '../types/game';

// ============================================================
// 体系一：基础打工类
// ============================================================

export const grindstone: Relic = {
  id: 'grindstone',
  name: '磨刀石',
  description: '打出≤2颗骰子的牌型时，额外+12基础伤害',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.diceCount || 0) <= 2 ? 12 : 0,
  }),
};

export const ironBanner: Relic = {
  id: 'iron_banner',
  name: '铁血战旗',
  description: '每3回合：出牌后临时获得1次额外出牌机会',
  icon: 'flag',
  rarity: 'uncommon',
  trigger: 'on_play',
  counter: 0,
  maxCounter: 3,
  counterLabel: '回合',
  effect: () => ({ grantExtraPlay: 1 }),
};

export const heavyMetalCore: Relic = {
  id: 'heavy_metal_core',
  name: '重金属核心',
  description: '牌型中每有1颗灌铅骰子，基础伤害+10',
  icon: 'weight',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.loadedDiceCount || 0) * 10,
  }),
};

export const chaosPendulum: Relic = {
  id: 'chaos_pendulum',
  name: '混沌摆锤',
  description: '点数和为奇数时+12伤害；偶数时回复3HP并净化1个负面状态',
  icon: 'pendulum',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => {
    const sum = ctx.pointSum || 0;
    return sum % 2 === 1 ? { damage: 12 } : { heal: 3, purifyDebuff: 1 };
  },
};

export const ironSkinRelic: Relic = {
  id: 'iron_skin_relic',
  name: '稳健之心',
  description: '本回合未使用过重投时，出牌后获得1次免费重投',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    grantFreeReroll: (ctx.rerollsThisTurn || 0) === 0 ? 1 : 0,
  }),
};

export const scattershotRelic: Relic = {
  id: 'scattershot_relic',
  name: '散射弹幕',
  description: '普通攻击时，点数总和≥15后每颗骰子基础伤害+3',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.handType === '普通攻击' && (ctx.pointSum || 0) >= 15) ? (ctx.diceCount || 0) * 3 : 0,
  }),
};

// ============================================================
// 体系二：倍率起飞类
// ============================================================

export const crimsonGrail: Relic = {
  id: 'crimson_grail',
  name: '猩红圣杯',
  description: '损失HP比例转化为最终伤害倍率(最高+80%)',
  icon: 'grail',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const hpPercent = (ctx.currentHp || 100) / (ctx.maxHp || 100);
    const lostPercent = 1 - hpPercent;
    const mult = 1 + Math.min(0.8, lostPercent * 1.5);
    return { multiplier: mult };
  },
};

export const arithmeticGauge: Relic = {
  id: 'arithmetic_gauge',
  name: '等差数列仪',
  description: '打出顺子时，长度每+1，倍率递增(3顺=+50%, 4顺=+100%, 5顺=+200%, 6顺=+400%)',
  icon: 'gauge',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    if (!ht.includes('顺')) return {};
    const count = ctx.diceCount || 0;
    const multMap: Record<number, number> = { 3: 1.5, 4: 2.0, 5: 3.0, 6: 5.0 };
    return { multiplier: multMap[count] || 1 };
  },
};

export const mirrorPrism: Relic = {
  id: 'mirror_prism',
  name: '镜像棱镜',
  description: '分裂骰子触发时，分裂出的点数直接转化为全局倍率',
  icon: 'prism',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: ctx.hasSplitDice ? 1 + (ctx.splitDiceValue || 0) * 0.5 : 1,
  }),
};

export const elementalResonator: Relic = {
  id: 'elemental_resonator',
  name: '元素共鸣器',
  description: '本场战斗打出过3种不同元素时，所有伤害+150%，且每次出牌净化全部负面状态',
  icon: 'resonator',
  rarity: 'legendary',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: (ctx.elementsUsedThisBattle?.size || 0) >= 3 ? 2.5 : 1,
    purifyDebuff: (ctx.elementsUsedThisBattle?.size || 0) >= 3 ? 99 : 0,
  }),
};

export const perfectionist: Relic = {
  id: 'perfectionist',
  name: '完美主义强迫症',
  description: '打出葫芦/四条/五条且无特殊骰子(纯白杆)时，伤害+300%',
  icon: 'diamond',
  rarity: 'legendary',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    const isPureHand = (ht === '葫芦' || ht === '四条' || ht === '五条');
    const noSpecial = !ctx.hasSpecialDice;
    return { multiplier: isPureHand && noSpecial ? 4.0 : 1 };
  },
};

export const twinStarsRelic: Relic = {
  id: 'twin_stars_relic',
  name: '双子星',
  description: '打出对子时，最终伤害+50%',
  icon: 'diamond',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: (ctx.handType === '对子') ? 1.5 : 1,
  }),
};

export const voidEchoRelic: Relic = {
  id: 'void_echo_relic',
  name: '虚空回响',
  description: '打出连对时，最终伤害+80%',
  icon: 'diamond',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: (ctx.handType === '连对') ? 1.8 : 1,
  }),
};

export const glassCannonRelic: Relic = {
  id: 'glass_cannon_relic',
  name: '玻璃大炮',
  description: '每次出牌：伤害+100%，但损失10HP',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: () => ({
    multiplier: 2.0,
    heal: -10,
  }),
};

// ============================================================
// 体系三：经济与续航类
// ============================================================

export const emergencyHourglass: Relic = {
  id: 'emergency_hourglass',
  name: '急救沙漏',
  description: '免疫一次致命伤害，当你即将死亡时，完全无视这次伤害(15节点CD)',
  icon: 'hourglass',
  rarity: 'rare',
  trigger: 'on_fatal',
  counter: 0,
  maxCounter: 15,
  counterLabel: '节点',
  effect: () => ({ preventDeath: true }),
};

export const vampireFangs: Relic = {
  id: 'vampire_fangs',
  name: '吸血鬼假牙',
  description: '击杀时溢出伤害的25%转化为生命恢复',
  icon: 'fangs',
  rarity: 'rare',
  trigger: 'on_kill',
  effect: (ctx) => ({
    heal: Math.floor((ctx.overkillDamage || 0) * 0.25),
  }),
};

export const blackMarketContract: Relic = {
  id: 'black_market_contract',
  name: '黑市合同',
  description: '每回合首次卖血Roll时，获得等同roll出骰子点数的金币（每回合一次）',
  icon: 'contract',
  rarity: 'uncommon',
  trigger: 'on_reroll',
  effect: (ctx) => ({
    goldBonus: ctx.isBloodReroll ? (ctx.diceValues?.[0] || 0) : 0,
    oncePerTurn: true,
  }),
};

export const scrapYard: Relic = {
  id: 'scrap_yard',
  name: '废品回收站',
  description: '战斗结束时，手中每有1颗诅咒/碎裂骰子，获得8金币',
  icon: 'recycle',
  rarity: 'uncommon',
  trigger: 'on_battle_end',
  effect: (ctx) => ({
    goldBonus: ((ctx.cursedDiceInHand || 0) + (ctx.crackedDiceInHand || 0)) * 8,
  }),
};

export const merchantsEyeRelic: Relic = {
  id: 'merchants_eye_relic',
  name: '点石成金',
  description: '打出普通攻击时，额外获得5金币',
  icon: 'bag',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => {
    if (ctx.handType === '普通攻击') return { goldBonus: 5 };
    return {};
  },
};

export const warProfiteerRelic: Relic = {
  id: 'war_profiteer_relic',
  name: '战争商人',
  description: '每击杀一个敌人，本场战斗每次出牌额外+5金币',
  icon: 'bag',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    goldBonus: (ctx.enemiesKilledThisBattle || 0) * 5,
  }),
};

export const interestRelic: Relic = {
  id: 'interest_relic',
  name: '利息存款',
  description: '每场战斗结束时，每10金币产生1金币利息',
  icon: 'bag',
  rarity: 'uncommon',
  trigger: 'on_battle_end',
  effect: (ctx) => ({
    goldBonus: Math.floor((ctx.currentGold || 0) / 10),
  }),
};

export const painAmplifierRelic: Relic = {
  id: 'pain_amplifier_relic',
  name: '痛觉放大器',
  description: '每次出牌：本场战斗已损失HP的15%转化为额外伤害',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: Math.floor((ctx.hpLostThisBattle || 0) * 0.15),
  }),
};

export const masochistRelic: Relic = {
  id: 'masochist_relic',
  name: '受虐狂',
  description: '每次出牌：本回合损失HP的50%转化为护甲，20%回复',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    armor: Math.floor((ctx.hpLostThisTurn || 0) * 0.5),
    heal: Math.floor((ctx.hpLostThisTurn || 0) * 0.2),
  }),
};
