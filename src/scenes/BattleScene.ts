/**
 * BattleScene.ts — UI-01 战斗主场景（Phaser Scene）
 *
 * 职责（SRP）：仅做调度 —— 初始化状态容器、装配子视图、接受外部事件、路由回调。
 *   真正的业务逻辑一律下沉到：
 *     - 状态：`battle/BattleState.ts`
 *     - 胶水：`battle/BattleGlue.ts`（UI-01-γ 真实伤害 + δ-1 遗物触发链）
 *     - 视图：`battle/view/*`（UI-01-β ✅）
 *     - 音效：`utils/sound.ts`（UI-01-δ-2 替换桩）
 *
 * UI-01 分段：
 *   - [α] 场景骨架 + BattleState ✅
 *   - [β] 4 个视图 + 抽/弃/出牌骨架（无结算链）✅
 *   - [γ] BattleGlue 接出牌真实伤害 + 敌人真实反击 ✅
 *   - [δ-1] MVP 三件遗物触发链 + 胜败闭环 ← 本次
 *   - [δ-2] 结算演出 + sound 替桩（下次）
 *
 * Designer MVP（designer-UI-01-MVP-SCOPE-20260421.md）：
 *   6 槽骰子 UI / 战士单职业 / 弃牌1次每回合 / 真实伤害单敌人 / 3 件验证遗物 / 胜败即重开
 */

import Phaser from 'phaser';
import { createInitialGameState } from '../logic/gameInit';
import { drawFromBag, discardDice, rerollUnselectedDice } from '../data/diceBag';
import { BattleState, type BattleStateSnapshot } from './battle/BattleState';
import {
  evaluateHand,
  computePlayOutcome,
  applyDamageToEnemies,
  computeBasicEnemyAttack,
  triggerOnPlayRelics,
  type PlayOutcomePatch,
  type RelicEffectAggregate,
} from './battle/BattleGlue';
import { PlayerView } from './battle/view/PlayerView';
import { EnemyView } from './battle/view/EnemyView';
import { DiceTray } from './battle/view/DiceTray';
import { ActionBar } from './battle/view/ActionBar';
import { ALL_RELICS } from '../data/relics';
import type { Enemy, Die, Relic } from '../types/game';

// MVP 硬编码敌人（Designer 方案 4-B：固定每回合 10 点伤害的训练木桩）
function buildMvpEnemy(): Enemy {
  return {
    uid: 'mvp_dummy_0',
    configId: 'mvp_dummy',
    name: '训练木桩',
    hp: 60,
    maxHp: 60,
    armor: 0,
    attackDmg: 10,
    combatType: 'warrior',
    dropGold: 0,
    dropRelic: false,
    emoji: '🎯',
    statuses: [],
    distance: 0,
  };
}

// MVP 开局三件遗物（Designer 裁定）
const MVP_RELIC_IDS = ['dimension_crush', 'healing_breeze', 'arithmetic_gauge'] as const;

