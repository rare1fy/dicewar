/**
 * checkEnemyDeathsModule.ts — 敌人死亡检测（波次切换/胜利判定）
 *
 * 从 postPlayEffects.ts 提取。
 * ARCH-F Round2 模块拆分
 */

import type { PostPlayContext } from './postPlayEffects';
import { generateChallenge } from '../utils/instakillChallenge';
import { ANIMATION_TIMING } from '../config';

// ============================================================
// 异步部分：敌人死亡检测
// ============================================================

export function createCheckEnemyDeaths(ctx: PostPlayContext): () => Promise<void> {
  return async () => {
    const {
      game, gameRef, enemies, outcome,
      hasAoe, targetUid, finalEnemyHp,
      setGame, setEnemies, setEnemyEffectForUid,
      setBossEntrance, setEnemyEffects, setDyingEnemies,
      setEnemyQuotes, setEnemyQuotedLowHp, setRerollCount,
      setWaveAnnouncement, setDice,
      addLog, playSound,
      showEnemyQuote, getEnemyQuotes, pickQuote,
      rollAllDice, handleVictory,
    } = ctx;

    await new Promise(r => setTimeout(r, ANIMATION_TIMING.enemyDeathCleanupDelay)); // Wait for death animation to complete
    // Use pre-computed finalEnemyHp (accurate: includes armor reduction, avoids stale closure)
    
    // For single target, check if target died
    if (!hasAoe) {
      const targetDied = finalEnemyHp <= 0;
      if (targetDied) {
        await new Promise(r => setTimeout(r, 700));
        const remainingAlive = enemies.filter(e => e.hp > 0 && e.uid !== targetUid);
        if (remainingAlive.length > 0) {
          setGame(prev => ({ ...prev, targetEnemyUid: (remainingAlive.find(e => e.combatType === 'guardian') || remainingAlive[0]).uid }));
          addLog(`当前目标被击败！还有 ${remainingAlive.length} 个敌人存活。`);
          return;
        }
      } else {
        return; // Target alive, no wave check needed
      }
    }
    
    // Check if all enemies in current wave are dead
    // AOE: use enemies closure (1200ms later state should be updated)
    // Single target: finalEnemyHp <= 0 confirmed above, anyAlive = false
    const anyAlive = hasAoe ? enemies.some(e => e.hp - outcome.damage > 0) : false;
    
    if (!anyAlive) {
      await new Promise(r => setTimeout(r, 700));
      const nextWaveIdx = game.currentWaveIndex + 1;
      if (nextWaveIdx < game.battleWaves.length) {
        const nextWave = game.battleWaves[nextWaveIdx].enemies;
        // Boss出场演出：如果当前是boss节点且下一波只有1个敌人(boss单独出场)
        const currentNode = game.map.find(n => n.id === game.currentNodeId);
        const isBossWave = currentNode?.type === 'boss' && nextWave.length === 1 && nextWave[0].maxHp > 200;
        if (isBossWave) {
          playSound('boss_appear');
          setBossEntrance({ visible: true, name: nextWave[0].name, chapter: game.chapter });
          await new Promise(r => setTimeout(r, ANIMATION_TIMING.enemyDeathCleanupDelay));
          setBossEntrance(prev => ({ ...prev, visible: false }));
          await new Promise(r => setTimeout(r, 300));
        }
        // Bug-3 安全兜底：确认所有死亡动画已播完再替换敌人数组
        // 防止 framer-motion 退出过渡被强制中断导致"闪没"
        await new Promise(r => setTimeout(r, ANIMATION_TIMING.waveTransitionDeathBuffer));
        setEnemies(nextWave);
        setEnemyEffects({}); setDyingEnemies(new Set());
        // Boss场景内演出：缩放前冲+抖动+笑声
        if (isBossWave && nextWave[0]) {
          setEnemyEffectForUid(nextWave[0].uid, 'boss_entrance');
          playSound('boss_laugh');
          await new Promise(r => setTimeout(r, ANIMATION_TIMING.bossEntranceDuration));
          setEnemyEffectForUid(nextWave[0].uid, null);
        }
        setEnemyQuotes({});
        setEnemyQuotedLowHp(new Set());
        setTimeout(() => {
          nextWave.forEach((e, idx) => {
            const q = getEnemyQuotes(e.configId);
            const line = pickQuote(q?.enter);
            if (line) {
              setTimeout(() => showEnemyQuote(e.uid, line, 3000), idx * 400);
            }
          });
        }, 300);
        // 垮波次：保留玩家剩余出牌/重投/连击状态（Bug-21：垮波次≠回合结束）
        // playsLeft: 保留当前值（至少1），防止自动endTurn；maxPlays重置用于下回合
        // comboCount/lastPlayHandType: 保留连击链（影锋刺客跨波次继续连击）
        // freeRerollsLeft: 保留剩余免费重投
        // Bug-4：法师吟唱（不出牌）时保留 chargeStacks 和屯牌；出了牌时重置吟唱状态
        // battleTurn重置为1：新波次敌人是全新实体，AI周期应从头开始
        // playsThisWave=0从新波次起算（仅instakill challenge内部使用）
        setGame(prev => {
          const isMageChanting = prev.playerClass === 'mage' && prev.playsLeft >= prev.maxPlays;
          return { ...prev, currentWaveIndex: nextWaveIdx, targetEnemyUid: (nextWave.find(e => e.combatType === 'guardian') || nextWave[0])?.uid || null, isEnemyTurn: false, playsLeft: Math.max(prev.playsLeft, 1), freeRerollsLeft: Math.max(prev.freeRerollsLeft, 1), armor: 0, chargeStacks: isMageChanting ? prev.chargeStacks : 0, mageOverchargeMult: isMageChanting ? prev.mageOverchargeMult : 0, bloodRerollCount: 0, comboCount: prev.comboCount, lastPlayHandType: prev.lastPlayHandType, lockedElement: isMageChanting ? prev.lockedElement : undefined, instakillChallenge: generateChallenge(prev.map.find(n => n.id === prev.currentNodeId)?.depth || 0, prev.chapter, prev.drawCount, prev.map.find(n => n.id === prev.currentNodeId)?.type), instakillCompleted: false, playsThisWave: 0, rerollsThisWave: 0, battleTurn: 1 };
        });
        setRerollCount(0);
        setWaveAnnouncement(nextWaveIdx + 1);
        addLog(`第 ${nextWaveIdx + 1} 波敌人来袭！`);
        // Bug-4：法师吟唱时保留屯牌，不清空骰子、不强制重置手牌
        // 注意：必须用 gameRef.current 获取最新 playsLeft（game 快照可能在出牌后未更新）
        const latestGame = gameRef.current;
        const isMageChanting = latestGame.playerClass === 'mage' && latestGame.playsLeft >= latestGame.maxPlays;
        if (!isMageChanting) {
          setDice([]);
        }
        rollAllDice(!isMageChanting);
        return;
      }
      handleVictory();
    }
  };
}
