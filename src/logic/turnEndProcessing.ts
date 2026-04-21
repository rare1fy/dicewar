/**
 * turnEndProcessing.ts — 回合结束处理（前半段）
 *
 * 从 DiceHeroGame.tsx endTurn() L2277-L2397 提取。
 * 包含：法师星界吟唱、冥想骰子、on_turn_end遗物触发、嘲讽骰子反噬。
 *
 * ARCH-F Round1 模块拆分
 */

import type { StateSetter, AddFloatingText } from '../types/battleContexts';
import type { Die, GameState, Enemy } from '../types/game';
import { getDiceDef } from '../data/dice';
import { buildRelicContext } from '../engine/buildRelicContext';

// ============================================================
// Context 接口
// ============================================================

export interface TurnEndContext {
  game: GameState;
  enemies: Enemy[];
  dice: Die[];
  rerollCount: number;

  // Callbacks
  setGame: StateSetter<GameState>;
  setEnemies: StateSetter<Enemy[]>;
  addFloatingText: AddFloatingText;
  addToast: (msg: string, type?: string) => void;
  addLog: (msg: string) => void;
  playSound: (id: string) => void;
  setScreenShake: StateSetter<boolean>;
  buildRelicContext: typeof buildRelicContext;
}

// ============================================================
// 主函数
// ============================================================

