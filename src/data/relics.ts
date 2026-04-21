/**
 * relics.ts - 遗物定义表（统一遗物池）
 * 
 * 四大核心体系：
 * 1. 基础打工类 (Flat/Chips) - 提供基础数值保障
 * 2. 倍率起飞类 (Multiplier) - 提供指数级爆发
 * 3. 经济与续航类 (Economy & Health) - 运转引擎
 * 4. 机制突变类 (Rule Breakers) - 改变底层逻辑
 */

import type { Relic } from '../types/game';

// 体系一~三：基础打工 / 倍率起飞 / 经济续航
import {
  grindstone,
  ironBanner,
  heavyMetalCore,
  chaosPendulum,
  ironSkinRelic,
  scattershotRelic,
  crimsonGrail,
  arithmeticGauge,
  mirrorPrism,
  elementalResonator,
  perfectionist,
  twinStarsRelic,
  voidEchoRelic,
  glassCannonRelic,
  emergencyHourglass,
  vampireFangs,
  blackMarketContract,
  scrapYard,
  merchantsEyeRelic,
  warProfiteerRelic,
  interestRelic,
  painAmplifierRelic,
  masochistRelic,
} from './relicsCore';

// 体系四~五、七：机制突变 / 环层塔地图 / 职业适配
import {
  overflowConduit,
  quantumObserver,
  limitBreaker,
  schrodingerBag,
  comboMasterRelic,
  navigatorCompass,
  pointAccumulator,
  floorConqueror,
  bloodForgeArmor,
  undyingSpirit,
  chargeCore,
  overflowMana,
  comboLeech,
  venomCrystal,
  extraHandSlot,
  extraFreeReroll,
  turnArmor,
  killReroll,
  lessIsMoreRelic,
  bloodEyeRelic,
} from './relicsSpecial';

// 体系六：增幅转化遗物
import {
  healingBreeze,
  sharpEdgeRelic,
  luckyCoinRelic,
  thickHideRelic,
  warmEmberRelic,
  treasureSenseRelic,
  goldenTouchRelic,
  hagglerRelic,
  elementOverloadRelic,
  fullHouseBlastRelic,
  chainLightningRelic,
  frostBarrierRelic,
  soulHarvestRelic,
  pressurePointRelic,
  basicInstinctRelic,
  rapidStrikesRelic,
  bloodPactRelic,
  minimalistRelic,
  bloodDiceRelic,
  purifyWaterRelic,
  adrenalineRushRelic,
  rerollFrenzyRelic,
  diceMasterRelic,
  fortuneWheelRelic,
  battleMedicRelic,
  rageFireRelic,
  treasureMapRelic,
  dimensionCrush,
  universalPair,
  chaosFace,
  greedyHand,
  doubleStrike,
  fateCoin,
  elementAffinity,
  symmetrySeeker,
} from './relicsAugmented';

// ============================================================
// 遗物注册表
// ============================================================

