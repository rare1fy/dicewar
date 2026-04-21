import { HandTypeDef } from '../types/game';

/**
 * 牌型定义表 - 纯倍率体系
 * 
 * 伤害公式: 骰子点数和 x 牌型倍率 x 增幅倍率
 * base字段保留为0（兼容旧代码），实际不参与计算
 * 
 * 设计原则:
 * - 对子系(对子/连对/三条/四条/五条/六条): 单体爆发，倍率递增
 * - 顺子系(3顺/4顺/5顺/6顺): AOE扫场，倍率从低到高
 * - 三条系: 附加易伤效果
 * - 葫芦系: 纯防御(护甲)
 * - 元素系: 骰子onPlay效果翻倍
 */
export const HAND_TYPES: HandTypeDef[] = [
  { id: 'high_card', name: '普通攻击', icon: 'icon-zap', base: 0, mult: 1.0, description: '任意单颗骰子。伤害 = 点数和' },
  { id: 'pair', name: '对子', icon: 'icon-pair', base: 0, mult: 2.0, description: '2颗点数相同。伤害 = 点数和+100%' },
  { id: 'straight_3', name: '顺子', icon: 'icon-arrow-right', base: 0, mult: 1.5, description: '3颗及以上点数连续。伤害 = 点数和 +50%，AOE全体' },
  { id: 'two_pair', name: '连对', icon: 'icon-layers', base: 0, mult: 2.5, description: '2组对子。伤害 = 点数和 +150%，获得5护甲' },
  { id: 'three_pair', name: '三连对', icon: 'icon-layers', base: 0, mult: 3.5, description: '3组对子。伤害 = 点数和 +250%，获得8护甲' },
  { id: 'three_of_a_kind', name: '三条', icon: 'icon-triangle', base: 0, mult: 3.5, description: '3颗点数相同。伤害 = 点数和 +250%，施加1层易伤(2回合)' },
  { id: 'straight_4', name: '4顺', icon: 'icon-arrow-right', base: 0, mult: 2.5, description: '4颗点数连续。伤害 = 点数和 +150%，AOE全体，施加1层虚弱' },
  { id: 'same_element', name: '同元素', icon: 'icon-droplet', base: 0, mult: 3.0, description: '至少4颗同元素(非普通)。伤害 = 点数和+200%，骰子效果翻倍' },
  { id: 'full_house', name: '葫芦', icon: 'icon-house', base: 0, mult: 4.0, description: '1组三条+1组对子。伤害 = 点数和+300%，获得15护甲' },
  { id: 'straight_5', name: '5顺', icon: 'icon-arrow-right', base: 0, mult: 3.5, description: '5颗点数连续。伤害 = 点数和 +250%，AOE全体，施加2层虚弱' },
  { id: 'four_of_a_kind', name: '四条', icon: 'icon-square', base: 0, mult: 6.0, description: '4颗点数相同。伤害 = 点数和+500%，施加2层易伤(2回合)' },
  { id: 'straight_6', name: '6顺', icon: 'icon-arrow-right', base: 0, mult: 5.0, description: '6颗点数连续(1-6)。伤害 = 点数和+400%，AOE全体，施加3层虚弱+10护甲' },
  { id: 'element_straight', name: '元素顺', icon: 'icon-zap', base: 0, mult: 5.5, description: '同元素+顺子。伤害 = 点数和 +450%，AOE全体，骰子效果翻倍' },
  { id: 'element_house', name: '元素葫芦', icon: 'icon-waves', base: 0, mult: 6.0, description: '同元素+葫芦。伤害 = 点数和+500%，骰子效果翻倍+25护甲' },
  { id: 'five_of_a_kind', name: '五条', icon: 'icon-star', base: 0, mult: 9.0, description: '5颗点数相同。伤害 = 点数和+800%，施加3层易伤(2回合)' },
  { id: 'six_of_a_kind', name: '六条', icon: 'icon-trophy', base: 0, mult: 15.0, description: '6颗点数相同。伤害 = 点数和+1400%，施加5层易伤(3回合)' },
  { id: 'royal_element', name: '皇家元素顺', icon: 'icon-crown', base: 0, mult: 16.0, description: '同元素+顺子(1-6)。伤害 = 点数和+1500%，AOE全体，骰子效果+200%+50护甲' },
];
