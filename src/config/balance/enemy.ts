// ============================================================
// 敌人攻击力修正系数
// ============================================================
export const ENEMY_ATTACK_MULT = {
  /** 近战(warrior)攻击倍率 */
  warrior: 1.3,
  /** 远程(ranger)主攻击倍率 */
  rangerHit: 0.40,
  /** 远程(ranger)追击每层额外伤害递增 */
  rangerAttackCountStep: 2,
  /** 减速(slow)时攻击倍率 */
  slow: 0.5,
} as const;

// ============================================================
// 守护者(Guardian)配置
// ============================================================
export const GUARDIAN_CONFIG = {
  /** 护盾倍率（基于 attackDmg） */
  shieldMult: 1.5,
  /** 攻防交替周期（battleTurn % 此值） */
  defenseCycle: 2,
} as const;

// ============================================================
// 牧师(Priest)配置
// ============================================================
export const PRIEST_CONFIG = {
  /** 治疗盟友倍率（基于 attackDmg） */
  healAllyMult: 4.0,
  /** 自疗倍率（基于 attackDmg） */
  healSelfMult: 3.0,
  /** 护甲祝福倍率（基于 attackDmg） */
  armorBoostMult: 3,
  /** 虚弱施加概率 */
  weakChance: 0.35,
  /** 易伤概率阈值（debuffRoll < 此值时施加易伤） */
  vulnerableThreshold: 0.6,
  /** 力量加成数值 */
  strengthBonus: 3,
  /** 诅咒骰子概率阈值（random < 此值 → 诅咒骰子） */
  curseChance: 0.5,
  /** 虚弱持续回合数 */
  weakDuration: 3,
  /** 易伤持续回合数 */
  vulnerableDuration: 3,
  /** 诅咒虚弱持续回合数 */
  curseWeakDuration: 2,
  /** 增益/减益行动周期（battleTurn % 此值） */
  buffCycle: 2,
} as const;

// ============================================================
// 法师(Caster)配置
// ============================================================
export const CASTER_CONFIG = {
  /** 毒雾概率（DoT 随机 < 此值 → 毒雾） */
  poisonChance: 0.4,
  /** 毒雾毒素倍率（基于 attackDmg） */
  poisonMult: 0.4,
  /** 火球触发阈值（DoT 随机 < 此值 → 火球） */
  fireballThreshold: 0.7,
  /** 火球灼烧倍率（基于 attackDmg） */
  fireballMult: 0.3,
  /** 诅咒毒素倍率（基于 attackDmg） */
  curseToxinMult: 0.25,
  /** 毒雾毒素下限 */
  poisonMin: 2,
  /** 火球灼烧下限 */
  burnMin: 1,
  /** 诅咒毒素下限 */
  curseMin: 1,
  /** 火球灼烧持续回合数 */
  fireballBurnDuration: 3,
  /** 诅咒虚弱持续回合数 */
  curseWeakDuration: 2,
} as const;

// ============================================================
// 敌人台词配置
// ============================================================
export const ENEMY_TAUNT_CONFIG = {
  /** 攻击台词触发概率 */
  attackChance: 0.3,
  /** 高伤台词伤害阈值 */
  highDmgThreshold: 15,
  /** 高伤台词延迟（ms） */
  highDmgQuoteDelay: 600,
  /** 高伤台词展示时长（ms） */
  highDmgQuoteDuration: 2000,
} as const;

// ============================================================
// 精英/ Boss 配置
// ============================================================
export const ELITE_CONFIG = {
  /** 精英 HP 下限（maxHp > 此值 → 精英） */
  hpThreshold: 80,
  /** Boss HP 下限（maxHp > 此值 → Boss） */
  bossHpThreshold: 200,
  /** Boss 诅咒 HP 比例（hp/maxHp < 此值 → 诅咒骰子） */
  bossCurseHpRatio: 0.4,
  /** 精英护甲倍率（基于 attackDmg） */
  armorMult: 1.5,
  /** Boss 护甲倍率（基于 attackDmg） */
  bossArmorMult: 2.0,
  /** 精英塞废骰子周期（battleTurn % 此值 = 0 时触发） */
  eliteDiceCycle: 3,
  /** Boss 低HP诅咒周期（battleTurn % 此值） */
  bossCurseCycle: 2,
  /** Boss塞碎裂骰子周期（battleTurn % 此值 = 0 时触发） */
  bossCrackedDiceCycle: 3,
  /** 叠护甲行动周期（elite, battleTurn % 此值） */
  eliteArmorCycle: 3,
  /** 叠护甲行动周期（boss, battleTurn % 此值） */
  bossArmorCycle: 2,
} as const;
