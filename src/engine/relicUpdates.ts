/**
 * relicUpdates.ts — 遗物状态更新工具
 *
 * 抽象 DiceHeroGame.tsx 中 setGame 内的遗物 counter 更新逻辑。
 * 将 `prev.relics.map(r => r.id === 'xxx' ? { ...r, counter: N } : r)` 
 * 模式统一为语义化函数。
 *
 * SRP: 只负责"更新遗物状态"，返回新的 relics 数组。
 */

import type { Relic } from '../types/game';

// ============================================================
// 通用更新：按 ID 更新遗物 counter
// ============================================================

/** 更新指定遗物的 counter */
export const updateRelicCounter = (relics: Relic[], relicId: string, newCounter: number): Relic[] =>
  relics.map(r => r.id === relicId ? { ...r, counter: newCounter } : r);

/** 递增指定遗物的 counter */
export const incrementRelicCounter = (relics: Relic[], relicId: string, delta: number = 1): Relic[] =>
  relics.map(r => r.id === relicId ? { ...r, counter: (r.counter || 0) + delta } : r);

/** 递减指定遗物的 counter（仅当 counter > 0 时） */
export const decrementRelicCounter = (relics: Relic[], relicId: string): Relic[] =>
  relics.map(r => r.id === relicId && (r.counter || 0) > 0 ? { ...r, counter: (r.counter || 0) - 1 } : r);

// ============================================================
// 具名更新：每个遗物一个语义化函数
// ============================================================

/** 导航罗盘：重置 counter */
export const resetCompassCounter = (relics: Relic[]): Relic[] =>
  updateRelicCounter(relics, 'navigator_compass', 0);

/** 导航罗盘：递增 counter */
export const incrementCompassCounter = (relics: Relic[]): Relic[] =>
  incrementRelicCounter(relics, 'navigator_compass');

/** 紧急沙漏：触发免死（counter 设为 15） */
export const triggerHourglass = (relics: Relic[]): Relic[] =>
  updateRelicCounter(relics, 'emergency_hourglass', 15);

/** 紧急沙漏：回合倒计时递减 */
export const tickHourglass = (relics: Relic[]): Relic[] =>
  decrementRelicCounter(relics, 'emergency_hourglass');

/** 层厅征服者：通关层数+1 */
export const incrementFloorsCleared = (relics: Relic[]): Relic[] =>
  incrementRelicCounter(relics, 'floor_conqueror');
