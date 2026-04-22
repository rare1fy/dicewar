/**
 * BattleGameOverBanner.ts — 战斗结局横幅（胜/败通用）
 *
 * 职责（SRP）：
 *   - 渲染全屏半透明遮罩 + 大字结局标题 + 3 按钮回流（再战 / 换职业 / 回首屏）
 *   - 仅负责 UI 组装；BGM 清理、场景跳转通过 BannerCallbacks 注入，保持 Scene 解耦
 *
 * 上层用法（BattleScene）：
 *   const banner = showBattleGameOverBanner(this, '胜利', '#22c55e', {
 *     onRestart: () => this.restartBattle(),
 *     onBackToClassSelect: () => this.backToClassSelect(),
 *     onBackToStart: () => this.backToStart(),
 *   });
 *   // 存引用用于防重入 / restart 时手动 destroy
 *
 * B1 拆分背景：BattleScene 单文件 ≤ 600 行红线；将横幅 + 3 按钮 + 工厂函数从 Scene 剥离。
 */

import Phaser from 'phaser';
import { fadeInBanner } from './BattleFx';

export interface BannerCallbacks {
  onRestart: () => void;
  onBackToClassSelect: () => void;
  onBackToStart: () => void;
}

/**
 * 创建并淡入战斗结局横幅。调用方负责持有返回的 Container 引用（防重入、restart 时主动 destroy）。
 */
export function showBattleGameOverBanner(
  scene: Phaser.Scene,
  title: string,
  titleColor: string,
  callbacks: BannerCallbacks,
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(1000);

  // 遮罩
  const shade = scene.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0, 0);
  container.add(shade);

  // 结局标题
  const titleText = scene.add.text(width / 2, height / 2 - 120, title, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '72px',
    color: titleColor,
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(titleText);

  // 3 按钮竖排；Mobile 9:16 竖屏空间够用；重要度递减 再战 → 换职业 → 回首屏
  const btnCx = width / 2;
  const btnBaseY = height / 2 + 10;
  const btnGap = 64;
  container.add(createBannerButton(scene, '再战一局', btnCx, btnBaseY, '#2563eb', callbacks.onRestart));
  container.add(createBannerButton(scene, '换个职业', btnCx, btnBaseY + btnGap, '#7c3aed', callbacks.onBackToClassSelect));
  container.add(createBannerButton(scene, '回到首屏', btnCx, btnBaseY + btnGap * 2, '#475569', callbacks.onBackToStart));

  // δ-2 演出：淡入（取代硬切）
  fadeInBanner(scene, container);

  return container;
}

/** 结局横幅 3 按钮统一样式工厂，消除重复。 */
function createBannerButton(
  scene: Phaser.Scene,
  label: string,
  x: number,
  y: number,
  bgColor: string,
  onClick: () => void,
): Phaser.GameObjects.Text {
  const btn = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '22px',
    color: '#ffffff',
    backgroundColor: bgColor,
    padding: { x: 20, y: 10 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  btn.on('pointerdown', onClick);
  return btn;
}
