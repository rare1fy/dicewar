/**
 * sfxSynth.ts — Web Audio 波形合成器（PHASER-ASSET-SOUND）
 *
 * 职责（SRP）：提供最小的 oscillator + envelope + gain 合成能力，无外部音源依赖。
 *
 * 为什么不用 Phaser.sound？
 *   - Phaser.sound 只能播放已加载的音频文件（MP3/OGG/WAV）
 *   - 原版 dicehero2 音效全靠 Web Audio 实时合成（免资源、体积 0、改参即改风味）
 *   - 两套音频系统并存不冲突：BGM 走 Phaser.sound，SFX 走原生 Web Audio
 *
 * 浏览器策略：
 *   - AudioContext 在用户手势前是 suspended 状态（Chrome/Safari）
 *   - 每次播放前检查 state，suspended 就 resume
 *   - 实例惰性创建（首次播放时 new AudioContext），避免 SSR / build-time 调用炸
 */

/** 延迟初始化的 AudioContext（惰性单例） */
let audioCtx: AudioContext | null = null;

/** 获取 AudioContext，首次调用时创建。SSR 环境下 window 不存在则返回 null。 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** 确保 ctx 已 resume（用户手势后必调用）。幂等。 */
function ensureResumed(ctx: AudioContext): void {
  if (ctx.state === 'suspended') {
    // 异步 resume，不阻塞播放调用（resume 成功前几毫秒的音会被丢，这是 Web Audio 规范，可接受）
    ctx.resume().catch(() => { /* 用户未交互则失败，忽略 */ });
  }
}

export interface BeepOptions {
  /** 起始频率 Hz（默认 440 = A4） */
  frequency?: number;
  /** 结束频率 Hz（用于频率滑动；不填则等于 frequency） */
  endFrequency?: number;
  /** 波形类型 */
  type?: OscillatorType;
  /** 持续时间 秒（默认 0.1） */
  duration?: number;
  /** 音量 0-1（默认 0.2） */
  volume?: number;
  /** attack 时间 秒（默认 0.005 = 5ms，避免爆音） */
  attack?: number;
  /** release 时间 秒（默认 0.05） */
  release?: number;
}

/**
 * 播放一个 beep。所有参数可选，最小调用：`beep()` 即可出声。
 * 使用 ADSR 中的 AR 两段（A=attack, R=release），中间保持峰值。
 */
export function beep(opts: BeepOptions = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);

  const {
    frequency = 440,
    endFrequency,
    type = 'sine',
    duration = 0.1,
    volume = 0.2,
    attack = 0.005,
    release = 0.05,
  } = opts;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency !== undefined && endFrequency !== frequency) {
    osc.frequency.linearRampToValueAtTime(endFrequency, now + duration);
  }

  // AR 包络：0 → volume（attack）→ 保持 → 0（release）
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.setValueAtTime(volume, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * 播放一组 beep 序列（用于和弦 / 琶音 / 复合音效）。
 * @param notes 每个元素是一个 beep 配置 + 相对起始时间（秒，从 0 开始）
 */
export function beepSequence(notes: Array<BeepOptions & { at: number }>): void {
  for (const note of notes) {
    setTimeout(() => beep(note), note.at * 1000);
  }
}
