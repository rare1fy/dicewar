/**
 * GameOverScene.ts — 游戏结局场景（α-go 闭环最后一环）
 *
 * 职责（SRP）：
 *   - 两种入口模式：
 *     1. 通关（victory）：打完最终 Boss → MapScene 检测后跳入 → 显示通关画面 + 本局统计
 *     2. 死亡（defeat）：战斗失败 → 从 BattleScene 横幅的"回到首屏"跳入 → 显示败北画面
 *   - 展示本局统计：职业 / 存活层数 / 击败敌人数 / 获得遗物数 / 金币
 *   - 两个回流按钮：再来一局（回 ClassSelect）/ 回到首屏（回 StartScene）
 *
 * 跨场景数据源（registry 总线）：
 *   - `runHp` / `runMaxHp` / `runGold` / `runRelics`：本局 HUD 持久状态（只读展示）
 *   - `gameOverStats`：本局统计快照（MapScene 或 BattleScene 在跳转前写入）
 *   - 清理：离开本场景时 resetRunState，保证新局干净
 *
 * MVP 收窄：
 *   - 不做：成就系统、解锁动画、分享截图、详细战斗日志
 *   - 做：结局标题 + 统计表 + 两个回流按钮 + 简单淡入动画
 */

import Phaser from 'phaser';
import { createButton } from './common/Button';
import { playSound } from '../utils/sound';
import { resetRunState } from './hud/GlobalHudBar';
import type { ClassId } from '../types/game';

/** 本局统计快照 —— 由上游场景写入 registry.gameOverStats */
export interface GameOverStats {
  /** 结局类型：通关 / 死亡 */
  outcome: 'victory' | 'defeat';
  /** 职业 id */
  classId: ClassId;
  /** 地图存活层数（0-based depth） */
  maxDepthReached: number;
  /** 击败敌人总数 */
  enemiesDefeated: number;
  /** 获得遗物数 */
  relicsCollected: number;
  /** 累计金币 */
  goldEarned: number;
}

interface GameOverSceneData {
  classId?: string;
  outcome?: 'victory' | 'defeat';
}

export class GameOverScene extends Phaser.Scene {
  private classId: ClassId = 'warrior';
  private outcome: 'victory' | 'defeat' = 'defeat';
  private isLeaving: boolean = false;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverSceneData): void {
    if (data && data.classId) this.classId = data.classId as ClassId;
    if (data && data.outcome) {
      this.outcome = data.outcome;
    } else {
      // 兜底：从 registry 统计快照读（BattleScene 通过 leaveToScene 透传不含 outcome）
      const stats = this.registry.get('gameOverStats') as GameOverStats | undefined;
      if (stats) this.outcome = stats.outcome;
    }
    this.isLeaving = false;
  }

  create(): void {
    // 从 registry 读取上游写入的统计（若无则用默认值，兼容直启调试）
    const stats = this.readStats();

    this.drawBackground();
    this.drawTitle(stats.outcome);
    this.drawStatsTable(stats);
    this.drawButtons();

    // 演出：全场景淡入
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // 音效
    playSound(stats.outcome === 'victory' ? 'victory' : 'death');

    // SHUTDOWN 清理
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // 清理结局统计快照（生命周期闭环，防止下一局读到旧数据）
      this.registry.remove('gameOverStats');
      // 清理本局所有 run-scoped 数据，保证新局干净
      resetRunState(this);
    });
  }

  // ==========================================================================
  // 渲染
  // ==========================================================================

  private drawBackground(): void {
    const { width, height } = this.scale;
    const bgColor = this.outcome === 'victory' ? 0x0c1a0e : 0x1a0c0c;
    this.add.rectangle(width / 2, height / 2, width, height, bgColor);
    // 暗角
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.6, 0.6, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.3);
  }

  private drawTitle(outcome: 'victory' | 'defeat'): void {
    const { width } = this.scale;
    const isVictory = outcome === 'victory';

    const titleText = isVictory ? '征途圆满' : '征途终止';
    const titleColor = isVictory ? '#22c55e' : '#ef4444';
    const subtitle = isVictory
      ? '你击败了深渊爬行者，种族英雄的传说将永远流传'
      : '黑暗吞噬了你的勇士，但传说不会终结';

    this.add.text(width / 2, 80, titleText, {
      fontFamily: 'FusionPixel',
      fontSize: '56px',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 145, subtitle, {
      fontFamily: 'FusionPixel',
      fontSize: '16px',
      color: '#d1d5db',
    }).setOrigin(0.5);
  }

  private drawStatsTable(stats: GameOverStats): void {
    const { width } = this.scale;
    const classLabel = this.classId === 'warrior' ? '战士'
                     : this.classId === 'mage' ? '法师'
                     : this.classId === 'rogue' ? '盗贼' : this.classId;

    const rows: [string, string][] = [
      ['职业', classLabel],
      ['到达层数', `${stats.maxDepthReached + 1}`],
      ['击败敌人', `${stats.enemiesDefeated}`],
      ['获得遗物', `${stats.relicsCollected}`],
      ['累计金币', `${stats.goldEarned}`],
    ];

    const tableX = width / 2;
    const tableBaseY = 220;
    const rowHeight = 42;

    // 背景板
    const panelHeight = rows.length * rowHeight + 30;
    const panelWidth = 320;
    const panel = this.add.rectangle(tableX, tableBaseY + panelHeight / 2 - 15, panelWidth, panelHeight, 0x1e293b, 0.8);
    panel.setStrokeStyle(1, 0x475569);

    for (let i = 0; i < rows.length; i++) {
      const y = tableBaseY + i * rowHeight;
      const [label, value] = rows[i];

      this.add.text(tableX - 120, y, label, {
        fontFamily: 'FusionPixel',
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0, 0);

      this.add.text(tableX + 120, y, value, {
        fontFamily: 'FusionPixel',
        fontSize: '18px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
    }
  }

  private drawButtons(): void {
    const { width, height } = this.scale;
    const btnBaseY = height - 160;
    const btnGap = 64;

    createButton(this, {
      label: '再来一局',
      variant: 'primary',
      onClick: () => this.goToClassSelect(),
    }).setPosition(width / 2, btnBaseY);

    createButton(this, {
      label: '回到首屏',
      variant: 'ghost',
      onClick: () => this.goToStart(),
    }).setPosition(width / 2, btnBaseY + btnGap);
  }

  // ==========================================================================
  // 回流
  // ==========================================================================

  private goToClassSelect(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.scene.start('ClassSelectScene');
  }

  private goToStart(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.scene.start('StartScene');
  }

  // ==========================================================================
  // 数据读取
  // ==========================================================================

  /** 从 registry 读取统计快照；若无则用默认值（兼容直启调试） */
  private readStats(): GameOverStats {
    const stored = this.registry.get('gameOverStats') as GameOverStats | undefined;
    if (stored) return stored;

    // 兜底：从 registry 中已有 key 构建最小统计
    const runRelics = (this.registry.get('runRelics') as unknown[] | undefined) ?? [];
    return {
      outcome: this.outcome,
      classId: this.classId,
      maxDepthReached: 0,
      enemiesDefeated: 0,
      relicsCollected: runRelics.length,
      goldEarned: (this.registry.get('runGold') as number | undefined) ?? 0,
    };
  }
}
