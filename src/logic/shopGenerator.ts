/**
 * shopGenerator.ts — 商店商品生成纯函数
 * 从 DiceHeroGame.tsx 提取，ARCH-6
 *
 * 消除了 startNode 和 nextNode 中重复的商店商品生成逻辑。
 */

import type { ShopItem } from '../types/game';
import { pickRandomRelics, RELICS_BY_RARITY } from '../data/relics';
import { DICE_BY_RARITY } from '../data/dice';
import { SHOP_CONFIG } from '../config/gameBalance';

/**
 * 生成商店商品列表
 * - 从遗物池随机3个 + 骰子池随机2个 + 1个重掷强化 → 候选池
 * - 从候选池随机抽3个
 * - 始终添加"骰子净化"选项
 *
 * @param ownedRelicIds 已拥有的遗物ID列表（用于排除）
 * @returns 商店商品数组
 */
export function generateShopItems(ownedRelicIds: string[]): ShopItem[] {
  const [minPrice, maxPrice] = SHOP_CONFIG.priceRange;
  const randPrice = () => Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;

  // 构建候选商品池
  const candidateItems: ShopItem[] = [];

  // 候选：遗物
  const shuffledRelics = pickRandomRelics(
    [...RELICS_BY_RARITY.common, ...RELICS_BY_RARITY.uncommon, ...RELICS_BY_RARITY.rare],
    3,
    ownedRelicIds,
  );
  for (const shopRelic of shuffledRelics) {
    candidateItems.push({
      id: 'relic_' + shopRelic.id,
      type: 'relic' as const,
      relicData: { ...shopRelic },
      label: shopRelic.name,
      desc: shopRelic.description,
      price: randPrice(),
    });
  }

  // 候选：骰子
  const shuffledDice = [...DICE_BY_RARITY.uncommon, ...DICE_BY_RARITY.rare].sort(() => Math.random() - 0.5);
  for (const d of shuffledDice.slice(0, 2)) {
    candidateItems.push({
      id: 'dice_' + d.id,
      type: 'specialDice' as const,
      diceDefId: d.id,
      label: d.name,
      desc: d.description + ' [' + d.faces.join(',') + ']',
      price: d.rarity === 'rare' ? randPrice() + 30 : randPrice() + 10,
    });
  }

  // 候选：重掷强化
  candidateItems.push({
    id: 'reroll_legacy',
    type: 'reroll' as const,
    label: '重掷强化',
    desc: '永久增加每回合 +1 次免费重掷',
    price: randPrice(),
  });

  // 从候选池随机抽3个
  const shopItems: ShopItem[] = candidateItems.sort(() => Math.random() - 0.5).slice(0, 3);

  // 始终添加删除骰子选项
  const removeDicePrice = Math.floor(Math.random() * (maxPrice - minPrice + 1)) + minPrice;
  shopItems.push({
    id: 'removeDice_fixed',
    type: 'removeDice' as const,
    label: '骰子净化',
    desc: '移除一颗骰子，瘦身构筑',
    price: removeDicePrice,
  });

  return shopItems;
}
