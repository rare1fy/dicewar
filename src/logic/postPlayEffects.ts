/**
* postPlayEffects.ts — 出牌后效处理
* checkEnemyDeaths 已提取到 checkEnemyDeathsModule.ts
* instakillChallengeAid 已提取到 instakillChallengeAid.ts (ARCH-G)
* ARCH-F Round2 模块拆分
*/

import type { Die, GameState, Enemy, DiceElement } from '../types/game';
import type { MutableRef, StateSetter } from '../types/battleContexts';
import type { ExpectedOutcomeResult } from './expectedOutcomeTypes';
import type { EnemyQuotes } from '../config/enemies';
import { getDiceDef } from '../data/dice';
import { drawFromBag } from '../data/diceBag';
import { applyDiceSpecialEffects } from './diceEffects';
import { hasOverflowConduit, hasLimitBreaker } from '../engine/relicQueries';
import { triggerInstakillChallengeAid } from './instakillChallengeAid';
import { buildRelicContext } from '../engine/buildRelicContext';
import { checkHands } from '../utils/handEvaluator';
import { checkChallenge } from '../utils/instakillChallenge';

// --- Context 接口 ---

export interface PostPlayContext {
  game: GameState;
  gameRef: MutableRef<GameState>;
  enemies: Enemy[];
  dice: Die[];
  selected: Die[];
  settleDice: Die[];
  outcome: ExpectedOutcomeResult;
  targetEnemy: Enemy;
  hasAoe: boolean;
  isElementalAoe: boolean;
  targetUid: string;
  finalEnemyHp: number;
  currentCombo: number;
  bestHand: string;
  rerollCount: number;
  /**
   * 顺子长度升档量（消费方：utils/handEvaluator.ts 的 checkHands）
   * 契约：必须通过 engine/buildSettlementInputs.ts 的 buildSettlementInputs(game.relics).straightUpgrade 注入，禁止散写。
   */
  straightUpgrade: number;
  /** 对子视为三条结算（万象归一遗物）。PHASER-FIX-STRAIGHT-PENDING-2。 */
  pairAsTriplet: boolean;

  // Callbacks
  setGame: StateSetter<GameState>;
  setEnemies: StateSetter<Enemy[]>;
  setDice: StateSetter<Die[]>;
  setRerollCount: StateSetter<number>;
  addFloatingText: (text: string, color: string, iconKey?: string, target?: string, persistent?: boolean) => void;
  addToast: (msg: string, type?: string) => void;
  addLog: (msg: string) => void;
  playSound: (id: string) => void;
  setScreenShake: StateSetter<boolean>;
  setEnemyEffectForUid: (uid: string, effect: string | null) => void;
  showEnemyQuote: (uid: string, text: string, duration: number) => void;
  getEnemyQuotes: (configId: string) => EnemyQuotes | undefined;
  pickQuote: (quotes?: string[]) => string | undefined;
  setBossEntrance: StateSetter<{ visible: boolean; name: string; chapter: number }>;
  setEnemyEffects: StateSetter<Record<string, string | null>>;
  setDyingEnemies: StateSetter<Set<string>>;
  setEnemyQuotes: StateSetter<Record<string, string>>;
  setEnemyQuotedLowHp: StateSetter<Set<string>>;
  setWaveAnnouncement: StateSetter<number | null>;
  rollAllDice: (forceResetHand?: boolean) => Promise<void>;
  handleVictory: () => void;
}

// --- 同步部分：出牌后效处理 ---

