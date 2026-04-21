/**
 * BattleScene.ts — UI-01 战斗主场景（Phaser Scene）
 *
 * 职责（SRP）：仅做调度 —— 初始化状态容器、装配子视图、接受外部事件、路由回调。
 *   真正的业务逻辑一律下沉到：
 *     - 状态：`battle/BattleState.ts`
 *     - 胶水：`battle/BattleGlue.ts`（UI-01-γ ✅ 出牌真实结算 + 敌人真实反击）
 *     - 视图：`battle/view/*`（UI-01-β ✅）
 *     - 音效：`utils/sound.ts`（UI-01-δ 替换桩）
 *
 * UI-01 分段：
 *   - [α] 场景骨架 + BattleState ✅
 *   - [β] 4 个视图 + 抽/弃/出牌骨架（无结算链）✅
 *   - [γ] BattleGlue 接出牌真实伤害 + 敌人真实反击 ← 本次
 *   - [δ] 3 件验证遗物触发链 + 结算演出 + sound 替桩 + 胜败重开
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
  type PlayOutcomePatch,
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

    this.add.text(width / 2, 32, 'BattleScene · UI-01-γ', {
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

    // γ 段提示
    this.add.text(padding, 720,
      'γ 真实结算：出牌走 checkHands + 牌型倍率真伤；敌人反击走 attackCalc.getEffectiveAttackDmg。遗物/结算演出 δ 段再接。',
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
   * 出牌 — γ 段真实结算：checkHands → 牌型倍率 → 真伤 + AOE
   */
  private handlePlay(): void {
    const snap = this.battleState.getSnapshot();
    const selected = snap.dice.filter((d) => d.selected && !d.spent);
    if (selected.length === 0 || snap.game.playsLeft <= 0) return;

    const hand = evaluateHand(selected);
    const outcome = computePlayOutcome(selected, hand, snap.game);

    // 标记为 spent
    this.battleState.setters.dice((prev) =>
      prev.map((d) => (d.selected && !d.spent ? { ...d, spent: true, selected: false } : d))
    );
    // 扣出牌数
    this.battleState.setters.game((g) => ({ ...g, playsLeft: Math.max(0, g.playsLeft - 1) }));

    // 真实伤害落地
    this.applyPlayResult(outcome);
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
   */
  private handleEndTurn(): void {
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
}
