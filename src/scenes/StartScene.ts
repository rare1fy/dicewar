/**
 * StartScene.ts — 游戏门面（Start Screen）
 *
 * 职责（SRP）：
 *   - 展示标题"六面决界" + 呼吸金色骰子
 *   - 提供"开启征程"主按钮跳 ClassSelect（未就位时临时跳 BattleScene）
 *   - 启动 Start BGM（Phaser.sound，loop）
 *   - 底部保留一个小小的"开发者菜单"入口跳 BootScene（POC 调试入口）
 *
 * MVP 收窄（vs 原版 StartScreen.tsx 309 行）：
 *   - 不做：CSSParticles / 脉冲光晕 / 淡出转场 / 存档继续 / 魂晶商店 / 教程
 *   - 做：标题 + 骰子动画 + 主按钮 + 径向暗角 + Start BGM + 开发者菜单入口
 *
 * 下一单（PHASER-SCENE-CLASS-SELECT）就位后把 `onStartPress` 跳转目标从 BattleScene 切到 ClassSelectScene。
 */

import Phaser from 'phaser';
import { createButton } from './common/Button';

export class StartScene extends Phaser.Scene {
  private bgm: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super('StartScene');
  }

  preload(): void {
    // Start BGM 资产（若 BattleScene 已注册过则跳过 — Phaser 3 在已存在时会警告但不报错，保险起见加 exists 判断）
    if (!this.cache.audio.exists('bgm_start')) {
      this.load.audio('bgm_start', 'audio/DiceBattle-Start.mp3');
    }
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.drawBackground();
    this.drawTitle(centerX, centerY - 240);
    this.drawBreathingDice(centerX, centerY - 40);
    this.drawMainButton(centerX, centerY + 180);
    this.drawDevMenuLink(centerX, this.scale.height - 40);

    this.startBgm();

    // 场景关闭时停 BGM，避免叠播（与 BattleScene BGM 生命周期协议一致）
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.stopBgm, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.stopBgm, this);
  }

  /** 背景：纯色 + 径向暗角（Graphics 双层，无粒子依赖） */
  private drawBackground(): void {
    const { width, height } = this.scale;
    // 底色
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0812);
    // 径向暗角：中心微亮 → 四周深暗（用 4 层 Rectangle 模拟，纯 Graphics 足矣）
    const vignetteTop = this.add.graphics();
    vignetteTop.fillGradientStyle(0x040306, 0x040306, 0x0a0812, 0x0a0812, 0.7, 0.7, 0, 0);
    vignetteTop.fillRect(0, 0, width, height * 0.35);
    const vignetteBottom = this.add.graphics();
    vignetteBottom.fillGradientStyle(0x0a0812, 0x0a0812, 0x040306, 0x040306, 0, 0, 0.8, 0.8);
    vignetteBottom.fillRect(0, height * 0.65, width, height * 0.35);
  }

  /** 标题："六面" 金色 + "决界" 绿色，加 textShadow 伪影模拟像素立体 */
  private drawTitle(x: number, y: number): void {
    const titleContainer = this.add.container(x, y);
    const title = this.add.text(0, 0, '六面决界', {
      fontFamily: 'FusionPixel, Arial Black, sans-serif',
      fontSize: '72px',
      color: '#f0d860',
      stroke: '#6b5520',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 56, '◆ 6 SIDES BATTLE ◆', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '20px',
      color: '#d4a030',
    }).setOrigin(0.5).setAlpha(0.8);

    titleContainer.add([title, subtitle]);

    // 副标题呼吸
    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.5, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** 呼吸金色骰子：双层辉光矩形 + 点数图案 + 浮动/旋转/发光 tween */
  private drawBreathingDice(x: number, y: number): void {
    const diceContainer = this.add.container(x, y);

    // 外层辉光：半透明金色大矩形，alpha 呼吸
    const glow = this.add.rectangle(0, 0, 160, 160, 0xd4a030, 0.25);
    // 骰子本体：白金面 + 深金描边
    const body = this.add.rectangle(0, 0, 110, 110, 0xf0d860)
      .setStrokeStyle(5, 0x6b5520);
    // 四角深金装饰（像素立体感）
    const topLeft = this.add.rectangle(-48, -48, 14, 14, 0x6b5520);
    const topRight = this.add.rectangle(48, -48, 14, 14, 0x6b5520);
    const bottomLeft = this.add.rectangle(-48, 48, 14, 14, 0x6b5520);
    const bottomRight = this.add.rectangle(48, 48, 14, 14, 0x6b5520);
    // 对角线 4 个点（5 面点数）
    const dotColor = 0x3a2a10;
    const dotSize = 12;
    const dotTopLeft = this.add.rectangle(-28, -28, dotSize, dotSize, dotColor);
    const dotTopRight = this.add.rectangle(28, -28, dotSize, dotSize, dotColor);
    const dotBottomLeft = this.add.rectangle(-28, 28, dotSize, dotSize, dotColor);
    const dotBottomRight = this.add.rectangle(28, 28, dotSize, dotSize, dotColor);
    const dotCenter = this.add.rectangle(0, 0, dotSize, dotSize, dotColor);

    diceContainer.add([
      glow, body,
      topLeft, topRight, bottomLeft, bottomRight,
      dotTopLeft, dotTopRight, dotBottomLeft, dotBottomRight, dotCenter,
    ]);

    // 浮动 + 轻摆
    this.tweens.add({
      targets: diceContainer,
      y: y - 10,
      angle: { from: -4, to: 4 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 辉光层呼吸
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.55 },
      scale: { from: 1, to: 1.2 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** 主按钮"开启征程" */
  private drawMainButton(x: number, y: number): void {
    const btn = createButton(this, {
      label: '开启征程',
      width: 240,
      height: 56,
      variant: 'primary',
      fontSize: 24,
      onClick: () => this.onStartPress(),
    });
    btn.setPosition(x, y);
  }

  /** 底部开发者菜单入口（小字链接样式） */
  private drawDevMenuLink(x: number, y: number): void {
    const link = this.add.text(x, y, '→ 开发者菜单', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: '#6c5a7a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    link.on('pointerover', () => link.setColor('#a88ac8'));
    link.on('pointerout', () => link.setColor('#6c5a7a'));
    link.on('pointerdown', () => {
      this.stopBgm();
      this.scene.start('BootScene');
    });
  }

  private onStartPress(): void {
    // α-go 第 2 单：ClassSelect 已就位，主按钮跳转目标切换到职业选择
    this.stopBgm();
    this.scene.start('ClassSelectScene');
  }

  private startBgm(): void {
    if (!this.cache.audio.exists('bgm_start')) {
      console.warn('[StartScene] bgm_start 未加载，跳过 BGM 启动');
      return;
    }
    // 防叠播：若已有同 key 实例先清，再新建
    if (this.sound.get('bgm_start')) {
      this.sound.removeByKey('bgm_start');
    }
    this.bgm = this.sound.add('bgm_start', { loop: true, volume: 0.3 });
    this.bgm.play();
  }

  private stopBgm(): void {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
    // 保险：即使 this.bgm 已丢，也按 key 清一次
    if (this.sound.get('bgm_start')) {
      this.sound.removeByKey('bgm_start');
    }
  }
}
