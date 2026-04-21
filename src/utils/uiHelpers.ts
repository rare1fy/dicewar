/**
 * uiHelpers.ts — 元素文本/颜色映射常量
 *
 * 从 dicehero2/src/utils/uiHelpers.tsx 精选迁移。
 * 原版 tsx 里 95% 是 React+Tailwind 的 CSS class 工具函数（getDiceElementClass / getHpBarClass 等），
 * 对 Phaser 场景零价值，全部砍掉。
 * 仅保留逻辑层引用的元素名称表 + 元素颜色表（十六进制字符串，可直接喂给 Phaser）。
 */

import type { DiceElement } from '../types/game';

/** 元素中文名称（日志与 UI 显示） */
export const ELEMENT_NAMES: Record<DiceElement, string> = {
  normal: '普通',
  fire: '火',
  ice: '冰',
  thunder: '雷',
  poison: '毒',
  holy: '圣',
  shadow: '影',
};

/** 元素对应的十六进制颜色（可直接供 Phaser `setTint` / text fillStyle 使用） */
export const ELEMENT_COLORS: Record<DiceElement, string> = {
  normal: '#8899aa',
  fire: '#e07830',
  ice: '#30a8d0',
  thunder: '#8060c0',
  poison: '#70c030',
  holy: '#d4a030',
  shadow: '#6a4a8a',
};
