/**
 * enemySpriteKey.ts — 敌人像素纹理 key 命名约定（单一真相源）
 *
 * 职责（SRP）：把 Designer 侧的中文敌人 name（如"食尸鬼"）映射到 Phaser 纹理 key（"enemy__食尸鬼"）。
 *
 * 为什么要工具化？
 *   - 防止 EnemyView / EnemyAssetLoader / 未来的 EnemyAI 散写 `'enemy_' + name` 字符串拼接
 *   - 中文 name 作为 key 在 Phaser TextureManager 里是合法的（实测），但建议加前缀防撞 key
 *   - 将来如要改前缀（例如加入章节前缀 chapter1/enemy__）只需改此文件
 *
 * [RULES-A3 命名即文档] 函数名 enemyTextureKey 直接描述用途，不用缩写。
 */

const PREFIX = 'enemy__';

/** 按敌人 name 计算纹理 key。保持确定性、无状态、纯函数。 */
export function enemyTextureKey(name: string): string {
  return `${PREFIX}${name}`;
}

/** 判断一个已注册的纹理 key 是否属于敌人域（用于批量释放时过滤）。 */
export function isEnemyTextureKey(key: string): boolean {
  return key.startsWith(PREFIX);
}
