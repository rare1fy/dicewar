/**
 * instakillChallengeAid.ts — 洞察弱点挑战达成后的战斗援助效果
 *
 * 当玩家完成洞察弱点挑战（instakillChallenge）时，随机触发一种援助效果：
 *  1. 全场敌人百分比伤害
 *  2. 全场敌人HP降至N%
 *  3. 全场敌人施加灼烧+中毒
 *  4. 立刻补抽1颗骰子
 *  5. 骰子库全部替换为随机强力骰子
 *
 * 从 postPlayEffects.ts 拆出 (ARCH-G)
 */

import type { PostPlayContext } from './postPlayEffects';
import { drawFromBag } from '../data/diceBag';
import { applyDiceSpecialEffects } from './diceEffects';
import { hasLimitBreaker } from '../engine/relicQueries';

// --- 强力骰子池（效果5用） ---
const STRONG_DICE_POOL = [
  { id: 'blade', name: '锋刃骰子' },
  { id: 'amplify', name: '倍增骰子' },
  { id: 'split', name: '分裂骰子' },
  { id: 'magnet', name: '磁吸骰子' },
  { id: 'joker', name: '小丑骰子' },
  { id: 'chaos', name: '混沌骰子' },
  { id: 'elemental', name: '元素骰子' },
] as const;

/**
 * 检测洞察弱点挑战是否刚完成，若是则随机触发一种战斗援助效果。
 * 应在出牌后效处理中延迟调用（setTimeout 600ms）。
 */
