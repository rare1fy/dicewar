/**
 * BattleScene.ts — UI-01 战斗主场景（Phaser Scene）
 *
 * 职责（SRP）：仅做调度 —— 初始化状态容器、装配子视图、接受外部事件。
 *   真正的业务逻辑一律下沉到：
 *     - 状态：`battle/BattleState.ts`
 *     - 胶水：`battle/BattleGlue.ts`（UI-01-γ）
 *     - 视图：`battle/view/*`（UI-01-β）
 *     - 音效：`utils/sound.ts`（UI-01-γ 替换桩）
 *
 * UI-01 分段交付：
 *   - [α] 场景骨架 + BattleState + 占位文本渲染 ← 本次
 *   - [β] 玩家/敌人/骰盘/ActionBar 子视图
 *   - [γ] BattleGlue 接结算链 + FloatingText + sound
 *   - [δ] 战士三遗物开局 + Verify 联调
 *
 * Designer MVP 范围（designer-UI-01-MVP-SCOPE-20260421.md）：
 *   6 槽骰子 UI / 战士单职业 / 弃牌1次每回合 / 固定伤害单敌人 / 3 件验证遗物 / 胜败即重开
 */

import Phaser from 'phaser';
import { createInitialGameState } from '../logic/gameInit';
import { BattleState, type BattleStateSnapshot } from './battle/BattleState';
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

// MVP 开局三件遗物 ID（Designer 裁定）
const MVP_RELIC_IDS = ['dimension_crush', 'healing_breeze', 'arithmetic_gauge'] as const;

/**
 * 按 ID 在 ALL_RELICS 查出真实 Relic 定义，缺失则抛错（MVP 不容忍哑配置）
 */
function buildMvpRelics(): Relic[] {
  return MVP_RELIC_IDS.map((id) => {
    const found = ALL_RELICS[id];
    if (!found) throw new Error(`[BattleScene] MVP 遗物缺失: ${id}（数据同步问题）`);
    return found;
  });
}

export class BattleScene extends Phaser.Scene {
  private battleState!: BattleState;

  // 占位文本句柄（α 段用）
  private hpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private relicsText!: Phaser.GameObjects.Text;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.battleState = new BattleState(this.buildInitialSnapshot());

    this.buildStaticLayout();
    this.buildPlaceholderHud();

    // 订阅状态变更：α 段只刷新占位文本
    this.battleState.subscribe((snap) => this.renderPlaceholderHud(snap));
    this.renderPlaceholderHud(this.battleState.getSnapshot());
  }

  // ==========================================================================
  // 初始化快照：MVP = 战士 + 3 遗物 + 1 敌人
  // ==========================================================================
  private buildInitialSnapshot(): BattleStateSnapshot {
    const game = createInitialGameState('warrior');
    // 预挂 3 件遗物（从 ALL_RELICS 查真实定义，保留 effect / icon 等全字段）
    game.relics = buildMvpRelics();

    // α 段先不发骰子、不跑 drawPhase；让玩家 HP/敌人 HP 画面能亮起来即可
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
    };
  }

  // ==========================================================================
  // 静态布局（背景 / 返回键 / 标题）
  // ==========================================================================
  private buildStaticLayout(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a1a');

    this.add.text(width / 2, 48, 'BattleScene · UI-01-α 骨架', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const backBtn = this.add.text(20, 20, '← 返回 Boot', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#60a5fa',
      backgroundColor: '#1f2937',
      padding: { x: 10, y: 4 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('BootScene'));

    // 底部分隔线
    this.add.rectangle(width / 2, height - 120, width - 40, 2, 0x374151);
  }

  // ==========================================================================
  // 占位 HUD —— α 段用纯文本证明 BattleState 生效
  // ==========================================================================
  private buildPlaceholderHud(): void {
    const { width } = this.scale;
    const panelY = 120;

    // 玩家信息
    this.add.text(40, panelY, '【玩家】', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#9ca3af',
    });
    this.hpText = this.add.text(40, panelY + 36, '', {
      fontFamily: 'monospace', fontSize: '26px', color: '#4ade80',
    });
    this.relicsText = this.add.text(40, panelY + 80, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#fbbf24',
      wordWrap: { width: width - 80 },
    });

    // 敌人信息
    const enemyY = panelY + 180;
    this.add.text(40, enemyY, '【敌人】', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#9ca3af',
    });
    this.enemyHpText = this.add.text(40, enemyY + 36, '', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ef4444',
    });

    // 阶段指示
    this.phaseText = this.add.text(40, enemyY + 120, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#d1d5db',
    });

    // α 段说明
    this.add.text(40, enemyY + 180,
      'α 骨架阶段：此处为占位 HUD。β 段将替换为子视图（DiceTray / ActionBar / Enemy 精灵）。',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#6b7280',
        wordWrap: { width: width - 80 },
      });
  }

  private renderPlaceholderHud(snap: Readonly<BattleStateSnapshot>): void {
    const { game, enemies } = snap;
    this.hpText.setText(`HP ${game.hp} / ${game.maxHp}    护甲 ${game.armor}    出牌数 ${game.playsLeft}/${game.maxPlays}`);
    this.relicsText.setText(`遗物: ${game.relics.map((r) => r.id).join('  ')}`);

    const enemyParts = enemies.map((e) => `${e.name} ${e.hp}/${e.maxHp} (攻击 ${e.attackDmg})`);
    this.enemyHpText.setText(enemyParts.join('\n'));

    this.phaseText.setText(`phase=${game.phase}  turn=${game.battleTurn}  class=${game.playerClass}`);
  }
}
