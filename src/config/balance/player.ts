// ============================================================
// 玩家初始配置
// ============================================================
export const PLAYER_INITIAL = {
  hp: 100,
  maxHp: 100,
  armor: 0,
  freeRerollsPerTurn: 1,  // 2次免费重投
  globalRerolls: 0,
  playsPerTurn: 1,
  souls: 0,
  relicSlots: 5,
  drawCount: 3,       // 初始抽3个骰子
  maxDrawCount: 6,
} as const;

// ============================================================
// 战斗数值缩放 - 层级系数（精确控制每层难度曲线）
// ============================================================

/** 层级难度系数，精确控制每层的倍率，确保精准的每层难度 */
export const DEPTH_SCALING: { hpMult: number; dmgMult: number }[] = [
  { hpMult: 0.90, dmgMult: 0.40 },  // depth 0: 教学关，轻松过
  { hpMult: 1.10, dmgMult: 0.50 },  // depth 1: 稍有肉感
  { hpMult: 1.25, dmgMult: 0.60 },  // depth 2: 开始有压力
  { hpMult: 1.50, dmgMult: 0.75 },  // depth 3: 精英层
  { hpMult: 1.20, dmgMult: 0.65 },  // depth 4: 精英后休息
  { hpMult: 1.40, dmgMult: 0.80 },  // depth 5: 热身完毕
  { hpMult: 1.20, dmgMult: 0.70 },  // depth 6: 营火前缓冲
  { hpMult: 1.80, dmgMult: 1.00 },  // depth 7: 中期Boss
  { hpMult: 1.10, dmgMult: 0.60 },  // depth 8: Boss后恢复期
  { hpMult: 1.40, dmgMult: 0.80 },  // depth 9: 重新热身
  { hpMult: 1.60, dmgMult: 0.90 },  // depth 10: 后期开始
  { hpMult: 1.80, dmgMult: 1.00 },  // depth 11: 后期巅峰
  { hpMult: 2.00, dmgMult: 1.10 },  // depth 12: pre-boss精英层
  { hpMult: 1.30, dmgMult: 0.80 },  // depth 13: 营火前缓冲
  { hpMult: 2.50, dmgMult: 1.30 },  // depth 14: 最终Boss
];

/** 获取指定层级的缩放系数 */
export const getDepthScaling = (depth: number): { hpMult: number; dmgMult: number } => {
  if (depth < 0) return { hpMult: 0.90, dmgMult: 0.80 };
  if (depth >= DEPTH_SCALING.length) return DEPTH_SCALING[DEPTH_SCALING.length - 1];
  return DEPTH_SCALING[depth];
};

// 保留旧接口兼容（部分代码可能还在用）
export const BATTLE_SCALING = {
  hpPerDepth: 0.15,
  dmgPerDepth: 0.10,
} as const;

// ============================================================
// 骰子奖励刷新配置
// ============================================================
export const DICE_REWARD_REFRESH = {
  /** 刷新基础价格（金币） */
  basePrice: 5,
  /** 价格倍率（每次刷新乘以此值） */
  priceMultiplier: 2,
  /** 首次免费 */
  firstFree: true,
} as const;

// ============================================================
// 增幅模块选择
// ============================================================
export const SKILL_SELECT_CONFIG = {
  /** 可选增幅数量 */
  choiceCount: 3,
  /** 代价池 */
  costPool: [
    { type: 'maxHp' as const, value: 8, label: '最大生命 -8' },
    { type: 'maxHp' as const, value: 12, label: '最大生命 -12' },
    { type: 'hp' as const, value: 10, label: '当前生命 -10' },
    { type: 'hp' as const, value: 15, label: '当前生命 -15' },
  ],
} as const;

// ============================================================
// 战士血怒配置
// ============================================================
export const FURY_CONFIG = {
  /** 每层伤害加成（15% = 0.15） */
  damagePerStack: 0.15,
  /** 最大叠加层数 */
  maxStack: 5,
  /** 叠满后卖血获得的护甲 */
  armorAtCap: 5,
} as const;

// ============================================================
// 魂晶系统配置
// ============================================================
export const SOUL_CRYSTAL_CONFIG = {
  /** 基础倍率 */
  baseMult: 1.0,
  /** 每层增加的倍率 */
  multPerDepth: 0.2,
  /** 溢出伤害转化为魂晶的系数（降低后通过商店涨价控制产销比） */
  conversionRate: 0.15,
  /** 获取魂晶的条件描述 */
  description: '击杀敌人时，溢出伤害×倍率×15%=魂晶',
} as const;

/** 计算当前层的魂晶倍率 */
export const getSoulCrystalMult = (depth: number, currentMult: number): number => {
  // 层数成长：基础倍率 + 每层+0.2
  const depthBonus = depth * SOUL_CRYSTAL_CONFIG.multPerDepth;
  return currentMult + depthBonus;
};

// ============================================================
// 状态效果修正系数
// ============================================================
export const STATUS_EFFECT_MULT = {
  /** 虚弱(weak)：攻击力 ×0.75 */
  weak: 0.75,
  /** 易伤(vulnerable)：受到攻击 ×1.5 */
  vulnerable: 1.5,
} as const;

// ============================================================
// 动画时长配置（ms）
// ============================================================
export const ANIMATION_TIMING = {
  /** 敌人死亡动画持续时间 */
  enemyDeathDuration: 1800,
  /** 敌人死亡后等待清理的缓冲时间（死亡动画 + 缓冲） */
  enemyDeathCleanupDelay: 2200,
  /** 波次转换时，等待死亡动画 + 额外缓冲后再替换敌人 */
  waveTransitionDeathBuffer: 400,
  /** 敌人入场动画（boss_entrance）持续时间 */
  bossEntranceDuration: 1200,
  /** 攻击特效持续时间 */
  attackEffectDuration: 400,
  /** 说话特效持续时间 */
  speakingEffectDuration: 400,
  /** 战斗胜利后延迟清理敌人（确保死亡动画播完，≥ enemyDeathDuration） */
  victoryEnemyCleanupDelay: 2200,
} as const;
