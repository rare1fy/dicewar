/**
 * gameBalance.ts - 游戏平衡数值配置表
 * 
 * 所有关于影响游戏平衡的数值配置。
 * 修改此文件可以调整游戏难度和节奏，无需改动逻辑代码。
 *
 * 配置按功能域拆分为三个子模块：
 *   balance/player  — 玩家初始值、战斗缩放、骰子奖励、增幅选择、血怒、魂晶、状态效果修正
 *   balance/world   — 商店配置、营火配置、战利品掉落、地图配置、章节配置
 *   balance/enemy   — 敌人攻击修正、守护者配置、牧师配置、法师配置、敌人台词、精英Boss配置
 */

export {
  PLAYER_INITIAL,
  DEPTH_SCALING,
  getDepthScaling,
  BATTLE_SCALING,
  DICE_REWARD_REFRESH,
  SKILL_SELECT_CONFIG,
  FURY_CONFIG,
  SOUL_CRYSTAL_CONFIG,
  getSoulCrystalMult,
  STATUS_EFFECT_MULT,
  ANIMATION_TIMING,
} from './balance/player';

export {
  SHOP_CONFIG,
  CAMPFIRE_CONFIG,
  LOOT_CONFIG,
  MAP_CONFIG,
  CHAPTER_CONFIG,
} from './balance/world';

export {
  ENEMY_ATTACK_MULT,
  GUARDIAN_CONFIG,
  PRIEST_CONFIG,
  CASTER_CONFIG,
  ENEMY_TAUNT_CONFIG,
  ELITE_CONFIG,
} from './balance/enemy';
