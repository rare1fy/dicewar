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
 * 纯文本飘字（非数值反馈：冻结 / 怒火+X / 0 伤害吸收提示等）
 *
 * 与 playDamageFloat 共用上升淡出的视觉模式，但：
 *   - 文本不加 ± 前缀
 *   - 字号略小
 *   - 颜色由调用方传入（Tailwind class 或 16 进制，这里做简单归一）
 */
export function playLabelFloat(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  colorHint: string = '#ffffff',
): void {
  const color = normalizeColorHint(colorHint);
  const text = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '22px',
    color,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(800);

  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/**
 * 把 Tailwind class（text-cyan-400 / text-orange-400 ...）或 #XXXXXX 归一为 CSS 颜色。
 * 覆盖 enemyAI 里出现的全部颜色名。
 */
function normalizeColorHint(hint: string): string {
  if (hint.startsWith('#')) return hint;
  if (hint.includes('cyan')) return '#22d3ee';
  if (hint.includes('orange')) return '#fb923c';
  if (hint.includes('yellow')) return '#fbbf24';
  if (hint.includes('purple')) return '#a855f7';
  if (hint.includes('green')) return '#22c55e';
  if (hint.includes('red')) return '#ef4444';
  if (hint.includes('blue')) return '#60a5fa';
  if (hint.includes('gray')) return '#9ca3af';
  return '#ffffff';
}

/**
 * 目标红色闪烁（共 4 段：红→原→红→原，tweens.addCounter 实现）
 *
 * 实现细节：只对 container.list 中**第一个** Rectangle 节点做闪烁，
 * 约定是该容器的面板背景（panelBg）。这样避免把 HP 条等其它矩形一起染红，
 * 保留"HP 条低血量时渐红"的颜色语义。
 *
 * Verify δ-2 [WARN-A] 修复：过去用遍历全部 Rectangle 会污染 HP 条语义。
 */
export function flashTarget(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
): void {
  const panelBg = target.list.find(
    (obj): obj is Phaser.GameObjects.Rectangle => obj instanceof Phaser.GameObjects.Rectangle,
  );
  if (!panelBg) return;

  const originalColor = panelBg.fillColor;

  // repeat: 3 + yoyo: true → start→yoyo→repeat→yoyo→repeat→yoyo→complete 共 4 次颜色翻转，约 320ms
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 80,
    repeat: 3,
    yoyo: true,
    onStart: () => panelBg.setFillStyle(0xff0000),
    onYoyo: () => panelBg.setFillStyle(originalColor),
    onRepeat: () => panelBg.setFillStyle(0xff0000),
    onComplete: () => panelBg.setFillStyle(originalColor),
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
