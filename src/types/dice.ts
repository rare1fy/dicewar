// ============================================================
// 骰子元素与稀有度
// ============================================================

export type DiceElement = 'normal' | 'fire' | 'ice' | 'thunder' | 'poison' | 'holy' | 'shadow';
export type DiceRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'curse';

// ============================================================
// 骰子定义 (模板)
// ============================================================

export interface DiceDef {
  id: string;
  name: string;
  element: DiceElement;
  faces: number[];
  description: string;
  rarity: DiceRarity;
  isElemental?: boolean;   // 元素骰子：抽到时随机坍缩
  isCursed?: boolean;      // 诅咒骰子：重Roll代价翻倍
  isCracked?: boolean;     // 碎裂骰子：回合结束自毁
  onPlay?: {
    bonusDamage?: number;
    bonusMult?: number;
    heal?: number;
    pierce?: number;
    selfDamage?: number;     // 反噬伤害（固定值）
    selfDamagePercent?: number; // 反噬伤害（最大HP百分比）
    statusToEnemy?: StatusEffect;
    statusToSelf?: StatusEffect;
    aoe?: boolean;
    armor?: number;          // 获得固定护甲
    // 战士特殊
    armorFromValue?: boolean;    // 护甲=骰子点数
    armorFromTotalPoints?: boolean; // 护甲=选中骰子总点数
    armorBreak?: boolean;        // 摧毁敌人全部护甲
    scaleWithHits?: boolean;     // 每受伤一次伤害+2
    firstPlayOnly?: boolean;     // 仅首次出牌生效
    scaleWithLostHp?: number;    // 伤害加成=已损失HP×N
    executeThreshold?: number;   // 斩杀线（敌人HP百分比）
    executeMult?: number;        // 斩杀倍率
    aoeDamage?: number;          // 独立AOE伤害
    healFromValue?: boolean;     // 回血=骰子点数
    lowHpOverrideValue?: number; // 低血时点数变为N
    lowHpThreshold?: number;     // 低血判定线
    bonusDamageFromPoints?: number; // 额外伤害=总点数×N
    requiresTriple?: boolean;    // 需要三条以上牌型
    scaleWithBloodRerolls?: boolean; // 卖血次数+1面值
    selfBerserk?: boolean;       // 自身施加狂暴
    scaleWithSelfDamage?: boolean;   // 自伤量转伤害
    damageFromArmor?: number;    // 伤害加成=护甲×N
    maxHpBonus?: number;         // 最大HP+N
    purifyAll?: boolean;         // 净化全部负面
    tauntAll?: boolean;          // 嘲讽全体
    // 法师特殊
    reverseValue?: boolean;      // 点数变为7-当前值
    randomTarget?: boolean;      // 随机目标
    removeBurn?: number;         // 清除灼烧层数
    healOnSkip?: number;         // 未出牌回复HP
    bonusDamagePerElement?: number; // 每颗元素骰子+N伤害
    copyHighestValue?: boolean;  // 复制最高点数
    bonusOnKeep?: number;        // 保留到下回合时+N点
    rerollOnKeep?: boolean;      // 保留时自动重投
    dualElement?: boolean;       // 双元素
    copyMajorityElement?: boolean; // 复制多数元素
    devourDie?: boolean;         // 吞噬骰子
    healPerCleanse?: number;     // 每净化1种回复N HP
    bonusMultOnKeep?: number;    // 保留时+N倍率
    unifyElement?: boolean;      // 统一元素
    overrideValue?: number;      // 固定点数
    swapWithUnselected?: boolean; // 与未选中骰子交换
    freezeBonus?: number;        // 冻结+N回合
    bonusPerTurnKept?: number;   // 每保留1回合+N点
    keepBonusCap?: number;       // 保留加成上限
    armorFromHandSize?: number;  // 护甲=手牌数×N
    requiresCharge?: number;     // 需要吟唱N回合
    bonusMultPerExtraCharge?: number; // 每多1层吟唱额外+N倍率（禁咒·陨星）
    chainBlast?: boolean;        // 废弃，改用chainBolt
    chainBolt?: boolean;         // 奥术飞弹：对每个存活敌人各造成一次等于自身点数的独立伤害
    maxHpBonusEvery?: number;    // 生命熔炉：每N次出牌+maxHP
    splashToRandom?: boolean;    // 对场上随机另一敌人造成同等点数伤害
    aoeDamagePercent?: number;   // 对全体敌人造成点数×比例的AOE伤害（旋风斩）
    splinterDamage?: number;     // 溢出伤害×比例传导给随机其他敌人
    comboSplashDamage?: boolean;  // 连锁打击：第2次及以上连击时对随机另一敌人造成本骰子点数独立伤害
    triggerAllElements?: boolean; // 触发全部元素
    // 盗贼特殊
    comboBonus?: number;         // 连击倍率加成
    poisonInverse?: boolean;     // 毒=7-点数
    stayInHand?: boolean;        // 出牌后不消耗
    grantTempDie?: boolean;      // 补充临时骰子
    drawFromBag?: number;        // 从骰子库补抽N颗正式骰子
    comboDrawBonusNextTurn?: boolean; // 连击成功后下回合手牌+1
    grantPlayOnCombo?: boolean;      // 连击时+1出牌机会
    cloneSelf?: boolean;             // 影分身：复制自身点数额外加伤
    critOnSecondPlay?: number;   // 第2次出牌暴击倍率
    poisonBase?: number;         // 基础毒层
    poisonBonusIfPoisoned?: number; // 已有毒额外+N
    alwaysBounce?: boolean;      // 必定弹回
    bonusDamageOnSecondPlay?: number; // 第2次出牌+N伤害
    stealArmor?: number;         // 偷取护甲
    poisonFromPoisonDice?: number; // 毒层=毒系骰子数×N
    bonusMultOnSecondPlay?: number; // 第2次出牌倍率
    grantExtraPlay?: boolean;    // 额外出牌机会
    detonatePoisonPercent?: number; // 引爆毒层百分比
    detonateExtraPerPlay?: number; // 每额外出牌多引爆N%毒层
    wildcard?: boolean;          // 万能骰子
    transferDebuff?: boolean;    // 转移负面状态
    detonateAllOnLastPlay?: boolean; // 最后出牌引爆全部
    escalateDamage?: number;     // 递增伤害百分比
    grantTempDieFixed?: number[]; // 补充固定面值分布的临时骰子（每颗触发1次）
    multOnThirdPlay?: number;    // 第3次及以上出牌伤害倍率
    bounceAndGrow?: boolean;     // 弹回手牌且每次出牌点数+1（上限+3）
    shadowClonePlay?: boolean;   // 影分身：自动触发一次50%伤害的额外出牌
    boomerangPlay?: boolean;     // 回旋：首次出牌弹回+下次出牌不消耗出牌次数
    doublePoisonOnCombo?: boolean; // 连击时目标毒层翻倍
    grantShadowRemnant?: boolean;   // 补充1颗临时暗影残骰（当回合可用，回合结束销毁）
    grantPersistentShadowRemnant?: boolean; // 连击时补充1颗持久暗影残骰（跨回合保留）
    grantExtraPlayOnCombo?: boolean; // 连击时补充1次出牌机会
    // v3新增 — 战士
    healOrMaxHp?: boolean;           // 生命熔炉：未满血回点数HP，满血+3最大HP（上限+20）
    executeHeal?: number;            // 斩杀回血
    purifyOne?: boolean;             // 净化1层负面
    // v3新增 — 法师
    damageShield?: boolean;          // 免伤护盾=点数×2（非护甲，不被毒绕过）
    purifyOneOnSkip?: boolean;       // 吟唱回合净化1层
    multPerElement?: number;         // 每颗元素骰子+N%最终伤害倍率
    ignoreForHandType?: boolean;     // 不参与牌型判定（镜像）
    boostLowestOnKeep?: number;      // 保留时手牌最低点骰子+N
    lockElement?: boolean;           // 锁定元素坍缩到下回合
    multiElementBlast?: boolean;     // 元素风暴：每颗选中骰子各触发随机元素
    burnEcho?: boolean;              // 灼烧共鸣：目标灼烧层×5伤害+延长1回合
    frostEchoDamage?: number;        // 冰封余韵：目标上回合曾冻结时+N%伤害
    armorToDamage?: boolean;         // 反转护甲为伤害
    // v3新增 — 盗贼
    grantShadowDie?: boolean;        // 补充1颗暗影残骰
    comboPersistShadow?: boolean;    // 连击时暗影残骰变持久型
    comboGrantPlay?: boolean;        // 连击时+1出牌机会
    poisonFromValue?: boolean;       // 施加毒=点数
    poisonScaleDamage?: number;      // 额外伤害=目标毒层×N
    comboDetonatePoison?: number;    // 连击时引爆N%毒层
    comboScaleDamage?: number;       // 伤害+连击次数×N%
    phantomFromShadowDice?: boolean; // 点数=手牌暗影残骰数×2
    comboHeal?: number;              // 连击时回复N HP
    grantPlayOnThird?: boolean;      // 第3次出牌时+1出牌机会
    // 通用
    purifyDebuff?: number | boolean; // 净化负面（遗物兼容）
  };
}