export async function processTurnEnd(ctx: TurnEndContext): Promise<void> {
  const {
    game, enemies, dice, rerollCount,
    setGame, setEnemies,
    addFloatingText, addToast, addLog, playSound,
    buildRelicContext: buildCtx,
  } = ctx;

  playSound('turn_end');
  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0 || game.isEnemyTurn || dice.some(d => d.playing)) return;

  // === 职业回合结束处理 ===
  // 法师【星界吟唱】：未出牌时吟唱+1（手牌上限3→4→5→6递增），到6后继续吟唱给倍率
  const playedThisTurn = game.playsLeft < game.maxPlays; // 本回合是否出过牌
  if (game.playerClass === 'mage' && !playedThisTurn) {
    const currentCharge = game.chargeStacks || 0;
    const maxChargeForHand = 6 - game.drawCount; // drawCount=3 → 最多蓄力3层到达上限6
    
    if (currentCharge >= maxChargeForHand) {
      // 手牌上限已达6颗，继续蓄力给伤害倍率加成（每次+10%）
      const overchargeBonus = 0.1;
      const chargeArmor = 6 + currentCharge * 2;
      setGame(prev => ({
        ...prev,
        chargeStacks: currentCharge + 1,
        mageOverchargeMult: (prev.mageOverchargeMult || 0) + overchargeBonus,
        armor: prev.armor + chargeArmor,
      }));
      addFloatingText(`过充! 伤害+${Math.round(((game.mageOverchargeMult || 0) + overchargeBonus) * 100)}%`, 'text-purple-400', undefined, 'player');
      addFloatingText(`+${chargeArmor}护甲`, 'text-blue-400', undefined, 'player');
    } else {
      // 正常吟唱：手牌上限+1
      const newChargeStacks = currentCharge + 1;
      const newHandLimit = Math.min(6, game.drawCount + newChargeStacks);
      const chargeArmor = 6 + currentCharge * 2;
      setGame(prev => ({
        ...prev, chargeStacks: newChargeStacks, armor: prev.armor + chargeArmor,
      }));
      addFloatingText(`吟唱 ${newHandLimit}/6`, 'text-purple-400', undefined, 'player');
      addFloatingText(`+${chargeArmor}护甲`, 'text-blue-400', undefined, 'player');
    }
  } else if (game.playerClass === 'mage' && playedThisTurn) {
    // 出了牌就重置吟唱和过充倍率
    setGame(prev => ({ ...prev, chargeStacks: 0, mageOverchargeMult: 0 }));
  }

  // healOnSkip: 冥想骰子 — 未出牌时手牌中有冥想骰子则回复HP
  if (!playedThisTurn) {
    dice.filter(d => !d.spent).forEach(d => {
      const def = getDiceDef(d.diceDefId);
      if (def.onPlay?.healOnSkip) {
        setGame(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + def.onPlay!.healOnSkip!) }));
        addFloatingText(`+${def.onPlay.healOnSkip}HP`, 'text-green-400', undefined, 'player');
      }
      // purifyOneOnSkip: 冥想回合净化1层
      if (def.onPlay?.purifyOneOnSkip) {
        setGame(prev => {
          const negStatuses = prev.statuses.filter(s => ['poison', 'burn', 'vulnerable', 'weak'].includes(s.type));
          if (negStatuses.length > 0) {
            const toRemove = negStatuses[0];
            addFloatingText(`冥想净化: ${toRemove.type}`, 'text-green-300', undefined, 'player');
            return { ...prev, statuses: prev.statuses.filter(s => s !== toRemove) };
          }
          return prev;
        });
      }
    });
  }

  // === on_turn_end 遗物触发 ===
  const turnEndCtx = buildCtx({ game, dice, targetEnemy: enemies.find(e => e.hp > 0) || null, rerollsThisTurn: rerollCount, hasPlayedThisTurn: playedThisTurn });
  const turnEndEffects = game.relics.filter(r => r.trigger === 'on_turn_end').map(r => ({ relic: r, effect: r.effect(turnEndCtx) }));
  let turnEndDrawBonus = 0;
  turnEndEffects.forEach(({ relic, effect }) => {
    // 蓄力晶核：未出牌时加护甲+回血
    if (effect.armor && effect.armor > 0) {
      setGame(prev => ({ ...prev, armor: prev.armor + effect.armor! }));
      addFloatingText(`+${effect.armor}护甲`, 'text-blue-400', undefined, 'player');
    }
    if (effect.heal && effect.heal > 0) {
      setGame(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + effect.heal!) }));
      addFloatingText(`+${effect.heal}HP`, 'text-green-400', undefined, 'player');
    }
    // 薛定谔的袋子：drawCountBonus
    if (effect.drawCountBonus && effect.drawCountBonus > 0) {
      turnEndDrawBonus += effect.drawCountBonus;
      addLog(`${relic.name}：下回合额外抽${effect.drawCountBonus}颗骰子！`);
    }
  });
  // 存入 game state，供抽牌阶段读取
  if (turnEndDrawBonus > 0) {
    setGame(prev => ({ ...prev, tempDrawCountBonus: (prev.tempDrawCountBonus || 0) + turnEndDrawBonus }));
  }

  // tauntAll: 咆哮骰子 — 嘲讽全体敌人：无视距离立即攻击玩家一次，算作敌人回合
  if (playedThisTurn) {
    const hasTaunt = dice.filter(d => d.spent).some(d => getDiceDef(d.diceDefId).onPlay?.tauntAll);
    if (hasTaunt) {
      addToast('咆哮嘲讽！全体敌人被迫攻击！', 'info');
      // 所有存活敌人立即对玩家进行一次攻击
      const aliveEnemies = enemies.filter(e => e.hp > 0);
      let totalTauntDmg = 0;
      aliveEnemies.forEach(e => {
        const dmg = e.attackDmg || 3;
        totalTauntDmg += dmg;
      });
      if (totalTauntDmg > 0) {
        setTimeout(() => {
          setGame(prev => {
            const armored = prev.armor;
            const afterArmor = Math.max(0, totalTauntDmg - armored);
            const newArmor = Math.max(0, armored - totalTauntDmg);
            return {
              ...prev,
              hp: Math.max(0, prev.hp - afterArmor),
              armor: newArmor,
            };
          });
          addFloatingText(`-${totalTauntDmg}`, 'text-red-500', undefined, 'player');
          addToast(`嘲讽反噬：全体敌人攻击造成${totalTauntDmg}伤害`, 'damage');
          playSound('enemy_skill');
        }, 400);
      }
      // 嘲讽攻击算作敌人的回合行动，距离归0
      setEnemies(prev => prev.map(e => ({ ...e, distance: 0 })));
    }
  }
}
