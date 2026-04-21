/**
 * statusInfo.ts - 状态效果元数据表（Phaser 版）
 *
 * 原 React 版为 statusInfo.tsx，直接塞入 <PixelIcon /> JSX 作为 icon 字段。
 * Phaser 版移除 JSX 依赖，改用 iconKey 字符串引用 Phaser 纹理/图集 key。
 * UI-01 场景接入时：`scene.add.sprite(x, y, STATUS_INFO[type].iconKey)` 即可。
 *
 * color 字段保留原版 Tailwind class 字符串（'text-purple-400' 等），
 * UI-01 时再在场景侧做一次字符串 → 色值的映射。
 */

import type { StatusType } from '../types/game';

export interface StatusMeta {
  /** Phaser 纹理 / 图集 key，UI-01 时由场景侧注册对应资源 */
  iconKey: string;
  /** 原 Tailwind class，保留用作色彩语义 key，UI-01 时映射为 Phaser 色值 */
  color: string;
  /** 状态中文名（浮动文字用） */
  label: string;
  /** 状态说明（图鉴/Tooltip 用） */
  description: string;
}

export const STATUS_INFO: Record<StatusType, StatusMeta> = {
  poison: {
    iconKey: 'pixel-poison',
    color: 'text-purple-400',
    label: '中毒',
    description: '每回合结束时受到 X 点伤害，随后层数减 1。',
  },
  burn: {
    iconKey: 'pixel-flame',
    color: 'text-orange-500',
    label: '灼烧',
    description: '回合结束时受到 X 点火焰伤害，随后灼烧消失。',
  },
  dodge: {
    iconKey: 'pixel-wind',
    color: 'text-blue-300',
    label: '闪避',
    description: '下次受到攻击时，有概率完全回避。',
  },
  vulnerable: {
    iconKey: 'pixel-arrow-up',
    color: 'text-red-400',
    label: '易伤',
    description: '受到的伤害增加 50%。',
  },
  strength: {
    iconKey: 'pixel-arrow-up',
    color: 'text-orange-400',
    label: '力量',
    description: '造成的伤害增加 X 点。',
  },
  weak: {
    iconKey: 'pixel-arrow-down',
    color: 'text-zinc-400',
    label: '虚弱',
    description: '造成的伤害减少 25%。',
  },
  armor: {
    iconKey: 'pixel-shield',
    color: 'text-blue-400',
    label: '护甲',
    description: '抵挡即将到来的伤害。',
  },
  slow: {
    iconKey: 'pixel-wind',
    color: 'text-cyan-400',
    label: '减速',
    description: '移动速度减半，远程伤害降低。',
  },
  freeze: {
    iconKey: 'pixel-wind',
    color: 'text-blue-300',
    label: '冻结',
    description: '完全无法行动。',
  },
};