export const ALL_RELICS: Record<string, Relic> = {
  // 基础打工
  grindstone,
  iron_banner: ironBanner,
  heavy_metal_core: heavyMetalCore,
  chaos_pendulum: chaosPendulum,
  iron_skin_relic: ironSkinRelic,
  scattershot_relic: scattershotRelic,
  // 倍率起飞
  crimson_grail: crimsonGrail,
  arithmetic_gauge: arithmeticGauge,
  mirror_prism: mirrorPrism,
  elemental_resonator: elementalResonator,
  perfectionist,
  twin_stars_relic: twinStarsRelic,
  void_echo_relic: voidEchoRelic,
  glass_cannon_relic: glassCannonRelic,
  // 经济续航
  emergency_hourglass: emergencyHourglass,
  vampire_fangs: vampireFangs,
  black_market_contract: blackMarketContract,
  scrap_yard: scrapYard,
  merchants_eye_relic: merchantsEyeRelic,
  war_profiteer_relic: warProfiteerRelic,
  interest_relic: interestRelic,
  pain_amplifier_relic: painAmplifierRelic,
  masochist_relic: masochistRelic,
  // 机制突变
  overflow_conduit: overflowConduit,
  quantum_observer: quantumObserver,
  limit_breaker: limitBreaker,
  schrodinger_bag: schrodingerBag,
  combo_master_relic: comboMasterRelic,
  // 环层塔地图类
  navigator_compass: navigatorCompass,
  point_accumulator: pointAccumulator,
  floor_conqueror: floorConqueror,
  // 增幅转化遗物
  healing_breeze: healingBreeze,
  sharp_edge_relic: sharpEdgeRelic,
  lucky_coin_relic: luckyCoinRelic,
  thick_hide_relic: thickHideRelic,
  warm_ember_relic: warmEmberRelic,
  treasure_sense_relic: treasureSenseRelic,
  golden_touch_relic: goldenTouchRelic,
  haggler_relic: hagglerRelic,
  element_overload_relic: elementOverloadRelic,
  full_house_blast_relic: fullHouseBlastRelic,
  chain_lightning_relic: chainLightningRelic,
  frost_barrier_relic: frostBarrierRelic,
  soul_harvest_relic: soulHarvestRelic,
  pressure_point_relic: pressurePointRelic,
  basic_instinct_relic: basicInstinctRelic,
  rapid_strikes_relic: rapidStrikesRelic,
  blood_pact_relic: bloodPactRelic,
  minimalist_relic: minimalistRelic,
  blood_dice_relic: bloodDiceRelic,
  purify_water_relic: purifyWaterRelic,
  adrenaline_rush_relic: adrenalineRushRelic,
  reroll_frenzy_relic: rerollFrenzyRelic,
  dice_master_relic: diceMasterRelic,
  fortune_wheel_relic: fortuneWheelRelic,
  battle_medic_relic: battleMedicRelic,
  rage_fire_relic: rageFireRelic,
  treasure_map_relic: treasureMapRelic,
  dimension_crush: dimensionCrush,
  universal_pair: universalPair,
  chaos_face: chaosFace,
  greedy_hand: greedyHand,
  double_strike: doubleStrike,
  fate_coin: fateCoin,
  element_affinity: elementAffinity,
  symmetry_seeker: symmetrySeeker,
  // 职业适配遗物
  blood_forge_armor: bloodForgeArmor,
  undying_spirit: undyingSpirit,
  charge_core: chargeCore,
  overflow_mana: overflowMana,
  combo_leech: comboLeech,
  venom_crystal: venomCrystal,
  // 通用新遗物
  extra_hand_slot: extraHandSlot,
  extra_free_reroll: extraFreeReroll,
  turn_armor: turnArmor,
  kill_reroll: killReroll,
  // 遗漏遗物（之前定义在ALL_RELICS之后）
  less_is_more_relic: lessIsMoreRelic,
  blood_eye: bloodEyeRelic,
};

export const RELICS_BY_RARITY: Record<string, Relic[]> = {
  common: [grindstone, heavyMetalCore, chaosPendulum, ironSkinRelic, scattershotRelic, merchantsEyeRelic, navigatorCompass, healingBreeze, sharpEdgeRelic, luckyCoinRelic, thickHideRelic, basicInstinctRelic, treasureMapRelic, turnArmor],
  uncommon: [ironBanner, blackMarketContract, scrapYard, twinStarsRelic, voidEchoRelic, warProfiteerRelic, interestRelic, comboMasterRelic, pointAccumulator, warmEmberRelic, treasureSenseRelic, goldenTouchRelic, hagglerRelic, rapidStrikesRelic, bloodPactRelic, rerollFrenzyRelic, battleMedicRelic, rageFireRelic, lessIsMoreRelic, bloodForgeArmor, chargeCore, comboLeech, killReroll],
  rare: [bloodEyeRelic, crimsonGrail, arithmeticGauge, mirrorPrism, vampireFangs, schrodingerBag, emergencyHourglass, glassCannonRelic, painAmplifierRelic, masochistRelic, floorConqueror, elementOverloadRelic, fullHouseBlastRelic, chainLightningRelic, frostBarrierRelic, soulHarvestRelic, pressurePointRelic, minimalistRelic, adrenalineRushRelic, symmetrySeeker, chaosFace, greedyHand, fateCoin, elementAffinity, bloodDiceRelic, purifyWaterRelic, undyingSpirit, overflowMana, venomCrystal, extraHandSlot],
  legendary: [elementalResonator, perfectionist, overflowConduit, quantumObserver, limitBreaker, diceMasterRelic, fortuneWheelRelic, dimensionCrush, universalPair, doubleStrike, extraFreeReroll],
};

/** 获取遗物奖励池 */
export const getRelicRewardPool = (source: 'elite' | 'boss' | 'treasure' | 'merchant' | 'event'): Relic[] => {
  switch (source) {
    case 'elite':
    case 'treasure':
    case 'merchant':
    case 'event':
      return [...RELICS_BY_RARITY.common, ...RELICS_BY_RARITY.uncommon, ...RELICS_BY_RARITY.rare];
    case 'boss':
      return [...RELICS_BY_RARITY.rare, ...RELICS_BY_RARITY.legendary];
  }
};

/** 随机抽取N个不重复遗物 */
export const pickRandomRelics = (pool: Relic[], count: number, owned: string[] = []): Relic[] => {
  const available = pool.filter(r => !owned.includes(r.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
