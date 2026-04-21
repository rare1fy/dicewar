/**
 * enemies.ts - 敌人配置表（聚合导出）
 *
 * 5个章节各自的敌人池，西幻魔兽世界风格
 * 章1: 幽暗森林 — 亡灵/蜘蛛/狼人/树精
 * 章2: 冰封山脉 — 冰巨人/雪狼/冰元素/霜巫
 * 章3: 熔岩深渊 — 火元素/熔岩犬/黑铁矮人/地狱火
 * 章4: 暗影要塞 — 暗影刺客/恶魔卫兵/邪能术士/堕落天使
 * 章5: 永恒之巅 — 光铸卫士/时光龙/虚空行者/泰坦造物
 */

export type { IntentType, PatternAction, PhaseConfig, EnemyQuotes, EnemyConfig } from './enemyTypes';

import { ch1_normals, ch2_normals, ch3_normals, ch4_normals, ch5_normals } from './enemyNormal';
import type { EnemyConfig } from './enemyTypes';

export const NORMAL_ENEMIES: EnemyConfig[] = [
  ...ch1_normals, ...ch2_normals, ...ch3_normals, ...ch4_normals, ...ch5_normals,
];

export { ELITE_ENEMIES, BOSS_ENEMIES, UPGRADEABLE_HAND_TYPES } from './enemyEliteBoss';
