/**
 * BattleInputHandler.ts — 玩家输入处理代理
 *
 * 职责：
 *   - 骰子选择切换
 *   - 出牌按钮点击
 *   - 弃牌按钮点击
 *   - 结束回合按钮点击
 *
 * 设计：Scene 将 InputHandler 实例绑定给各 View 回调，
 *      Handler 内部做前置检查（能否出牌？能否弃牌？战斗结束没？），
 *      通过把柄（bound 方法）触发实际业务逻辑。
 *
 * @module battle/BattleInputHandler
 */

import type { BattleState } from './BattleState';
import type { Die } from '../../types/game';
import {
  evaluateHand,
  computePlayOutcome,
  triggerOnPlayRelics,
  type RelicEffectAggregate,
  type PlayOutcomePatch,
} from './BattleGlue';
import { rerollUnselectedDice } from '../../data/diceBag';
import { playSound } from '../../utils/sound';

/** 输入处理器依赖的上下文 */
export interface InputHandlerDeps {
  battleState: BattleState;
  getPlaysLeft: () => number;
  getDiscardLeft: () => number;
  isBattleOver: () => boolean;
  consumePlay: (outcome: PlayOutcomePatch, aggregate: RelicEffectAggregate) => void;
  onDiscard: (afterReroll: Die[]) => void;
  onEndTurnRequest: () => void;
}

/**
 * 玩家输入处理器 — 封装所有 UI → 逻辑的单向调用。
 * 前置检查在此完成，避免 Scene 中写重复 if。
 */
export class BattleInputHandler {
  private deps: InputHandlerDeps;

  constructor(deps: InputHandlerDeps) {
    this.deps = deps;
  }

  /** 切换骰子选中状态（允许任意时刻切换，包括战斗结束后查看） */
  toggleDieSelection(dieId: number): void {
    this.deps.battleState.setters.dice((prev) =>
      prev.map((d) => (d.id === dieId ? { ...d, selected: !d.selected } : d))
    );
  }

  /** 出牌 — 含完整前置检查与结算链 */
  handlePlay(): void {
    if (this.deps.isBattleOver()) return;

    const snap = this.deps.battleState.getSnapshot();
    const selected = snap.dice.filter((d) => d.selected && !d.spent);
    if (selected.length === 0 || snap.game.playsLeft <= 0) return;

    // SFX: 出牌启动音
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

    // 4) 标记 spent
    this.deps.battleState.setters.dice((prev) =>
      prev.map((d) => (d.selected && !d.spent ? { ...d, spent: true, selected: false } : d))
    );

    // 5) 扣出牌数
    this.deps.battleState.setters.game((g) => ({ ...g, playsLeft: Math.max(0, g.playsLeft - 1) }));

    // 6) 消费结果（Scene 处理：应用伤害 + 演出 + 胜负判定）
    this.deps.consumePlay(outcome, aggregate);
  }

  /** 弃牌重骰 — MVP 每回合 1 次 */
  handleDiscard(): void {
    if (this.deps.isBattleOver()) return;

    const snap = this.deps.battleState.getSnapshot();
    if (snap.discardLeft <= 0) return;

    const afterReroll = rerollUnselectedDice(snap.dice);
    this.deps.battleState.setters.dice(afterReroll);
    this.deps.battleState.setters.discardLeft((n) => Math.max(0, n - 1));

    this.deps.onDiscard(afterReroll);
  }

  /** 结束回合 — 前置检查走 BattleState */
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
