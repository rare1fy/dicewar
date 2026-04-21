/**
 * relicsAugmented.ts - 遗物定义：增幅转化遗物
 *
 * 从 relics.ts 拆分而来，包含：
 * - 体系六：增幅转化遗物（从增幅模块合并）
 */

import type { Relic } from '../types/game';

// ============================================================
// 体系六：增幅转化遗物（从增幅模块合并）
// ============================================================

/** 治愈之风 - 每次出牌回复3HP */
export const healingBreeze: Relic = {
  id: 'healing_breeze',
  name: '治愈之风',
  description: '每次出牌回复3HP',
  icon: 'grail',
  rarity: 'common',
  trigger: 'on_play',
  effect: () => ({ heal: 3 }),
};

/** 磨砺石 - 击杀敌人时下回合临时+1出牌次数 */
export const sharpEdgeRelic: Relic = {
  id: 'sharp_edge_relic',
  name: '磨砺石',
  description: '击杀敌人时，下回合临时+1出牌次数',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_kill',
  effect: () => ({ grantExtraPlay: 1 }),
};

/** 幸运铜板 - 每次出牌额外获得2金币 */
export const luckyCoinRelic: Relic = {
  id: 'lucky_coin_relic',
  name: '幸运铜板',
  description: '每次出牌额外获得2金币',
  icon: 'bag',
  rarity: 'common',
  trigger: 'on_play',
  effect: () => ({ goldBonus: 2 }),
};

/** 厚皮兽甲 - 打出对子时获得10护甲 */
export const thickHideRelic: Relic = {
  id: 'thick_hide_relic',
  name: '厚皮兽甲',
  description: '打出对子时获得10护甲',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    armor: ctx.handType === '对子' ? 10 : 0,
  }),
};

/** 余烬暖石 - 打出对子时回复4HP+获得5护甲+净化 */
export const warmEmberRelic: Relic = {
  id: 'warm_ember_relic',
  name: '余烬暖石',
  description: '打出对子时回复4HP、获得5护甲，并净化1个负面状态',
  icon: 'grail',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    heal: ctx.handType === '对子' ? 4 : 0,
    armor: ctx.handType === '对子' ? 5 : 0,
    purifyDebuff: ctx.handType === '对子' ? 1 : 0,
  }),
};

/** 寻宝直觉 - 打出顺子时额外获得15金币 */
export const treasureSenseRelic: Relic = {
  id: 'treasure_sense_relic',
  name: '寻宝直觉',
  description: '打出顺子时额外获得15金币',
  icon: 'bag',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    return ht.includes('顺') ? { goldBonus: 15 } : {};
  },
};

/** 点金之手 - 打出多条时额外获得点数和+100%金币 */
export const goldenTouchRelic: Relic = {
  id: 'golden_touch_relic',
  name: '点金之手',
  description: '打出三条/四条/五条时额外获得点数和+100%金币',
  icon: 'bag',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    if (ht === '三条' || ht === '四条' || ht === '五条') {
      return { goldBonus: (ctx.pointSum || 0) * 2 };
    }
    return {};
  },
};

/** 讨价还价 - 商店消耗减少20% */
export const hagglerRelic: Relic = {
  id: 'haggler_relic',
  name: '讨价还价',
  description: '商店所有物品价格降低20%',
  icon: 'bag',
  rarity: 'uncommon',
  trigger: 'passive',
  effect: () => ({ shopDiscount: 0.2 }),
};

/** 元素过载 - 同元素出牌时伤害+120% */
export const elementOverloadRelic: Relic = {
  id: 'element_overload_relic',
  name: '元素过载',
  description: '打出同元素牌型时，最终伤害+120%',
  icon: 'resonator',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    return ht.includes('元素') ? { multiplier: 2.2 } : {};
  },
};

/** 葫芦爆裂 - 葫芦时额外伤害+护甲 */
export const fullHouseBlastRelic: Relic = {
  id: 'full_house_blast_relic',
  name: '葫芦爆裂',
  description: '打出葫芦时额外造成点数和250%伤害并获得10护甲',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    if (ctx.handType === '葫芦') {
      return { damage: Math.floor((ctx.pointSum || 0) * 2.5), armor: 10 };
    }
    return {};
  },
};

/** 连锁闪电 - 顺子时额外伤害+灼烧 */
export const chainLightningRelic: Relic = {
  id: 'chain_lightning_relic',
  name: '连锁闪电',
  description: '打出顺子时额外造成点数和的150%伤害并附加2层灼烧',
  icon: 'prism',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    if (ht.includes('顺')) {
      return {
        damage: Math.floor((ctx.pointSum || 0) * 1.5),
        statusEffects: [{ type: 'burn' as const, value: 2 }],
      };
    }
    return {};
  },
};

/** 霜冻屏障 - 葫芦时15护甲+虚弱2 */
export const frostBarrierRelic: Relic = {
  id: 'frost_barrier_relic',
  name: '霜冻屏障',
  description: '打出葫芦时获得15护甲并使敌人虚弱2层',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    if (ctx.handType === '葫芦') {
      return {
        armor: 15,
        statusEffects: [{ type: 'weak' as const, value: 2 }],
      };
    }
    return {};
  },
};

