// ============================================================
// 遗物系统
// ============================================================

export type RelicTrigger = 
  | 'on_play'          // 每次出牌时
  | 'on_kill'          // 击杀敌人时
  | 'on_reroll'        // 重Roll时
  | 'on_turn_start'    // 回合开始时
  | 'on_turn_end'      // 回合结束时
  | 'on_battle_start'  // 战斗开始时
  | 'on_battle_end'    // 战斗结束时
  | 'on_damage_taken'  // 受到伤害时
  | 'on_fatal'        // 致命伤害时（急救沙漏免死）
  | 'on_floor_clear'   // 清层完成时
  | 'on_move'         // 地图移动时（导航罗盘/藏宝图）
  | 'passive';        // 被动持续生效

export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface RelicContext {
  // 出牌信息
  handType?: string;
  diceCount?: number;
  diceValues?: number[];
  diceDefIds?: string[];
  pointSum?: number;
  // 战斗状态
  rerollsThisTurn?: number;
  hpLostThisTurn?: number;
  hpLostThisBattle?: number;
  currentHp?: number;
  maxHp?: number;
  currentGold?: number;
  enemiesKilledThisBattle?: number;
  overkillDamage?: number;
  // 元素追踪
  elementsUsedThisBattle?: Set<string>;
  // 特殊骰子追踪
  hasSplitDice?: boolean;
  splitDiceValue?: number;
  hasLoadedDice?: boolean;
  loadedDiceCount?: number;
  hasSpecialDice?: boolean;
  cursedDiceInHand?: number;
  crackedDiceInHand?: number;
  // 连续普攻追踪
  consecutiveNormalAttacks?: number;
  // 免费重Roll追踪
  freeRerollsUsed?: number;
  selectedDiceCount?: number;
  // 地图进度
  currentDepth?: number;           // 当前节点深度
  floorsCleared?: number;          // 已通过的战斗层数（层厅征服者用）
  didNotPlay?: boolean;            // 本回合是否未出牌（蓄力晶核用）
  handSize?: number;               // 当前手牌数（满溢魔力用）
  isComboPlay?: boolean;           // 是否为连击出牌（暗影吸取用）
  targetPoisonStacks?: number;     // 目标毒层数（毒爆晶石用）
  playsThisTurn?: number;          // 本回合已出牌次数（连击本能用）
  isBloodReroll?: boolean;         // 本次重投是否为卖血重投（黑市合同/血铸铠甲用）
}

export interface RelicEffect {
  damage?: number;
  armor?: number;
  heal?: number;
  multiplier?: number;
  pierce?: number;
  goldBonus?: number;
  drawCountBonus?: number;
  shopDiscount?: number;
  statusEffects?: import('./dice').StatusEffect[];
  preventDeath?: boolean;      // 免疫致命伤害（急救沙漏）
  overflowDamage?: number;     // 溢出伤害转化
  freeRerolls?: number;
  // 特殊标记
  canLockDice?: boolean;
  maxPointsUnlocked?: boolean;
  straightUpgrade?: number;      // 顺子触发时升级量（3顺变4顺）
  pairAsTriplet?: boolean;       // 对子视为三条结算
  rerollPointBoost?: number;     // 重掷时骰子点数+N
  extraDraw?: number;            // 每回合额外抽骰子数量
  extraPlay?: number;            // 每回合额外出牌次数
  extraReroll?: number;          // 每回合额外免费重投次数
  normalElementChance?: number;  // 普通骰子获得元素概率
  tempDrawBonus?: number;        // 下回合临时+N手牌（魔法手套）
  unlockBloodReroll?: boolean;   // 解锁卖血重投（嗜血骰袋）
  grantFreeReroll?: number;      // 获得N次免费重投
  grantExtraPlay?: number;       // 获得N次额外出牌
  keepUnplayedOnce?: boolean;    // 本场战斗保留未使用骰子1次（命运之轮）
  keepHighestDie?: number;       // 保留点数最高的N颗骰子到下回合
  freeRerollChance?: number;     // 重投时N%概率不消耗次数
  oncePerTurn?: boolean;         // 每回合只触发一次
  purifyDebuff?: number;         // 净化N个负面状态
}

// ============================================================
// 被动遗物字段 Brand Type（ARCH-3 类型安全）
// ============================================================

/**
 * 被动遗物特有的字段键名
 *
 * [RULES-A4] 这些字段只由 trigger: 'passive' 的遗物返回，
 * 不依赖 RelicContext，可以在 sumPassiveRelicValue 中安全查询。
 * 如果尝试用 sumPassiveRelicValue 查询不在此列表的字段，TypeScript 会报错。
 */
export type PassiveRelicKey =
  | 'maxPointsUnlocked'      // limit_breaker: 骰子面值上限解除
  | 'shopDiscount'           // merchant_compass: 商店折扣
  | 'keepUnplayedOnce'       // fortune_wheel_relic: 保留未使用骰子
  | 'straightUpgrade'        // dimension_crush: 顺子升级
  | 'pairAsTriplet'          // unified_pair: 对子视为三条
  | 'rerollPointBoost'       // chaos_face: 重投点数加成
  | 'extraPlay'              // extra_play_relic: 额外出牌
  | 'extraReroll'            // fate_coin: 额外重投
  | 'normalElementChance'    // element_infuser: 普通骰子元素概率
  | 'unlockBloodReroll';     // extra_free_reroll: 解锁卖血重投
  // 注意：'extraDraw' 不是被动遗物字段，没有遗物返回此字段

export interface Relic {
  id: string;
  name: string;
  description: string;
  icon: string;           // icon标识符（对应PixelIcons中的组件）
  rarity: RelicRarity;
  trigger: RelicTrigger;
  effect: (context: RelicContext) => RelicEffect;
  // 计数型遗物
  counter?: number;        // 当前计数值
  maxCounter?: number;      // 最大计数（用于显示进度）
  counterLabel?: string;    // 计数标签（如"层"、"次"）
}
