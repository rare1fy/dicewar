/**
 * relicsSpecial.ts - 遗物定义：机制突变 / 环层塔地图 / 职业适配
 *
 * 从 relics.ts 拆分而来，包含：
 * - 体系四：机制突变类 (Rule Breakers)
 * - 体系五：环层塔地图类
 * - 体系七：职业适配遗物
 */

import type { Relic } from '../types/game';

// ============================================================
// 体系四：机制突变类
// ============================================================

export const overflowConduit: Relic = {
  id: 'overflow_conduit',
  name: '溢出导管',
  description: '击杀敌人时，溢出伤害转移给另一个随机敌人',
  icon: 'prism',
  rarity: 'legendary',
  trigger: 'on_kill',
  effect: (ctx) => ({
    overflowDamage: ctx.overkillDamage || 0,
  }),
};

export const quantumObserver: Relic = {
  id: 'quantum_observer',
  name: '量子观测仪',
  description: '每次出牌时，随机复制1颗已选骰子的点数作为额外伤害',
  icon: 'eye',
  rarity: 'legendary',
  trigger: 'on_play',
  effect: (ctx) => {
    if ((ctx.diceValues?.length || 0) > 0) {
      const idx = Math.floor(Math.random() * ctx.diceValues!.length);
      return { damage: ctx.diceValues![idx] };
    }
    return {};
  },
};

export const limitBreaker: Relic = {
  id: 'limit_breaker',
  name: '狂暴小丑',
  description: '小丑骰子点数上限提升至100（原上限9）',
  icon: 'infinity',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ maxPointsUnlocked: true }),
};

export const schrodingerBag: Relic = {
  id: 'schrodinger_bag',
  name: '薛定谔的袋子',
  description: '回合结束时若未使用重Roll，下回合额外获得1颗临时元素骰子',
  icon: 'bag',
  rarity: 'rare',
  trigger: 'on_turn_end',
  effect: (ctx) => {
    if ((ctx.rerollsThisTurn || 0) === 0) {
      return { drawCountBonus: 1 };
    }
    return {};
  },
};

export const comboMasterRelic: Relic = {
  id: 'combo_master_relic',
  name: '连招大师',
  description: '本场战斗中连续普攻，每次+5伤害且倍率+15%（非普攻重置，战斗结束重置）',
  icon: 'blade',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.handType === '普通攻击') ? (ctx.consecutiveNormalAttacks || 0) * 5 : 0,
    multiplier: (ctx.handType === '普通攻击') ? 1 + (ctx.consecutiveNormalAttacks || 0) * 0.15 : 1,
  }),
};

// ============================================================
// 体系五：环层塔地图类
// ============================================================

/** 导航罗盘 - 每移动3步，下场战斗首次出牌+8伤害+5护甲 */
export const navigatorCompass: Relic = {
  id: 'navigator_compass',
  name: '导航罗盘',
  description: '每移动3步，下场战斗首次出牌+8伤害+5护甲',
  icon: 'gear',
  rarity: 'common',
  trigger: 'on_move',
  effect: () => ({ damage: 8, armor: 5 }),
  counter: 0,
  maxCounter: 3,
  counterLabel: '步',
};

/** 点数统计器 - 每回合自动获得3护甲，每过6层多+1护甲 */
export const pointAccumulator: Relic = {
  id: 'point_accumulator',
  name: '点数统计器',
  description: '每次出牌获得3护甲，每通过6层额外+1护甲（成长型）',
  icon: 'layers',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => {
    const layerBonus = Math.floor((ctx.currentDepth || 0) / 6);
    return { armor: 3 + layerBonus };
  },
  counter: 0,
  counterLabel: '层',
};

/** 层厅征服者 - 每通过1层战斗节点，出牌时永久+2基础伤害 */
export const floorConqueror: Relic = {
  id: 'floor_conqueror',
  name: '层厅征服者',
  description: '每通过1层战斗节点，出牌时永久+2基础伤害（累计叠加）',
  icon: 'crown',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({ damage: (ctx.floorsCleared || 0) * 2 }),
  counter: 0,
  counterLabel: '层',
};

// ============================================================
// 体系七：职业适配遗物
// ============================================================

/** 战士：血铸铠甲 - 每次嗜血获得8护甲 */
export const bloodForgeArmor: Relic = {
  id: 'blood_forge_armor',
  name: '血铸铠甲',
  description: '每次嗜血获得8护甲',
  icon: 'blade',
  rarity: 'uncommon',
  trigger: 'on_reroll',
  effect: (ctx) => ({ armor: ctx.isBloodReroll ? 8 : 0 }),
};

/** 战士：不灭斗志 - HP≤50%时每次出牌+1免费重投 */
export const undyingSpirit: Relic = {
  id: 'undying_spirit',
  name: '不灭斗志',
  description: 'HP≤50%时每次出牌额外+8伤害+5护甲',
  icon: 'grail',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.currentHp || 100) <= (ctx.maxHp || 100) * 0.5 ? 8 : 0,
    armor: (ctx.currentHp || 100) <= (ctx.maxHp || 100) * 0.5 ? 5 : 0,
  }),
};