// ============================================================
// 骰子实例 (运行时)
// ============================================================

// ============================================================
// 拥有的骰子（带等级）
// ============================================================

export interface OwnedDie {
  defId: string;    // 骰子定义ID
  level: number;    // 当前等级 1-3
}

export interface Die {
  id: number;
  diceDefId: string;
  value: number;
  element: DiceElement;
  collapsedElement?: DiceElement;  // 元素骰子坍缩后的实际元素
  secondElement?: DiceElement;     // 棱镜骰子第二元素
  keptBonusAccum?: number;         // 星辰骰子：已累积的保留加成
  justAdded?: boolean;             // 刚加入手牌（入场动画用）
  isBonusDraw?: boolean;           // 技能补抽的骰子（不占手牌上限）
  selected: boolean;
  spent: boolean;
  rolling?: boolean;
  playing?: boolean;
  kept?: boolean;
  isTemp?: boolean;   // 盗贼临时补充的骰子（保留到下回合）
  isShadowRemnant?: boolean;  // 暗影残骰标记
  shadowRemnantPersistent?: boolean; // 持久暗影残骰（连击奖励，跨回合保留1次）
  shadowRemnantSurvived?: boolean;   // 已存活1回合，下回合结束销毁
  bounceGrowCount?: number;  // 飞刀骰子弹回次数（上限3）
  boomerangUsed?: boolean;   // 回旋骰子本回合已弹回过
}

// ============================================================
// 牌型
// ============================================================

export type HandType = '普通攻击' | '对子' | '连对' | '三连对' | '三条' | '顺子' | '4顺' | '5顺' | '6顺' | '同元素' | '葫芦' | '四条' | '五条' | '六条' | '元素顺' | '元素葫芦' | '皇家元素顺' | '无效牌型';

// ============================================================
// 状态效果
// ============================================================

export type StatusType = 'poison' | 'burn' | 'dodge' | 'vulnerable' | 'strength' | 'weak' | 'armor' | 'slow' | 'freeze';

export interface StatusEffect {
  type: StatusType;
  value: number;
  duration?: number;
}
