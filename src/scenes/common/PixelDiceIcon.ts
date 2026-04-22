/**
 * scenes/common/PixelDiceIcon.ts — 像素风 7x7 调色板骰子图标
 *
 * 职责（SRP）：
 *   - 为职业选择、Loot、小卡片等场景提供统一的"调色板骰子"像素图标
 *   - 使用 pixelToTexture 烘焙到 Phaser.Texture，按 key 缓存
 *
 * 图案来源：原版 ClassSelectScreen.tsx 的 WarriorDiceIcon / MageDiceIcon / RogueDiceIcon
 *   7x7 网格：4 角深色 + 4 边色 + 中央对角线 4 点色 + 填充色 + 边框色
 *
 * 用法：
 *   PixelDiceIcon.bake(scene, 'warrior');      // 先烘焙
 *   scene.add.image(x, y, 'pixel-dice-warrior').setScale(8); // 再渲染
 */

import Phaser from 'phaser';
import { bakePixelTexture } from '../../utils/pixelToTexture';

export type PixelDiceKind = 'warrior' | 'mage' | 'rogue';

interface Palette {
  /** Border（角块）*/ B: string;
  /** Highlight（上/左边）*/ H: string;
  /** Fill（中心）*/ F: string;
  /** Dark（右/下边）*/ D: string;
  /** Dot（对角线点数）*/ DOT: string;
}

const PALETTES: Record<PixelDiceKind, Palette> = {
  // 战士：白骨骷髅骰子
  warrior: { B: '#4a2020', H: '#d0c0b0', F: '#b0a090', D: '#806050', DOT: '#c04040' },
  // 法师：紫色星界骰子
  mage: { B: '#2a1050', H: '#8050c0', F: '#6040a0', D: '#402080', DOT: '#d0a0ff' },
  // 盗贼：绿色淬毒骰子
  rogue: { B: '#103020', H: '#30a050', F: '#208040', D: '#106030', DOT: '#80ff80' },
};

/** 构造 7x7 像素矩阵（对角线 4 点 + 1 中心点共 5 点） */
function buildMatrix(p: Palette): string[][] {
  const { B, H, F, D, DOT } = p;
  return [
    [B, H, H, H, H, H, B],
    [H, F, F, F, F, F, D],
    [H, F, DOT, F, F, F, D],
    [H, F, F, DOT, F, F, D],
    [H, F, F, F, DOT, F, D],
    [H, F, F, F, F, F, D],
    [B, D, D, D, D, D, B],
  ];
}

/** 返回纹理 key（不烘焙） */
export function pixelDiceKey(kind: PixelDiceKind): string {
  return `pixel-dice-${kind}`;
}

/** 烘焙单个职业骰子图标到 Phaser.Texture（幂等：重复调用会复用缓存） */
export function bakePixelDice(scene: Phaser.Scene, kind: PixelDiceKind): string {
  const key = pixelDiceKey(kind);
  const matrix = buildMatrix(PALETTES[kind]);
  bakePixelTexture(scene, key, matrix, { scale: 8 });
  return key;
}

/** 批量烘焙全部三职业骰子（ClassSelect 场景一次性调用） */
export function bakeAllPixelDice(scene: Phaser.Scene): void {
  (Object.keys(PALETTES) as PixelDiceKind[]).forEach((k) => bakePixelDice(scene, k));
}