export function triggerInstakillChallengeAid(ctx: PostPlayContext): void {
  const {
    gameRef, enemies,
    setGame, setEnemies, setDice,
    addFloatingText, addToast, addLog,
    playSound, setScreenShake, setEnemyEffectForUid,
  } = ctx;

  const currentChallenge = gameRef.current.instakillChallenge;
  if (!(currentChallenge?.completed) || gameRef.current.instakillCompleted) return;

  setGame(prev => ({ ...prev, instakillCompleted: true }));
  playSound('critical');
  setScreenShake(true);
  setTimeout(() => setScreenShake(false), 600);

  // 随机选择一种援助效果
  const g = gameRef.current;
  const currentNode = g.map.find(n => n.id === g.currentNodeId);
  const depth = currentNode?.depth || 0;
  const chapter = g.chapter;
  const isBoss = currentNode?.type === 'boss';

  const aidRoll = Math.random();

  if (aidRoll < 0.2) {
    // 效果1：对全场敌人造成大量伤害（基于敌人最大HP的百分比）
    const pct = isBoss ? 0.3 : 0.5;
    const dmgText = `${Math.round(pct * 100)}%`;
    addFloatingText(`✦ 弱点击破 ✦`, 'text-yellow-300', undefined, 'enemy', true);
    addToast(`◆ 洞察弱点！全场敌人受到${dmgText}最大生命值伤害`, 'buff');
    addLog(`洞察弱点达成！全场敌人受到${dmgText}最大HP伤害`);
    setTimeout(() => {
      setEnemies(prev => prev.map(e => {
        if (e.hp <= 0) return e;
        const dmg = Math.floor(e.maxHp * pct);
        const newHp = Math.max(1, e.hp - dmg);
        return { ...e, hp: newHp };
      }));
      enemies.filter(e => e.hp > 0).forEach(e => {
        addFloatingText(`-${Math.floor(e.maxHp * pct)}`, 'text-red-500', undefined, 'enemy');
        setEnemyEffectForUid(e.uid, 'hit');
      });
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }, 800);
  } else if (aidRoll < 0.4) {
    // 效果2：全场敌人HP降至N%
    const targetPct = isBoss ? 0.5 : 0.35;
    const pctText = `${Math.round(targetPct * 100)}%`;
    addFloatingText(`✦ 弱点击破 ✦`, 'text-yellow-300', undefined, 'enemy', true);
    addToast(`◆ 洞察弱点！全场敌人血量降至${pctText}`, 'buff');
    addLog(`洞察弱点达成！全场敌人血量降至${pctText}`);
    setTimeout(() => {
      setEnemies(prev => prev.map(e => {
        if (e.hp <= 0) return e;
        const cap = Math.floor(e.maxHp * targetPct);
        if (e.hp <= cap) return e;
        return { ...e, hp: cap };
      }));
      enemies.filter(e => e.hp > 0).forEach(e => {
        setEnemyEffectForUid(e.uid, 'hit');
      });
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }, 800);
  } else if (aidRoll < 0.6) {
    // 效果3：全场敌人施加大量灼烧+中毒
    const stacks = 3 + depth + (chapter - 1) * 2;
    addFloatingText(`✦ 弱点击破 ✦`, 'text-yellow-300', undefined, 'enemy', true);
    addToast(`◆ 洞察弱点！全场敌人获得${stacks}层灼烧+${stacks}层中毒`, 'buff');
    addLog(`洞察弱点达成！全场敌人获得${stacks}层灼烧和中毒`);
    setTimeout(() => {
      setEnemies(prev => prev.map(e => {
        if (e.hp <= 0) return e;
        const newStatuses = [...(e.statuses || [])];
        const burnIdx = newStatuses.findIndex(s => s.type === 'burn');
        if (burnIdx >= 0) newStatuses[burnIdx] = { ...newStatuses[burnIdx], value: newStatuses[burnIdx].value + stacks };
        else newStatuses.push({ type: 'burn', value: stacks, duration: 99 });
        const poisonIdx = newStatuses.findIndex(s => s.type === 'poison');
        if (poisonIdx >= 0) newStatuses[poisonIdx] = { ...newStatuses[poisonIdx], value: newStatuses[poisonIdx].value + stacks };
        else newStatuses.push({ type: 'poison', value: stacks, duration: 99 });
        return { ...e, statuses: newStatuses };
      }));
      enemies.filter(e => e.hp > 0).forEach(e => {
        setEnemyEffectForUid(e.uid, 'debuff');
      });
    }, 800);
  } else if (aidRoll < 0.8) {
    // 效果4：本场战斗骰子上限+1，立刻补抽
    addFloatingText(`✦ 弱点击破 ✦`, 'text-yellow-300', undefined, 'enemy', true);
    addToast(`◆ 洞察弱点！立刻补抽1颗骰子！`, 'buff');
    addLog(`洞察弱点达成！立刻补抽1颗骰子`);
    setTimeout(() => {
      const g = gameRef.current;
      const { drawn, newBag, newDiscard } = drawFromBag(g.diceBag, g.discardPile, 1);
      if (drawn.length > 0) {
        setGame(prev => ({ ...prev, diceBag: newBag, discardPile: newDiscard }));
        const newDie = {
          ...drawn[0],
          id: Date.now() + 9000,
          selected: false, spent: false, rolling: false, justAdded: true, isBonusDraw: true,
        };
        const processed = applyDiceSpecialEffects([newDie], { hasLimitBreaker: hasLimitBreaker(g.relics), lockedElement: g.lockedElement });
        setDice(prev => [...prev, ...processed.map(d => ({ ...d, justAdded: true }))]);
        setTimeout(() => setDice(pd => pd.map(d => d.justAdded ? { ...d, justAdded: false } : d)), 600);
        addFloatingText(`+1骰子`, 'text-yellow-300', undefined, 'player');
      }
    }, 800);
  } else {
    // 效果5：骰子库全部临时替换为随机一种强力骰子
    const pick = STRONG_DICE_POOL[Math.floor(Math.random() * STRONG_DICE_POOL.length)];
    addFloatingText(`✦ 弱点击破 ✦`, 'text-yellow-300', undefined, 'enemy', true);
    addToast(`◆ 洞察弱点！骰子库全部变为${pick.name}！`, 'buff');
    addLog(`洞察弱点达成！骰子库临时替换为${pick.name}`);
    setTimeout(() => {
      setGame(prev => ({
        ...prev,
        diceBag: prev.diceBag.map(() => pick.id),
        discardPile: prev.discardPile.map(() => pick.id),
      }));
    }, 800);
  }
}
