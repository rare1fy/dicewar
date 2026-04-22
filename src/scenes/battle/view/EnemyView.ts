/**
 * EnemyView.ts — 敌人信息视图（UI-01-β + APPLY 像素接线）
 *
 * 职责（SRP）：只渲染单敌人的 HP 条 / 攻击力 / 状态（MVP 固定训练木桩），不涉及点击/AI。
 * β 段不接 enemyAI.ts，γ 段再视情况决定（见 UI-01-γ 前置红线）。
 *
 * APPLY 段新增：敌人左上角图像优先渲染 ENEMY_SPRITES 像素纹理；
 *   若 name 在 ENEMY_SPRITES 里不存在（如 MVP 的"训练木桩"），自动回落到 emoji 文本展示。
 *   —— 这样既接通了像素链路，又保留对占位敌人的兼容，不强耦合数据层。
 */

import Phaser from 'phaser';
import type { BattleStateSnapshot } from '../BattleState';
import { enemyTextureKey } from '../../../utils/enemySpriteKey';

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
  private spriteImage: Phaser.GameObjects.Image;
  private intentText: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;

  // 面板尺寸（构造时记录，用于锚点计算）
  private panelWidth: number;
  private panelHeight: number;

  // 像素显示槽位（emojiText 与 spriteImage 二选一，初始都挂载、按需 setVisible 切换）
  private static readonly SPRITE_SLOT_X = 40;
  private static readonly SPRITE_SLOT_Y = 36;

  constructor(scene: Phaser.Scene, config: EnemyViewConfig) {
    this.scene = scene;
    this.panelWidth = config.width;
    this.panelHeight = 140;
    this.container = scene.add.container(config.x, config.y);

    const panelBg = scene.add.rectangle(0, 0, this.panelWidth, this.panelHeight, 0x1f2937).setOrigin(0, 0).setStrokeStyle(2, 0x4b5563);

    // 敌人 emoji（fallback 路径）
    this.emojiText = scene.add.text(16, 12, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
    });

    // 敌人像素 sprite（主路径）—— 初始挂空 key，render 时按 name 切换并 setVisible
    // 锚点 (0.5, 0.5) + 槽位中心，方便不同尺寸 sprite 居中自适应
    this.spriteImage = scene.add.image(EnemyView.SPRITE_SLOT_X, EnemyView.SPRITE_SLOT_Y, '__DEFAULT')
      .setOrigin(0.5, 0.5)
      .setVisible(false);

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

    this.container.add([
      panelBg, this.emojiText, this.spriteImage, this.nameText, this.intentText,
      this.hpBarBg, this.hpBar, this.hpText,
    ]);
  }

  public render(snap: Readonly<BattleStateSnapshot>): void {
    const { enemies } = snap;
    const enemy = enemies[0];

    if (!enemy) {
      this.nameText.setText('');
      this.emojiText.setText('');
      this.spriteImage.setVisible(false);
      this.hpText.setText('');
      this.hpBar.setDisplaySize(0, 24);
      this.intentText.setText('');
      return;
    }

    this.renderAvatar(enemy.name, enemy.emoji);
    this.nameText.setText(`${enemy.name}${enemy.armor > 0 ? `  🛡 ${enemy.armor}` : ''}`);
    this.intentText.setText(`意图: 下回合攻击 ${enemy.attackDmg}`);

    const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const baseWidth = this.hpBarBg.width;
    this.hpBar.setDisplaySize(baseWidth * hpRatio, 24);
    this.hpText.setText(`${enemy.hp} / ${enemy.maxHp}`);
  }

  /**
   * 头像渲染优先级：像素 sprite（若纹理已烤）> emoji 文本（兜底）。
   * 烘焙动作由 BattleScene 在 create 里通过 EnemyAssetLoader 统一完成，本 View 只消费。
   */
  private renderAvatar(name: string, emoji: string): void {
    const key = enemyTextureKey(name);
    if (this.scene.textures.exists(key)) {
      this.spriteImage.setTexture(key).setVisible(true);
      this.emojiText.setText('');
    } else {
      this.spriteImage.setVisible(false);
      this.emojiText.setText(emoji);
    }
  }

  /**
   * δ-2 演出用：返回敌人面板的世界坐标中心（飘字起点）
   * 基于面板实际尺寸计算，不硬编码偏移。
   */
  public getWorldCenter(): { x: number; y: number } {
    return {
      x: this.container.x + this.panelWidth / 2,
      y: this.container.y + this.panelHeight / 2,
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
