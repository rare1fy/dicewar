/**
 * scenes/common/Button.ts — 像素风通用按钮底座
 *
 * 职责（SRP）：
 *   - 统一 Start / ClassSelect / Loot / GameOver 等外壳 Scene 的按钮视觉与交互规范
 *   - 三种语义变体（primary / ghost / purple），对齐原版 pixel-btn / ghost / purple 配色
 *   - 内置 hover 高亮 + pointerdown 按压反馈 + 点击 CD（防连点）
 *
 * 设计约束：
 *   - 不依赖任何业务层，scene 只需传 label + onClick
 *   - 不强制尺寸，caller 给 width/height（便于在不同 Scene 复用）
 *   - 返回 Phaser.GameObjects.Container，挂载方自负定位
 */

import Phaser from 'phaser';

export type ButtonVariant = 'primary' | 'ghost' | 'purple';

export interface ButtonOptions {
  /** 按钮文案 */
  label: string;
  /** 宽度（默认 220） */
  width?: number;
  /** 高度（默认 48） */
  height?: number;
  /** 样式变体，默认 primary */
  variant?: ButtonVariant;
  /** 字号（默认 18） */
  fontSize?: number;
  /** 点击回调 */
  onClick: () => void;
  /** 点击 CD 毫秒数（默认 300，防连点） */
  clickCooldown?: number;
}

interface VariantPalette {
  fill: number;
  fillHover: number;
  border: number;
  textColor: string;
}

const PALETTES: Record<ButtonVariant, VariantPalette> = {
  primary: {
    // 原版 pixel-btn-primary：绿系
    fill: 0x3c8c4a,
    fillHover: 0x4ea85c,
    border: 0x1f4d28,
    textColor: '#ffffff',
  },
  ghost: {
    // 原版 pixel-btn-ghost：暗灰描边风
    fill: 0x2b2633,
    fillHover: 0x3a3344,
    border: 0x6c5a7a,
    textColor: '#d4c4e6',
  },
  purple: {
    // 原版 pixel-btn-purple：魂晶紫
    fill: 0x6b3b9e,
    fillHover: 0x8852c2,
    border: 0x3a1d5c,
    textColor: '#f5e9ff',
  },
};

/**
 * 创建一个像素风按钮 Container，（0,0）为容器中心点。
 * 调用方用 container.setPosition(x, y) 定位即可。
 */
export function createButton(scene: Phaser.Scene, options: ButtonOptions): Phaser.GameObjects.Container {
  const width = options.width ?? 220;
  const height = options.height ?? 48;
  const variant = options.variant ?? 'primary';
  const fontSize = options.fontSize ?? 18;
  const cooldown = options.clickCooldown ?? 300;
  const palette = PALETTES[variant];

  const container = scene.add.container(0, 0);
  container.setSize(width, height);

  const bg = scene.add.rectangle(0, 0, width, height, palette.fill)
    .setStrokeStyle(3, palette.border);
  const label = scene.add.text(0, 0, options.label, {
    fontFamily: 'FusionPixel, Arial Black, sans-serif',
    fontSize: `${fontSize}px`,
    color: palette.textColor,
  }).setOrigin(0.5);

  container.add([bg, label]);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  let lastClickAt = 0;

  // 统一的按压态复位函数（抽出来避免 up/upoutside/out 三处重复）
  const resetPressed = (): void => {
    if (container.scale !== 1) container.setScale(1);
  };

  container.on('pointerover', () => {
    bg.setFillStyle(palette.fillHover);
    // 用 CSS cursor 属性而非 setDefaultCursor（避免多按钮全局状态竞争）
    scene.game.canvas.style.cursor = 'pointer';
  });
  container.on('pointerout', () => {
    bg.setFillStyle(palette.fill);
    resetPressed();
    scene.game.canvas.style.cursor = 'default';
  });
  container.on('pointerdown', () => {
    // 按压反馈
    container.setScale(0.96);
  });
  container.on('pointerup', () => {
    resetPressed();
    const now = scene.time.now;
    if (now - lastClickAt < cooldown) return;
    lastClickAt = now;
    options.onClick();
  });
  // P0 修复（Verify R1）：指针按下后拖出按钮松手，补复位，不触发 onClick
  container.on('pointerupoutside', () => {
    resetPressed();
  });

  // 场景销毁时复位光标，避免跨 Scene 光标样式残留
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.game.canvas.style.cursor = 'default';
  });

  return container;
}
