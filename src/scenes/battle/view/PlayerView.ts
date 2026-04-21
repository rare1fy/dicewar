/**
 * PlayerView.ts — 玩家信息视图（UI-01-β）
 *
 * 职责（SRP）：只渲染玩家状态（HP / 护甲 / 出牌数 / 3 件遗物），不涉及交互。
 * 订阅由 BattleScene 统一管理，每次 BattleState 变更都调 render(snapshot)。
 */

import Phaser from 'phaser';
import type { BattleStateSnapshot } from '../BattleState';

export interface PlayerViewConfig {
  x: number;
  y: number;
  width: number;
}

export class PlayerView {
  private container: Phaser.GameObjects.Container;
  private hpText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private armorText: Phaser.GameObjects.Text;
  private playsText: Phaser.GameObjects.Text;
  private relicsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: PlayerViewConfig) {
    this.container = scene.add.container(config.x, config.y);

    const panelBg = scene.add.rectangle(0, 0, config.width, 140, 0x111827).setOrigin(0, 0).setStrokeStyle(2, 0x374151);

    const title = scene.add.text(12, 10, '玩家 · 战士', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#9ca3af',
    });

    // HP 条
    this.hpBarBg = scene.add.rectangle(12, 42, config.width - 24, 20, 0x1f2937).setOrigin(0, 0);
    this.hpBar = scene.add.rectangle(12, 42, config.width - 24, 20, 0x4ade80).setOrigin(0, 0);
    this.hpText = scene.add.text(config.width / 2, 52, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 护甲 + 出牌数（同一行）
    this.armorText = scene.add.text(12, 72, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#60a5fa',
    });
    this.playsText = scene.add.text(config.width - 12, 72, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#fbbf24',
    }).setOrigin(1, 0);

    // 遗物列表
    this.relicsText = scene.add.text(12, 104, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#a78bfa',
      wordWrap: { width: config.width - 24 },
    });

    this.container.add([panelBg, title, this.hpBarBg, this.hpBar, this.hpText, this.armorText, this.playsText, this.relicsText]);
  }

  public render(snap: Readonly<BattleStateSnapshot>): void {
    const { game } = snap;

    // HP 条宽度
    const hpRatio = Math.max(0, Math.min(1, game.hp / game.maxHp));
    const baseWidth = this.hpBarBg.width;
    this.hpBar.setDisplaySize(baseWidth * hpRatio, 20);
    this.hpBar.setFillStyle(hpRatio > 0.5 ? 0x4ade80 : hpRatio > 0.2 ? 0xfbbf24 : 0xef4444);
    this.hpText.setText(`${game.hp} / ${game.maxHp}`);

    this.armorText.setText(`护甲 ${game.armor}`);
    this.playsText.setText(`出牌 ${game.playsLeft}/${game.maxPlays}`);

    const relicNames = game.relics.map((r) => r.name || r.id);
    this.relicsText.setText(`遗物: ${relicNames.join(' · ')}`);
  }

  /**
   * δ-2 演出用：返回玩家面板的世界坐标中心（飘字 + 回血起点）
   */
  public getWorldCenter(): { x: number; y: number } {
    return {
      x: this.container.x + 60,
      y: this.container.y + 50,
    };
  }

  /** δ-2 演出用：暴露 container 给 FX 闪烁 */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
