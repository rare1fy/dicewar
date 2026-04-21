/**
 * enemyAICallbackBuilder.ts — 敌人AI回调构建器
 *
 * ARCH-I: 从 useBattleCombat.tsx endTurn 中提取的 enemyAICallbacks 构建逻辑。
 * 将回调组装逻辑集中管理，减少 Hook 内的样板代码行数。
 */

import type { EnemyAICallbacks } from './enemyAI';

/**
 * 构建 enemyAICallbacks 对象
 *
 * 将 endTurn 中散落的回调组装逻辑集中到一个函数中，
 * 减少 Hook 内的样板代码行数。scheduleDelayedQuote 由本函数自动生成。
 */
export function buildEnemyAICallbacks(
  ctx: Omit<EnemyAICallbacks, 'scheduleDelayedQuote'>,
): EnemyAICallbacks {
  const { showEnemyQuote } = ctx;
  return {
    ...ctx,
    scheduleDelayedQuote: (dq) => {
      setTimeout(() => showEnemyQuote(dq.uid, dq.text, dq.duration), dq.delayMs);
    },
  };
}
