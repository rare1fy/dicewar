/**
 * EnemyView.ts — 敌人信息视图（UI-01-β）
 *
 * 职责（SRP）：只渲染单敌人的 HP 条 / 攻击力 / 状态（MVP 固定训练木桩），不涉及点击/AI。
 * β 段不接 enemyAI.ts，γ 段再视情况决定（见 UI-01-γ 前置红线）。
 */

import Phaser from 'phaser';
import type { BattleStateSnapshot } from '../BattleState';

export interface EnemyViewConfig {
  x: number;
  y: number;
  width: number;
}

export class EnemyView {
  private container: Phaser.GameObjects.Container;
  private hpText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private emojiText: Phaser.GameObjects.Text;
  private intentText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: EnemyViewConfig) {
    this.container = scene.add.container(config.x, config.y);

    const panelBg = scene.add.rectangle(0, 0, config.width, 140, 0x1f2937).setOrigin(0, 0).setStrokeStyle(2, 0x4b5563);

    // 敌人 emoji + 名字
    this.emojiText = scene.add.text(16, 12, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
    });
    this.nameText = scene.add.text(76, 18, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#f87171',
    });
    this.intentText = scene.add.text(76, 50, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#fbbf24',
    });

    // HP 条
    this.hpBarBg = scene.add.rectangle(12, 88, config.width - 24, 24, 0x111827).setOrigin(0, 0);
    this.hpBar = scene.add.rectangle(12, 88, config.width - 24, 24, 0xef4444).setOrigin(0, 0);
    this.hpText = scene.add.text(config.width / 2, 100, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.container.add([panelBg, this.emojiText, this.nameText, this.intentText, this.hpBarBg, this.hpBar, this.hpText]);
  }

  public render(snap: Readonly<BattleStateSnapshot>): void {
    const { enemies } = snap;
    const enemy = enemies[0];

    if (!enemy) {
      this.nameText.setText('');
      this.emojiText.setText('');
      this.hpText.setText('');
      this.hpBar.setDisplaySize(0, 24);
      this.intentText.setText('');
      return;
    }

    this.emojiText.setText(enemy.emoji);
    this.nameText.setText(`${enemy.name}${enemy.armor > 0 ? `  🛡 ${enemy.armor}` : ''}`);
    this.intentText.setText(`意图: 下回合攻击 ${enemy.attackDmg}`);

    const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const baseWidth = this.hpBarBg.width;
    this.hpBar.setDisplaySize(baseWidth * hpRatio, 24);
    this.hpText.setText(`${enemy.hp} / ${enemy.maxHp}`);
  }

  /**
   * δ-2 演出用：返回敌人面板的世界坐标中心（飘字起点）
   */
  public getWorldCenter(): { x: number; y: number } {
    return {
      x: this.container.x + 60,
      y: this.container.y + 40,
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
