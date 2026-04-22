/**
 * ClassSelectScene.ts — 职业选择场景（α-go 第 2 单）
 *
 * 职责（SRP）：
 *   - 渲染三职业卡片（战士/法师/盗贼），展示名称/副标题/描述/规则数字/像素骰子图标
 *   - 选中态高亮（主题色描边 + 外发光）
 *   - 选中后展开技能详情面板（3 条技能）
 *   - 确认按钮触发 800ms 淡出转场，scene.start('MapScene', { classId })
 *   - 左上"← 返回"回 StartScene
 *
 * MVP 收窄（vs 原版 ClassSelectScreen.tsx 240 行 React + framer-motion）：
 *   - 不做：motion 序列入场动画 / 动态呼吸色按钮
 *   - 做：卡片高亮 + 技能面板淡入 tween + 黑幕淡出 + select/gate_close 音效
 *
 * 数据源：data/classes.ts 的 CLASS_DEFS（已有）
 * 参数传递：通过 scene.start('MapScene', { classId }) 注入到 MapScene.init(data)，再透传给 BattleScene
 */

import Phaser from 'phaser';
import { CLASS_DEFS, type ClassId } from '../data/classes';
import { bakeAllPixelDice, pixelDiceKey } from './common/PixelDiceIcon';
import { createButton } from './common/Button';
import { playSound } from '../utils/sound';

const CLASS_ORDER: ClassId[] = ['warrior', 'mage', 'rogue'];

export class ClassSelectScene extends Phaser.Scene {
  private selectedClass: ClassId | null = null;
  private cardContainers = new Map<ClassId, Phaser.GameObjects.Container>();
  private cardBgs = new Map<ClassId, Phaser.GameObjects.Rectangle>();
  private cardGlows = new Map<ClassId, Phaser.GameObjects.Rectangle>();
  private skillPanelContainer: Phaser.GameObjects.Container | null = null;
  private confirmBtn: (Phaser.GameObjects.Container & { setLabelText: (text: string) => void }) | null = null;
  private fadeMask: Phaser.GameObjects.Rectangle | null = null;
  private isConfirming = false;

  constructor() {
    super('ClassSelectScene');
  }