/** 灵魂收割 - 多条时伤害+回血 */
export const soulHarvestRelic: Relic = {
  id: 'soul_harvest_relic',
  name: '灵魂收割',
  description: '打出三条/四条/五条时额外造成点数和200%伤害并回复点数和50%HP',
  icon: 'fangs',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    if (ht === '三条' || ht === '四条' || ht === '五条') {
      const sum = ctx.pointSum || 0;
      return { damage: Math.floor(sum * 2), heal: Math.floor(sum * 0.5) };
    }
    return {};
  },
};

/** 压力点 - 顺子时穿透+易伤 */
export const pressurePointRelic: Relic = {
  id: 'pressure_point_relic',
  name: '压力点',
  description: '打出顺子时造成10穿透伤害并附加1层易伤',
  icon: 'blade',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const ht = ctx.handType || '';
    if (ht.includes('顺')) {
      return {
        pierce: 10,
        statusEffects: [{ type: 'vulnerable' as const, value: 1 }],
      };
    }
    return {};
  },
};

/** 基本直觉 - 普攻额外伤害 */
export const basicInstinctRelic: Relic = {
  id: 'basic_instinct_relic',
  name: '基本直觉',
  description: '普通攻击时额外造成点数和的150%伤害',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: ctx.handType === '普通攻击' ? Math.floor((ctx.pointSum || 0) * 1.5) : 0,
  }),
};

/** 连击本能 - 本回合出牌≥2次后给免费重投 */
export const rapidStrikesRelic: Relic = {
  id: 'rapid_strikes_relic',
  name: '连击本能',
  description: '本回合已出过牌≥2次后，每次出牌额外获得1次免费重投',
  icon: 'blade',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    grantFreeReroll: (ctx.playsThisTurn || 0) >= 2 ? 1 : 0,
  }),
};

/** 血之契约 - 普攻时保留点数最高的1颗骰子到下回合 */
export const bloodPactRelic: Relic = {
  id: 'blood_pact_relic',
  name: '血之契约',
  description: '打出普攻时，保留手牌中点数最高的1颗骰子到下回合',
  icon: 'fangs',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    keepHighestDie: ctx.handType === '普通攻击' ? 1 : 0,
  }),
};

/** 极简主义 - 单骰出牌大伤害 */
export const minimalistRelic: Relic = {
  id: 'minimalist_relic',
  name: '极简主义',
  description: '只选1颗骰子出牌时，+15伤害且伤害+100%',
  icon: 'diamond',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.selectedDiceCount || ctx.diceCount || 0) === 1 ? 15 : 0,
    multiplier: (ctx.selectedDiceCount || ctx.diceCount || 0) === 1 ? 2.0 : 1,
  }),
};

/** 血骰契约 - 每次重Roll伤害倍率+20%（超模→rare） */
export const bloodDiceRelic: Relic = {
  id: 'blood_dice_relic',
  name: '血骰契约',
  description: '每次出牌时，本回合每次重Roll使伤害倍率+20%',
  icon: 'fangs',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: 1 + (ctx.rerollsThisTurn || 0) * 0.2,
  }),
};

/** 净化圣水 - 出牌时移除玩家1个负面状态 */
export const purifyWaterRelic: Relic = {
  id: 'purify_water_relic',
  name: '净化圣水',
  description: '每次出牌时，随机移除1个负面状态（虚弱/易伤/中毒/灼烧）',
  icon: 'grail',
  rarity: 'rare',
  trigger: 'on_play',
  effect: () => ({ purifyDebuff: 1 }),
};

/** 肾上腺素 - HP越低倍率越高 */
export const adrenalineRushRelic: Relic = {
  id: 'adrenaline_rush_relic',
  name: '肾上腺素',
  description: 'HP越低伤害倍率越高(70%→+20%, 50%→+50%, 30%→+100%)',
  icon: 'grail',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    const hpPercent = (ctx.currentHp || 100) / (ctx.maxHp || 100);
    const bonus = hpPercent < 0.3 ? 2.0 : hpPercent < 0.5 ? 1.5 : hpPercent < 0.7 ? 1.2 : 1.0;
    return { multiplier: bonus };
  },
};

/** 狂掷风暴 - 有免费重投时，15%概率不消耗免费次数 */
export const rerollFrenzyRelic: Relic = {
  id: 'reroll_frenzy_relic',
  name: '狂掷风暴',
  description: '使用免费重投时，10%概率不消耗本次免费次数（搏命重投不可触发）',
  icon: 'blade',
  rarity: 'uncommon',
  trigger: 'on_reroll',
  effect: (ctx) => ({
    freeRerollChance: ctx.isBloodReroll ? 0 : 0.10,
  }),
};

/** 骰子大师 - 每回合额外抽1颗骰子 */
export const diceMasterRelic: Relic = {
  id: 'dice_master_relic',
  name: '骰子大师',
  description: '打出≥3颗骰子的牌型时，基础伤害+15，倍率+30%',
  icon: 'eye',
  rarity: 'legendary',
  trigger: 'on_play',
  effect: (ctx) => {
    if ((ctx.diceCount || 0) >= 3) {
      return { damage: 15, multiplier: 1.3 };
    }
    return {};
  },
};

