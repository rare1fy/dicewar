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
 * 战斗类型：对应 MapNode.type 的"战斗型"子集（enemy/elite/boss）。
 * - normal：对齐 NodeType 'enemy'，普通遭遇战
 * - elite：精英（介于普通与 Boss 之间）
 * - boss：章节 Boss（差异化：高血、高伤、触发 BossEntrance 演出、切 Boss BGM）
 *
 * 为什么不直接用 NodeType：NodeType 还包含 shop/event/treasure 等非战斗类型，
 *   这里只想在战斗场景里区分"敌人规格"，语义更窄更聚焦。
 */
export type BattleType = 'normal' | 'elite' | 'boss';

/**
 * MVP 敌人：normal 节点（食尸鬼，60HP / 10atk）
 * 沿用原"训练木桩"数值，命名复用 ENEMY_SPRITES 已有像素资产。
 */
function buildNormalEnemy(): Enemy {
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
 * MVP 敌人：elite 节点（亡灵骑士，100HP / 14atk / 5 护甲）
 *
 * 数值设计（无 Designer 裁定，暂定 MVP 基线，可配平）：
 *   - HP 60 → 100（+67%，玩家需多 2-3 回合）
 *   - atk 10 → 14（+40%，单次伤害压力提升）
 *   - armor 0 → 5（首轮物理伤害被吸收，鼓励用高倍率牌型）
 */
function buildEliteEnemy(): Enemy {
  return {
    uid: 'mvp_elite_0',
    configId: 'mvp_elite',
    name: '亡灵骑士',
    hp: 100,
    maxHp: 100,
    armor: 5,
    attackDmg: 14,
    combatType: 'warrior',
    dropGold: 0,
    dropRelic: false,
    emoji: '🛡️',
    statuses: [],
    distance: 0,
  };
}

/**
 * MVP 敌人：boss 节点（深渊爬行者，180HP / 18atk / 10 护甲）
 *
 * 数值设计（BOSS-MVP 基线，等后续 Designer 裁定）：
 *   - HP 100 → 180（+80%，BOSS 战更持久）
 *   - atk 14 → 18（+29%，压力升级但不至于秒杀）
 *   - armor 5 → 10（需要组合牌才能破防）
 *   - name "深渊爬行者"：配合章节 BOSS 入场演出的世界观
 */
function buildBossEnemy(): Enemy {
  return {
    uid: 'mvp_boss_0',
    configId: 'mvp_boss',
    name: '深渊爬行者',
    hp: 180,
    maxHp: 180,
    armor: 10,
    attackDmg: 18,
    combatType: 'warrior',
    dropGold: 0,
    dropRelic: false,
    emoji: '👹',
    statuses: [],
    distance: 0,
  };
}

/**
 * 按战斗类型构建 MVP 敌人。normal/elite/boss 差异化通过独立构造函数落地，
 * 未来接入章节数据后改为 buildMvpEnemyForNode(chapter, nodeType) 二维表。
 *
 * 兼容性：保留 buildMvpEnemy() 作为 normal 的别名，避免下游直启路径（BattleScene 无
 * 参 init）立即断链；后续任务统一收口后可删别名。
 */
export function buildMvpEnemyForType(battleType: BattleType): Enemy {
  switch (battleType) {
    case 'boss': return buildBossEnemy();
    case 'elite': return buildEliteEnemy();
    case 'normal':
    default: return buildNormalEnemy();
  }
}

/** @deprecated 用 buildMvpEnemyForType('normal')；保留以兼容无参调用路径 */
export function buildMvpEnemy(): Enemy {
  return buildNormalEnemy();
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