  create(): void {
    this.drawBackground();
    bakeAllPixelDice(this);

    this.drawTitle();
    this.drawClassCards();
    this.drawConfirmButton();
    this.drawBackLink();

    // 技能面板占位（首次未选中时隐藏；选中后才填充）
    this.skillPanelContainer = this.add.container(this.scale.width / 2, 820);
    this.skillPanelContainer.setAlpha(0);

    // 场景转出时复位光标状态
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.game.canvas.style.cursor !== 'default') {
        this.game.canvas.style.cursor = 'default';
      }
    });
  }

  /** 背景：纯色 + 顶/底暗雾（与 StartScene 风格一致） */
  private drawBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0812);
    const topFog = this.add.graphics();
    topFog.fillGradientStyle(0x040306, 0x040306, 0x0a0812, 0x0a0812, 0.7, 0.7, 0, 0);
    topFog.fillRect(0, 0, width, height * 0.25);
    const bottomFog = this.add.graphics();
    bottomFog.fillGradientStyle(0x0a0812, 0x0a0812, 0x040306, 0x040306, 0, 0, 0.8, 0.8);
    bottomFog.fillRect(0, height * 0.75, width, height * 0.25);
  }

  private drawTitle(): void {
    const centerX = this.scale.width / 2;
    this.add.text(centerX, 90, '选择职业', {
      fontFamily: 'FusionPixel, Arial Black, sans-serif',
      fontSize: '48px',
      color: '#f0d860',
      stroke: '#6b5520',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(centerX, 140, '每个职业拥有独特的战斗风格与专属骰子', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '16px',
      color: '#8a7ba0',
    }).setOrigin(0.5);
  }

  /** 三职业卡片垂直布局 */
  private drawClassCards(): void {
    const centerX = this.scale.width / 2;
    const cardStartY = 220;
    const cardHeight = 140;
    const cardGap = 16;
    const cardWidth = 620;

    CLASS_ORDER.forEach((classId, idx) => {
      const y = cardStartY + idx * (cardHeight + cardGap);
      this.drawSingleCard(classId, centerX, y, cardWidth, cardHeight);
    });
  }

  /** 单张职业卡片 */
  private drawSingleCard(classId: ClassId, x: number, y: number, w: number, h: number): void {
    const cls = CLASS_DEFS[classId];
    const container = this.add.container(x, y);

    // 外发光层（默认不可见）
    const glow = this.add.rectangle(0, 0, w + 16, h + 16, Phaser.Display.Color.HexStringToColor(cls.color).color, 0.25)
      .setVisible(false);

    // 卡片背景（深色 + 默认灰紫描边）
    const bg = this.add.rectangle(0, 0, w, h, 0x1a1624)
      .setStrokeStyle(3, 0x3a3344);

    // 左侧骰子图标
    const diceKey = pixelDiceKey(classId);
    const diceIcon = this.add.image(-w / 2 + 70, 0, diceKey).setOrigin(0.5);

    // 名称（主标题）
    const name = this.add.text(-w / 2 + 140, -40, cls.name, {
      fontFamily: 'FusionPixel, Arial Black, sans-serif',
      fontSize: '28px',
      color: cls.colorLight,
    }).setOrigin(0, 0.5);

    // 副标题（title）
    const title = this.add.text(-w / 2 + 140 + name.width + 12, -38, cls.title, {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: cls.color,
    }).setOrigin(0, 0.5);

    // 描述（两行以内）
    const desc = this.add.text(-w / 2 + 140, -10, cls.description, {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: '#b8a8c8',
      wordWrap: { width: w - 160 },
      lineSpacing: 4,
    }).setOrigin(0, 0);

    // 规则数字行（抽骰/出牌/重投 + 标签）
    const tagParts: string[] = [
      `抽骰:${cls.drawCount}`,
      `出牌:${cls.maxPlays}`,
      `重投:${cls.freeRerolls}`,
    ];
    if (cls.canBloodReroll) tagParts.push('卖血');
    if (cls.keepUnplayed) tagParts.push('留牌');
    if (classId === 'rogue') tagParts.push('连击');
    const tags = this.add.text(-w / 2 + 140, h / 2 - 18, tagParts.join('  '), {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '13px',
      color: cls.colorLight,
    }).setOrigin(0, 0.5);

    container.add([glow, bg, diceIcon, name, title, desc, tags]);
    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );

    container.on('pointerover', () => {
      if (this.selectedClass !== classId) bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(cls.color).color, 0.7);
      this.game.canvas.style.cursor = 'pointer';
    });
    container.on('pointerout', () => {
      if (this.selectedClass !== classId) bg.setStrokeStyle(3, 0x3a3344);
      this.game.canvas.style.cursor = 'default';
    });
    container.on('pointerdown', () => {
      playSound('select');
      this.selectClass(classId);
    });

    this.cardContainers.set(classId, container);
    this.cardBgs.set(classId, bg);
    this.cardGlows.set(classId, glow);
  }

  /** 选中某职业，刷新所有卡片的高亮态 + 技能面板 + 确认按钮文案 */
  private selectClass(classId: ClassId): void {
    this.selectedClass = classId;

    // 刷新所有卡片的描边与外发光
    CLASS_ORDER.forEach((cid) => {
      const bg = this.cardBgs.get(cid)!;
      const glow = this.cardGlows.get(cid)!;
      const cls = CLASS_DEFS[cid];
      if (cid === classId) {
        bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(cls.color).color);
        glow.setVisible(true);
      } else {
        bg.setStrokeStyle(3, 0x3a3344);
        glow.setVisible(false);
      }
    });

    this.updateSkillPanel(classId);
    this.updateConfirmButton(classId);
  }

  /** 渲染技能详情面板（3 条技能） */
  private updateSkillPanel(classId: ClassId): void {
    const panel = this.skillPanelContainer;
    if (!panel) return;
    panel.removeAll(true);

    const cls = CLASS_DEFS[classId];
    const panelW = 620;
    const panelH = 160;
    const borderColor = Phaser.Display.Color.HexStringToColor(cls.color).color;

    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x14101f)
      .setStrokeStyle(2, borderColor, 0.6);
    const header = this.add.text(0, -panelH / 2 + 16, `◆ 职业技能 ◆`, {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: cls.color,
    }).setOrigin(0.5);
    panel.add([bg, header]);

    // 3 条技能
    cls.skills.forEach((skill, i) => {
      const rowY = -panelH / 2 + 40 + i * 38;
      const tag = this.add.text(-panelW / 2 + 20, rowY, skill.name, {
        fontFamily: 'FusionPixel, Arial Black, sans-serif',
        fontSize: '14px',
        color: cls.colorLight,
        backgroundColor: cls.color + '33',
        padding: { x: 6, y: 3 },
      }).setOrigin(0, 0.5);
      const descText = this.add.text(-panelW / 2 + 20 + tag.width + 12, rowY, skill.desc, {
        fontFamily: 'FusionPixel, monospace',
        fontSize: '13px',
        color: '#d4c4e6',
        wordWrap: { width: panelW - tag.width - 56 },
      }).setOrigin(0, 0.5);
      panel.add([tag, descText]);
    });

    // 面板淡入 tween（首次出现 or 切换职业）
    this.tweens.killTweensOf(panel);
    this.tweens.add({
      targets: panel,
      alpha: { from: 0, to: 1 },
      duration: 260,
      ease: 'Sine.easeOut',
    });
  }

  /** 确认按钮：未选择时禁用 + 灰，选中后启用 + 主题色描边 + 文案变化 */
  private drawConfirmButton(): void {
    const centerX = this.scale.width / 2;
    this.confirmBtn = createButton(this, {
      label: '请选择一个职业',
      width: 340,
      height: 56,
      variant: 'primary',
      fontSize: 20,
      onClick: () => this.onConfirmPress(),
    });
    this.confirmBtn.setPosition(centerX, 1000);
    this.confirmBtn.setAlpha(0.45);
  }

  private updateConfirmButton(classId: ClassId): void {
    if (!this.confirmBtn) return;
    const cls = CLASS_DEFS[classId];
    // Verify R5 修复：用 Button.ts 新增的稳定 API 替代 container.list[1] 索引
    this.confirmBtn.setLabelText(`选择 ${cls.name} 开启冒险`);
    this.confirmBtn.setAlpha(1);
  }

  private drawBackLink(): void {
    const back = this.add.text(40, 40, '← 返回', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '18px',
      color: '#8a7ba0',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    back.on('pointerover', () => {
      back.setColor('#d4c4e6');
      this.game.canvas.style.cursor = 'pointer';
    });
    back.on('pointerout', () => {
      back.setColor('#8a7ba0');
      this.game.canvas.style.cursor = 'default';
    });
    back.on('pointerdown', () => {
      if (this.isConfirming) return;
      this.scene.start('StartScene');
    });
  }

  private onConfirmPress(): void {
    if (this.isConfirming) return;
    if (!this.selectedClass) return;
    this.isConfirming = true;

    playSound('gate_close');

    // 黑幕淡出转场
    this.fadeMask = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0,
    ).setDepth(1000);

    this.tweens.add({
      targets: this.fadeMask,
      alpha: { from: 0, to: 1 },
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const classId = this.selectedClass!;
        // α-go 第 4 单：确认职业后进入地图；
        // newRun:true 是三重语义 —— (1) 让 MapScene 重开地图（清 nodes/currentNodeId），
        // (2) 清 registry 中可能残留的 Battle↔Map 回流协议键（pendingBattleNodeId / lastBattleResult），
        //     避免上一局战斗中途退出时的"僵尸回流"数据污染新局。
        // (3) α-go 第 6 单 LOOT：顺手清 runRelics，保证新局的 BattleScene.buildInitialSnapshot
        //     走"按职业的 starter relic"分支，而不是继承上一局的累积遗物池。
        this.registry.remove('runRelics');
        this.scene.start('MapScene', { classId, newRun: true });
      },
    });
  }
}
