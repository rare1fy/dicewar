/**
 * EnemyAssetLoader.ts — 敌人像素资产加载与释放（PHASER-ASSET-APPLY）
 *
 * 职责（SRP）：
 *   1. 批量把 ENEMY_SPRITES 里的像素矩阵 bake 成 Phaser 纹理
 *   2. 提供释放能力（对应 PIXEL-ENGINE v2 Verify WARN-2 的"像素纹理释放策略"要求）
 *   3. 对 scene.shutdown 友好（调用方在 BattleScene SHUTDOWN 事件里调 release）
 *
 * 为什么独立成模块而不是塞进 BattleScene？
 *   - BattleScene 已 480 行接近 600 红线，新增批量烘焙逻辑会顶线
 *   - 未来章节切换、Boss 场切换都会用到同一套 bake/release，抽出来才能复用
 *   - 单一职责：BattleScene 调度场景，本模块管纹理生命周期
 *
 * MVP 策略（本轮）：
 *   - bakeAll(): 开场烘焙全部 42 个 ENEMY_SPRITES（数据量小，一次烤完简单可控）
 *   - releaseAll(): 按 enemy__ 前缀清理本域纹理
 *   - 未来扩展：bakeForChapter(chapter) 按章节懒加载
 */

import Phaser from 'phaser';
import { ENEMY_SPRITES } from '../../data/pixel/enemySprites';
import { bakePixelTexture } from '../../utils/pixelToTexture';
import { enemyTextureKey, isEnemyTextureKey } from '../../utils/enemySpriteKey';

/** 默认像素缩放比例（4 = 原版 PixelArt.tsx 的 pixelSize）。 */
const DEFAULT_SCALE = 4;

/**
 * 批量烘焙所有 ENEMY_SPRITES 到 Phaser 纹理缓存。
 * 已存在的 key 自动跳过（pixelToTexture 内置缓存命中）。
 *
 * @returns 本次实际烘焙的纹理数量（命中缓存的不计）
 */
export function bakeAllEnemySprites(scene: Phaser.Scene, scale: number = DEFAULT_SCALE): number {
  let baked = 0;
  for (const name of Object.keys(ENEMY_SPRITES)) {
    const key = enemyTextureKey(name);
    if (scene.textures.exists(key)) continue;
    const sprite = ENEMY_SPRITES[name];
    bakePixelTexture(scene, key, sprite.pixels, { scale });
    baked++;
  }
  return baked;
}

/**
 * 释放所有敌人纹理。由 BattleScene SHUTDOWN 事件调用，避免章节切换时内存累积。
 * Phaser 的 textures.remove 是安全的（不存在 key 不会抛错）。
 *
 * @returns 实际释放的纹理数量
 */
export function releaseAllEnemyTextures(scene: Phaser.Scene): number {
  let released = 0;
  const keys = scene.textures.getTextureKeys();
  for (const key of keys) {
    if (!isEnemyTextureKey(key)) continue;
    scene.textures.remove(key);
    released++;
  }
  return released;
}