/** 法师：蓄力晶核 - 蓄力回合额外获得4护甲+回复3HP */
export const chargeCore: Relic = {
  id: 'charge_core',
  name: '蓄力晶核',
  description: '蓄力回合（未出牌）额外获得4护甲并回复3HP',
  icon: 'crystal',
  rarity: 'uncommon',
  trigger: 'on_turn_end',
  effect: (ctx) => ({
    armor: ctx.didNotPlay ? 4 : 0,
    heal: ctx.didNotPlay ? 3 : 0,
  }),
};

/** 法师：满溢魔力 - 手牌≥5颗时出牌伤害+25% */
export const overflowMana: Relic = {
  id: 'overflow_mana',
  name: '满溢魔力',
  description: '手牌≥5颗时出牌伤害+25%',
  icon: 'prism',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    multiplier: (ctx.handSize || 0) >= 5 ? 1.25 : 1,
  }),
};

/** 盗贼：连击回血 - 触发连击时回复6HP */
export const comboLeech: Relic = {
  id: 'combo_leech',
  name: '暗影吸取',
  description: '第2次出牌为非普攻时回复6HP',
  icon: 'fangs',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => ({
    heal: (ctx.isComboPlay && ctx.handType !== '普通攻击') ? 6 : 0,
  }),
};

/** 盗贼：毒爆晶石 - 敌人毒层≥8时出牌额外+15伤害 */
export const venomCrystal: Relic = {
  id: 'venom_crystal',
  name: '毒爆晶石',
  description: '敌人毒层≥8时出牌额外+15伤害',
  icon: 'prism',
  rarity: 'rare',
  trigger: 'on_play',
  effect: (ctx) => ({
    damage: (ctx.targetPoisonStacks || 0) >= 8 ? 15 : 0,
  }),
};

/** 通用：魔法手套 - 打出对子时，下回合临时+1手牌（需1回合CD，对子才触发） */
export const extraHandSlot: Relic = {
  id: 'extra_hand_slot',
  name: '魔法手套',
  description: '打出对子时，下回合临时+1骰子（触发后需1次出牌冷却）',
  icon: 'hand',
  rarity: 'rare',
  trigger: 'on_play',
  maxCounter: 2,
  counterLabel: 'CD',
  effect: (ctx) => ({
    // 每2次出牌触发1次，且只有对子才给tempDrawBonus
    tempDrawBonus: ctx.handType === '对子' ? 1 : 0,
  }),
};

/** 通用：嗜血骰袋 - 非战士职业也可以嗜血（代价为战士的2倍） */
export const extraFreeReroll: Relic = {
  id: 'extra_free_reroll',
  name: '嗜血骰袋',
  description: '解锁嗜血能力（非战士职业可用，HP代价为战士的2倍）',
  icon: 'bag',
  rarity: 'legendary',
  trigger: 'passive',
  effect: () => ({ unlockBloodReroll: true }),
};

/** 铁壁护符 - 受到伤害后下回合临时+1手牌 */
export const turnArmor: Relic = {
  id: 'turn_armor',
  name: '铁壁护符',
  description: '受到敌人攻击后，下回合临时+1手牌',
  icon: 'blade',
  rarity: 'common',
  trigger: 'on_damage_taken',
  effect: () => ({ tempDrawBonus: 1 }),
};

/** 通用：击杀重投 - 击杀敌人时获得1次免费重投 */
export const killReroll: Relic = {
  id: 'kill_reroll',
  name: '战利品骰',
  description: '击杀敌人时获得1次免费重投',
  icon: 'dice',
  rarity: 'uncommon',
  trigger: 'on_kill',
  effect: () => ({ grantFreeReroll: 1 }),
};

/** 少即是多 - 低点数骰子倍率加成 */
export const lessIsMoreRelic: Relic = {
  id: 'less_is_more_relic',
  name: '少即是多',
  description: '出牌时每有1颗3点及以下的骰子，倍率+20%',
  icon: 'less_is_more',
  rarity: 'uncommon',
  trigger: 'on_play',
  effect: (ctx) => {
    const lowCount = (ctx.diceValues || []).filter(v => v <= 3).length;
    if (lowCount === 0) return {};
    return { multiplier: 1 + lowCount * 0.2 };
  },
};

/** 血神之眼 - 击杀敌人时恢复HP */
export const bloodEyeRelic: Relic = {
  id: 'blood_eye',
  name: '血神之眼',
  description: '击杀敌人时恢复3点HP，溢出伤害>5时额外回复2点',
  icon: 'blood_eye',
  rarity: 'rare',
  trigger: 'on_kill',
  effect: (ctx) => {
    const overkill = ctx.overkillDamage || 0;
    const baseHeal = 3;
    const bonusHeal = overkill > 5 ? 2 : 0;
    return { heal: baseHeal + bonusHeal };
  },
};
