/**
 * battleContexts.ts - Phaser 版战斗上下文接口集合
 *
 * 原 React 版用 React.MutableRefObject / React.Dispatch<SetStateAction> 描述回调入参。
 * Phaser 版 UI 层不是 React，没有 useState/useRef 概念，但业务逻辑契约保持不变：
 *   - ref 本质是"可变容器" → `{ current: T }`
 *   - setState 本质是"给定下一状态或更新器的 setter" → `StateSetter<T>`
 *   - ReactNode 图标 → `iconKey?: string`（Phaser 纹理 key）
 *
 * 本文件只定义类型，不含运行时代码。所有字段对应的运行时实现将在 PHASER-UI-01 场景层注入。
 */

import type { Die, GameState, Enemy, HandResult, StatusEffect } from './game';
import type { ExpectedOutcomeResult } from '../logic/expectedOutcomeTypes';
import type { EnemyQuotes } from '../config/enemies';

/**
 * 可变容器 —— 替代 React.MutableRefObject。
 * TODO[PHASER-UI-01]: connect to scene（由场景持有实际引用）
 */
export interface MutableRef<T> {
  current: T;
}

/**
 * State setter —— 替代 React.Dispatch<React.SetStateAction<T>>。
 * 支持直接传新值或传更新函数。
 * TODO[PHASER-UI-01]: connect to scene（由场景实现 setter，内部直接改 gameRef.current 并刷新 UI）
 */
export type StateSetter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * 浮动文字回调 —— 替代原版 addFloatingText。
 * iconKey 是 Phaser 纹理 key（对应 STATUS_INFO[type].iconKey 或其它图集条目）。
 * TODO[PHASER-UI-01]: connect to scene（场景内实现 scene.add.text + scene.add.sprite 复合）
 */
export type AddFloatingText = (
  text: string,
  color: string,
  iconKey?: string,
  target?: string,
  persistent?: boolean,
) => void;

// ============================================================================
// DamageApplicationContext —— 供 logic/damageApplication.ts 使用
// ============================================================================
export interface DamageApplicationContext {
  // Refs
  playsPerEnemyRef: MutableRef<Record<string, number>>;

  // Setters
  setEnemies: StateSetter<Enemy[]>;
  setGame: StateSetter<GameState>;
  setArmorGained: StateSetter<boolean>;
  setHpGained: StateSetter<boolean>;
  setPlayerEffect: StateSetter<string | null>;
  setEnemyQuotedLowHp: StateSetter<Set<string>>;

  // Callbacks
  addFloatingText: AddFloatingText;
}

// ============================================================================
// PostPlayContext —— 供 logic/postPlayEffects.ts 使用
// ============================================================================
export interface PostPlayContext {
  // Refs
  gameRef: MutableRef<GameState>;

  // Setters
  setGame: StateSetter<GameState>;
  setEnemies: StateSetter<Enemy[]>;
  setDice: StateSetter<Die[]>;
  setRerollCount: StateSetter<number>;
  setScreenShake: StateSetter<boolean>;
  setBossEntrance: StateSetter<{ visible: boolean; name: string; chapter: number }>;
  setEnemyEffects: StateSetter<Record<string, string | null>>;
  setDyingEnemies: StateSetter<Set<string>>;
  setEnemyQuotes: StateSetter<Record<string, string>>;
  setEnemyQuotedLowHp: StateSetter<Set<string>>;
  setWaveAnnouncement: StateSetter<number | null>;

  // Callbacks
  addFloatingText: AddFloatingText;
}

// 复用的外部类型再导出，方便迁入文件的 import 简化
export type { ExpectedOutcomeResult, EnemyQuotes, HandResult, StatusEffect };
