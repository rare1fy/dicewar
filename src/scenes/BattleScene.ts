/**
 * BattleScene.ts — UI-01 战斗主场景（Phaser Scene）
 *
 * 职责（SRP）：仅做调度 —— 初始化状态容器、装配子视图、接受外部事件、路由回调。
 *   真正的业务逻辑一律下沉到：
 *     - 状态：`battle/BattleState.ts`
 *     - 胶水：`battle/BattleGlue.ts`（γ 真实伤害 + δ-1 遗物触发链）
 *     - 视图：`battle/view/*`（β ✅）
 *     - 演出：`battle/BattleFx.ts`（δ-2 飘字 / 闪烁 / 震屏 / 淡入）
 *     - 音效：`utils/sound.ts` + `utils/sfxSynth.ts`（Web Audio 合成器，ASSET-SOUND ✅）；BGM 本 Scene 直管 Phaser.sound
 *
 * UI-01 分段：
 *   - [α] 场景骨架 + BattleState ✅
 *   - [β] 4 个视图 + 抽/弃/出牌骨架（无结算链）✅
 *   - [γ] BattleGlue 接出牌真实伤害 + 敌人真实反击 ✅
 *   - [δ-1] MVP 三件遗物触发链 + 胜败闭环 ✅
 *   - [δ-2] 轻量视觉演出（伤害飘字 / 目标闪烁 / 玩家震屏 / 横幅淡入）
 *   - [δ-3] 多敌目标选择 + enemyAI 完整链（下次）
 *   - Phase 0 ASSET-APPLY：敌人像素接线（食尸鬼 sprite 替代 emoji）✅
 *   - Phase 0 ASSET-SOUND：Web Audio 合成 SFX（roll/play/hit/heal/victory/death 6 个接入点）✅
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
  triggerOnPlayRelics,
  type PlayOutcomePatch,
  type RelicEffectAggregate,
} from './battle/BattleGlue';
import {
  playDamageFloat,
  flashTarget,
} from './battle/BattleFx';
import { runEnemyTurn, type EnemyTurnResult } from './battle/BattleTurnRunner';
import { buildBattleAICallbacks, bridgeScreenShake } from './battle/BattleAICallbacks';
import { PlayerView } from './battle/view/PlayerView';
import { EnemyView } from './battle/view/EnemyView';
import { DiceTray } from './battle/view/DiceTray';
import { ActionBar } from './battle/view/ActionBar';
import { bakeAllEnemySprites } from './battle/EnemyAssetLoader';
import { playSound } from '../utils/sound';
// α-go 多职业 B1 拆分（2026-04-22）：原本在本文件的 MVP 硬编码敌人/遗物、BGM 管理、胜负闭环
// 全部下沉到 battle/BattleMvpData.ts / BattleBgm.ts / BattleOutcome.ts，守住 600 行红线同时
// 让多职业起手遗物配表独立演进（Designer 可直接改 BattleMvpData）。
import { buildMvpEnemy, buildMvpRelics } from './battle/BattleMvpData';
import {
  preloadBattleBgm,
  startBattleBgm,
  stopBattleBgm,
  createEmptyBgmHandle,
  type BattleBgmHandle,
} from './battle/BattleBgm';
import { checkBattleOver as checkBattleOverShared, showOverBanner as showOverBannerShared, type BattleOutcomeContext } from './battle/BattleOutcome';
import type { Die, ClassId } from '../types/game';

// （MVP 数据已下沉到 BattleMvpData.ts）

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;

  private playerView!: PlayerView;
  private enemyView!: EnemyView;
  private diceTray!: DiceTray;
  private actionBar!: ActionBar;

  // δ-3 胜败闭环：单战斗结局状态（'victory' / 'defeat' / null）+ 横幅容器
  private battleResult: 'victory' | 'defeat' | null = null;
  private overBanner: Phaser.GameObjects.Container | null = null;
  // GAMEOVER-MVP R3 修复：3 回流按钮防重入锁，避免快速连点触发 scene.start 两次
  private isLeavingScene: boolean = false;

  // δ-3d 防重入：敌人回合异步执行期间禁止再次点击"结束回合"
  private isResolvingEnemyTurn = false;

  // BGM 句柄（α-go 多职业拆分后封装在 BattleBgmHandle 里）
  private bgm: BattleBgmHandle = createEmptyBgmHandle();

  // α-go 第 2 单：从 ClassSelectScene 注入的职业 id（未注入时回落 'warrior' 保留单测/直启路径）
  private classId: ClassId = 'warrior';

  constructor() {
    super('BattleScene');
  }

  /**
   * Phaser Scene 生命周期：scene.start('BattleScene', { classId }) 传参走这里。
   * 必须在 preload / create 之前执行；若未传 classId（直启 / 调试路径），**回到 warrior 默认**而非继承上一次。
   *
   * Verify PHASER-SCENE-CLASS-SELECT / R1+R2 修复：
   *   原实现只有"带参时覆盖"，未处理 else → 连续两次不同职业进入时会静默泄漏上一次职业。
   */
  init(data: { classId?: ClassId } | undefined): void {
    this.classId = (data && data.classId) ? data.classId : 'warrior';
  }

  /**
   * 预加载 4 首 BGM（Start / Normal / Outside / Boss）。
   * 实际注册细节在 BattleBgm.preloadBattleBgm；本方法只做调度。
   */
  preload(): void {
    preloadBattleBgm(this);
  }

  create(): void {
    this.battleState = new BattleState(this.buildInitialSnapshot());

    // APPLY: 开场批量烘焙敌人像素纹理（MVP 一次烤全 42 个；未来按章节改为 bakeForChapter）
    // 注意：必须在 buildViews() 之前，否则 EnemyView.render 首帧取不到纹理会走 emoji fallback
    bakeAllEnemySprites(this);

    this.buildStaticLayout();
    this.buildViews();
    this.startBgm();

    // 订阅刷新所有视图
    this.battleState.subscribe((snap) => this.renderAllViews(snap));
    // δ-3d：注册震屏桥——enemyAI 内部 setScreenShake(true) 上升沿触发一次 shakeOnPlayerHit
    bridgeScreenShake(this, this.battleState);
    this.renderAllViews(this.battleState.getSnapshot());

    // 开局先抽一手牌
    this.drawHand();

    // BGM 生命周期：Scene shutdown 时显式清理，避免 restart 叠播
    // （Phaser BaseSoundManager.removeAll 只在 game destroy 时触发，不会随 scene 重启自动清）
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopBgm());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.stopBgm());

    // GAMEOVER-MVP R4 修复：Phaser 3 Scene 实例复用 —— `scene.start('XXX')` 会 stop 当前 Scene
    // 但 BattleScene 实例会被复用，`battleResult` / `overBanner` 类字段不会自动重置。
    // 必须在 SHUTDOWN 时一次性清掉，否则玩家"换个职业"后再进战斗会因 `isBattleOver` 残留 true 被软锁。
    // 绑在 SHUTDOWN 而非具体回流方法，DRY 守住所有当前与未来的离开路径。
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.resetBattleResultState());

    // APPLY / PIXEL-ENGINE v2 WARN-2 说明：
    //   敌人像素纹理的释放能力已在 EnemyAssetLoader.releaseAllEnemyTextures 实现，但本 MVP 暂不调用。
    //   原因：Verify v1 查 Phaser 3.90 源码确认 Systems.shutdown 先发 SHUTDOWN 事件、此时 EnemyView.spriteImage
    //   仍持有纹理引用，SHUTDOWN 阶段 remove 纹理存在"图像引用悬空变绿占位"的风险（WARN-NEEDS-GPT）。
    //   本 MVP 仅一个 BattleScene，bake 有缓存命中不会累积；真正多场景切换时再切入 release（届时改到
    //   scene.events.on('destroy') 或下一章节 preload 前批量清理更安全）。
  }

  // ==========================================================================
  // 初始化快照
  // ==========================================================================
  private buildInitialSnapshot(): BattleStateSnapshot {
    const game = createInitialGameState(this.classId);
    // α-go 第 6 单 LOOT：run-scoped 遗物池优先 —— 如果玩家在整局中已经通过 Loot 累积了遗物，
    // 读 registry.runRelics 作为本场战斗的遗物基线；首场战斗（runRelics 为空）回退到
    // BattleMvpData 里按职业配的 starter relic（见 STARTER_RELIC_IDS）。
    // ClassSelectScene 点"开始新局"时会清 runRelics，保证新局重新走 starter 路径。
    const runRelics = (this.registry.get('runRelics') as typeof game.relics | undefined);
    game.relics = runRelics && runRelics.length > 0
      ? [...runRelics]
      : buildMvpRelics(this.classId);

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

    this.add.text(width / 2, 32, 'BattleScene · UI-01-δ-2', {
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

    // δ-2 段提示
    this.add.text(padding, 720,
      'δ-2 视觉演出：命中敌人飘红字+红闪 / 玩家受击震屏+飘白字 / 回血飘绿字 / 胜败横幅淡入。SFX 已接：roll/play/hit/heal/victory/death（Web Audio 合成）。',
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

  /**
   * 启动战斗 BGM。调度到 BattleBgm.startBattleBgm（含防叠播 + cache 校验）。
   * 同时把返回的新 handle 赋给 this.bgm，供 shutdown 时清理。
   */
  private startBgm(): void {
    this.bgm = startBattleBgm(this, this.bgm);
  }

  /** 停止并销毁 BGM。幂等安全（null 守卫在 stopBattleBgm 里）。 */
  private stopBgm(): void {
    stopBattleBgm(this.bgm);
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

    // SFX: 骰子落盘（Web Audio 合成）
    playSound('roll');
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

    // SFX: 出牌启动音（牌型判定前触发，给玩家即时反馈）
    playSound('play');

    // 1) 牌型判定（注入遗物 straightUpgrade）
    const hand = evaluateHand(selected, snap.game.relics);

    // 2) 遗物 on_play 聚合（multiplier / heal / bonusDamage）
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

    // δ-2 演出：命中敌人飘字 + 红闪（AOE 用黄色，高倍率用紫色）
    if (outcome.primaryDamage > 0) {
      const center = this.enemyView.getWorldCenter();
      const fxKind = outcome.multiplier >= 3
        ? 'crit'
        : outcome.isAoe
          ? 'aoe'
          : 'normal';
      playDamageFloat(this, center.x, center.y, outcome.primaryDamage, fxKind);
      flashTarget(this, this.enemyView.getContainer());
      // SFX: 高倍率用 critical、普通命中用 hit（与飘字 fxKind 呼应）
      playSound(outcome.multiplier >= 3 ? 'critical' : 'hit');
    }

    // 7) 遗物回血（healing_breeze 等）— 封顶 maxHp
    if (aggregate.heal > 0) {
      this.battleState.setters.game((g) => ({
        ...g,
        hp: Math.min(g.maxHp, g.hp + aggregate.heal),
      }));
      // δ-2 演出：玩家身上飘绿字
      const pCenter = this.playerView.getWorldCenter();
      playDamageFloat(this, pCenter.x, pCenter.y, aggregate.heal, 'heal');
      // SFX: 遗物回血
      playSound('heal');
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
   * δ-3d"结束回合"：调用 BattleTurnRunner.runEnemyTurn 封装完整的敌人回合流程，
   * 包含 DOT 结算 / AI 决策 / 精英增强 / 回合结束处理 + 胜负判定。
   */
  private handleEndTurn(): void {
    if (this.isBattleOver()) return;
    const snap = this.battleState.getSnapshot();
    // δ-3d 防重入：逻辑层双重守卫（UI 层 ActionBar 已按 isEnemyTurn 禁用按钮）
    if (snap.game.isEnemyTurn) return;
    if (this.isResolvingEnemyTurn) return;
    this.isResolvingEnemyTurn = true;

    const livingEnemies = snap.enemies.filter((e) => e.hp > 0);

    // δ-3d：用 runEnemyTurn 替代手动循环 computeBasicEnemyAttack
    // 构造 EnemyAICallbacks（通过 BattleAICallbacks 工厂）
    const cb = buildBattleAICallbacks(
      this,
      this.battleState,
      this.playerView,
      this.enemyView,
      () => { /* handleVictory 由 runner 内部处理 */ },
    );

    runEnemyTurn(snap.game, livingEnemies, snap.dice, snap.rerollCount, cb)
      .then((result: EnemyTurnResult) => {
        this.isResolvingEnemyTurn = false;

        // δ-3 胜负闭环：根据 EnemyTurnResult 标志走横幅逻辑
        // 注：演出（震屏/飘字/闪烁）已由 executeEnemyTurn 内部通过 callbacks 处理，
        if (result.victory) {
          this.battleResult = 'victory';
          this.showOverBanner('胜利', '#22c55e');
          return; // 战斗结束，不刷新抽牌
        }
        if (result.defeat) {
          this.battleResult = 'defeat';
          this.showOverBanner('失败', '#ef4444');
          return; // 战斗结束，不刷新抽牌
        }

        // 战斗继续：回收手牌到弃骰库 + 回合刷新
        // 注：battleTurn 已由 executeEnemyTurn 内部步骤7推进，此处不重复
        const currentDice = this.battleState.getSnapshot().dice;
        this.battleState.setters.game((g) => ({
          ...g,
          discardPile: discardDice(currentDice, g.discardPile),
          playsLeft: g.maxPlays,
        }));
        // 恢复弃牌次数（UI 层专属字段，独立于 GameState）
        this.battleState.setters.discardLeft(this.battleState.getSnapshot().discardsPerTurn);

        // 抽新手牌
        this.drawHand();
      })
      .catch((err) => {
        // δ-3d 兜底：异常时释放锁 + 恢复 isEnemyTurn + 日志，避免战斗卡死
        this.isResolvingEnemyTurn = false;
        this.battleState.setters.game((g) => ({ ...g, isEnemyTurn: false }));
        console.error('[BattleScene] runEnemyTurn 异常:', err);
      });
  }

  // ==========================================================================
  // δ-3 胜败闭环（α-go 多职业拆分后下沉 BattleOutcome.ts）
  // ==========================================================================

  /** 构造 Outcome 模块需要的 context —— 把 Scene 私有字段的读写暴露为闭包 */
  private buildOutcomeContext(): BattleOutcomeContext {
    return {
      scene: this,
      getResult: () => this.battleResult,
      setResult: (r) => { this.battleResult = r; },
      getBanner: () => this.overBanner,
      setBanner: (b) => { this.overBanner = b; },
      onRestart: () => this.restartBattle(),
      onBackToClassSelect: () => this.backToClassSelect(),
      onBackToStart: () => this.backToStart(),
      onBackToMap: () => this.backToMap(),
      onBackToLoot: () => this.backToLoot(),
    };
  }

  /** 战斗是否已分胜负（用于 handlePlay / handleEndTurn 前置判断）。 */
  private isBattleOver(): boolean {
    return this.battleResult !== null;
  }

  /**
   * 检查胜负并按需弹横幅。逻辑下沉 BattleOutcome.checkBattleOver。
   * @returns true 表示战斗已结束（调用方应中止后续动作）
   */
  private checkBattleOver(): boolean {
    const snap = this.battleState.getSnapshot();
    return checkBattleOverShared(this.buildOutcomeContext(), {
      playerHp: snap.game.hp,
      anyEnemyAlive: snap.enemies.some((e) => e.hp > 0),
    });
  }

  /** 弹横幅（由 handleEndTurn 里的 EnemyTurnResult 分支直接调用）。 */
  private showOverBanner(title: string, titleColor: string): void {
    showOverBannerShared(this.buildOutcomeContext(), title, titleColor);
  }

  /**
   * 统一的离开场景路径：锁防重入 + 停 BGM + scene.start 目标。
   * 传 null 表示 scene.restart（再战一局）。
   * 所有按钮回调都收口到这里，DRY + 未来扩展按钮只加一行 wrapper。
   */
  private leaveToScene(targetKey: string | null): void {
    if (this.isLeavingScene) return; // R3：防 3 按钮连点重入
    this.isLeavingScene = true;
    this.stopBgm(); // BGM 显式清理（SHUTDOWN 也会兜底，幂等安全）
    if (targetKey === null) {
      this.scene.restart({ classId: this.classId });
    } else {
      // 统一透传 classId：MapScene/LootScene/ClassSelectScene/StartScene 都能安全接收
      // （各自 init 内部只认自己关心的字段，多余字段忽略；StartScene 无 init 无影响）
      this.scene.start(targetKey, { classId: this.classId });
    }
  }

  private restartBattle(): void { this.leaveToScene(null); }
  private backToClassSelect(): void { this.leaveToScene('ClassSelectScene'); }
  private backToStart(): void { this.leaveToScene('StartScene'); }
  /** 从 Map 进入的战斗胜败后回 Map；MapScene 在 create 里读 registry.lastBattleResult 更新节点状态 */
  private backToMap(): void { this.leaveToScene('MapScene'); }
  /**
   * α-go 第 6 单 LOOT：胜利 + 从 Map 进入 → 去奖励场景。
   * 在离场前把本场战斗结束时的 relics 数组写回 registry.runRelics，
   * 让 LootScene 的"已持有遗物排除"拿到最新状态（覆盖 buildInitialSnapshot 时读到的那份）。
   * 若将来战斗中能获得遗物（on_kill / on_boss），relics 会被 BattleState 更新，本路径会自动带新遗物。
   */
  private backToLoot(): void {
    const relics = this.battleState.getSnapshot().game.relics;
    this.registry.set('runRelics', [...relics]);
    this.leaveToScene('LootScene');
  }

  /**
   * 战斗结算态一次性复位：挂在 SHUTDOWN 事件统一触发，
   * 保护所有离开路径（restart / 换职业 / 回首屏 / 回地图）。
   * Phaser 3 SceneManager 复用 Scene 实例，类字段必须显式复位。
   */
  private resetBattleResultState(): void {
    // Map 回流探测点：SHUTDOWN 时把最终战果写入 game.registry，MapScene 读后据此决定节点是否 completed
    this.registry.set('lastBattleResult', this.battleResult);
    this.battleResult = null;
    if (this.overBanner) {
      this.overBanner.destroy();
      this.overBanner = null;
    }
    this.isLeavingScene = false;
  }
}
