/**
 * dice.ts - 骰子定义表 v2
 * 
 * === 骰子体系 v2 ===
 * 1. 元素骰子：合并火/冰/雷/毒/圣为一种，抽到时随机坍缩
 * 2. 灌铅骰子：只能掷出 4/5/6，高下限
 * 3. 混沌骰子：只能掷出 1 和 6，极端分布
 * 4. 锋刃骰子：+20 基础伤害
 * 5. 倍增骰子：+50% 倍率
 * 6. 小丑骰子：1-9 随机
 * 7. 分裂骰子：出牌时复制自身加入结算
 * 8. 诅咒骰子：0点，重Roll代价翻倍
 * 9. 碎裂骰子：固定1-2点，反噬伤害
 */

import type { DiceDef, DiceRarity } from '../types/game';

// ============================================================
// 普通骰子 (common)
// ============================================================

const standard: DiceDef = {
  id: 'standard',
  name: '普通骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '标准六面骰，点数1到6均匀分布',
  rarity: 'common',
};

// ============================================================
// 进阶骰子 (uncommon)
// ============================================================

const heavy: DiceDef = {
  id: 'heavy',
  name: '灌铅骰子',
  element: 'normal',
  faces: [4, 4, 5, 5, 6, 6],
  description: '只会掷出4、5、6，稳定的高点数骰子',
  rarity: 'uncommon',
};

const elemental: DiceDef = {
  id: 'elemental',
  name: '元素骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '每回合随机变为火、冰、雷、毒、圣元素之一；重投会重新随机',
  rarity: 'rare',
  isElemental: true,
};

// ============================================================
// 高级骰子 (rare)
// ============================================================

const blade: DiceDef = {
  id: 'blade',
  name: '锋刃骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '出牌时追加5点固定伤害，随战斗阶段升级提升',
  rarity: 'rare',
  onPlay: { bonusDamage: 5 },
};

const amplify: DiceDef = {
  id: 'amplify',
  name: '倍增骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '出牌时最终伤害提升20%，随战斗阶段升级提升',
  rarity: 'rare',
  onPlay: { bonusMult: 1.2 },
};

const split: DiceDef = {
  id: 'split',
  name: '分裂骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '出牌时分裂出1颗相同点数的临时骰子一同结算',
  rarity: 'rare',
};


const magnet: DiceDef = {
  id: 'magnet',
  name: '磁吸骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6],
  description: '出牌时随机将1颗同伴骰子的点数变为与本骰子相同',
  rarity: 'rare',
};
const joker: DiceDef = {
  id: 'joker',
  name: '小丑骰子',
  element: 'normal',
  faces: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  description: '点数在1到9之间随机，突破六面骰的限制',
  rarity: 'rare',
};

// ============================================================
// 传说骰子 (legendary)
// ============================================================

const chaos: DiceDef = {
  id: 'chaos',
  name: '混沌骰子',
  element: 'normal',
  faces: [1, 1, 1, 6, 6, 6],
  description: '只会掷出1或6，适合凑满堂红和多条牌型',
  rarity: 'legendary',
};

// ============================================================
// 诅咒骰子 (curse)
// ============================================================

const cursed: DiceDef = {
  id: 'cursed',
  name: '诅咒骰子',
  element: 'normal',
  faces: [0, 0, 0, 0, 0, 0],
  description: '点数固定为0，重投代价翻倍',
  rarity: 'curse',
  isCursed: true,
};

const cracked: DiceDef = {
  id: 'cracked',
  name: '碎裂骰子',
  element: 'normal',
  faces: [1, 1, 1, 2, 2, 2],
  description: '出牌后受到3点反噬伤害；回合结束时若未打出则自动销毁',
  rarity: 'curse',
  onPlay: { selfDamage: 2 },
  isCracked: true,
};

// ============================================================
// 骰子注册表
// ============================================================

// ============================================================
// 骰子注册表（支持动态注册职业骰子）
// ============================================================

// 通用骰子池（不含已移交给职业的骰子：elemental→法师, heavy→盗贼）
const BASE_DICE: Record<string, DiceDef> = {
  standard,
  blade, amplify, split, magnet, joker,
  chaos,
  cursed, cracked,
  // heavy 和 elemental 保留定义但不放入通用池，仅用于旧存档兼容查询
};

// 保留旧ID定义供 getDiceDef 回退查找
const LEGACY_DICE: Record<string, DiceDef> = { heavy, elemental };

// 盗贼临时骰子（连击/技能奖励，1回合后销毁）
const temp_rogue: DiceDef = {
  id: 'temp_rogue', name: '暗影残骰', element: 'normal', faces: [1, 1, 2, 2, 3, 3], rarity: 'common',
  description: '连击奖励的临时骰子，回合结束未使用则自动销毁',
};

// 可变注册表（包含基础+职业骰子）
export let ALL_DICE: Record<string, DiceDef> = { ...BASE_DICE, ...LEGACY_DICE, temp_rogue };

/** 注册职业骰子到全局注册表 */
export function registerClassDice(diceList: DiceDef[]) {
  const updated = { ...ALL_DICE };
  diceList.forEach(d => { updated[d.id] = d; });
  ALL_DICE = updated;
}

export const DICE_BY_RARITY: Record<DiceRarity, DiceDef[]> = {
  common: [standard],
  uncommon: [],
  rare: [blade, amplify, split, magnet, joker],
  legendary: [chaos],
  curse: [cursed, cracked],
};

export const INITIAL_DICE_BAG: string[] = [
  'standard', 'standard', 'standard', 'standard',
  'blade',
];

