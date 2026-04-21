/**
 * settlement/phase3_effects.ts — Phase 3 特殊效果触发 + 棱镜聚焦 + 盗贼连击终结
 *
 * ARCH-17 从 settlementAnimation.ts L267-L428 拆出
 * 包含：
 *   - Phase 3 主流程：收集骰子 onPlay 效果 / 遗物效果 / 战士血怒狂暴 / 盗贼连击
 *   - 逐个展示效果（含遗物 icon 刷光）
 *   - bounce 定格动画
 *   - 棱镜聚焦：锁定当前元素到下回合
 *   - 盗贼连击终结倍率：同牌型+25%
 *
 * [!] outcome.damage 在"盗贼连击终结倍率"处被 mutate，为原文件 L442 的已有行为，忠实迁移
 */

import { getDiceDef, getUpgradedOnPlay } from '../../data/dice';
import { STATUS_INFO } from '../../data/statusInfo';
import { FURY_CONFIG } from '../../config/gameBalance';
import type { SettlementContext } from './types';

export async function runPhase3Effects(ctx: SettlementContext): Promise<void> {
  const {
    game, gameRef, dice, currentHands, selected, outcome, comboFinisherBonus,
    setSettlementData, setSettlementPhase,
    setFlashingRelicIds, setGame,
    addFloatingText,
    playMultiplierTick,
  } = ctx;

  // ========================================
  // Phase 3: 特殊效果触发 (每个0.4s)
  // ========================================
  setSettlementPhase('effects');

  // 收集所有触发效果
  const allEffects: { name: string; detail: string; type: 'damage' | 'mult' | 'status' | 'heal' | 'armor'; rawValue?: number; rawMult?: number; relicId?: string; icon?: string }[] = [];

  // 骰子onPlay效果
  const skipOnPlaySettlement = selected.length > 1 && currentHands.activeHands.includes('普通攻击') && currentHands.activeHands.length === 1;
  selected.forEach(d => {
    const def = getDiceDef(d.diceDefId);
    if (skipOnPlaySettlement || !def.onPlay) return;
    const diceLevel = game.ownedDice.find(od => od.defId === d.diceDefId)?.level || 1;
    const op = getUpgradedOnPlay(def, diceLevel) || def.onPlay;
    if (op.bonusDamage) allEffects.push({ name: def.name, rawValue: op.bonusDamage, detail: `伤害+${op.bonusDamage}`, type: 'damage' });
    if (op.bonusMult) allEffects.push({ name: def.name, rawMult: op.bonusMult, detail: `倍率+${Math.round((op.bonusMult - 1) * 100)}%`, type: 'mult' });
    if (op.scaleWithHits) {
      const furyBonus = gameRef.current.furyBonusDamage || 0;
      if (furyBonus > 0) allEffects.push({ name: def.name, rawValue: furyBonus, detail: `怒火+${furyBonus}`, type: 'damage' });
    }
    if (op.heal) allEffects.push({ name: def.name, detail: `回复${op.heal}HP`, type: 'heal' });
    if (op.pierce) allEffects.push({ name: def.name, rawValue: op.pierce, detail: `穿透+${op.pierce}`, type: 'damage' });
    if (op.statusToEnemy) {
      const info = STATUS_INFO[op.statusToEnemy.type];
      allEffects.push({ name: def.name, detail: `${info.label}+${op.statusToEnemy.value}`, type: 'status' });
    }
    // 以下是之前缺失的效果展示
    if (op.armor) allEffects.push({ name: def.name, detail: `护甲+${op.armor}`, type: 'armor' });
    if (op.armorFromValue) allEffects.push({ name: def.name, detail: `护甲+${d.value}(点数)`, type: 'armor' });
    if (op.armorFromTotalPoints) {
      const totalPts = selected.reduce((s, dd) => s + dd.value, 0);
      allEffects.push({ name: def.name, detail: `护甲+${totalPts}(总点数)`, type: 'armor' });
    }
    if (op.armorFromHandSize) {
      const handSize = dice.filter(dd => !dd.spent).length;
      allEffects.push({ name: def.name, detail: `护甲+${handSize * op.armorFromHandSize}(${handSize}×${op.armorFromHandSize})`, type: 'armor' });
    }
    if (op.armorBreak) allEffects.push({ name: def.name, detail: op.armorToDamage ? '破甲→伤害' : '摧毁护甲', type: 'damage' });
    if (op.aoeDamage) allEffects.push({ name: def.name, detail: `AOE ${op.aoeDamage}伤害`, type: 'damage' });
    if (op.selfDamagePercent) allEffects.push({ name: def.name, detail: `自伤${Math.round(op.selfDamagePercent * 100)}%`, type: 'status' });
    if (op.scaleWithLostHp) {
      const lostHp = game.maxHp - game.hp;
      allEffects.push({ name: def.name, detail: `已损失HP ${Math.round(lostHp * op.scaleWithLostHp)}伤害`, type: 'damage' });
    }
    if (op.executeThreshold) allEffects.push({ name: def.name, detail: `斩杀线${Math.round(op.executeThreshold * 100)}%→${Math.round(op.executeMult! * 100)}%伤害`, type: 'mult' });
    if (op.healFromValue) allEffects.push({ name: def.name, detail: `回复${d.value}HP(点数)`, type: 'heal' });
    if (op.maxHpBonusEvery) allEffects.push({ name: def.name, detail: `每${op.maxHpBonusEvery}次出牌后最大HP+5（当前${(game.lifefurnaceCounter || 0) + 1}/${op.maxHpBonusEvery}）`, type: 'heal' });
    if (op.maxHpBonus) allEffects.push({ name: def.name, detail: `最大HP+${op.maxHpBonus}`, type: 'heal' });
    if (op.bonusDamagePerElement) {
      const elemCount = dice.filter(dd => !dd.spent && dd.element !== 'normal').length;
      if (elemCount > 0) allEffects.push({ name: def.name, detail: `元素加成+${elemCount * op.bonusDamagePerElement}(${elemCount}×${op.bonusDamagePerElement})`, type: 'damage' });
    }
    if (op.bonusDamageFromPoints) allEffects.push({ name: def.name, detail: `总点数${Math.round(op.bonusDamageFromPoints * 100)}%加成`, type: 'damage' });
    if (op.damageFromArmor) allEffects.push({ name: def.name, detail: `护甲${Math.round(op.damageFromArmor * 100)}%→伤害`, type: 'damage' });
    if (op.overrideValue) allEffects.push({ name: def.name, detail: `点数→${op.overrideValue}`, type: 'damage' });
    if (op.copyHighestValue) allEffects.push({ name: def.name, detail: '复制最高点数', type: 'damage' });
    // devourDie display removed — now 超载
    if (op.poisonInverse) allEffects.push({ name: def.name, detail: `毒层${7 - d.value}`, type: 'status' });
    if (op.comboBonus) allEffects.push({ name: def.name, detail: `连击+${Math.round(op.comboBonus * 100)}%`, type: 'mult' });
    if (op.selfBerserk) allEffects.push({ name: def.name, detail: '狂暴: 伤害+30%/受伤+20%', type: 'status' });
    if (op.purifyAll) allEffects.push({ name: def.name, detail: '净化负面状态', type: 'heal' });
    if (op.stayInHand) allEffects.push({ name: def.name, detail: '不消耗留在手牌', type: 'status' });
    if (op.grantTempDie) allEffects.push({ name: def.name, detail: '+1临时骰子', type: 'status' });
    if (op.drawFromBag) allEffects.push({ name: def.name, detail: `补抽${op.drawFromBag}颗骰子`, type: 'status' });
    if (op.grantExtraPlay) allEffects.push({ name: def.name, detail: '+1出牌机会', type: 'status' });
    if (op.grantTempDieFixed) allEffects.push({ name: def.name, detail: '+1临时骰(2-5)', type: 'status' });
    if (op.multOnThirdPlay && (game.comboCount || 0) >= 2) allEffects.push({ name: def.name, detail: `追击+${Math.round((op.multOnThirdPlay - 1) * 100)}%`, type: 'mult' });
    if (op.shadowClonePlay) allEffects.push({ name: def.name, detail: `影分身+50%`, type: 'damage' });
    if (op.unifyElement) allEffects.push({ name: def.name, detail: '统一元素', type: 'status' });
    if (def.isElemental && d.secondElement) allEffects.push({ name: def.name, detail: `双元素: ${d.secondElement}`, type: 'status' });
    if (op.critOnSecondPlay && (game.comboCount || 0) >= 1) allEffects.push({ name: def.name, detail: `暴击+${Math.round((op.critOnSecondPlay - 1) * 100)}%`, type: 'mult', rawMult: op.critOnSecondPlay });
    if (op.bonusDamageOnSecondPlay && (game.comboCount || 0) >= 1) allEffects.push({ name: def.name, rawValue: op.bonusDamageOnSecondPlay, detail: `第2击+${op.bonusDamageOnSecondPlay}`, type: 'damage' });
    if (op.bonusMultOnSecondPlay && (game.comboCount || 0) >= 1) allEffects.push({ name: def.name, rawMult: op.bonusMultOnSecondPlay, detail: `第2击+${Math.round((op.bonusMultOnSecondPlay - 1) * 100)}%`, type: 'mult' });
    if (op.stealArmor) allEffects.push({ name: def.name, detail: `偷取护甲(≤${op.stealArmor})`, type: 'armor' });
    if (op.poisonBase) allEffects.push({ name: def.name, detail: `毒${d.value + op.poisonBase}${op.poisonBonusIfPoisoned ? '(已毒+' + op.poisonBonusIfPoisoned + ')' : ''}`, type: 'status' });
    if (op.poisonFromPoisonDice) allEffects.push({ name: def.name, detail: `毒系骰子×${op.poisonFromPoisonDice}毒层`, type: 'status' });
    if (op.detonatePoisonPercent) allEffects.push({ name: def.name, detail: `引爆${Math.round(op.detonatePoisonPercent * 100)}%毒层`, type: 'damage' });
    if (op.escalateDamage) allEffects.push({ name: def.name, detail: `递增+${Math.round(op.escalateDamage * 100)}%`, type: 'mult' });
    if (op.wildcard) allEffects.push({ name: def.name, detail: '万能→最优点数', type: 'damage' });
    if (op.transferDebuff) allEffects.push({ name: def.name, detail: '转移负面→敌人', type: 'status' });
    if (op.detonateAllOnLastPlay) allEffects.push({ name: def.name, detail: '引爆全部负面', type: 'damage' });
    if (op.bounceAndGrow) allEffects.push({ name: def.name, detail: '弹回+点数+1', type: 'status' });
    if (op.boomerangPlay) allEffects.push({ name: def.name, detail: '弹回+下次免费', type: 'status' });
    if (op.lowHpOverrideValue && op.lowHpThreshold && game.hp / game.maxHp < op.lowHpThreshold) allEffects.push({ name: def.name, detail: `低血→点数${op.lowHpOverrideValue}`, type: 'damage' });
    if (op.scaleWithBloodRerolls && game.bloodRerollCount) allEffects.push({ name: def.name, detail: `搏命+${Math.min(game.bloodRerollCount, 3)}面值`, type: 'damage' });
    if (op.scaleWithSelfDamage) allEffects.push({ name: def.name, detail: '自伤→伤害加成', type: 'mult' });
    if (op.tauntAll) allEffects.push({ name: def.name, detail: '嘲讽全体敌人', type: 'status' });
    if (op.freezeBonus) allEffects.push({ name: def.name, detail: `冻结+${op.freezeBonus}回合`, type: 'status' });
    if (op.swapWithUnselected) allEffects.push({ name: def.name, detail: '交换最高点数', type: 'damage' });
    if (op.triggerAllElements) allEffects.push({ name: def.name, detail: '触发全部元素', type: 'status' });
    if (op.removeBurn) allEffects.push({ name: def.name, detail: `清除${op.removeBurn}层灼烧`, type: 'heal' });
    if (op.healPerCleanse) allEffects.push({ name: def.name, detail: `每净化+${op.healPerCleanse}HP`, type: 'heal' });
    // 元素骰子坍缩效果
    if (def.isElemental && d.collapsedElement) {
      const elemNames: Record<string, string> = { fire: '灼烧', ice: '冻结', thunder: '雷击AOE', poison: '中毒', holy: '治疗' };
      allEffects.push({ name: def.name, detail: `${elemNames[d.collapsedElement] || d.collapsedElement}`, type: d.collapsedElement === 'holy' ? 'heal' : 'status' });
    }
  });

  // 遗物效果
  outcome.triggeredAugments.forEach(aug => {
    allEffects.push({ name: aug.name, detail: aug.details, type: aug.rawMult ? 'mult' : 'damage', rawValue: aug.rawDamage || undefined, rawMult: aug.rawMult || undefined, relicId: aug.relicId, icon: aug.icon });
  });

  // 战士血怒加成（5层封顶）
  const latestBloodRerolls = gameRef.current.bloodRerollCount || 0;
  if (game.playerClass === 'warrior' && latestBloodRerolls > 0) {
    const atCap = latestBloodRerolls >= FURY_CONFIG.maxStack;
    const effectiveStacks = Math.min(latestBloodRerolls, FURY_CONFIG.maxStack);
    allEffects.push({ name: '血怒', detail: `${effectiveStacks}/${FURY_CONFIG.maxStack}层 +${Math.round(effectiveStacks * FURY_CONFIG.damagePerStack * 100)}%${atCap ? ' [已满]' : ''}`, type: 'mult', rawMult: 1 + effectiveStacks * FURY_CONFIG.damagePerStack, icon: 'blooddrop' });
  }
  // 战士狂暴本能（受伤百分比倍率）
  const settlementRageMult = gameRef.current.warriorRageMult || 0;
  if (game.playerClass === 'warrior' && settlementRageMult > 0) {
    allEffects.push({ name: '狂暴', detail: `+${Math.round(settlementRageMult * 100)}%`, type: 'mult', rawMult: 1 + settlementRageMult, icon: 'flame' });
  }
  // 盗贼连击加成
  if (game.playerClass === 'rogue' && (game.comboCount || 0) >= 1) {
    allEffects.push({ name: '连击', detail: '+20%', type: 'mult', rawMult: 1.2, icon: 'zap' });
  }

  // 逐个展示效果
  for (let i = 0; i < allEffects.length; i++) {
    setSettlementData(prev => prev ? {
      ...prev,
      triggeredEffects: allEffects.slice(0, i + 1),
      // 动态更新基础值和倍率显示
      ...(allEffects[i].rawValue ? { currentBase: (prev?.currentBase || 0) + allEffects[i].rawValue! } : {}),
      ...(allEffects[i].rawMult ? { currentMult: (prev?.currentMult || 1) * allEffects[i].rawMult! } : {}),
      currentEffectIdx: i,
    } : prev);
    playMultiplierTick(i + 1);
    // 遗物icon刷光
    if (allEffects[i].relicId) {
      setFlashingRelicIds(prev => [...prev, allEffects[i].relicId!]);
      setTimeout(() => setFlashingRelicIds(prev => prev.filter(id => id !== allEffects[i].relicId)), 800);
    }
    await new Promise(r => setTimeout(r, 350));
  }
  if (allEffects.length > 0) await new Promise(r => setTimeout(r, 200));

  // 结算演出Q弹定格动画
  setSettlementPhase('bounce');
  await new Promise(r => setTimeout(r, 500));

  // === 棱镜聚焦：锁定当前元素到下回合 ===
  const hasLockElement = selected.some(d => getDiceDef(d.diceDefId).onPlay?.lockElement);
  if (hasLockElement) {
    const activeElem = selected.find(d => d.collapsedElement && d.collapsedElement !== 'normal')?.collapsedElement;
    if (activeElem) {
      setGame(prev => ({ ...prev, lockedElement: activeElem }));
      addFloatingText(`棱镜聚焦: ${activeElem}锁定!`, 'text-purple-300', undefined, 'player');
    }
  }

  // === 盗贼连击终结倍率：同牌型+25% ===
  if (comboFinisherBonus > 0) {
    outcome.damage = Math.floor(outcome.damage * (1 + comboFinisherBonus));
    addFloatingText(`连击终结! +${Math.round(comboFinisherBonus * 100)}%`, 'text-yellow-300', undefined, 'player');
  }
}