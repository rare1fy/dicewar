/**
 * ActionBar.ts — 动作按钮栏（UI-01-β）
 *
 * 职责（SRP）：
 *   - 3 个按钮：出牌 / 弃牌重抽 / 结束回合
 *   - 可用性由 render() 根据 snapshot 判定（playsLeft / 弃牌次数 / 是否有选中）
 *   - 点击时调用对应回调，不做业务逻辑
 *
 * Designer MVP 边界：
 *   - 弃牌 1 次/回合（用 game.freeRerollsLeft 字段存弃牌次数，MVP 简化口径）
 *   - 无能量系统
 *   - 结束回合 = 敌人固定打 10 点 → 新回合抽牌
 */

import Phaser from 'phaser';
import type { BattleStateSnapshot } from '../BattleState';

export interface ActionBarConfig {
  x: number;
  y: number;
  width: number;
  onPlay: () => void;
  onDiscard: () => void;
  onEndTurn: () => void;
}

interface ButtonWidget {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
  enabled: boolean;
}

export class ActionBar {
  private scene: Phaser.Scene;
  private playBtn: ButtonWidget;
  private discardBtn: ButtonWidget;
  private endTurnBtn: ButtonWidget;

  constructor(scene: Phaser.Scene, config: ActionBarConfig) {
    this.scene = scene;

    const btnWidth = (config.width - 24) / 3;
    const btnY = config.y;

    this.playBtn = this.buildButton(config.x + btnWidth / 2, btnY, btnWidth, '出牌', 0xdc2626, config.onPlay);
    this.discardBtn = this.buildButton(config.x + btnWidth + 12 + btnWidth / 2, btnY, btnWidth, '弃牌重抽', 0x7c3aed, config.onDiscard);
    this.endTurnBtn = this.buildButton(config.x + (btnWidth + 12) * 2 + btnWidth / 2, btnY, btnWidth, '结束回合', 0x2563eb, config.onEndTurn);
  }

  private buildButton(cx: number, cy: number, width: number, label: string, color: number, onClick: () => void): ButtonWidget {
    const container = this.scene.add.container(cx, cy);
    const bg = this.scene.add.rectangle(0, 0, width, 64, color).setStrokeStyle(2, 0x1f2937);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, 64);
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -32, width, 64), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => {
      if (widget.enabled) onClick();
    });

    const widget: ButtonWidget = { bg, label: text, container, enabled: true };
    return widget;
  }

  public render(snap: Readonly<BattleStateSnapshot>): void {
    const { game, dice, discardLeft } = snap;
    const hasSelected = dice.some((d) => d.selected && !d.spent);
    const canPlay = game.playsLeft > 0 && hasSelected;
    const canDiscard = discardLeft > 0;

    this.updateButton(this.playBtn, canPlay, `出牌 (剩${game.playsLeft})`);
    this.updateButton(this.discardBtn, canDiscard, `弃牌重抽 (剩${discardLeft})`);
    this.updateButton(this.endTurnBtn, true, '结束回合');
  }

  private updateButton(btn: ButtonWidget, enabled: boolean, label: string): void {
    btn.enabled = enabled;
    btn.label.setText(label);
    btn.container.setAlpha(enabled ? 1 : 0.35);
  }

  public destroy(): void {
    this.playBtn.container.destroy();
    this.discardBtn.container.destroy();
    this.endTurnBtn.container.destroy();
  }
}
