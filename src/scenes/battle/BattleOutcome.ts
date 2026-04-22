/**
 * BattleOutcome.ts — 战斗胜败闭环 + 离场路由
 *
 * 职责（SRP）：把"判胜负 + 弹横幅 + 离场路由 + 结算态复位"这条链从 BattleScene 抽出来。
 *   BattleScene 提供自己的字段访问器（读/写 battleResult 等）和渲染入口，本模块给纯逻辑。
 *
 * 拆分来源：BattleScene.ts（α-go 多职业前置 B1 拆分）。
 *
 * 设计决策：
 *   - 不把状态字段（battleResult / overBanner / isLeavingScene）搬出 Scene
 *     —— 这些字段与 Phaser 生命周期绑定，放 Scene 里最接近原生语义；
 *     本模块只提供纯动作 + 回调契约（OutcomeContext 接口）。
 *   - `isBattleOver()` 极简，留在 Scene 里内联（一行，抽出反而分散）。
 *   - `leaveToScene` 保留在 Scene 里，因为它要更新 `isLeavingScene` 这个 Scene 字段，且
 *     是 4 个按钮回流的收口 —— 跟 Scene 绑定紧密。
 */

import Phaser from 'phaser';
import { playSound } from '../../utils/sound';
import { showBattleGameOverBanner } from './BattleGameOverBanner';

/**
 * 外部 Scene 需要提供的最小上下文接口。
 * BattleScene 实现它 → 传入各函数。比把 Scene 整个传进来更安全（禁止本模块访问无关字段）。
 */
export interface BattleOutcomeContext {
  scene: Phaser.Scene;
  /** 读当前战斗结果 */
  getResult: () => 'victory' | 'defeat' | null;
  /** 写战斗结果（只改字段不触发渲染） */
  setResult: (r: 'victory' | 'defeat') => void;
  /** 读当前横幅 */
  getBanner: () => Phaser.GameObjects.Container | null;
  /** 写横幅（模块创建后回填 Scene） */
  setBanner: (b: Phaser.GameObjects.Container | null) => void;
  /** 回流按钮回调 */
  onRestart: () => void;
  onBackToClassSelect: () => void;
  onBackToStart: () => void;
  onBackToMap: () => void;
  /** α-go 第 6 单 LOOT：胜利 + 从 Map 进入时的"选战利品"路由（其他分支不用） */
  onBackToLoot: () => void;
}

/**
 * 弹胜负横幅。与 Scene 解耦：通过 ctx 读写状态，不直接访问 Scene 字段。
 *
 * 首按钮路由矩阵（α-go 第 6 单 LOOT 接入后）：
 *   - 胜利 + fromMap  → "选择战利品" → LootScene（跳转后玩家 3 选 1 或 Skip，再回 Map）
 *   - 失败 + fromMap  → "返回地图"   → MapScene（失败不给 Loot，直接保留地图进度）
 *   - 独立战斗（非 fromMap，开发者菜单直入）→ "再战一局" → restartBattle
 */
export function showOverBanner(
  ctx: BattleOutcomeContext,
  title: string,
  titleColor: string,
): void {
  if (ctx.getBanner()) return; // 防重入
  const isVictory = title === '胜利';
  playSound(isVictory ? 'victory' : 'death');
  const fromMap = ctx.scene.registry.get('pendingBattleNodeId') != null;

  // 首按钮文案 + 回调：按 (victory, fromMap) 二维分支
  let restartLabel: string;
  let onRestart: () => void;
  if (fromMap && isVictory) {
    restartLabel = '选择战利品';
    onRestart = () => ctx.onBackToLoot();
  } else if (fromMap) {
    restartLabel = '返回地图';
    onRestart = () => ctx.onBackToMap();
  } else {
    restartLabel = '再战一局';
    onRestart = () => ctx.onRestart();
  }

  const banner = showBattleGameOverBanner(ctx.scene, title, titleColor, {
    restartLabel,
    onRestart,
    onBackToClassSelect: () => ctx.onBackToClassSelect(),
    onBackToStart: () => ctx.onBackToStart(),
  });
  ctx.setBanner(banner);
}

/**
 * 玩家/敌人血量快照，供 checkBattleOver 判定。
 * 用参数对象而非直接 BattleStateSnapshot 避免反向依赖（本模块不 import BattleState）。
 */
export interface BattleHpSnapshot {
  playerHp: number;
  /** 存活敌人数量（> 0 表示还有敌人） */
  anyEnemyAlive: boolean;
}

/**
 * 检查当前血量状态是否分出胜负。返回胜负或 null（未结束）。
 * 纯函数，方便单测 —— 判定逻辑不依赖 scene / banner。
 */
export function evaluateBattleResult(snap: BattleHpSnapshot): 'victory' | 'defeat' | null {
  if (snap.playerHp <= 0) return 'defeat';
  if (!snap.anyEnemyAlive) return 'victory';
  return null;
}

/**
 * 检查胜负并按需弹横幅。
 * - 已结束（getResult() 非 null）→ 返回 true 让调用方中止
 * - 未结束但血量判定出结果 → 更新 result + 弹横幅 + 返回 true
 * - 未结束且未出结果 → 返回 false
 */
export function checkBattleOver(
  ctx: BattleOutcomeContext,
  snap: BattleHpSnapshot,
): boolean {
  if (ctx.getResult() !== null) return true;
  const result = evaluateBattleResult(snap);
  if (result === 'victory') {
    ctx.setResult('victory');
    showOverBanner(ctx, '胜利', '#22c55e');
    return true;
  }
  if (result === 'defeat') {
    ctx.setResult('defeat');
    showOverBanner(ctx, '失败', '#ef4444');
    return true;
  }
  return false;
}
