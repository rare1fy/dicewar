/**
 * BattleFx.ts — UI-01-δ-2 轻量战斗演出
 *
 * 职责（SRP）：战斗视觉反馈（飘字、震屏、闪烁、淡入横幅）。
 *   不依赖 SettlementContext / runSettlementAnimation 的完整结算动画链，
 *   仅负责"用户操作 → 即时视觉反馈"的薄层。
 *
 * 不做：
 *   - 结算分阶段动画（runSettlementAnimation 4 phase）→ 依赖 15+ setter 的重接线，留 δ-3+
 *   - 音效播放 → 当前 sound.ts 是空桩，无资源可播，登记为独立欠账 PHASER-SOUND-01
 *   - 骰子翻转/重投动画 → 非 δ-2 范围
 *
 * 技术选型：
 *   - Phaser 原生 scene.tweens / cameras.main.shake / scene.add.text
 *   - 零外部依赖，零新增资源
 *
 * δ-2 作用域字段明细：
 *   - playDamageFloat(): 伤害飘字（上升 + 淡出，按类型着色）
 *   - flashTarget(): 目标闪烁（调方自己传对象，本模块不管绑定关系）
 *   - shakeOnPlayerHit(): 玩家受击震屏
 *   - fadeInBanner(): 横幅淡入 tween
 */

import Phaser from 'phaser';

/** 伤害飘字类型 → 决定颜色和字号 */
export type DamageFxKind = 'normal' | 'aoe' | 'crit' | 'heal';

const FX_COLOR_MAP: Record<DamageFxKind, string> = {
  normal: '#ffffff',
  aoe: '#fbbf24',      // 黄色（AOE）
  crit: '#a855f7',     // 紫色（暴击/终极）
  heal: '#22c55e',     // 绿色（回血）
};

const FX_SIZE_MAP: Record<DamageFxKind, string> = {
  normal: '28px',
  aoe: '32px',
  crit: '40px',
  heal: '26px',
};

/**
 * 伤害飘字（上升 + 淡出）
 *
 * @param scene 场景
 * @param x 起点世界坐标
 * @param y 起点世界坐标
 * @param amount 数值（heal 会自动加 +，伤害会自动加 -）
 * @param kind 类型
 */
export function playDamageFloat(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  kind: DamageFxKind = 'normal',
): void {
  const prefix = kind === 'heal' ? '+' : '-';
  const text = scene.add.text(x, y, `${prefix}${amount}`, {
    fontFamily: 'Arial, sans-serif',
    fontSize: FX_SIZE_MAP[kind],
    color: FX_COLOR_MAP[kind],
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(800);

  scene.tweens.add({
    targets: text,
    y: y - 60,
    alpha: 0,
    duration: 800,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/**
 * 目标红色闪烁（2 次脉冲）
 * 调方传 Phaser.GameObjects.Container（或任何带 setTint 的对象，这里用泛型限制）
 */
export function flashTarget(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
): void {
  // Container 本身不支持 tint，遍历其中 Rectangle 子节点做闪烁
  const rects = target.list.filter(
    (obj): obj is Phaser.GameObjects.Rectangle => obj instanceof Phaser.GameObjects.Rectangle,
  );
  if (rects.length === 0) return;

  const originalColors = rects.map((r) => r.fillColor);

  // 闪红 → 复原 → 再闪红 → 再复原
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 80,
    repeat: 3,
    yoyo: true,
    onStart: () => rects.forEach((r) => r.setFillStyle(0xff0000)),
    onYoyo: () => rects.forEach((r, i) => r.setFillStyle(originalColors[i])),
    onRepeat: () => rects.forEach((r) => r.setFillStyle(0xff0000)),
    onComplete: () => rects.forEach((r, i) => r.setFillStyle(originalColors[i])),
  });
}

/** 玩家受击震屏 */
export function shakeOnPlayerHit(scene: Phaser.Scene, intensity: number = 0.005): void {
  scene.cameras.main.shake(150, intensity);
}

/**
 * 横幅淡入（0 → 1 alpha）
 * 用于胜利/失败横幅
 */
export function fadeInBanner(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
  duration: number = 400,
): void {
  target.setAlpha(0);
  scene.tweens.add({
    targets: target,
    alpha: 1,
    duration,
    ease: 'Cubic.easeOut',
  });
}
