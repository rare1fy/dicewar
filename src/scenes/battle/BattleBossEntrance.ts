/**
 * BattleBossEntrance.ts — Boss 入场演出
 *
 * 职责（SRP）：在 BattleScene 内渲染一次性 Boss 入场横幅 —— 全屏黑半透明遮罩 + 章节副标题 +
 *   Boss 名称大字 + 自动淡入持续淡出 + 完成回调。仅对 battleType === 'boss' 的战斗触发一次。
 *
 * 拆分来源：BattleScene.ts（α 节奏第 2 轮 PHASER-SCENE-BOSS-MVP 前置 B1 拆分）。
 *   BattleScene 当前 546 行，接入 Boss 入场会使其贴死 600 红线，独立拆出本模块守铁律。
 *
 * 使用方式（由 BattleScene.create 调用）：
 *   if (battleType === 'boss') {
 *     showBossEntrance(this, { name: '深渊爬行者', chapter: 1 }, () => {
 *       this.startBattleFlow();
 *     });
 *   } else {
 *     this.startBattleFlow();
 *   }
 *
 * 时序（总 2400ms）：
 *   0ms            黑幕渐入（300ms 至 alpha 0.85）
 *   300ms          章节副标题淡入（400ms）
 *   500ms          Boss 名称大字淡入 + 轻微放大（600ms）
 *   1500ms         Boss 名称微震（200ms，表达"压迫感"）
 *   1900ms         整体淡出（500ms）+ 完成后销毁 + onComplete 回调
 */

import Phaser from 'phaser';

export interface BossEntranceConfig {
  /** Boss 名称（大字显示），例如 "深渊爬行者" */
  name: string;
  /** 当前章节号（1-5），影响副标题文案；MVP 固定 1 也可以 */
  chapter: number;
}

/** 章节副标题文案表（MVP 全用同一行；未来按章节差异化） */
const CHAPTER_LABEL_MAP: Record<number, string> = {
  1: '第一章 · 章节 BOSS',
  2: '第二章 · 章节 BOSS',
  3: '第三章 · 章节 BOSS',
  4: '第四章 · 章节 BOSS',
  5: '第五章 · 终章 BOSS',
};

function chapterLabel(chapter: number): string {
  return CHAPTER_LABEL_MAP[chapter] ?? CHAPTER_LABEL_MAP[1];
}

/**
 * 展示 Boss 入场演出。调用后立即返回，演出结束时通过 onComplete 回调通知调用方。
 *
 * 设计契约：
 *   - 调用方应在回调里启动战斗流（startBgm / drawHand 等），否则战斗开局会被黑幕盖住
 *   - 所有元素 depth=9000+，压过 BattleScene 主界面但低于 10000（预留给战斗横幅）
 *   - 若调用方在演出期间 scene.shutdown，tween 会被 Phaser 自动清理；onComplete 内部
 *     仍会做 scene.isActive() 守卫防止跑到已释放 Scene（v2 Verify R-1 修复）
 *   - 非幂等：重复调用本函数会叠加演出实例，调用方需自行确保单次触发
 *     （通常由 BattleScene.create 单入口调度保证；未来若多处调用需加锁）
 *
 * @param scene       承载演出的 Phaser Scene（一般就是 BattleScene）
 * @param cfg         Boss 配置（名称 + 章节）
 * @param onComplete  演出全部结束（含 onDestroy 后）触发
 */
export function showBossEntrance(
  scene: Phaser.Scene,
  cfg: BossEntranceConfig,
  onComplete: () => void,
): void {
  const { width, height } = scene.scale;
  const centerX = width / 2;
  const centerY = height / 2;

  // 根容器，便于整体淡出和销毁
  const container = scene.add.container(0, 0).setDepth(9000);

  // 黑幕（同时作为交互拦截层：演出期间 pointer 全部被它吃掉）
  const mask = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0);
  // BOSS-MVP R3 修复：演出期间禁用主界面交互
  //   原因：buildViews 已先于演出执行，dice/action 按钮物理上已 interactive；视觉被黑幕盖住但 pointer 事件
  //   仍会穿透到下层。mask.setInteractive() 让 mask 成为 pointer 吸收层，阻止事件打到下层 UI。
  //   mask 随 container.destroy() 自动清理 interactive 注册，无需显式 off。
  mask.setInteractive();
  container.add(mask);

  // 章节副标题（小字，浅色）
  const subtitle = scene.add.text(centerX, centerY - 60, chapterLabel(cfg.chapter), {
    fontFamily: 'FusionPixel, monospace',
    fontSize: '20px',
    color: '#fca5a5',
  }).setOrigin(0.5, 0.5).setAlpha(0);
  container.add(subtitle);

  // Boss 名称大字
  const nameText = scene.add.text(centerX, centerY + 10, cfg.name, {
    fontFamily: 'FusionPixel, monospace',
    fontSize: '56px',
    color: '#fecaca',
    stroke: '#7f1d1d',
    strokeThickness: 6,
  }).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.8);
  container.add(nameText);

  // 时间线
  // Step 1 (0~300ms)：黑幕淡入到 0.85
  scene.tweens.add({
    targets: mask,
    alpha: 0.85,
    duration: 300,
    ease: 'Sine.easeOut',
  });

  // Step 2 (300~700ms)：副标题淡入
  scene.tweens.add({
    targets: subtitle,
    alpha: 1,
    duration: 400,
    delay: 300,
    ease: 'Sine.easeOut',
  });

  // Step 3 (500~1100ms)：Boss 名称淡入 + 放大
  scene.tweens.add({
    targets: nameText,
    alpha: 1,
    scale: 1.0,
    duration: 600,
    delay: 500,
    ease: 'Back.easeOut',
  });

  // Step 4 (1500~1700ms)：Boss 名称轻微横向震动（压迫感）
  scene.tweens.add({
    targets: nameText,
    x: { from: centerX - 6, to: centerX + 6 },
    duration: 60,
    repeat: 2,
    yoyo: true,
    delay: 1500,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      nameText.setX(centerX);  // 震完归位，避免零点漂移
    },
  });

  // Step 5 (1900~2400ms)：整体淡出 + 销毁 + 回调
  scene.tweens.add({
    targets: container,
    alpha: 0,
    duration: 500,
    delay: 1900,
    ease: 'Sine.easeIn',
    onComplete: () => {
      // BOSS-MVP Verify R-1 修复：Scene 已 shutdown/destroy 时不跑 onComplete。
      //   Phaser 3 在 Scene.shutdown 时会自动 killAll tweens，此处守卫双保险：
      //   就算 Phaser 未来版本变更或 tween 抢跑完成，onComplete() 里的 startBattleFlow
      //   也不会作用在已释放 Scene 上（start/drawHand 内部对 null view 会现炸）。
      if (!scene.scene || !scene.scene.isActive()) return;
      if (container.active) {
        container.destroy();
      }
      onComplete();
    },
  });
}
