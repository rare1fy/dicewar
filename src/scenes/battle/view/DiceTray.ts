/**
 * DiceTray.ts — 骰盘视图（UI-01-β）
 *
 * 职责（SRP）：
 *   - 渲染 6 槽骰子（Designer 裁定 MVP：固定 6 槽容量 UI，但战士 drawCount=3 不变）
 *   - 点击骰子切换 selected 状态
 *   - 通过 onToggle 回调把"谁被点击"告知上层，具体状态变更由 BattleScene 走 BattleState.setters.dice
 *
 * 不涉及：抽牌 / 弃牌 / 结算 / 动画（留给 γ 段）
 */

import Phaser from 'phaser';
import type { Die, DiceElement } from '../../../types/game';
import type { BattleStateSnapshot } from '../BattleState';

export interface DiceTrayConfig {
  x: number;
  y: number;
  width: number;
  /** 槽位数（MVP 固定 6） */
  slotCount: number;
  /** 点击回调：上层根据 dieId 更新 BattleState */
  onToggle: (dieId: number) => void;
}

const ELEMENT_COLORS: Record<DiceElement, number> = {
  normal: 0xe5e7eb,
  fire: 0xef4444,
  ice: 0x60a5fa,
  thunder: 0xfacc15,
  poison: 0x22c55e,
  holy: 0xfbbf24,
  shadow: 0x6b7280,
};

interface SlotWidgets {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  selectRing: Phaser.GameObjects.Rectangle;
  faceText: Phaser.GameObjects.Text;
  elementChip: Phaser.GameObjects.Rectangle;
  emptyHint: Phaser.GameObjects.Text;
}

export class DiceTray {
  private scene: Phaser.Scene;
  private config: DiceTrayConfig;
  private slots: SlotWidgets[] = [];

  constructor(scene: Phaser.Scene, config: DiceTrayConfig) {
    this.scene = scene;
    this.config = config;
    this.buildSlots();
  }

  private buildSlots(): void {
    const { x, y, width, slotCount } = this.config;
    const slotSize = 88;
    const gap = (width - slotCount * slotSize) / (slotCount - 1);

    for (let i = 0; i < slotCount; i += 1) {
      const slotX = x + i * (slotSize + gap) + slotSize / 2;
      this.slots.push(this.buildSingleSlot(slotX, y, slotSize));
    }
  }

  private buildSingleSlot(cx: number, cy: number, size: number): SlotWidgets {
    const container = this.scene.add.container(cx, cy);

    const bg = this.scene.add.rectangle(0, 0, size, size, 0xffffff).setStrokeStyle(3, 0x4b5563);
    const selectRing = this.scene.add.rectangle(0, 0, size + 10, size + 10, 0, 0).setStrokeStyle(4, 0xfbbf24).setVisible(false);
    const faceText = this.scene.add.text(0, -4, '', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#1f2937',
    }).setOrigin(0.5);
    const elementChip = this.scene.add.rectangle(0, size / 2 - 6, size - 12, 8, ELEMENT_COLORS.normal);
    const emptyHint = this.scene.add.text(0, 0, '·', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      color: '#4b5563',
    }).setOrigin(0.5);

    container.add([selectRing, bg, faceText, elementChip, emptyHint]);
    container.setSize(size, size);
    container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);

    return { container, bg, selectRing, faceText, elementChip, emptyHint };
  }

  /**
   * 根据当前手牌快照刷新槽位。
   * 空槽显示占位符，有骰的槽绑定最新 dieId 的点击事件。
   */
  public render(snap: Readonly<BattleStateSnapshot>): void {
    const { dice } = snap;

    this.slots.forEach((slot, idx) => {
      const die: Die | undefined = dice[idx];

      if (!die) {
        this.renderEmptySlot(slot);
        return;
      }

      this.renderDieSlot(slot, die);
    });
  }

  private renderEmptySlot(slot: SlotWidgets): void {
    slot.bg.setFillStyle(0x374151);
    slot.faceText.setText('');
    slot.elementChip.setFillStyle(0x4b5563);
    slot.emptyHint.setVisible(true);
    slot.selectRing.setVisible(false);
    slot.container.removeAllListeners('pointerdown');
    slot.container.setAlpha(0.5);
  }

  private renderDieSlot(slot: SlotWidgets, die: Die): void {
    slot.emptyHint.setVisible(false);
    slot.bg.setFillStyle(die.spent ? 0x9ca3af : 0xffffff);
    slot.faceText.setText(String(die.value));
    slot.elementChip.setFillStyle(ELEMENT_COLORS[die.element] ?? ELEMENT_COLORS.normal);
    slot.selectRing.setVisible(die.selected);
    slot.container.setAlpha(die.spent ? 0.4 : 1);

    // 重绑 pointerdown（每次 render 都重绑，避免闭包里捕获旧 id）
    slot.container.removeAllListeners('pointerdown');
    if (!die.spent) {
      slot.container.on('pointerdown', () => this.config.onToggle(die.id));
    }
  }

  public destroy(): void {
    this.slots.forEach((s) => s.container.destroy());
    this.slots = [];
  }
}