export function executePostPlayEffects(ctx: PostPlayContext): void {
  const {
    game, gameRef, enemies, dice, settleDice, outcome,
    hasAoe, targetUid, finalEnemyHp,
    currentCombo, bestHand, rerollCount, straightUpgrade, pairAsTriplet,
    setGame, setEnemies, setDice, setRerollCount,
    addFloatingText, addToast, addLog, playSound,
    setEnemyEffectForUid,
  } = ctx;

  // Track kills for war_profiteer_relic
  const killCount = enemies.filter(e => e.hp <= 0).length;
  if (killCount > 0) {
    setGame(prev => ({ ...prev, enemiesKilledThisBattle: (prev.enemiesKilledThisBattle || 0) + killCount }));
  }
  // on_kill 遗物效果：检查是否有敌人被击杀（Pre-compute killed enemies synchronously，避免 stale closure）
  const killedEnemiesData: Array<{uid: string, overkill: number}> = [];
  if (hasAoe) {
    enemies.filter(e => e.hp > 0).forEach(e => {
      let dmg = outcome.damage;
      let arm = e.armor;
      if (outcome.armorBreak) { arm = 0; }
      if (arm > 0) { dmg = Math.max(0, dmg - arm); }
      const newHp = e.hp - dmg;
      if (newHp <= 0) { killedEnemiesData.push({ uid: e.uid, overkill: Math.abs(newHp) }); }
    });
  } else {
    if (finalEnemyHp <= 0) {
      killedEnemiesData.push({ uid: targetUid, overkill: Math.abs(finalEnemyHp) });
    }
  }
  // === 洞察弱点检测（使用结算演出后的最终数据） ===
  const finalHandResult = checkHands(settleDice, { straightUpgrade, pairAsTriplet });
  const totalDiceInHand = dice.filter(d => !d.spent).length;
  setGame(prev => {
    const newPlaysWave = (prev.playsThisWave || 0) + 1;
    let challenge = prev.instakillChallenge;
    if (challenge && !challenge.completed) {
      challenge = checkChallenge(challenge, {
        selectedDice: settleDice,
        activeHands: finalHandResult.activeHands,
        pointSum: outcome.X,
        rerollsUsedSinceLastPlay: prev.rerollsThisWave || 0,
        totalDiceInHand: totalDiceInHand,
        ownedDiceTypes: [...new Set<string>(prev.ownedDice.map(d => d.defId))],
        killedThisPlay: killedEnemiesData.length,
      });
    }
    return { ...prev, playsThisWave: newPlaysWave, instakillChallenge: challenge, rerollsThisWave: 0 };
  });

  // 洞察弱点进度提示（在state更新后检测）
  setTimeout(() => {
    const g = gameRef.current;
    const ch = g.instakillChallenge;
    if (ch && !ch.completed && ch.progress && ch.progress > 0 && ch.value && ch.value > 0) {
      addFloatingText(`◆ ${ch.progress}/${ch.value}`, 'text-[var(--pixel-gold)]', undefined, 'enemy');
      playSound('coin');
      // 敌人受击反馈：轻微震动
      enemies.filter(e => e.hp > 0).forEach(e => {
        setEnemyEffectForUid(e.uid, 'shake');
        setTimeout(() => setEnemyEffectForUid(e.uid, null), 300);
      });
    }
  }, 400);

  // 检测挑战达成 → 触发战斗援助效果（已提取到 instakillChallengeAid.ts）
  setTimeout(() => triggerInstakillChallengeAid(ctx), 600);

  setTimeout(() => {
    // Use pre-computed kill data instead of stale enemies closure
    if (killedEnemiesData.length > 0) {
      game.relics.filter(r => r.trigger === 'on_kill').forEach(relic => {
        killedEnemiesData.forEach(killedData => {
          const overkill = killedData.overkill;
          const killCtx = buildRelicContext({ game, dice, targetEnemy: enemies.find(e => e.hp > 0) || null, rerollsThisTurn: rerollCount, hasPlayedThisTurn: true, overkillDamage: overkill });
          const res = relic.effect(killCtx);
          if (res.heal && res.heal > 0) {
            setGame(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + res.heal!) }));
            addToast(` ${relic.name}: +${res.heal}HP`, 'heal');
          }
          if (res.grantExtraPlay) {
            setGame(prev => ({ ...prev, relicTempExtraPlay: (prev.relicTempExtraPlay || 0) + res.grantExtraPlay! }));
            addToast(`${relic.name}: 下回合+${res.grantExtraPlay}出牌`, 'buff');
          }
          if (res.grantFreeReroll) {
            setRerollCount(prev => Math.max(0, prev - res.grantFreeReroll!));
            addToast(`${relic.name}: +${res.grantFreeReroll}免费重投`, 'buff');
          }
        });
      });

          // 溢出导管: 溢出伤害转移给随机敌人
          if (hasOverflowConduit(game.relics)) {
            killedEnemiesData.forEach(killedData => {
              const overkill = killedData.overkill;
              if (overkill > 0) {
                const aliveOthers = enemies.filter(e => e.hp > 0 && e.uid !== killedData.uid);
                if (aliveOthers.length > 0) {
                  const target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
                  setEnemies(prev => prev.map(e => e.uid === target.uid ? { ...e, hp: Math.max(0, e.hp - overkill) } : e));
                  addLog(' 溢出导管: ' + overkill + ' 点溢出伤害转移给 ' + target.name + '!');
                  addFloatingText('-' + overkill, 'text-orange-400', undefined, 'enemy');
                  playSound('hit');
                }
              }
            });
          }
    }
  }, 300);

  // 魂晶获取：击杀敌人时，溢出伤害×当前倍率×系数=魂晶（同步执行，不在setTimeout中）
  if (killedEnemiesData.length > 0) {
    const currentNode = game.map.find(n => n.id === game.currentNodeId);
    const currentDepth = currentNode?.depth || 0;
    const depthMult = game.soulCrystalMultiplier + currentDepth * 0.1;
    let totalSoulGain = 0;
    killedEnemiesData.forEach(killedData => {
      if (killedData.overkill > 0) {
        const enemy = enemies.find(e => e.uid === killedData.uid);
        const cappedOverkill = Math.min(killedData.overkill, enemy?.maxHp || 50);
        // 降低基础系数：0.5→0.15，通过商店涨价控制产销比
        const gain = Math.max(1, Math.ceil(cappedOverkill * depthMult * 0.15));
        totalSoulGain += gain;
      }
    });
    if (totalSoulGain > 0) {
      setGame(prev => ({
        ...prev,
        blackMarketQuota: (prev.blackMarketQuota || 0) + totalSoulGain,
        totalOverkillThisRun: (prev.totalOverkillThisRun || 0) + totalSoulGain,
      }));
      addFloatingText(`+${totalSoulGain} 魂晶`, 'text-purple-300', undefined, 'player', true);
      addToast(`+${totalSoulGain} 魂晶 (${Math.round(depthMult * 100)}%倍率)`, 'buff');
    }
  }

  // Mark dice as spent & add to discard pile
  const selectedDiceForSpent = dice.filter(d => d.selected && !d.spent);
  const spentDefIds = selectedDiceForSpent.filter(d => !d.isTemp && d.diceDefId !== 'temp_rogue').map(d => d.diceDefId);
  // 盗贼骰子补充：检查 grantShadowDie（只补1颗）
  let tempDieToGrant: Die | null = null;
  if (game.playerClass === 'rogue') {
    const hasTempGrant = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.grantShadowDie);
    if (hasTempGrant && !tempDieToGrant) {
      tempDieToGrant = {
        id: Date.now() + 8000,
        diceDefId: 'temp_rogue',
        value: Math.floor(Math.random() * 4) + 2, // 点数2-5
        element: 'normal' as DiceElement,
        selected: false,
        spent: false,
        rolling: false,
        isTemp: true, // 临时暗影残骰
        isShadowRemnant: true, // 暗影残骰标记
      };
    }
  }

  // === 暗影残骰连击奖励逻辑 ===
  const currentComboForShadow = game.comboCount || 0;
  if (game.playerClass === 'rogue' && currentComboForShadow >= 1) {
    // comboPersistShadow: 连击心得 — 连击时暗影残骰变为持久型（跨回合保留）
    const hasComboPersist = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.comboPersistShadow);
    if (hasComboPersist && tempDieToGrant) {
      tempDieToGrant.shadowRemnantPersistent = true;
      addFloatingText('连击心得: 残骰持久化!', 'text-green-400', undefined, 'player');
    }
    // comboGrantPlay: 袖箭连击 — 连击时+1出牌机会
    const hasComboPlay = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.comboGrantPlay);
    if (hasComboPlay) {
      setGame(prev => ({ ...prev, playsLeft: prev.playsLeft + 1 }));
      addFloatingText('连击袖箭: +1出牌!', 'text-cyan-400', undefined, 'player');
    }
  }

  // === 接应骰子：从骰子库补抽正式骰子 ===
  const bagDrawCount = selectedDiceForSpent.reduce((sum, d) => {
    const def = getDiceDef(d.diceDefId);
    return sum + (def.onPlay?.drawFromBag || 0);
  }, 0);
  if (bagDrawCount > 0) {
    setTimeout(() => {
      const g = gameRef.current;
      const { drawn, newBag, newDiscard, shuffled } = drawFromBag(g.diceBag, g.discardPile, bagDrawCount);
      if (shuffled) { addToast('弃骰库洗回骰子库', 'info'); }
      setGame(prev => ({ ...prev, diceBag: newBag, discardPile: newDiscard }));
      const newDice: Die[] = drawn.map(d => ({
        ...d,
        id: Date.now() + Math.floor(Math.random() * 10000),
        rolling: false, selected: false, spent: false, justAdded: true, isBonusDraw: true,
      }));
      const processed = applyDiceSpecialEffects(newDice, { hasLimitBreaker: hasLimitBreaker(g.relics), lockedElement: g.lockedElement });
      setDice(pd => [...pd, ...processed.map(d => ({ ...d, justAdded: true }))]);
      setTimeout(() => setDice(pd => pd.map(d => d.justAdded ? { ...d, justAdded: false } : d)), 600);
      addFloatingText(`接应: +${bagDrawCount}骰子`, 'text-cyan-300', undefined, 'player');
    }, 300);
  }
  
  setDice(prev => prev.map(d => {
    if (!d.selected) return d;
    const def = getDiceDef(d.diceDefId);
    // bounceAndGrow: 飞刀骰子出牌后弹回，点数+1（上限+3）
    if (def.onPlay?.bounceAndGrow) {
      const growCount = (d.bounceGrowCount || 0);
      if (growCount < 3) {
        return { ...d, selected: false, playing: false, spent: false, value: Math.min(6, d.value + 1), bounceGrowCount: growCount + 1 };
      }
      // 超过3次后正常消耗
    }
    // boomerangPlay: 回旋骰子 — 首次出牌弹回，同时标记下次出牌免费
    if (def.onPlay?.boomerangPlay && !(d.boomerangUsed)) {
      // 标记已用过本回合弹回，下次出牌免费（由 playsLeft 不减处理）
      return { ...d, selected: false, playing: false, spent: false, boomerangUsed: true };
    }
    return { ...d, spent: true, selected: false, playing: false };
  }));
  
  // grantExtraPlay: 影舞骰子给予额外出牌机会
  const hasExtraPlay = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.grantExtraPlay);
  if (hasExtraPlay) {
    setGame(prev => ({ ...prev, playsLeft: prev.playsLeft + 1 }));
    addFloatingText('+1出牌机会', 'text-green-400', undefined, 'player');
  }

  // grantPlayOnThird: 三连闪 — 第3次出牌时+1出牌机会
  if ((game.comboCount || 0) >= 2) {
    const hasPlayOnThird = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.grantPlayOnThird);
    if (hasPlayOnThird) {
      setGame(prev => ({ ...prev, playsLeft: prev.playsLeft + 1 }));
      addFloatingText('三连闪! +1出牌!', 'text-yellow-300', undefined, 'player');
    }
  }

  // grantTempDieFixed: 连击心得 — 每颗立即补1颗临时骰子（面值从faces随机取）
  const tempDieFixedDice = selectedDiceForSpent.filter(d => getDiceDef(d.diceDefId).onPlay?.grantTempDieFixed);
  if (tempDieFixedDice.length > 0) {
    const newTempDice = tempDieFixedDice.map((d, idx) => {
      const faces = getDiceDef(d.diceDefId).onPlay!.grantTempDieFixed!;
      const val = faces[Math.floor(Math.random() * faces.length)];
      return {
        id: Date.now() + 9000 + idx,
        diceDefId: 'r_combomastery',
        value: val,
        element: 'normal' as DiceElement,
        selected: false, spent: false, rolling: false,
        isTemp: true,
      };
    });
    setDice(prev => [...prev, ...newTempDice]);
    addFloatingText(`连击心得: +${tempDieFixedDice.length}临时骰`, 'text-green-300', undefined, 'player');
  }

  // boomerangPlay: 回旋骰子已弹回，给下次出牌免费（playsLeft不减）
  const hasBoomerangBounced = selectedDiceForSpent.some(d => d.boomerangUsed);
  if (hasBoomerangBounced) {
    setGame(prev => ({ ...prev, playsLeft: prev.playsLeft + 1 }));
    addFloatingText('回旋: 下次出牌免费!', 'text-cyan-300', undefined, 'player');
  }

  // doublePoisonOnCombo: 蚀骨毒液 — 连击时目标毒层翻倍
  if (currentCombo >= 1 && targetUid) {
    const hasDoublePoison = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.doublePoisonOnCombo);
    if (hasDoublePoison) {
      setEnemies(prev => prev.map(e => {
        if (e.uid !== targetUid) return e;
        const poison = e.statuses.find(s => s.type === 'poison');
        if (!poison || poison.value <= 0) return e;
        const doubled = poison.value * 2;
        addFloatingText(`蚀骨连击: 毒层翻倍(${doubled})`, 'text-green-500', undefined, 'enemy');
        return { ...e, statuses: e.statuses.map(s => s.type === 'poison' ? { ...s, value: doubled, duration: Math.max(s.duration || 2, 1) } : s) };
      }));
    }
  }

  // shadowClonePlay: 影分身 — 触发后自动再执行一次50%伤害的出牌（不消耗出牌次数）
  const hasShadowClone = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.shadowClonePlay);
  if (hasShadowClone && outcome.damage > 0) {
    const cloneDmg = Math.floor(outcome.damage * 0.5);
    if (cloneDmg > 0) {
      setTimeout(() => {
        setEnemies(prev => prev.map(e => {
          if (e.uid !== targetUid) return e;
          const afterArmor = Math.max(0, cloneDmg - e.armor);
          return { ...e, hp: e.hp - afterArmor, armor: Math.max(0, e.armor - cloneDmg) };
        }));
        addFloatingText(`影分身: ${cloneDmg}伤害`, 'text-purple-400', undefined, 'enemy');
      }, 400);
    }
  }
  
  // maxHpBonus / maxHpBonusEvery: 生命熔炉永久+maxHP
  selectedDiceForSpent.forEach(d => {
    const def = getDiceDef(d.diceDefId);
    if (def.onPlay?.maxHpBonusEvery) {
      // 每N次出牌才触发
      const every = def.onPlay.maxHpBonusEvery;
      setGame(prev => {
        const cnt = (prev.lifefurnaceCounter || 0) + 1;
        if (cnt >= every) {
          addFloatingText(`生命熔炉 最大HP+5`, 'text-red-300', undefined, 'player');
          return { ...prev, maxHp: prev.maxHp + 5, lifefurnaceCounter: 0 };
        }
        return { ...prev, lifefurnaceCounter: cnt };
      });
    } else if (def.onPlay?.maxHpBonus) {
      setGame(prev => ({ ...prev, maxHp: prev.maxHp + def.onPlay!.maxHpBonus! }));
    }
    // 生命熔炉v3：满血时永久+3最大HP（无上限）
    if (def.onPlay?.healOrMaxHp) {
      setGame(prev => {
        if (prev.hp >= prev.maxHp) {
          addFloatingText(`生命熔炉 最大HP+3`, 'text-red-300', undefined, 'player');
          return { ...prev, maxHp: prev.maxHp + 3 };
        }
        return prev;
      });
    }
  });

  // transferDebuff: 净化之刃 — 清除自身1个负面
  const hasTransferDebuff = selectedDiceForSpent.some(d => getDiceDef(d.diceDefId).onPlay?.transferDebuff);
  if (hasTransferDebuff) {
    setGame(prev => {
      const negatives = prev.statuses.filter(s => ['poison', 'burn', 'vulnerable', 'weak'].includes(s.type));
      if (negatives.length > 0) {
        const toRemove = negatives[0];
        addToast(`净化之刃: 移除${toRemove.type}并转移给敌人!`, 'buff');
        return { ...prev, statuses: prev.statuses.filter(s => s !== toRemove) };
      }
      return prev;
    });
  }
  
  // 补充临时骰子（延迟显示，只补1颗）
  if (tempDieToGrant) {
    const tmpDie = tempDieToGrant;
    setTimeout(() => {
      setDice(prev => [...prev, { ...tmpDie, justAdded: true }]);
      setTimeout(() => setDice(pd => pd.map(d => d.id === tmpDie.id ? { ...d, justAdded: false } : d)), 600);
      addFloatingText('+1暗影残骰', 'text-green-300', undefined, 'player');
    }, 300);
  }
  
  const usedElements = selectedDiceForSpent.filter(d => d.element !== 'normal').map(d => d.element);
  const isNormalAttackPlay = bestHand === '普通攻击';
  setGame(prev => ({ ...prev, discardPile: [...prev.discardPile, ...spentDefIds], elementsUsedThisBattle: [...new Set([...(prev.elementsUsedThisBattle || []), ...usedElements])], consecutiveNormalAttacks: isNormalAttackPlay ? (prev.consecutiveNormalAttacks || 0) + 1 : 0 }));

  let logMsg = `打出 ${bestHand}，造成 ${outcome.damage} 伤害`;
  if (outcome.armor > 0) logMsg += `，获得 ${outcome.armor} 护甲`;
  if (outcome.heal > 0) logMsg += `，回复 ${outcome.heal} 生命`;
  if (outcome.triggeredAugments.length > 0) {
    const augDetails = outcome.triggeredAugments.map(a => `${a.name}(${a.details})`).join(', ');
    logMsg += ` (触发: ${augDetails})`;
  }

  // 冠灯净化：出牌后才执行副作用（清除负面状态或移除诅咒骰子）
  if (outcome.holyPurify) {
    const purifyCount = typeof outcome.holyPurify === 'number' ? outcome.holyPurify : 1;
    const negativeStatuses = game.statuses.filter(s => ['poison', 'burn', 'vulnerable', 'weak'].includes(s.type));
    if (negativeStatuses.length > 0) {
      // 净化数量：purifyCount>=99表示全部净化
      const toPurge = purifyCount >= 99 ? negativeStatuses : 
        negativeStatuses.sort(() => Math.random() - 0.5).slice(0, purifyCount);
      const purgeTypes = new Set(toPurge.map(s => s.type));
      setGame(prev => ({
        ...prev,
        statuses: prev.statuses.filter(s => !purgeTypes.has(s.type)),
      }));
      const purgedNames = toPurge.map(s => s.type).join('、');
      addLog(`净化！清除了 ${purgedNames}`);
      addFloatingText(`净化 ${toPurge.length > 1 ? '×' + toPurge.length : purgedNames}`, 'text-cyan-300', undefined, 'player');
    } else {
      const cursedIdx = game.ownedDice.findIndex(d => d.defId === 'cursed' || d.defId === 'cracked');
      if (cursedIdx >= 0) {
        const cursedDefId = game.ownedDice[cursedIdx].defId;
        const cursedDef = getDiceDef(cursedDefId);
        setGame(prev => {
          const newOwned = [...prev.ownedDice];
          newOwned.splice(cursedIdx, 1);
          let removedFromBag = false;
          const newBag = prev.diceBag.filter(id => {
            if (!removedFromBag && id === cursedDefId) {
              removedFromBag = true;
              return false;
            }
            return true;
          });
          let removedFromDiscard = false;
          const newDiscard = prev.discardPile.filter(id => {
            if (!removedFromDiscard && id === cursedDefId) {
              removedFromDiscard = true;
              return false;
            }
            return true;
          });
          return { ...prev, ownedDice: newOwned, diceBag: newBag, discardPile: newDiscard };
        });
        addLog(`净化！移除了 ${cursedDef.name}`);
        addFloatingText(`净化 ${cursedDef.name}`, 'text-cyan-300', undefined, 'player');
      }
    }
  }
  logMsg += `。`;
  addLog(logMsg);
}

// [已提取到 checkEnemyDeathsModule.ts]
export { createCheckEnemyDeaths } from './checkEnemyDeathsModule';
