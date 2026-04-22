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
import type { BattleType } from './BattleMvpData';

/**
 * BattleType → BGM key 映射。
 *
 * MVP 映射（BOSS-MVP 单交付）：
 *   - normal / elite → bgm_normal（战斗常驻曲）
 *   - boss → bgm_boss（章节 BOSS 专属紧张曲）
 *
 * 未来 BGM-SWITCH 任务扩展：
 *   - elite 单独走 bgm_outside（地图外的紧张曲），与 normal 区分
 *   - 按章节切换不同 normal/boss 曲库
 *
 * ⚠️ 维护铁律（BOSS-MVP Verify R-9 沉淀）：
 *   startBattleBgm 使用 Object.values(BGM_KEY_MAP) 遍历清理全部 BGM 残留，
 *   所以 **本 Map 里只允许放"循环播放的 BGM key"**。
 *   禁止放按钮音效 / SFX key（如 'sfx_click'），否则会被 removeByKey 误伤。
 *   SFX 播放路径走 sfxSynth.ts，与本映射完全解耦。
 */
const BGM_KEY_MAP: Record<BattleType, string> = {
  normal: 'bgm_normal',
  elite: 'bgm_normal',
  boss: 'bgm_boss',
};

function selectBgmKey(battleType: BattleType): string {
  return BGM_KEY_MAP[battleType] ?? 'bgm_normal';
}

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
export function startBattleBgm(
  scene: Phaser.Scene,
  prev?: BattleBgmHandle,
  battleType: BattleType = 'normal',
): BattleBgmHandle {
  const key = selectBgmKey(battleType);
  // 步骤 1：清 prev handle（幂等）
  if (prev?.sound) {
    prev.sound.stop();
    prev.sound.destroy();
    prev.sound = null;
  }
  // 步骤 2：清理所有已知 BGM key 的全局残留。
  //   BOSS-MVP 修正（取代单 key 清理）：因为玩家可能在 normal ↔ boss 之间来回切换，
  //   如果只清当前要播的 key，另一类 BGM 的残留 Sound 实例会泄漏（Phaser 不会自动 gc 同名之外的）。
  //   例：boss 战打完回 map，map 节点又进 normal 战 → 新 key=bgm_normal 被清，但 bgm_boss 残留未清。
  //   虽然 stopBgm 会在 SHUTDOWN 时销毁当次 handle，但过去的残留不受 handle 约束。
  //   所以这里按 BGM_KEY_MAP 列出的所有 key 全部精确清一遍。
  for (const bgmKey of new Set(Object.values(BGM_KEY_MAP))) {
    if (scene.sound.get(bgmKey)) {
      scene.sound.removeByKey(bgmKey);
    }
  }
  // 步骤 3：cache 校验
  if (!scene.cache.audio.exists(key)) {
    console.warn(`[BattleBgm] ${key} 未加载，跳过 BGM 启动`);
    return createEmptyBgmHandle();
  }
  const sound = scene.sound.add(key, { loop: true, volume: 0.3 });
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
