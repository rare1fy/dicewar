/**
 * drawPhase.ts — 回合结束抽牌阶段
 *
 * 从 DiceHeroGame.tsx endTurn() L2429-L2654 提取。
 * 包含：三职业差异弃牌/留牌、命运之轮、血之契约、抽牌数计算、
 *       drawFromBag抽牌、keptDice处理、roll动画。
 *
 * ARCH-F Round1 模块拆分
 */

import type { MutableRef, StateSetter, AddFloatingText } from '../types/battleContexts';
import type { Die, GameState } from '../types/game';
import { getDiceDef, rollDiceDef } from '../data/dice';
import { drawFromBag } from '../data/diceBag';
import { applyDiceSpecialEffects } from './diceEffects';
import { hasRelic, hasLimitBreaker } from '../engine/relicQueries';

// ============================================================
// Context 接口
// ============================================================

export interface DrawPhaseContext {
  gameRef: MutableRef<GameState>;
  game: GameState;
  dice: Die[];

  // Callbacks
  setGame: StateSetter<GameState>;
  setDice: StateSetter<Die[]>;
  setRerollCount: StateSetter<number>;
  setShuffleAnimating: StateSetter<boolean>;
  setDiceDrawAnim: StateSetter<boolean>;
  addFloatingText: AddFloatingText;
  addToast: (msg: string, type?: string) => void;
  playSound: (id: string) => void;
}

// ============================================================
// 主函数
// ============================================================

