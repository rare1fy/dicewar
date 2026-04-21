/**
 * BattleState.ts — UI-01 战斗状态容器
 *
 * 职责（SRP）：
 *   持有战斗期间所有可变状态（对应原 React 版 game / dice / enemies 等 useState+useRef），
 *   并为 `types/battleContexts.ts` 契约提供 `MutableRef<T>` + `StateSetter<T>` 的 Phaser 实现。
 *
 * === 红线①（MIG-05B Verify 沉淀）===
 * StateSetter 必须**按调用顺序应用 updater**，保证累加逻辑（playsLeft / discardPile / relicTempExtraPlay）
 * 不被"简单覆盖"掉。本文件实现方式：
 *   setter(nextOrUpdater) =>
 *     if typeof updater === 'function':  this.state.xxx = updater(this.state.xxx)   ← 同步读最新值
 *     else:                              this.state.xxx = nextOrUpdater
 *   再触发订阅。
 * 任何"先算出 next 再赋值"的偷懒实现都禁止。
 */

import type { Die, GameState, Enemy } from '../../types/game';
import type { MutableRef, StateSetter } from '../../types/battleContexts';

// ============================================================================
// 战斗期状态快照（对应原 React 版 useState 字段集合）
// ============================================================================
export interface BattleStateSnapshot {
  game: GameState;
  dice: Die[];
  enemies: Enemy[];
  rerollCount: number;
  screenShake: boolean;
  bossEntrance: { visible: boolean; name: string; chapter: number };
  enemyEffects: Record<string, string | null>;
  dyingEnemies: Set<string>;
  enemyQuotes: Record<string, string>;
  enemyQuotedLowHp: Set<string>;
  waveAnnouncement: number | null;
  armorGained: boolean;
  hpGained: boolean;
  playerEffect: string | null;
  playsPerEnemy: Record<string, number>;
  /** 剩余弃牌次数（MVP）。专属 UI 层字段，不污染 GameState.freeRerollsLeft。 */
  discardLeft: number;
  /** 每回合弃牌次数上限（MVP：1） */
  discardsPerTurn: number;
}

// ============================================================================
// 状态变更监听器 —— UI 层订阅，收到通知后按需刷新
// ============================================================================
export type BattleStateListener = (snapshot: Readonly<BattleStateSnapshot>) => void;

/**
 * BattleState —— 集中管理战斗期可变状态
 *
 * 使用方式（UI-01-γ BattleGlue 阶段）：
 *   const state = new BattleState(initialSnapshot);
 *   const ctx: PostPlayContext = {
 *     gameRef: state.refs.game,
 *     setGame: state.setters.game,
 *     setDice: state.setters.dice,
 *     // ... 其它 setter
 *     addFloatingText: floatingTextLayer.add,
 *   };
 *   executePostPlayEffects(ctx, ...);
 */
export class BattleState {
  private snapshot: BattleStateSnapshot;
  private listeners = new Set<BattleStateListener>();

  public readonly refs: {
    game: MutableRef<GameState>;
    playsPerEnemy: MutableRef<Record<string, number>>;
  };

  public readonly setters: {
    game: StateSetter<GameState>;
    dice: StateSetter<Die[]>;
    enemies: StateSetter<Enemy[]>;
    rerollCount: StateSetter<number>;
    screenShake: StateSetter<boolean>;
    bossEntrance: StateSetter<{ visible: boolean; name: string; chapter: number }>;
    enemyEffects: StateSetter<Record<string, string | null>>;
    dyingEnemies: StateSetter<Set<string>>;
    enemyQuotes: StateSetter<Record<string, string>>;
    enemyQuotedLowHp: StateSetter<Set<string>>;
    waveAnnouncement: StateSetter<number | null>;
    armorGained: StateSetter<boolean>;
    hpGained: StateSetter<boolean>;
    playerEffect: StateSetter<string | null>;
    discardLeft: StateSetter<number>;
  };

  constructor(initial: BattleStateSnapshot) {
    this.snapshot = initial;

    // MutableRef<T> 实现：直接给引用入口，current 读写都走 this.snapshot
    const self = this;
    this.refs = {
      game: {
        get current() { return self.snapshot.game; },
        set current(next: GameState) { self.assign('game', next); },
      },
      playsPerEnemy: {
        get current() { return self.snapshot.playsPerEnemy; },
        set current(next: Record<string, number>) { self.assign('playsPerEnemy', next); },
      },
    };

    // StateSetter<T> 实现：严守红线①"按顺序应用 updater"
    this.setters = {
      game: (n) => this.apply('game', n),
      dice: (n) => this.apply('dice', n),
      enemies: (n) => this.apply('enemies', n),
      rerollCount: (n) => this.apply('rerollCount', n),
      screenShake: (n) => this.apply('screenShake', n),
      bossEntrance: (n) => this.apply('bossEntrance', n),
      enemyEffects: (n) => this.apply('enemyEffects', n),
      dyingEnemies: (n) => this.apply('dyingEnemies', n),
      enemyQuotes: (n) => this.apply('enemyQuotes', n),
      enemyQuotedLowHp: (n) => this.apply('enemyQuotedLowHp', n),
      waveAnnouncement: (n) => this.apply('waveAnnouncement', n),
      armorGained: (n) => this.apply('armorGained', n),
      hpGained: (n) => this.apply('hpGained', n),
      playerEffect: (n) => this.apply('playerEffect', n),
      discardLeft: (n) => this.apply('discardLeft', n),
    };
  }

  // ---------------- 对外只读快照 ----------------
  public getSnapshot(): Readonly<BattleStateSnapshot> {
    return this.snapshot;
  }

  // ---------------- 订阅 / 退订 ----------------
  public subscribe(listener: BattleStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ---------------- 内部：通用 setter 应用 ----------------
  /**
   * 红线①核心实现：
   *   - 如果入参是函数，用函数(当前值)同步求值，保证多次调用时后一次能看到前一次的结果
   *   - 如果入参是值，直接覆盖
   *   - 每次变更都通知监听器
   */
  private apply<K extends keyof BattleStateSnapshot>(
    key: K,
    nextOrUpdater: BattleStateSnapshot[K] | ((prev: BattleStateSnapshot[K]) => BattleStateSnapshot[K]),
  ): void {
    const prev = this.snapshot[key];
    const next = typeof nextOrUpdater === 'function'
      ? (nextOrUpdater as (p: BattleStateSnapshot[K]) => BattleStateSnapshot[K])(prev)
      : nextOrUpdater;
    if (next === prev) return;
    this.snapshot = { ...this.snapshot, [key]: next };
    this.notify();
  }

  private assign<K extends keyof BattleStateSnapshot>(key: K, next: BattleStateSnapshot[K]): void {
    if (this.snapshot[key] === next) return;
    this.snapshot = { ...this.snapshot, [key]: next };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
