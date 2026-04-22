/**
 * LootCard.ts — Loot 场景单张奖励卡视图组件
 *
 * 职责（SRP）：渲染一张可点击的遗物奖励卡，包含：
 *   - 稀有度底色框（common/uncommon/rare/legendary 四档配色）
 *   - 像素图标（通过 pixelToTexture 烘焙 RELIC_PIXEL_DATA[relic.id]）
 *   - 遗物名（中文）
 *   - 稀有度小标签
 *   - 描述正文（自动换行）
 *   - hover 高亮 + 点击回调
 *
 * 设计决策：
 *   - 继承自 Phaser.GameObjects.Container，方便 LootScene 统一 add / destroy
 *   - 不持有业务状态（picked/not），点击后由 LootScene 统一处理
 *   - 像素图标缺失（RELIC_PIXEL_DATA 里没有该 id）时兜底用遗物 icon 字段首字作为占位文本
 *     —— 避免因数据表缺漏导致白屏
 */

import Phaser from 'phaser';
import { RELIC_PIXEL_DATA } from '../../data/pixel/relicPixelData';
import { bakePixelTexture } from '../../utils/pixelToTexture';
import type { Relic, RelicRarity } from '../../types/game';

const CARD_W = 200;
const CARD_H = 280;
const ICON_SIZE = 64;

/** 稀有度 → (边框色, 底色, 名字色) 配色。与原版 LootCard 视觉对齐。 */
const RARITY_STYLE: Record<RelicRarity, { border: number; fill: number; name: string; label: string }> = {
  common:    { border: 0x9ca3af, fill: 0x1f2937, name: '#e5e7eb', label: '普通' },
  uncommon:  { border: 0x22c55e, fill: 0x14532d, name: '#bbf7d0', label: '稀有' },
  rare:      { border: 0x3b82f6, fill: 0x1e3a8a, name: '#bfdbfe', label: '史诗' },
  legendary: { border: 0xf59e0b, fill: 0x78350f, name: '#fde68a', label: '传说' },
};

export interface LootCardOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  relic: Relic;
  onPick: (relic: Relic) => void;
}

export class LootCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private readonly onPick: (relic: Relic) => void;
  private readonly relic: Relic;

  constructor(opts: LootCardOptions) {
    super(opts.scene, opts.x, opts.y);
    this.relic = opts.relic;
    this.onPick = opts.onPick;
    this.setData('relicId', opts.relic.id);

    const style = RARITY_STYLE[opts.relic.rarity] ?? RARITY_STYLE.common;

    // 1. 卡片背景 + 边框（边框用独立 Rectangle，hover 改描边色）
    this.bg = opts.scene.add.rectangle(0, 0, CARD_W, CARD_H, style.fill, 0.95).setOrigin(0.5);
    this.border = opts.scene.add.rectangle(0, 0, CARD_W, CARD_H, 0, 0).setOrigin(0.5);
    this.border.setStrokeStyle(3, style.border, 1);
    this.add([this.bg, this.border]);

    // 2. 像素图标（居上方，带一圈描边占位框）
    const iconFrame = opts.scene.add.rectangle(0, -CARD_H / 2 + ICON_SIZE / 2 + 24, ICON_SIZE + 12, ICON_SIZE + 12, 0x0f172a, 0.6)
      .setOrigin(0.5)
      .setStrokeStyle(1, style.border, 0.5);
    this.add(iconFrame);

    const pixelData = RELIC_PIXEL_DATA[opts.relic.id];
    if (pixelData && pixelData.length > 0) {
      const key = `relic_icon_${opts.relic.id}`;
      bakePixelTexture(opts.scene, key, pixelData, { scale: 3 });
      const img = opts.scene.add.image(iconFrame.x, iconFrame.y, key).setOrigin(0.5);
      this.add(img);
    } else {
      // 兜底：显示 icon 字段首字
      const fallback = opts.scene.add.text(iconFrame.x, iconFrame.y, opts.relic.icon.slice(0, 2), {
        fontFamily: 'FusionPixel',
        fontSize: '24px',
        color: '#fff',
      }).setOrigin(0.5);
      this.add(fallback);
    }

    // 3. 稀有度小标签（图标下方）
    const rarityLabel = opts.scene.add.text(0, -CARD_H / 2 + ICON_SIZE + 52, style.label, {
      fontFamily: 'FusionPixel',
      fontSize: '14px',
      color: style.name,
    }).setOrigin(0.5);
    this.add(rarityLabel);

    // 4. 遗物名
    const nameText = opts.scene.add.text(0, -CARD_H / 2 + ICON_SIZE + 80, opts.relic.name, {
      fontFamily: 'FusionPixel',
      fontSize: '18px',
      color: style.name,
      align: 'center',
      wordWrap: { width: CARD_W - 24 },
    }).setOrigin(0.5);
    this.add(nameText);

    // 5. 描述正文
    const descText = opts.scene.add.text(0, 40, opts.relic.description, {
      fontFamily: 'FusionPixel',
      fontSize: '13px',
      color: '#e5e7eb',
      align: 'center',
      wordWrap: { width: CARD_W - 24 },
      lineSpacing: 4,
    }).setOrigin(0.5);
    this.add(descText);

    // 6. 交互（用 bg 做 hit area，避免子元素争抢）
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => {
      this.border.setStrokeStyle(4, style.border, 1);
      opts.scene.tweens.add({ targets: this, scale: 1.05, duration: 150, ease: 'Sine.easeOut' });
    });
    this.bg.on('pointerout', () => {
      this.border.setStrokeStyle(3, style.border, 1);
      opts.scene.tweens.add({ targets: this, scale: 1, duration: 150, ease: 'Sine.easeOut' });
    });
    this.bg.on('pointerup', () => this.onPick(this.relic));

    opts.scene.add.existing(this);
  }
}
