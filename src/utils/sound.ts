/**
 * sound.ts — 音效桩（Phaser 迁移期临时占位）
 *
 * dicehero2 原版是基于 Web Audio + HTMLAudio 的自研音效引擎。
 * Phaser 有自己的 this.sound.add/play 体系，与原版不兼容。
 *
 * 当前状态：【桩】
 * - 所有调用点保留（logic/ 业务代码里调 playSound('hit') 等）
 * - 空实现，不产生任何副作用
 *
 * 下一步：PHASER-SOUND-01 → 在 Phaser Scene 场景里按 this.sound 规范重写。
 *         届时把本文件替换成：scene 注入 + 字符串 key 查表发 play 即可。
 */

/** 所有可用的音效类型（保留类型定义，供调用方 TS 检查） */
export type SoundType =
  | 'hit' | 'heal' | 'buff' | 'death' | 'error' | 'victory'
  | 'roll' | 'reroll' | 'select' | 'unselect' | 'play'
  | 'coin' | 'relic' | 'levelUp' | 'bossHit' | 'critical';

/** 播放音效 - 桩实现（无副作用） */
export function playSound(_type: string): void {
  // no-op（等 PHASER-SOUND-01）
}

/** 结算逐字节音效 - 桩 */
export function playSettlementTick(): void {
  // no-op
}

/** 倍率递增音效 - 桩 */
export function playMultiplierTick(): void {
  // no-op
}

/** 重击音效 - 桩 */
export function playHeavyImpact(): void {
  // no-op
}

// BGM 与音量控制 - 桩
export function playBGM(_type: string): void { /* no-op */ }
export function startBGM(_type: string): void { /* no-op */ }
export function stopBGM(): void { /* no-op */ }
export function stopBGMImmediate(): void { /* no-op */ }
export function getCurrentBGMType(): string | null { return null; }
export function getMasterVolume(): number { return 1; }
export function isSfxEnabled(): boolean { return true; }
export function isBgmEnabled(): boolean { return true; }
export function setMasterVolume(_v: number): void { /* no-op */ }
export function setSfxEnabled(_b: boolean): void { /* no-op */ }
export function setBgmEnabled(_b: boolean): void { /* no-op */ }
