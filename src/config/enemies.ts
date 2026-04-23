/**
 * enemies.ts - 敌人配置表（聚合导出）
 *
 * 5个章节各自的敌人池，涂鸦绘本风世界观
 * 章1: 边线猎场 — 王国军
 * 章2: 冷枝封林 — 月林守夜会
 * 章3: 火脉工坑 — 铁须工坊 + 獠牙部落
 * 章4: 冰背旧道 — 霜冠旧廷
 * 章5: 冠顶天环 — 天穹看守团 + 星界议会
 */

export type { IntentType, PatternAction, PhaseConfig, EnemyQuotes, EnemyConfig } from './enemyTypes';

import { ch1_normals, ch2_normals, ch3_normals, ch4_normals, ch5_normals } from './enemyNormal';
import type { EnemyConfig } from './enemyTypes';

export const NORMAL_ENEMIES: EnemyConfig[] = [
  ...ch1_normals, ...ch2_normals, ...ch3_normals, ...ch4_normals, ...ch5_normals,
];

export { ELITE_ENEMIES, BOSS_ENEMIES, UPGRADEABLE_HAND_TYPES } from './enemyEliteBoss';
