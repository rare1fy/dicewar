/**
 * BattleBgm.ts — 战斗 BGM 生命周期管理
 *
 * 职责（SRP）：封装 Phaser.sound 的预加载、启动、停止、清理逻辑。
 *   对 BattleScene 暴露一组无状态函数（或最小上下文结构体），避免 Scene 直接操作 sound API。
 *
 * 拆分来源：BattleScene.ts（α-go 多职业前置 B1 拆分）。
 *
 * 防叠播（BGM v2 Verify 沉淀）：
 *   - 启动前显式 stop + destroy 本 handle
 *   - removeByKey 精确清理同名残留（不误杀其他音频）
 *
 * 使用方式：
 *   // 在 Scene.preload 内：
 *   preloadBattleBgm(this);
 *   // 在 Scene.create 内：
 *   const handle = startBattleBgm(this);
 *   // 在 Scene.shutdown 内：
 *   stopBattleBgm(handle, this);
 */

import Phaser from 'phaser';

/**
 * BGM 句柄：由 startBattleBgm 返回，stopBattleBgm 接收以做幂等清理。
 * 用 object 包裹而非裸 Sound 实例，方便未来扩展（当前只有 sound 一个字段，但约束稳定 API）。
 */
export interface BattleBgmHandle {
  sound: Phaser.Sound.BaseSound | null;
}

/** 空句柄：给 Scene 初始化用。 */
export function createEmptyBgmHandle(): BattleBgmHandle {
  return { sound: null };
}

/**
 * 预加载 4 首 BGM（Start / Normal / Outside / Boss）。
 * Normal 在当前 MVP 战斗场景中激活循环；其余登记但不启动，留给后续 BGM-SWITCH 任务。
 * 防重入：cache 已有同 key 时跳过（scene.restart 会重跑 preload）。
 */
export function preloadBattleBgm(scene: Phaser.Scene): void {
  const pairs: [string, string][] = [
    ['bgm_start', 'audio/DiceBattle-Start.mp3'],
    ['bgm_normal', 'audio/DiceBattle-Normal.mp3'],
    ['bgm_outside', 'audio/DiceBattle-Outside.mp3'],
    ['bgm_boss', 'audio/DiceBattle-Boss.mp3'],
  ];
  for (const [key, path] of pairs) {
    if (!scene.cache.audio.exists(key)) {
      scene.load.audio(key, path);
    }
  }
}

/**
 * 启动战斗 BGM（默认循环 Normal 曲）。
 *
 * 设计决策：
 *   - MVP 统一用 Normal，Boss 战切换登记为 PHASER-ASSET-BGM-SWITCH 后续任务。
 *   - 音量 0.3 对齐原版 soundPlayer 的默认 BGM 音量（太响会盖音效）。
 *   - Phaser 在 autoplay policy 未解锁时会静默失败 —— 不抛异常，等用户首次交互后自动触发。
 *
 * 防叠播（BGM v2 Verify REJECT 修复延续）：
 *   1. 先清 prev handle（通常 shutdown 已清，这里二次保险）
 *   2. removeByKey 精确清同 key 全局残留（不触碰其他音频对象，避免 removeAll 误伤 Web Audio sfx）
 *   3. cache 没有就 warn + 返回 null handle，不阻断战斗
 */
export function startBattleBgm(scene: Phaser.Scene, prev?: BattleBgmHandle): BattleBgmHandle {
  // 步骤 1：清 prev handle（幂等）
  if (prev?.sound) {
    prev.sound.stop();
    prev.sound.destroy();
    prev.sound = null;
  }
  // 步骤 2：按 key 精确清理同名全局残留
  if (scene.sound.get('bgm_normal')) {
    scene.sound.removeByKey('bgm_normal');
  }
  // 步骤 3：cache 校验
  if (!scene.cache.audio.exists('bgm_normal')) {
    console.warn('[BattleBgm] bgm_normal 未加载，跳过 BGM 启动');
    return createEmptyBgmHandle();
  }
  const sound = scene.sound.add('bgm_normal', { loop: true, volume: 0.3 });
  sound.play();
  return { sound };
}

/**
 * 停止并销毁 BGM。幂等：多次调用安全（null 守卫）。
 * 调用后 handle.sound 会被置 null，外部应该接收返回值或接受句柄被就地修改。
 */
export function stopBattleBgm(handle: BattleBgmHandle): void {
  if (!handle.sound) return;
  handle.sound.stop();
  handle.sound.destroy();
  handle.sound = null;
}