/** 命运之轮 - 出牌后保留未使用骰子到下回合（非法师职业也可囤牌，每场战斗限1次） */
export const fortuneWheelRelic: Relic = {
  id: 'fortune_wheel_relic',
  name: '命运之轮',
  description: '每场战斗首次出牌后，保留未使用骰子到下回合（任何职业均可囤牌1次）',
  icon: 'gear',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ keepUnplayedOnce: true }),
};

/** 战场急救 - 击杀敌人时回复8HP */
export const battleMedicRelic: Relic = {
  id: 'battle_medic_relic',
  name: '战场急救',
  description: '击杀敌人时回复8HP',
  icon: 'grail',
  rarity: 'uncommon',
  trigger: 'on_kill',
  effect: () => ({ heal: 8 }),
};

/** 怒火燎原 - 每次受到伤害后，下次出牌伤害+15 */
export const rageFireRelic: Relic = {
  id: 'rage_fire_relic',
  name: '怒火燎原',
  description: '受到伤害后，下次出牌额外+15伤害',
  icon: 'blade',
  rarity: 'uncommon',
  trigger: 'on_damage_taken',
  effect: () => ({ damage: 15 }),
};

/** 藏宝图 - 宝箱节点额外获得15金币 */
export const treasureMapRelic: Relic = {
  id: 'treasure_map_relic',
  name: '藏宝图',
  description: '每次移动到宝箱节点时额外获得15金币',
  icon: 'bag',
  rarity: 'common',
  trigger: 'on_move',
  effect: () => ({ goldBonus: 15 }),
};

/** 降维打击 - 构成顺子所需的骰子数量-1（规则改变型遗物） */
export const dimensionCrush: Relic = {
  id: 'dimension_crush',
  name: '降维打击',
  icon: 'compress',
  description: '\u89E6\u53D1\u987A\u5B50\u65F6\uFF0C\u987A\u5B50\u6570\u91CF+1\uFF083\u987A\u53D84\u987A\uFF0C\u4EE5\u6B64\u7C7B\u63A8\uFF09',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ straightUpgrade: 1 }),
};

/** 万象归一 - 所有对子视为三条 (规则改变型) */
export const universalPair: Relic = {
  id: 'universal_pair',
  name: '万象归一',
  icon: 'prism',
  description: '对子视为三条结算（倍率按三条计算）',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ pairAsTriplet: true }),
};

/** 混沌骰面 - 每回合第一次重投时，所有骰子+1点 (规则改变型) */
export const chaosFace: Relic = {
  id: 'chaos_face',
  name: '混沌骰面',
  icon: 'dice',
  description: '每回合第一次重投时，所有手中骰子点数+1（6不变）',
  rarity: 'rare',
  trigger: 'passive',
  effect: () => ({ rerollPointBoost: 1 }),
};

/** 贪婪之手 - 每回合额外抽1颗骰子 (规则改变型) */
export const greedyHand: Relic = {
  id: 'greedy_hand',
  name: '贪婪之手',
  icon: 'hand',
  description: '打出≥4颗骰子的牌型时，基础伤害+20',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    if ((ctx.diceCount || 0) >= 4) {
      return { damage: 20 };
    }
    return {};
  },
};

/** 双重打击 - 每回合额外1次出牌机会 (规则改变型) */
export const doubleStrike: Relic = {
  id: 'double_strike',
  name: '双重打击',
  icon: 'bolt',
  description: '每回合额外获得1次出牌机会',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ extraPlay: 1 }),
};

/** 命运硬币 - 每回合额外1次免费重投 (规则改变型) */
export const fateCoin: Relic = {
  id: 'fate_coin',
  name: '命运硬币',
  icon: 'coin',
  description: '本回合重投≥2次后出牌，倍率+50%',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    if ((ctx.rerollsThisTurn || 0) >= 2) {
      return { multiplier: 1.5 };
    }
    return {};
  },
};

/** 元素亲和 - 普通骰子有30%概率获得随机元素 (规则改变型) */
export const elementAffinity: Relic = {
  id: 'element_affinity',
  name: '元素亲和',
  icon: 'crystal',
  description: '普通骰子抽取时有30%概率获得随机元素',
  rarity: 'rare',
  trigger: 'passive',
  effect: () => ({ normalElementChance: 0.3 }),
};

/** 完美主义者改 - 全部相同点数时额外+50% (规则改变型) */
export const symmetrySeeker: Relic = {
  id: 'symmetry_seeker',
  name: '对称追求者',
  icon: 'diamond',
  description: '出牌时若所有骰子点数相同，额外+50%倍率',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => {
    if (!ctx || !ctx.diceValues || ctx.diceValues.length === 0) return {};
    const allSame = ctx.diceValues.every((v: number) => v === ctx.diceValues![0]);
    return allSame ? { multiplier: 1.5 } : {};
  },
};
