/**
 * settlement/phase2_diceScoring.ts — Phase 2 逐颗计分 + 2.5 倍率动画
 *
 * ARCH-17 从 settlementAnimation.ts L113-L265 拆出
 * 包含：
 *   - Phase 2 主循环（逐颗骰子计分 + 分裂骰子弹出）
 *   - 磁吸骰子同化
 *   - 磁吸后牌型/伤害重算
 *   - 分裂后牌型/伤害重算
 *   - Phase 2.5 倍率强调动画
 *
 * [!] DRY 违反：磁吸重算段 ↔ 分裂重算段 两段约76行高度重复
 *     → 已挂 ARCH-25 独立任务后处理（触发时机互斥，合并需谨慎）
 * [!] outcome 为引用传入，本 Phase 会 mutate 其 damage/bestHand/X/handMultiplier
 *     此为原文件的已有行为，忠实迁移
 */

import type { Die } from '../../types/game';
import { getDiceDef } from '../../data/dice';
import { HAND_TYPES } from '../../data/handTypes';
import { checkHands } from '../../utils/handEvaluator';
import type { SettlementContext } from './types';

export async function runPhase2DiceScoring(ctx: SettlementContext): Promise<{
  settleDice: Die[];
  splitOccurred: boolean;
}> {
  const {
    game, selected, outcome, straightUpgrade,
    setSettlementData, setSettlementPhase,
    addLog, addToast,
    playSound, playSettlementTick, playMultiplierTick,
  } = ctx;

  // ========================================
  // Phase 2: 逐颗骰子计分 (每颗0.3s) - 分裂骰子在此阶段弹出
  // ========================================
  setSettlementPhase('dice');
  let runningBase = outcome.baseHandValue;
  const settleDice = [...selected]; // 实际参与结算的骰子列表
  let splitOccurred = false;
  for (let i = 0; i < settleDice.length; i++) {
    runningBase += settleDice[i].value;
    const currentRunning = runningBase;
    setSettlementData(prev => prev ? { ...prev, currentBase: currentRunning, currentEffectIdx: i, selectedDice: [...settleDice] } : prev);
    playSettlementTick(i);
    await new Promise(r => setTimeout(r, 280));

    // 分裂骰子：播放到它时额外弹出一颗随机点数骰子
    if (settleDice[i].diceDefId === 'split') {
      const splitFaces = [1, 2, 3, 4, 5, 6];
      const splitValue = splitFaces[Math.floor(Math.random() * splitFaces.length)]; // 复制相同点数
      const splitDie: Die = {
        id: settleDice[i].id + 9000,
        diceDefId: 'standard',
        value: splitValue,
        element: 'normal',
        selected: true,
        spent: false,
        rolling: false,
      };
      // 插入到当前位置之后
      settleDice.splice(i + 1, 0, splitDie);
      splitOccurred = true;
      playSound('relic_activate');
      // 更新显示 - 新骰子弹出，同时把新骰子的值也加入计分并点亮
      runningBase += splitValue;
      const splitRunning = runningBase;
      i++; // 跳过新插入的骰子，避免循环重复处理
      setSettlementData(prev => prev ? { ...prev, selectedDice: [...settleDice], currentBase: splitRunning, currentEffectIdx: i } : prev);
      await new Promise(r => setTimeout(r, 400));
      addLog(`分裂骰子分裂！额外弹出点数 ${splitValue}`);
      addToast(`分裂! 弹出点数 ${splitValue}`, 'buff');
    }
  }

  // 如果发生了分裂，重新计算牌型和伤害

  // 磁吸骰子：随机同化一颗同伴骰子的点数为自身点数（已被影响的不再重复）
  let magnetOccurred = false;
  const magnetizedIds = new Set<number>(); // 已被磁吸影响的骰子ID
  for (let i = 0; i < settleDice.length; i++) {
    if (settleDice[i].diceDefId === 'magnet' && settleDice.length > 1) {
      const magnetValue = settleDice[i].value;
      // 找到所有非磁吸且未被磁吸过的同伴骰子
      const targets = settleDice.filter((d, idx) => idx !== i && d.diceDefId !== 'magnet' && !magnetizedIds.has(d.id));
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const oldValue = target.value;
        target.value = magnetValue;
        magnetizedIds.add(target.id);
        magnetOccurred = true;
        playSound('relic_activate');
        setSettlementData(prev => prev ? { ...prev, selectedDice: [...settleDice] } : prev);
        await new Promise(r => setTimeout(r, 400));
        const targetDef = getDiceDef(target.diceDefId);
        addLog(`磁吸骰子同化！${targetDef.name}的点数 ${oldValue} → ${magnetValue}`);
        addToast(`?? ${targetDef.name} ${oldValue}→${magnetValue}`, 'buff');
      }
    }
  }

  // 如果发生了磁吸，也需要重新计算牌型和伤害（和分裂一样的逻辑）
  if (magnetOccurred && !splitOccurred) {
    const newHandResult = checkHands(settleDice, { straightUpgrade });
    const newBestHand = newHandResult.bestHand;
    if (newBestHand !== outcome.bestHand) {
      addLog(`磁吸改变了牌型！${outcome.bestHand} → ${newBestHand}`);
      addToast(` 牌型变化: ${outcome.bestHand} → ${newBestHand}`, newBestHand === '普通攻击' ? 'damage' : 'buff');
      playSound(newBestHand === '普通攻击' ? 'hit' : 'relic_activate');
    }
    const newX = settleDice.reduce((sum, d) => sum + d.value, 0);
    let newHandMult = 1;
    newHandResult.activeHands.forEach(handName => {
      const handDef = HAND_TYPES.find(h => h.name === handName);
      if (handDef) {
        const level = game.handLevels[handName] || 1;
        const levelBonusMult = (level - 1) * 0.3;
        newHandMult += ((handDef.mult || 1) - 1) + levelBonusMult;
      }
    });
    const newBaseDamage = Math.floor(newX * newHandMult);
    const newTotalDamage = Math.floor((newBaseDamage + (outcome.damage - Math.floor(outcome.X * outcome.handMultiplier))) * outcome.multiplier) + outcome.pierceDamage;
    outcome.damage = Math.max(0, newTotalDamage);
    outcome.bestHand = newBestHand;
    outcome.X = newX;
    outcome.handMultiplier = newHandMult;
    runningBase = 0;
    settleDice.forEach(d => runningBase += d.value);
    runningBase += outcome.baseHandValue;
    setSettlementData(prev => prev ? {
      ...prev,
      bestHand: newBestHand,
      selectedDice: [...settleDice],
      currentBase: runningBase,
      currentMult: newHandMult,
      finalDamage: outcome.damage,
    } : prev);
    await new Promise(r => setTimeout(r, 500));
  }
  if (splitOccurred) {
    const newHandResult = checkHands(settleDice, { straightUpgrade });
    const newBestHand = newHandResult.bestHand;
    if (newBestHand !== outcome.bestHand) {
      addLog(`分裂改变了牌型！${outcome.bestHand} → ${newBestHand}`);
      addToast(` 牌型变化: ${outcome.bestHand} → ${newBestHand}`, newBestHand === '普通攻击' ? 'damage' : 'buff');
      playSound(newBestHand === '普通攻击' ? 'hit' : 'relic_activate');
    }
    // 重新计算伤害（用新的骰子列表和牌型）
    const newX = settleDice.reduce((sum, d) => sum + d.value, 0);
    let newHandMult = 1;
    newHandResult.activeHands.forEach(handName => {
      const handDef = HAND_TYPES.find(h => h.name === handName);
      if (handDef) {
        const level = game.handLevels[handName] || 1;
        const levelBonusMult = (level - 1) * 0.3;
        newHandMult += ((handDef.mult || 1) - 1) + levelBonusMult;
      }
    });
    const newBaseDamage = Math.floor(newX * newHandMult);
    const newTotalDamage = Math.floor((newBaseDamage + (outcome.damage - Math.floor(outcome.X * outcome.handMultiplier))) * outcome.multiplier) + outcome.pierceDamage;
    // 更新 outcome 的伤害值（用闭包变量）
    outcome.damage = Math.max(0, newTotalDamage);
    outcome.bestHand = newBestHand;
    outcome.X = newX;
    outcome.handMultiplier = newHandMult;
    runningBase = 0;
    settleDice.forEach(d => runningBase += d.value);
    runningBase += outcome.baseHandValue;
    setSettlementData(prev => prev ? {
      ...prev,
      bestHand: newBestHand,
      selectedDice: [...settleDice],
      currentBase: runningBase,
      currentMult: newHandMult,
      finalDamage: outcome.damage,
    } : prev);
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 200));

  // ========================================
  // Phase 2.5: 倍率强调动画 (0.5s)
  // ========================================
  setSettlementPhase('mult');
  playMultiplierTick(0);
  await new Promise(r => setTimeout(r, 500));

  return { settleDice, splitOccurred };
}