export const ELEMENTAL_COLLAPSE_ELEMENTS = ['fire', 'ice', 'thunder', 'poison', 'holy'] as const;
export type CollapseElement = typeof ELEMENTAL_COLLAPSE_ELEMENTS[number];

export const collapseElement = (): CollapseElement => {
  return ELEMENTAL_COLLAPSE_ELEMENTS[Math.floor(Math.random() * ELEMENTAL_COLLAPSE_ELEMENTS.length)];
};

export const rollDiceDef = (def: DiceDef): number => {
  return def.faces[Math.floor(Math.random() * def.faces.length)];
};

export const getDiceDef = (id: string): DiceDef => {
  return ALL_DICE[id] || ALL_DICE['standard'];
};

// ============================================================
// 骰子升级体系
// ============================================================

export const getUpgradedFaces = (def: DiceDef, _level: number): number[] => {
  // 升级不再改变点数面，而是强化骰子的特殊效果
  return def.faces;
};

export const getDiceLevelScale = (level: number): number => {
  return 1 + (level - 1) * 0.5;
};


/** 获取升级后的onPlay效果（强化特殊效果，而非点数） */
export const getUpgradedOnPlay = (def: DiceDef, level: number): DiceDef['onPlay'] => {
  if (level <= 1) return def.onPlay;
  const bonus = level - 1; // Lv2 = +1, Lv3 = +2
  
  if (!def.onPlay) {
    // 无特殊效果的骰子：升级后获得额外伤害
    // 普通骰子 Lv2=+3, Lv3=+6; 灌铅 Lv2=+4, Lv3=+8
    const baseBonusDmg = def.id === 'heavy' ? 4 : def.id === 'elemental' ? 3 : 3;
    return { bonusDamage: bonus * baseBonusDmg };
  }
  
  const op = { ...def.onPlay };
  // 锋刃骰子: Lv1=5, Lv2=8, Lv3=11（每级+3）
  if (op.bonusDamage) op.bonusDamage = op.bonusDamage + bonus * 3;
  // 倍增骰子: Lv1=1.2, Lv2=1.35, Lv3=1.5（每级+0.15）
  if (op.bonusMult) op.bonusMult = Number((op.bonusMult + bonus * 0.15).toFixed(2));
  if (op.selfDamage) op.selfDamage = Math.max(1, op.selfDamage - bonus); // 减少副作用
  return op;
};

/** 获取升级后的元素效果倍率 */
export const getElementLevelBonus = (level: number): number => {
  return 1 + (level - 1) * 0.5; // Lv1=1x, Lv2=1.5x, Lv3=2x
};

export const DICE_MAX_LEVEL = 3;

// ============================================================
// 骰子构筑奖励池 — 加权随机，所有骰子都有机会
// ============================================================

export const getDiceRewardPool = (battleType: 'enemy' | 'elite' | 'boss', playerClass?: string): DiceDef[] => {
  // 优先使用职业专属骰子池
  if (playerClass) {
    const classDice = Object.values(ALL_DICE).filter(d => d.id.startsWith(playerClass === 'warrior' ? 'w_' : playerClass === 'mage' ? 'mage_' : 'r_'));
    if (classDice.length > 0) {
      const idx = battleType === 'enemy' ? 0 : battleType === 'elite' ? 1 : 2;
      const pool: DiceDef[] = [];
      classDice.forEach(d => {
        // 按稀有度设置权重
        const rarityWeight = d.rarity === 'common' ? [4,3,1] : d.rarity === 'uncommon' ? [3,3,2] : d.rarity === 'rare' ? [1,2,3] : [0.3,1,3];
        const count = Math.max(1, Math.round(rarityWeight[idx]));
        for (let i = 0; i < count; i++) pool.push(d);
      });
      // 混入通用骰子（不含已有职业版本的：heavy→r_heavy, elemental→mage_elemental）
      const universalDice = [
        ALL_DICE['blade'], ALL_DICE['amplify'],
        ALL_DICE['split'], ALL_DICE['magnet'],
        ALL_DICE['joker'], ALL_DICE['chaos']
      ].filter(Boolean);
      universalDice.forEach(d => {
        if (d) pool.push(d);
      });
      return pool;
    }
  }
  
  // 后备：通用池（不含已移交职业的heavy/elemental）
  const weights: Record<string, [number, number, number]> = {
    blade:     [3, 3, 2],
    amplify:   [3, 3, 2],
    split:     [1, 3, 3],
    magnet:    [1, 3, 3],
    joker:     [1, 2, 3],
    chaos:     [0.3, 1, 3],
  };
  const idx = battleType === 'enemy' ? 0 : battleType === 'elite' ? 1 : 2;
  const pool: DiceDef[] = [];
  for (const [id, w] of Object.entries(weights)) {
    const def = ALL_DICE[id];
    if (!def) continue;
    const count = Math.max(1, Math.round(w[idx]));
    for (let i = 0; i < count; i++) pool.push(def);
  }
  return pool;
};

export const pickRandomDice = (pool: DiceDef[], count: number): DiceDef[] => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const result: DiceDef[] = [];
  for (const d of shuffled) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      result.push(d);
      if (result.length >= count) break;
    }
  }
  return result;
};

export const ELEMENT_EFFECT_DESC: Record<string, string> = {
  fire: '破甲爆燃：摧毁敌人所有护甲，附加真实伤害，并施加点数灼烧',
  ice: '绝对控制：冻结敌人1回合，点数结算减半',
  thunder: '传导AOE：对其他敌人造成等量穿透伤害',
  poison: '叠层斩杀：施加毒层，跨回合持续掉血',
  holy: '经济续航：恢复等同点数的生命值',
};
