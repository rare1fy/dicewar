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
import { showBattleGameOverBanner } from './battle/BattleGameOverBanner';
import { runEnemyTurn, type EnemyTurnResult } from './battle/BattleTurnRunner';
import { buildBattleAICallbacks, bridgeScreenShake } from './battle/BattleAICallbacks';
import { PlayerView } from './battle/view/PlayerView';
import { EnemyView } from './battle/view/EnemyView';
import { DiceTray } from './battle/view/DiceTray';
import { ActionBar } from './battle/view/ActionBar';
import { bakeAllEnemySprites } from './battle/EnemyAssetLoader';
import { playSound } from '../utils/sound';
import { ALL_RELICS } from '../data/relics';
import type { Enemy, Die, Relic, ClassId } from '../types/game';

// MVP 硬编码敌人（Designer 方案 4-B：固定每回合 10 点伤害的训练木桩）
// APPLY: name 从"训练木桩"换成"食尸鬼"（ENEMY_SPRITES 已有），让像素接线肉眼可验收；
//        其余数值保持训练木桩不变（不破坏 Designer 的 MVP 数值契约）
function buildMvpEnemy(): Enemy {
  return {
    uid: 'mvp_dummy_0',
    configId: 'mvp_dummy',
    name: '食尸鬼',
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
  // GAMEOVER-MVP R3 修复：3 回流按钮防重入锁，避免快速连点触发 scene.start 两次
  private isLeavingScene: boolean = false;

  // δ-3d 防重入：敌人回合异步执行期间禁止再次点击"结束回合"
  private isResolvingEnemyTurn = false;

  // BGM 句柄（preload 成功后持有，scene shutdown 时显式清理避免叠播）
  private bgm: Phaser.Sound.BaseSound | null = null;

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
   * 仅 Normal 在本 MVP 场景中激活循环播放；其余登记但不启动，留给后续章节 / Boss 切换。
   */
  preload(): void {
    // 防重入：Phaser cache 内已有相同 key 时跳过（scene.restart 会重跑 preload）
    if (!this.cache.audio.exists('bgm_start')) {
      this.load.audio('bgm_start', 'audio/DiceBattle-Start.mp3');
    }
    if (!this.cache.audio.exists('bgm_normal')) {
      this.load.audio('bgm_normal', 'audio/DiceBattle-Normal.mp3');
    }
    if (!this.cache.audio.exists('bgm_outside')) {
      this.load.audio('bgm_outside', 'audio/DiceBattle-Outside.mp3');
    }
    if (!this.cache.audio.exists('bgm_boss')) {
      this.load.audio('bgm_boss', 'audio/DiceBattle-Boss.mp3');
    }
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
   * 启动战斗 BGM（默认循环 Normal 曲）。
   * 设计决策：
   *   - MVP 统一用 Normal，Boss 战切换登记为 PHASER-ASSET-BGM-SWITCH 后续任务。
   *   - 音量 0.3 对齐原版 soundPlayer 的默认 BGM 音量（太响会盖住音效）。
   *   - Phaser 在 autoplay policy 未解锁时会静默失败 —— 不抛异常，等待用户首次交互后自动触发。
   *
   * 防叠播（Verify v1 REJECT 修复）：
   *   Phaser 的 sound manager 是 Game 级单例，scene.restart 不会自动清理旧 bgm 实例。
   *   启动前先显式 stop+destroy 本 scene 持有的旧句柄，并 remove 全局同 key 残留实例（保险）。
   */
  private startBgm(): void {
    // 步骤 1：清本 scene 的旧句柄（通常 shutdown 已清，这里是二次保险）
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
    // 步骤 2：按 key 精确清理同名残留（应对开发期热更 / Scene 快速切换的边缘情况）
    // 历史：曾用 this.sound.removeAll()——PIXEL-ENGINE-BGM v2 Verify WARN-1 指出：
    //   SOUND 接入后 removeAll 会误杀其他音频对象（如 Web Audio sfx 同实例管理到 Phaser.sound 时）。
    //   改精确 key 清理更稳，语义明确：只删 bgm_normal 这一个键，不触碰其他。
    if (this.sound.get('bgm_normal')) {
      this.sound.removeByKey('bgm_normal');
    }

    if (!this.cache.audio.exists('bgm_normal')) {
      console.warn('[BattleScene] bgm_normal 未加载，跳过 BGM 启动');
      return;
    }
    this.bgm = this.sound.add('bgm_normal', { loop: true, volume: 0.3 });
    this.bgm.play();
  }

  /**
   * 停止并销毁 BGM。由 Scene SHUTDOWN / DESTROY / restartBattle 调用。
   * 幂等：多次调用安全（null 守卫）。
   */
  private stopBgm(): void {
    if (!this.bgm) return;
    this.bgm.stop();
    this.bgm.destroy();
    this.bgm = null;
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

    // 2) 遗物 on_play 聚合（multiplier / heal）
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

  /**
   * 全屏半透明遮罩 + 结局文字 + 3 按钮回流（再战 / 换职业 / 回首屏）。
   * GAMEOVER-MVP：堵死胜败后胡同，给玩家三条明确出路。横幅本体实现下沉至 BattleGameOverBanner.ts。
   */
  private showOverBanner(title: string, titleColor: string): void {
    if (this.overBanner) return; // 防重入

    // SFX: 胜利琶音 / 失败降调（按 title 字符串路由，避免新增一个独立参数）
    playSound(title === '胜利' ? 'victory' : 'death');

    this.overBanner = showBattleGameOverBanner(this, title, titleColor, {
      onRestart: () => this.restartBattle(),
      onBackToClassSelect: () => this.backToClassSelect(),
      onBackToStart: () => this.backToStart(),
    });
  }

  /** 完全重置场景：Phaser scene restart 是最干净的做法（不依赖手动恢复 BattleState）。 */
  private restartBattle(): void {
    if (this.isLeavingScene) return; // R3 修复：防重入（快速连点 3 按钮）
    this.isLeavingScene = true;
    // BGM 显式清理（SHUTDOWN 事件会再兜底一次，幂等安全；resetBattleResultState 也在 SHUTDOWN 触发）
    this.stopBgm();
    this.scene.restart();
  }

  /** 回职业选择：允许玩家换个职业重开；BGM 与战斗态由 SHUTDOWN 兜底清理。 */
  private backToClassSelect(): void {
    if (this.isLeavingScene) return;
    this.isLeavingScene = true;
    this.stopBgm();
    this.scene.start('ClassSelectScene');
  }

  /** 回首屏：彻底退出本局；BGM 与战斗态由 SHUTDOWN 兜底清理。 */
  private backToStart(): void {
    if (this.isLeavingScene) return;
    this.isLeavingScene = true;
    this.stopBgm();
    this.scene.start('StartScene');
  }

  /**
   * 战斗结算态一次性复位：挂在 SHUTDOWN 事件统一触发，
   * 保护所有离开路径（restart / 换职业 / 回首屏 / 未来其他）。
   * Phaser 3 SceneManager 复用 Scene 实例，类字段必须显式复位。
   */
  private resetBattleResultState(): void {
    this.battleResult = null;
    if (this.overBanner) {
      this.overBanner.destroy();
      this.overBanner = null;
    }
    this.isLeavingScene = false;
  }
}