function buildMvpRelics(): Relic[] {
  return MVP_RELIC_IDS.map((id) => {
    const found = ALL_RELICS[id];
    if (!found) throw new Error(`[BattleScene] MVP 遗物缺失: ${id}（数据同步问题）`);
    return found;
  });
}

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;

  private playerView!: PlayerView;
  private enemyView!: EnemyView;
  private diceTray!: DiceTray;
  private actionBar!: ActionBar;

  // δ-3 胜败闭环：单战斗结局状态（'victory' / 'defeat' / null）+ 横幅容器
  private battleResult: 'victory' | 'defeat' | null = null;
  private overBanner: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.battleState = new BattleState(this.buildInitialSnapshot());

    this.buildStaticLayout();
    this.buildViews();

    // 订阅刷新所有视图
    this.battleState.subscribe((snap) => this.renderAllViews(snap));
    this.renderAllViews(this.battleState.getSnapshot());

    // 开局先抽一手牌
    this.drawHand();
  }

  // ==========================================================================
  // 初始化快照
  // ==========================================================================
  private buildInitialSnapshot(): BattleStateSnapshot {
    const game = createInitialGameState('warrior');
    game.relics = buildMvpRelics();

    const initialDice: Die[] = [];

    return {
      game,
      dice: initialDice,
      enemies: [buildMvpEnemy()],
      rerollCount: 0,
      screenShake: false,
      bossEntrance: { visible: false, name: '', chapter: 1 },
      enemyEffects: {},
      dyingEnemies: new Set<string>(),
      enemyQuotes: {},
      enemyQuotedLowHp: new Set<string>(),
      waveAnnouncement: null,
      armorGained: false,
      hpGained: false,
      playerEffect: null,
      playsPerEnemy: {},
      // Designer MVP：弃牌 1 次/回合。UI 层专属字段，不污染 GameState.freeRerollsLeft（后者是"免费重投次数"语义，
      // 被 engine/buildRelicContext.ts 消费，γ-0 拆分后专字段专用）
      discardLeft: 1,
      discardsPerTurn: 1,
    };
  }

  // ==========================================================================
  // 静态布局
  // ==========================================================================
  private buildStaticLayout(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#0f172a');

    this.add.text(width / 2, 32, 'BattleScene · UI-01-δ-1', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 20, '← 返回', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#60a5fa',
      backgroundColor: '#1f2937',
      padding: { x: 10, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('BootScene'));
  }

  // ==========================================================================
  // 视图装配
  // ==========================================================================
  private buildViews(): void {
    const { width } = this.scale;
    const padding = 20;
    const innerWidth = width - padding * 2;

    // 敌人在上
    this.enemyView = new EnemyView(this, { x: padding, y: 80, width: innerWidth });
    // 玩家在中
    this.playerView = new PlayerView(this, { x: padding, y: 240, width: innerWidth });
    // 骰盘
    this.diceTray = new DiceTray(this, {
      x: padding, y: 460, width: innerWidth, slotCount: 6,
      onToggle: (dieId) => this.toggleDieSelection(dieId),
    });
    // 按钮栏
    this.actionBar = new ActionBar(this, {
      x: padding, y: 620, width: innerWidth,
      onPlay: () => this.handlePlay(),
      onDiscard: () => this.handleDiscard(),
      onEndTurn: () => this.handleEndTurn(),
    });

    // δ-1 段提示
    this.add.text(padding, 720,
      'δ-1 遗物触发链：dimension_crush 升顺 / arithmetic_gauge 顺子倍率 / healing_breeze 回血3。胜败闭环已接入，可再战一局。',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#6b7280',
        wordWrap: { width: innerWidth },
      });
  }

  private renderAllViews(snap: Readonly<BattleStateSnapshot>): void {
    this.playerView.render(snap);
    this.enemyView.render(snap);
    this.diceTray.render(snap);
    this.actionBar.render(snap);
  }

  // ==========================================================================
  // 交互逻辑（β 段占位，γ 段替换为真实胶水）
  // ==========================================================================
  private toggleDieSelection(dieId: number): void {
    this.battleState.setters.dice((prev) =>
      prev.map((d) => (d.id === dieId ? { ...d, selected: !d.selected } : d))
    );
  }

  /**
   * 抽牌 — 每回合开始时调，β 段直接用 drawFromBag
   */
  private drawHand(): void {
    const snap = this.battleState.getSnapshot();
    const { game } = snap;
    const { drawn, newBag, newDiscard } = drawFromBag(game.diceBag, game.discardPile, game.drawCount);

    this.battleState.setters.dice(drawn);
    this.battleState.setters.game((g) => ({ ...g, diceBag: newBag, discardPile: newDiscard }));
  }

  /**
   * 出牌 — δ-1 真实结算链：
   *   evaluateHand(含 straightUpgrade) → triggerOnPlayRelics(聚合) → computePlayOutcome(合并 multiplier) → 应用伤害+heal → 判胜负
   */
  private handlePlay(): void {
    const snap = this.battleState.getSnapshot();
    const selected = snap.dice.filter((d) => d.selected && !d.spent);
    if (selected.length === 0 || snap.game.playsLeft <= 0) return;
    if (this.isBattleOver()) return;

    // 1) 牌型判定（注入遗物 straightUpgrade）
    const hand = evaluateHand(selected, snap.game.relics);

    // 2) 遗物 on_play 聚合（multiplier / heal）
    const pointSum = selected.reduce((s, d) => s + d.value, 0);
    const targetEnemy = snap.enemies.find((e) => e.hp > 0) ?? null;
    const aggregate: RelicEffectAggregate = triggerOnPlayRelics({
      relics: snap.game.relics,
      game: snap.game,
      dice: snap.dice,
      selectedDice: selected,
      targetEnemy,
      handType: hand.bestHand,
      pointSum,
    });

    // 3) 合并倍率算出伤害分布
    const outcome = computePlayOutcome(selected, hand, snap.game, aggregate);

    // 4) 标 spent
    this.battleState.setters.dice((prev) =>
      prev.map((d) => (d.selected && !d.spent ? { ...d, spent: true, selected: false } : d))
    );
    // 5) 扣出牌数
    this.battleState.setters.game((g) => ({ ...g, playsLeft: Math.max(0, g.playsLeft - 1) }));

    // 6) 伤害落地
    this.applyPlayResult(outcome);

    // 7) 遗物回血（healing_breeze 等）— 封顶 maxHp
    if (aggregate.heal > 0) {
      this.battleState.setters.game((g) => ({
        ...g,
        hp: Math.min(g.maxHp, g.hp + aggregate.heal),
      }));
    }

    // 8) 胜负检查
    this.checkBattleOver();
  }

  /**
   * 把 BattleGlue 算好的 PlayOutcomePatch 应用到敌人状态。
   * γ 段仅主目标 = 第一个存活敌人（MVP 单敌场景）；δ 段接 UI 选目标能力后改为 snap.targetIndex。
   */
  private applyPlayResult(outcome: PlayOutcomePatch): void {
    const snap = this.battleState.getSnapshot();
    const targetIndex = snap.enemies.findIndex((e) => e.hp > 0);
    if (targetIndex < 0) return;

    this.battleState.setters.enemies((prev) =>
      applyDamageToEnemies(prev, targetIndex, outcome)
    );
  }

  /**
   * β 段"弃牌重抽"：未选中的骰子重骰（不消耗 diceBag），每回合 1 次。
   * γ-0 拆分：使用 BattleState 专属 discardLeft 字段，不污染 GameState.freeRerollsLeft（其被 buildRelicContext 消费）。
   */
  private handleDiscard(): void {
    const snap = this.battleState.getSnapshot();
    if (snap.discardLeft <= 0) return;

    this.battleState.setters.dice((prev) => rerollUnselectedDice(prev));
    this.battleState.setters.discardLeft((n) => Math.max(0, n - 1));
  }

  /**
   * γ 段"结束回合"：敌人真实反击（attackCalc）→ 回收手牌 → 刷新 → 抽新牌。
   * δ-1 追加：反击后检查玩家死亡；存活才刷新抽牌。
   */
  private handleEndTurn(): void {
    if (this.isBattleOver()) return;
    const snap = this.battleState.getSnapshot();
    const livingEnemies = snap.enemies.filter((e) => e.hp > 0);

    // 敌人反击（γ 段单敌逐个跑基础攻击，δ 段接 enemyAI 走完整技能分支）
    for (const enemy of livingEnemies) {
      const patch = computeBasicEnemyAttack(enemy, this.battleState.getSnapshot().game.armor, this.battleState.getSnapshot().game.statuses);
      if (patch.effectiveDamage <= 0) continue;
      this.battleState.setters.game((g) => ({
        ...g,
        armor: g.armor - patch.armorConsumed,
        hp: Math.max(0, g.hp - patch.hpDamage),
      }));
    }

    // 战败检查（若玩家死亡则跳过回合刷新）
    if (this.checkBattleOver()) return;

    // 回收手牌到弃骰库 + 回合刷新
    const currentDice = this.battleState.getSnapshot().dice;
    this.battleState.setters.game((g) => ({
      ...g,
      discardPile: discardDice(currentDice, g.discardPile),
      playsLeft: g.maxPlays,
      battleTurn: g.battleTurn + 1,
    }));
    // 恢复弃牌次数（UI 层专属字段，独立于 GameState）
    this.battleState.setters.discardLeft(this.battleState.getSnapshot().discardsPerTurn);

    // 抽新手牌
    this.drawHand();
  }

  // ==========================================================================
  // δ-3 胜败闭环
  // ==========================================================================

  /** 当前战斗是否已分胜负。防止横幅弹出后继续点按钮继续打。 */
  private isBattleOver(): boolean {
    return this.battleResult !== null;
  }

  /**
   * 检查胜负并按需弹横幅。
   * @returns true 表示战斗已结束（调用方应中止后续动作）
   */
  private checkBattleOver(): boolean {
    if (this.battleResult !== null) return true;
    const snap = this.battleState.getSnapshot();

    if (snap.game.hp <= 0) {
      this.battleResult = 'defeat';
      this.showOverBanner('失败', '#ef4444');
      return true;
    }
    const anyAlive = snap.enemies.some((e) => e.hp > 0);
    if (!anyAlive) {
      this.battleResult = 'victory';
      this.showOverBanner('胜利', '#22c55e');
      return true;
    }
    return false;
  }

  /** 全屏半透明遮罩 + 结局文字 + "再战一局" 按钮。 */
  private showOverBanner(title: string, titleColor: string): void {
    if (this.overBanner) return; // 防重入
    const { width, height } = this.scale;

    const container = this.add.container(0, 0).setDepth(1000);

    const shade = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0, 0);
    container.add(shade);

    const titleText = this.add.text(width / 2, height / 2 - 60, title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '72px',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    const restartBtn = this.add.text(width / 2, height / 2 + 40, '再战一局', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#2563eb',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => this.restartBattle());
    container.add(restartBtn);

    this.overBanner = container;
  }

  /** 完全重置场景：Phaser scene restart 是最干净的做法（不依赖手动恢复 BattleState）。 */
  private restartBattle(): void {
    this.battleResult = null;
    if (this.overBanner) {
      this.overBanner.destroy();
      this.overBanner = null;
    }
    this.scene.restart();
  }
}
