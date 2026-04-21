/**
 * config/index.ts - 配置表统一入口
 * 
 * 所有游戏内容的纯数据配置集中在这里导出。
 * 修改游戏内容只需编辑对应的配置文件，无需触碰逻辑代码。
 */

export {
  PLAYER_INITIAL,
  BATTLE_SCALING,
  SHOP_CONFIG,
  DICE_REWARD_REFRESH,
  CAMPFIRE_CONFIG,
  LOOT_CONFIG,
  MAP_CONFIG,
  SKILL_SELECT_CONFIG,
  CHAPTER_CONFIG,
  DEPTH_SCALING,
  getDepthScaling,
  STATUS_EFFECT_MULT,
  ANIMATION_TIMING,
  ENEMY_ATTACK_MULT,
  GUARDIAN_CONFIG,
  PRIEST_CONFIG,
  CASTER_CONFIG,
  ENEMY_TAUNT_CONFIG,
  ELITE_CONFIG,
} from './gameBalance';

export {
  EVENTS_POOL,
  type EventConfig,
  type EventOptionConfig,
} from './events';

export {
  NORMAL_ENEMIES,
  ELITE_ENEMIES,
  BOSS_ENEMIES,
  UPGRADEABLE_HAND_TYPES,
  type EnemyConfig,
  type PatternAction,
  type PhaseConfig,
  type IntentType,
  type EnemyQuotes,
} from './enemies';
