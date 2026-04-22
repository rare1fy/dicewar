/**
 * BattleInputHandler.ts — 玩家输入处理代理
 *
 * 职责：
 *   - 骰子选择切换
 *   - 出牌前置检查 + 结算链（evaluateHand → triggerRelics → computeOutcome）
 *   - 弃牌前置检查 + 重骰
 *   - 结束回合前置检查 + 委托
 *
 * 设计：Scene 传入 SceneDeps（演出 + 胜负判定的薄回调），
 *      Handler 负责所有"能不能做"的前置守卫和"算出什么"的纯逻辑，
 *      Scene 只负责"演什么"和"判什么"。
 *
 * @module battle/BattleInputHandler
 */

import type { BattleState } from './BattleState';
import {
  evaluateHand,
  computePlayOutcome,
  triggerOnPlayRelics,
  type RelicEffectAggregate,
  type PlayOutcomePatch,
} from './BattleGlue';
import { applyDamageToEnemies } from './BattleGlue';
import { rerollUnselectedDice } from '../../data/diceBag';
import { playSound } from '../../utils/sound';

/** Scene 注入的演出 + 胜负判定回调 */
export interface SceneDeps {
  battleState: BattleState;
  isBattleOver: () => boolean;
  /** 出牌后：应用伤害 + 视觉演出 + 胜负判定 */
  onPlayResolved: (outcome: PlayOutcomePatch, aggregate: RelicEffectAggregate) => void;
  /** 结束回合请求（Scene 处理异步敌人回合） */
  onEndTurnRequest: () => void;
}

/**
 * 玩家输入处理器 — 封装所有 UI → 逻辑的单向调用。
 * 前置检查在此完成，避免 Scene 中写重复 if。
 */
export class BattleInputHandler {
  private deps: SceneDeps;

  constructor(deps: SceneDeps) {
    this.deps = deps;
  }

  /** 切换骰子选中状态 */
  toggleDieSelection(dieId: number): void {
    this.deps.battleState.setters.dice((prev) =>
      prev.map((d) => (d.id === dieId ? { ...d, selected: !d.selected } : d))
    );
  }

  /**
   * 出牌 — 完整结算链：
   *   evaluateHand → triggerOnPlayRelics → computePlayOutcome
   *   → mark spent + decrement playsLeft → applyDamage → delegate to Scene for FX
   */
  handlePlay(): void {
    if (this.deps.isBattleOver()) return;

    const snap = this.deps.battleState.getSnapshot();
    const selected = snap.dice.filter((d) => d.selected && !d.spent);
    if (selected.length === 0 || snap.game.playsLeft <= 0) return;

    // SFX
    playSound('play');

    // 1) 牌型判定
    const hand = evaluateHand(selected, snap.game.relics);

    // 2) 遗物聚合
    const pointSum = selected.reduce((s, d) => s + d.value, 0);
    const targetEnemy = snap.enemies.find((e) => e.hp > 0) ?? null;
    const aggregate: RelicEffectAggregate = triggerOnPlayRelics({
      relics: snap.game.relics,
      game: snap.game,
      dice: snap.dice,
      selectedDice: selected,
      hand,
      targetEnemy,
      pointSum,
    });

    // 3) 计算伤害
    const outcome = computePlayOutcome(selected, hand, snap.game, aggregate);

    // 4) 标 spent
    this.deps.battleState.setters.dice((prev) =>
      prev.map((d) => (d.selected && !d.spent ? { ...d, spent: true, selected: false } : d))
    );

    // 5) 扣出牌数
    this.deps.battleState.setters.game((g) => ({ ...g, playsLeft: Math.max(0, g.playsLeft - 1) }));

    // 6) 伤害落地（纯状态更新）
    const targetIndex = snap.enemies.findIndex((e) => e.hp > 0);
    if (targetIndex >= 0) {
      this.deps.battleState.setters.enemies((prev) =>
        applyDamageToEnemies(prev, targetIndex, outcome)
      );
    }

    // 7) 委托 Scene 做演出 + 遗物回血 + 胜负判定
    this.deps.onPlayResolved(outcome, aggregate);
  }

  /** 弃牌重骰 — 每回合 1 次 */
  handleDiscard(): void {
    if (this.deps.isBattleOver()) return;

    const snap = this.deps.battleState.getSnapshot();
    if (snap.discardLeft <= 0) return;

    this.deps.battleState.setters.dice((prev) => rerollUnselectedDice(prev));
    this.deps.battleState.setters.discardLeft((n) => Math.max(0, n - 1));
  }

  /** 结束回合 — 前置检查后委托 Scene */
  handleEndTurn(): void {
    if (this.deps.isBattleOver()) return;

    const snap = this.deps.battleState.getSnapshot();
    if (snap.game.isEnemyTurn) return;

    this.deps.onEndTurnRequest();
  }

  /** 绑定给 View 的骰子选择回调 */
  get onToggleDie(): (dieId: number) => void {
    return (id) => this.toggleDieSelection(id);
  }

  /** 绑定给 View 的出牌回调 */
  get onPlay(): () => void {
    return () => this.handlePlay();
  }

  /** 绑定给 View 的弃牌回调 */
  get onDiscard(): () => void {
    return () => this.handleDiscard();
  }

  /** 绑定给 View 的结束回合回调 */
  get onEndTurn(): () => void {
    return () => this.handleEndTurn();
  }
}
