/**
 * BattleMvpData.ts — MVP 战斗开局数据
 *
 * 职责（SRP）：为每个职业提供"刚开场的战斗场景"所需的初始数据：
 *   - MVP 敌人（当前三职业通用一个食尸鬼，后续可按章节/节点差异化）
 *   - 每职业的开局 3 件遗物（Designer MVP 裁定的职业切向遗物组合）
 *
 * 拆分来源：BattleScene.ts（α-go 多职业前置 B1 拆分）。
 * 上游消费：BattleScene.buildInitialSnapshot（仅用于 classId 对应的那一份）。
 *
 * 扩展点（TODO）：
 *   - 未来 MAP 节点差异化敌人 → `buildMvpEnemyForNode(nodeType)` 重载
 *   - 未来开局遗物走"随机 3 选 1"→ 这里改为 getStarterRelicPool(classId)
 */

import { ALL_RELICS } from '../../data/relics';
import type { Enemy, Relic, ClassId } from '../../types/game';

/**
 * MVP 训练木桩（固定每回合攻击 10 点，血量 60）
 * 命名改为"食尸鬼"以复用 ENEMY_SPRITES 里已有的像素资产，数值保持训练木桩不变。
 */
export function buildMvpEnemy(): Enemy {
  return {
    uid: 'mvp_dummy_0',
    configId: 'mvp_dummy',
    name: '食尸鬼',
    hp: 60,
    maxHp: 60,
    armor: 0,
    attackDmg: 10,
    combatType: 'warrior',
    dropGold: 0,
    dropRelic: false,
    emoji: '🎯',
    statuses: [],
    distance: 0,
  };
}

/**
 * 每职业开局 3 件遗物（MVP 保底方案 —— Verify L3 审查 REJECT 后返工）
 *
 * 现状：三职业统一使用 warrior 的 MVP 基线遗物：
 *   dimension_crush（群攻爆发）/ healing_breeze（回血续航）/ arithmetic_gauge（顺子倍率）
 *
 * 为什么不做职业差异化起手遗物（2026-04-22 Verify L3 REJECT 沉淀）：
 *   第一次返工版曾按职业切向给 mage/rogue 配适配遗物，Verify 查源码发现两个阻断：
 *     1. `combo_master_relic` 的 damage 字段在当前 BattleGlue.triggerOnPlayRelics 聚合器里
 *        被吞掉（聚合器只吃 multiplier/heal，见 BattleGlue.ts L252-255）—— 接线不完整
 *     2. `charge_core`/`overflow_mana` 是防御/高门槛遗物，法师 3 抽 1 出的 MVP 节奏吃不到
 *        触发条件（handSize>=5 基本不可能，didNotPlay 是防守向），前期几乎白板
 *
 *   Verify 方案 A：先让"职业参数切换生效"（initialDice / maxPlays / drawCount / hp），
 *   "职业起手遗物差异化"作为独立 Designer 单 DESIGNER-RELIC-STARTER 推进。
 *
 * 职业差异化已经通过 createInitialGameState(classId) 生效：
 *   - warrior: hp=120, maxPlays=1, drawCount=3, initialDice 含 w_bloodthirst/w_ironwall
 *   - mage:    hp=100, maxPlays=1, drawCount=3, initialDice 含 mage_elemental/mage_reverse
 *   - rogue:   hp=90,  maxPlays=2, drawCount=3, initialDice 含 r_quickdraw/r_combomastery
 */
const STARTER_RELIC_IDS: Record<ClassId, readonly string[]> = {
  warrior: ['dimension_crush', 'healing_breeze', 'arithmetic_gauge'],
  mage:    ['dimension_crush', 'healing_breeze', 'arithmetic_gauge'],
  rogue:   ['dimension_crush', 'healing_breeze', 'arithmetic_gauge'],
};

/**
 * 按职业构建 3 件开局遗物。
 * 如果某遗物 id 在 ALL_RELICS 里缺失，回退到 arithmetic_gauge（普适安全值）而非抛异常，
 * 避免开发期数据表同步问题直接打断战斗流；但会输出 warn，方便追查。
 */
export function buildMvpRelics(classId: ClassId): Relic[] {
  const ids = STARTER_RELIC_IDS[classId] ?? STARTER_RELIC_IDS.warrior;
  const fallback = ALL_RELICS.arithmetic_gauge;
  return ids.map((id) => {
    const found = ALL_RELICS[id];
    if (!found) {
      console.warn(`[BattleMvpData] 开局遗物缺失: ${id}（职业 ${classId}），回退到 arithmetic_gauge`);
      return fallback;
    }
    return found;
  });
}
