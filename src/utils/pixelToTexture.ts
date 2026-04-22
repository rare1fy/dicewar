/**
 * pixelToTexture.ts — 像素矩阵 → Phaser 纹理转换器（PHASER-PIXEL-ENGINE）
 *
 * 职责（SRP）：把 `string[][]` 颜色矩阵（空串='' 表示透明）渲染成 Phaser.Textures.CanvasTexture，
 *   供 EnemyView / 遗物图标等场景层通过 `scene.add.image(x, y, key)` 零成本引用。
 *
 * 为什么不用 scene.textures.generate？
 *   - `textures.generate` 需要一个预制色板 + 字符索引方案，原版像素数据是**直接颜色十六进制**（'#4a6a3a'），
 *     用 generate 反而要做字符↔颜色的反向映射，麻烦且易出错。
 *   - CanvasTexture 手动绘制 fillRect 每个像素块，直白高效，一次 bake 后后续都是 GPU 纹理引用。
 *
 * 性能保证：
 *   - 每个 sprite 在首次调用时 bake 一次，缓存 key → 重复调用直接命中 Phaser 纹理缓存。
 *   - 运行时零 DOM 节点（vs 原版 CSS box-shadow 方案），彻底去除 box-shadow 布局抖动。
 *
 * 使用示例：
 *   import { bakePixelTexture } from '../utils/pixelToTexture';
 *   bakePixelTexture(scene, 'enemy_goblin', enemyGoblinSprite.pixels, { scale: 4 });
 *   scene.add.image(x, y, 'enemy_goblin');
 *
 * [RULES-A/B 合规] 行数预算 ≤ 200 行，纯函数，无副作用（只写 scene.textures 缓存）。
 */

import Phaser from 'phaser';

// ============================================================================
// 类型定义
// ============================================================================

/** 像素矩阵：outer = rows，inner = cols，空串 '' 代表透明像素。 */
export type PixelMatrix = readonly (readonly string[])[] | string[][];

export interface BakeOptions {
  /** 每个逻辑像素在纹理中的实际边长（px），默认 4。等价于原版 PixelArt.tsx 的 pixelSize。 */
  scale?: number;
  /** 可选背景色（'#rrggbb' 或 rgba(...)），留空则透明底。 */
  background?: string;
  /** 命中已有缓存时是否强制重烤（调试用）。默认 false。 */
  force?: boolean;
}

// ============================================================================
// 核心 API
// ============================================================================

/**
 * 把像素矩阵 bake 成 Phaser 纹理。
 * @returns 纹理实际像素宽高（含 scale）；若 key 已存在且未 force 则直接返回缓存尺寸。
 *
 * 分支优先级（Verify v1 修复）：
 *   1. force=true 时，先删旧 key → 保证所有后续路径（含空矩阵 fallback）都能如实重建
 *   2. 再判空矩阵 → 1x1 透明兜底
 *   3. 再判缓存命中 → 直接返回
 *   4. 最后走真实绘制
 */
export function bakePixelTexture(
  scene: Phaser.Scene,
  key: string,
  matrix: PixelMatrix,
  options: BakeOptions = {},
): { width: number; height: number } {
  const scale = options.scale ?? 4;

  // 步骤 1：force 重烤优先删旧 key，必须在任何 early return 之前
  // 否则空矩阵 + force=true 时会出现"返回值说 1x1 但缓存还是旧大图"的契约分裂
  if (options.force && scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  // 步骤 2：空矩阵 → 1x1 透明兜底（force 已在步骤 1 处理过，此处直接按尺寸建兜底纹理）
  if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
    if (!scene.textures.exists(key)) {
      const empty = scene.textures.createCanvas(key, 1, 1);
      if (empty) empty.refresh();
    }
    return { width: 1, height: 1 };
  }

  const rows = matrix.length;
  const cols = matrix[0].length;
  const width = cols * scale;
  const height = rows * scale;

  // 步骤 3：缓存命中（此处 force=true 已在步骤 1 remove 过，走不到这条）
  if (scene.textures.exists(key)) {
    return { width, height };
  }

  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) {
    // TextureManager.createCanvas 返回 null 的常见原因：key 已被占用 / 纹理创建失败
    // 兜底登记，让调用方拿到尺寸但不崩溃
    console.warn(`[pixelToTexture] createCanvas 失败：${key}（key 已存在或纹理创建异常）`);
    return { width, height };
  }

  const ctx = canvas.getContext();

  // 可选底色
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }

  // 逐像素绘制
  for (let y = 0; y < rows; y++) {
    const row = matrix[y];
    // 容错：若某行列数与首行不一致，按本行实际长度走（不越界）
    const rowLen = Math.min(row.length, cols);
    for (let x = 0; x < rowLen; x++) {
      const color = row[x];
      if (!color) continue; // 空串 = 透明，跳过
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  canvas.refresh();
  return { width, height };
}

/**
 * 批量 bake：用于开场一次性烘焙整批 sprite（如进入关卡时把本章所有敌人 sprite 预烤）。
 * key 冲突时跳过（保留先到先得），避免覆盖同名纹理。
 */
export function bakePixelBatch(
  scene: Phaser.Scene,
  entries: Array<{ key: string; matrix: PixelMatrix; options?: BakeOptions }>,
): void {
  for (const entry of entries) {
    if (scene.textures.exists(entry.key) && !entry.options?.force) continue;
    bakePixelTexture(scene, entry.key, entry.matrix, entry.options);
  }
}

/**
 * 辅助：从 `SE = { pixels, width, height }` 原版数据结构直接 bake。
 * 屏蔽 enemySprites.ts 那种 S(w,h,pixels) 工厂包装格式的差异。
 * 签名使用 PixelMatrix（含 readonly），与主 API 对齐，兼容 `as const` 声明的常量。
 */
export function bakeFromSpriteEntry(
  scene: Phaser.Scene,
  key: string,
  entry: { pixels: PixelMatrix },
  options: BakeOptions = {},
): { width: number; height: number } {
  return bakePixelTexture(scene, key, entry.pixels, options);
}
