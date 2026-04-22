/**
 * sound.ts — 游戏音效入口（PHASER-ASSET-SOUND）
 *
 * 职责（SRP）：把 logic/ 层散落的 `playSound('hit')` 等语义调用，路由到 sfxSynth 的具体波形配方。
 *
 * 架构分工：
 *   - sfxSynth.ts  → 底层波形合成（beep + envelope）
 *   - sound.ts     → 业务语义层（每种 SoundType 映射到一组 beep 配方）
 *   - BattleScene  → BGM 生命周期管理（走 Phaser.sound，不经本文件）
 *
 * BGM 接口保留为桩：
 *   BGM 已在 BattleScene.startBgm / stopBgm 里直接走 Phaser.sound 管理，
 *   本文件的 playBGM/startBGM/stopBGM 桩仅为了不破坏 logic/ 层旧调用点（如有）。
 *   未来若要把 BGM 调度也收到本文件，再拆 bgm.ts 独立模块，当前 MVP 不动。
 */

import { beep, beepSequence } from './sfxSynth';

/** 所有可用的音效类型 */
export type SoundType =
  | 'hit' | 'heal' | 'buff' | 'death' | 'error' | 'victory'
  | 'roll' | 'reroll' | 'select' | 'unselect' | 'play'
  | 'coin' | 'relic' | 'levelUp' | 'bossHit' | 'critical';

/** 开关状态（持久到 localStorage 是下一步的事，本 MVP 先走内存） */
let sfxEnabled = true;
let bgmEnabled = true;
let masterVolume = 1;

/**
 * 每种 SoundType 的波形配方。MVP 只精心调 5 个核心战斗音，其余先用通用配方兜底。
 * 数值来自手调（sine 明亮、square 硬、triangle 温暖、sawtooth 刺耳）。
 */
const RECIPES: Record<SoundType, () => void> = {
  // 核心 5 个（MVP 覆盖战斗闭环关键节点）
  roll: () => beep({ frequency: 800, endFrequency: 1200, type: 'square', duration: 0.08, volume: 0.15 }),
  play: () => beepSequence([
    { at: 0, frequency: 440, type: 'triangle', duration: 0.06, volume: 0.2 },
    { at: 0.06, frequency: 660, type: 'triangle', duration: 0.08, volume: 0.2 },
  ]),
  hit: () => beep({ frequency: 180, endFrequency: 80, type: 'square', duration: 0.12, volume: 0.25 }),
  victory: () => beepSequence([
    { at: 0, frequency: 523, type: 'triangle', duration: 0.12, volume: 0.25 },  // C5
    { at: 0.12, frequency: 659, type: 'triangle', duration: 0.12, volume: 0.25 }, // E5
    { at: 0.24, frequency: 784, type: 'triangle', duration: 0.2, volume: 0.25 },  // G5
  ]),
  death: () => beep({ frequency: 200, endFrequency: 50, type: 'sawtooth', duration: 0.4, volume: 0.25 }),

  // 兜底 11 个（共用通用配方，未来按需细调）
  heal: () => beep({ frequency: 660, endFrequency: 880, type: 'sine', duration: 0.15, volume: 0.2 }),
  buff: () => beep({ frequency: 440, endFrequency: 880, type: 'triangle', duration: 0.12, volume: 0.2 }),
  error: () => beep({ frequency: 200, type: 'sawtooth', duration: 0.1, volume: 0.2 }),
  reroll: () => beep({ frequency: 600, endFrequency: 900, type: 'square', duration: 0.06, volume: 0.15 }),
  select: () => beep({ frequency: 880, type: 'sine', duration: 0.04, volume: 0.1 }),
  unselect: () => beep({ frequency: 440, type: 'sine', duration: 0.04, volume: 0.1 }),
  coin: () => beepSequence([
    { at: 0, frequency: 988, type: 'triangle', duration: 0.05, volume: 0.15 },   // B5
    { at: 0.05, frequency: 1319, type: 'triangle', duration: 0.08, volume: 0.15 }, // E6
  ]),
  relic: () => beepSequence([
    { at: 0, frequency: 523, type: 'sine', duration: 0.08, volume: 0.2 },
    { at: 0.08, frequency: 784, type: 'sine', duration: 0.12, volume: 0.2 },
  ]),
  levelUp: () => beepSequence([
    { at: 0, frequency: 523, type: 'triangle', duration: 0.08, volume: 0.25 },
    { at: 0.08, frequency: 659, type: 'triangle', duration: 0.08, volume: 0.25 },
    { at: 0.16, frequency: 1047, type: 'triangle', duration: 0.15, volume: 0.25 }, // C6
  ]),
  bossHit: () => beep({ frequency: 120, endFrequency: 60, type: 'square', duration: 0.2, volume: 0.3 }),
  critical: () => beepSequence([
    { at: 0, frequency: 150, type: 'square', duration: 0.05, volume: 0.3 },
    { at: 0.03, frequency: 300, type: 'square', duration: 0.08, volume: 0.25 },
  ]),
};

/** 播放音效。sfxEnabled=false 或未知 type 时静默返回，不抛错。 */
export function playSound(type: string): void {
  if (!sfxEnabled || masterVolume === 0) return;
  const recipe = RECIPES[type as SoundType];
  if (!recipe) return; // 未知 type 静默（防御 logic 层传值漂移）
  recipe();
}

/** 结算逐字节音效（UI-01-δ 未使用，留桩） */
export function playSettlementTick(): void {
  if (!sfxEnabled) return;
  beep({ frequency: 1200, type: 'square', duration: 0.02, volume: 0.08 });
}

/** 倍率递增音效 */
export function playMultiplierTick(): void {
  if (!sfxEnabled) return;
  beep({ frequency: 1500, type: 'triangle', duration: 0.04, volume: 0.1 });
}

/** 重击音效（触发玩家震屏时配套使用） */
export function playHeavyImpact(): void {
  if (!sfxEnabled) return;
  beep({ frequency: 80, endFrequency: 40, type: 'sawtooth', duration: 0.15, volume: 0.3 });
}

// ──────────────────────────────────────────────────────────────────────────
// BGM 说明：
//   BGM 生命周期完全由 BattleScene 管理（this.sound.add('bgm_normal')），
//   本文件不再暴露 BGM 接口。历史版本曾有 playBGM/startBGM/stopBGM 等桩，
//   Verify PHASER-ASSET-SOUND WARN-2 指出"假接口会误导未来接入者"，故删除。
//   未来若需把 BGM 调度逻辑收敛到 utils/，再新建 `utils/bgm.ts` 独立模块。
// ──────────────────────────────────────────────────────────────────────────

// 音量 / 开关控制
export function getMasterVolume(): number { return masterVolume; }
export function setMasterVolume(v: number): void { masterVolume = Math.max(0, Math.min(1, v)); }
export function isSfxEnabled(): boolean { return sfxEnabled; }
export function setSfxEnabled(b: boolean): void { sfxEnabled = b; }
export function isBgmEnabled(): boolean { return bgmEnabled; }
export function setBgmEnabled(b: boolean): void { bgmEnabled = b; }
