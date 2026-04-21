// ============================================================
// 商店配置
export const SHOP_CONFIG = {
  /** 商店遗物数量 */
  relicCount: 3,
  /** 商品价格范围 [min, max] */
  priceRange: [20, 80] as [number, number],
  /** 删除骰子固定价格 */
  removeDicePrice: 30,
  /** 固定商品列表（重投强化已移至遗物池随机产出） */
  fixedItems: [
    { id: 'removeDice', type: 'removeDice' as const, label: '骰子净化', desc: '移除一个骰子，精简构筑' },
  ],
} as const;

// ============================================================
// 营火配置
// ============================================================
export const CAMPFIRE_CONFIG = {
  /** 休息恢复量 */
  restHeal: 40,
  /** 模块强化费用系数: cost = level * costPerLevel */
  upgradeCostPerLevel: 20,
  /** 模块最大等级 */
  maxRelicLevel: 5,
} as const;

// ============================================================
// 战利品 / 掉落配置
// ============================================================
export const LOOT_CONFIG = {
  /** 普通战斗掉落金币 */
  normalDropGold: 25,
  /** 精英战斗掉落金币 */
  eliteDropGold: 50,
  /** Boss掉落金币 */
  bossDropGold: 80,
  /** 增幅选择数量 */
  relicChoiceCount: 3,
  /** 精英额外奖励 */
  /** 精英额外奖励：40%概率获得+1每回合重投，60%获得金币 */
  eliteRewards: [
    { type: 'freeRerollPerTurn' as const, value: 1, label: '+1 每回合重投' },
    { type: 'gold' as const, value: 40, label: '+40 金币' },
    { type: 'gold' as const, value: 40, label: '+40 金币' },
    { type: 'gold' as const, value: 50, label: '+50 金币' },
  ],
} as const;

// ============================================================
// 地图配置
// ============================================================
export const MAP_CONFIG = {
  /** 总层数 */
  totalLayers: 15,
  /** 中期Boss所在层 */
  midBossLayer: 7,
  /** Boss前休息层（已融入发散节点，此字段保留兼容） */
  restBeforeBossLayers: [6, 13],
  /** 固定层配置 */
  fixedLayers: {
    0: { type: 'enemy' as const, count: 1 },   // 第零层教学战
    1: { type: null, count: 3 },                // 初期分路
    2: { type: null, count: 5 },                // 扩散层
    3: { type: null, count: 3 },                // 风险层（可出精英，不强制）
    4: { type: null, count: 4 },                // 中期发散（可随机出营火）
    5: { type: null, count: 5 },                // 扩散层
    6: { type: null, count: 4 },                // Boss前发散（保证含营火）
    7: { type: 'boss' as const, count: 1 },     // 中Boss
    8: { type: null, count: 3 },                // Boss后再分路
    9: { type: null, count: 5 },                // 扩散层
    10: { type: null, count: 5 },               // 中后期风险层
    11: { type: null, count: 4 },               // 后期发散（可随机出营火）
    12: { type: null, count: 5 },               // 压力层
    13: { type: null, count: 4 },               // Boss前发散（保证含营火）
    14: { type: 'boss' as const, count: 1 },    // 最终Boss
  } as Record<number, { type: string | null; count: number }>,
  /** 随机层节点数范围 [min, max]（仅fallback） */
  randomLayerNodeRange: [2, 4] as [number, number],
  /** 节点类型权重（仅fallback，主要用层模板） */
  nodeTypeWeights: [
    { type: 'elite' as const, cumWeight: 0.10 },
    { type: 'campfire' as const, cumWeight: 0.22 },
    { type: 'treasure' as const, cumWeight: 0.32 },
    { type: 'merchant' as const, cumWeight: 0.44 },
    { type: 'merchant' as const, cumWeight: 0.52 },
    { type: 'event' as const, cumWeight: 0.62 },
    // 剩余概率 = enemy
  ],
} as const;

// ============================================================
// 章节配置 (5章制，逐章提升难度)
// ============================================================
export const CHAPTER_CONFIG = {
  /** 总章节数 */
  totalChapters: 5,
  /** 章节名称 */
  chapterNames: ['幽暗森林', '冰封山脉', '熔岩深渊', '暗影要塞', '永恒之巅'] as const,
  /** 每章的数值缩放 (HP和伤害) */
  chapterScaling: [
    { hpMult: 1.0, dmgMult: 1.0 },   // 第1章: 基准
    { hpMult: 1.25, dmgMult: 1.15 },  // 第2章: +25% HP, +15% DMG（温和地递增）
    { hpMult: 1.55, dmgMult: 1.30 },  // 第3章: +55% HP, +30% DMG
    { hpMult: 1.90, dmgMult: 1.50 },  // 第4章: +90% HP, +50% DMG
    { hpMult: 2.30, dmgMult: 1.70 },  // 第5章: +130% HP, +70% DMG（最终决花战）
  ],
  /** 每章通关时恢复的HP比例 */
  chapterHealPercent: 0.6,
  /** 每章通关时获得的金币 */
  chapterBonusGold: 75,
} as const;