export function executeDrawPhase(ctx: DrawPhaseContext): void {
  const {
    gameRef, game, dice,
    setGame, setDice, setRerollCount,
    setShuffleAnimating, setDiceDrawAnim,
    addFloatingText, addToast, playSound,
  } = ctx;

  // === 回合结束留手牌机制（职业差异） ===
  const g2 = gameRef.current;
  let remainingDice: Die[];
  let discardFromHand: string[] = [];
  
  if (g2.playerClass === 'mage') {
    // 法师：吟唱回合（未出牌）保留手牌，出过牌的回合弃掉所有手牌
    const playedThisTurnCheck = g2.playsLeft < g2.maxPlays;
    if (playedThisTurnCheck) {
      // 出过牌 → 弃掉所有手牌（和战士一样）
      discardFromHand = dice.filter(d => !d.spent).map(d => d.diceDefId);
      remainingDice = [];
    } else {
      // 吟唱（未出牌）→ 保留手牌，按吟唱层上限裁剪
      const chargeStacks = g2.chargeStacks || 0;
      const handLimit = Math.min(6, g2.drawCount + chargeStacks);
      remainingDice = dice.filter(d => !d.spent);
      if (remainingDice.length > handLimit) {
        const excess = remainingDice.slice(0, remainingDice.length - handLimit);
        discardFromHand = excess.map(d => d.diceDefId);
        remainingDice = remainingDice.slice(remainingDice.length - handLimit);
      }
    }
  } else if (g2.playerClass === 'rogue') {
    // 盗贼回合结束：
    // - 持久暗影残骰(shadowRemnantPersistent)：保留到下回合，清除persistent标记
    // - 普通临时暗影残骰(isTemp且非persistent)：直接销毁，不放回弃骰库
    // - 正式骰子：放回弃骰库
    const unspent = dice.filter(d => !d.spent);
    const persistentShadow = unspent.filter(d => d.isShadowRemnant && d.shadowRemnantPersistent);
    const normalDice = unspent.filter(d => !d.isShadowRemnant && !d.isTemp && d.diceDefId !== 'temp_rogue');
    discardFromHand = normalDice.map(d => d.diceDefId);
    // 持久暗影残骰保留但清除persistent标记（下回合结束时会被销毁）
    remainingDice = persistentShadow.map(d => ({ ...d, shadowRemnantPersistent: false, isTemp: true }));
  } else {
    // 战士/其他：默认全部弃掉
    // 命运之轮：首次出牌后保留手牌1次
    const hasKeepOnce = hasRelic(g2.relics, 'fortune_wheel_relic') && !(g2.fortuneWheelUsed);
    if (hasKeepOnce && g2.playsLeft < g2.maxPlays) {
      remainingDice = dice.filter(d => !d.spent);
      discardFromHand = [];
      setGame(prev => ({ ...prev, fortuneWheelUsed: true }));
      addFloatingText('命运之轮: 保留手牌!', 'text-yellow-300', undefined, 'player');
    } else {
      discardFromHand = dice.filter(d => !d.spent).map(d => d.diceDefId);
      remainingDice = [];
    }
  }

  // 血之契约遗物：保留最高点骰子（任何职业，在弃牌后追加保留）
  const keepHighest = g2.relicKeepHighest || 0;
  if (keepHighest > 0 && discardFromHand.length > 0) {
    const unspent = dice.filter(d => !d.spent).sort((a, b) => b.value - a.value);
    const toKeep = unspent.slice(0, keepHighest);
    toKeep.forEach(d => {
      const idx = discardFromHand.indexOf(d.diceDefId);
      if (idx >= 0) {
        discardFromHand.splice(idx, 1);
        remainingDice.push(d);
      }
    });
    setGame(prev => ({ ...prev, relicKeepHighest: 0 }));
    if (toKeep.length > 0) addFloatingText(`保留${toKeep.map(d => d.value).join(',')}点骰子`, 'text-cyan-300', undefined, 'player');
  }
  
  // 把弃掉的手牌放入弃骰库
  if (discardFromHand.length > 0) {
    setGame(prev => ({ ...prev, discardPile: [...prev.discardPile, ...discardFromHand] }));
  }
  
  const remainingCount = remainingDice.length;
  
  // Capture draw bonus from on_turn_end effects before entering setTimeout (closure captures value)
  const schrodingerBonus = game.tempDrawCountBonus || 0;
  // Reset tempDrawCountBonus for next turn
  setGame(prev => ({ ...prev, tempDrawCountBonus: 0 }));
  // Use setTimeout to ensure previous state updates are flushed
  setTimeout(() => {
    // Read latest game state from ref (setTimeout ensures prior setGame calls are flushed)
    const g = gameRef.current;
    setRerollCount(0);
    // 计算抽牌数：法师按蓄力上限（硬顶6），战士可能+1
    const chargeBonus = g.playerClass === 'mage' ? (g.chargeStacks || 0) : 0;
    const warriorBonus = (g.playerClass === 'warrior' && g.hp <= g.maxHp * 0.5) ? 1 : 0;
    if (warriorBonus > 0) {
      addFloatingText('血怒补牌+1', 'text-red-400', undefined, 'player');
    }
    const rawTargetHandSize = g.drawCount + chargeBonus + warriorBonus;
    const targetHandSize = Math.min(6, rawTargetHandSize);
    // 战士：手牌已达6上限时，按受伤百分比给伤害倍率补偿
    if (g.playerClass === 'warrior' && rawTargetHandSize > 6) {
      const hpLostPct = Math.max(0, 1 - g.hp / g.maxHp);
      const rageMult = Math.round(hpLostPct * 100) / 100;
      setGame(prev => ({ ...prev, warriorRageMult: rageMult }));
      if (rageMult > 0) {
        setTimeout(() => addFloatingText(`狂暴+${Math.round(rageMult * 100)}%`, 'text-red-500', undefined, 'player'), 200);
      }
    } else if (g.playerClass === 'warrior') {
      setGame(prev => ({ ...prev, warriorRageMult: 0 }));
    }
    // 盗贼连击心得额外抽牌
    const rogueDrawBonus2 = (g.playerClass === 'rogue' && (g.rogueComboDrawBonus || 0) > 0) ? (g.rogueComboDrawBonus || 0) : 0;
    if (rogueDrawBonus2 > 0) {
      addFloatingText(`连击心得+${rogueDrawBonus2}手牌`, 'text-green-300', undefined, 'player');
      setGame(prev => ({ ...prev, rogueComboDrawBonus: 0 }));
    }
    // 魔法手套遗物临时手牌加成
    const relicDrawBonus2 = g.relicTempDrawBonus || 0;
    if (relicDrawBonus2 > 0) {
      addFloatingText(`魔法手套+${relicDrawBonus2}手牌`, 'text-cyan-300', undefined, 'player');
      setGame(prev => ({ ...prev, relicTempDrawBonus: 0 }));
    }
    const needDraw = Math.max(0, targetHandSize + schrodingerBonus + rogueDrawBonus2 + relicDrawBonus2 - (remainingCount - remainingDice.filter(d => d.diceDefId === 'temp_rogue' || d.isBonusDraw).length));
    
    // 直接从 gameRef.current 读取最新状态进行抽牌计算
    // setTimeout 保证之前的 setGame 已 flush，gameRef.current 是最新值
    let finalBag = [...g.diceBag];
    let finalDiscard = [...g.discardPile];
    let drawnDice: Die[] = [];
    let wasShuffled = false;
    
    if (needDraw > 0) {
      const result = drawFromBag(finalBag, finalDiscard, needDraw);
      drawnDice = result.drawn;
      finalBag = result.newBag;
      finalDiscard = result.newDiscard;
      wasShuffled = result.shuffled;
    }
    
    // 原子更新骰子库状态
    setGame(prev => ({ ...prev, diceBag: finalBag, discardPile: finalDiscard }));
    
    if (wasShuffled) { setShuffleAnimating(true); setTimeout(() => setShuffleAnimating(false), 800); addToast('\u2728 弃骰库已洗回骰子库!', 'buff'); }
    
    // Merge kept dice + fresh dice — 并处理法师"保留"类效果
    const keptDice: Die[] = remainingDice.map((d) => {
      const def = getDiceDef(d.diceDefId);
      let newValue = d.value;
      // bonusOnKeep: 水晶骰子 — 保留到下回合时点数+N
      if (def.onPlay?.bonusOnKeep) {
        newValue = Math.min(6, newValue + def.onPlay.bonusOnKeep);
        addFloatingText(`${def.name}+${def.onPlay.bonusOnKeep}点`, 'text-cyan-400', undefined, 'player');
      // boostLowestOnKeep: 时光之沙 — 保留时手牌中最低点骰子+2
      if (def.onPlay?.boostLowestOnKeep) {
        const minVal = Math.min(...keptDice.map(kd => kd.value));
        keptDice.forEach(kd => {
          if (kd.value === minVal) {
            kd.value = Math.min(6, kd.value + 2);
          }
        });
      }

      }
      // bonusPerTurnKept: 星辰骰子 — 每保留1回合+N点（累积有上限）
      if (def.onPlay?.bonusPerTurnKept) {
        const cap = def.onPlay.keepBonusCap || 99;
        const accumulated = d.keptBonusAccum || 0;
        if (accumulated < cap) {
          const bonus = Math.min(def.onPlay.bonusPerTurnKept, cap - accumulated);
          newValue = Math.min(6, newValue + bonus);
          addFloatingText(`${def.name}+${bonus}点(${accumulated + bonus}/${cap})`, 'text-purple-400', undefined, 'player');
          return {
            ...d,
            value: newValue,
            selected: false,
            kept: true,
            keptBonusAccum: accumulated + bonus,
          };
        }
      }
      return {
        ...d,
        value: newValue,
        selected: false,
        kept: true,
      };
    });
    // rerollOnKeep: 时光骰子 — 保留到下回合时自动重投
    keptDice.forEach((d, idx) => {
      const def = getDiceDef(d.diceDefId);
      if (def.onPlay?.rerollOnKeep) {
        keptDice[idx] = { ...d, value: rollDiceDef(def), rolling: false };
        addFloatingText(`${def.name}自动重投`, 'text-blue-400', undefined, 'player');
      }
    });
    // bonusMultOnKeep: 法力涌动 — 保留时给下次出牌额外倍率（累积到mageOverchargeMult）
    const keepMultBonus = keptDice.reduce((sum, d) => {
      const def = getDiceDef(d.diceDefId);
      return sum + (def.onPlay?.bonusMultOnKeep || 0);
    }, 0);
    if (keepMultBonus > 0) {
      setGame(prev => ({ ...prev, mageOverchargeMult: (prev.mageOverchargeMult || 0) + keepMultBonus }));
      addFloatingText(`蓄力倍率+${Math.round(keepMultBonus * 100)}%`, 'text-purple-400', undefined, 'player');
    }
    // drawnDice is computed synchronously above, guaranteed to have values
    const freshDice: Die[] = drawnDice.map((d) => ({
      ...d,
      rolling: true,
      kept: false,
      value: Math.floor(Math.random() * 6) + 1,
    }));
    
    // Side effects: animations and dice update
    setDiceDrawAnim(true);
    setTimeout(() => setDiceDrawAnim(false), 400);
    setDice([...keptDice, ...freshDice]);
    
    // Roll animation for fresh dice only
    const doRoll = async () => {
      const frameTimes = [30, 40, 50, 60, 80, 100, 120, 150];
      for (let f = 0; f < frameTimes.length; f++) {
        await new Promise(r => setTimeout(r, frameTimes[f]));
        setDice(pd => pd.map(d => d.rolling ? { ...d, value: rollDiceDef(getDiceDef(d.diceDefId)) } : d));
        if (f === 3) playSound('reroll');
      }
      setDice(pd => pd.map(d => ({ ...d, rolling: false, kept: false })));
      // 元素骰子坍缩 + 小丑骰子1-9随机
      setDice(prev => applyDiceSpecialEffects(prev, { hasLimitBreaker: hasLimitBreaker(game.relics) , lockedElement: game.lockedElement }));
      playSound('dice_lock');
      await new Promise(r => setTimeout(r, 200));
      setDice(prev => [...prev]);
    };
    doRoll();
  }, 100);
  playSound('roll');
}
