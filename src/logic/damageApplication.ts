/**
 * damageApplication.ts — 伤害应用逻辑
 *
 * 从 DiceHeroGame.tsx playHand() L1432-L1672 提取。
 * 纯函数：接收 state 快照 + 回调，执行伤害/护甲/回血等应用。
 *
 * ARCH-F Round1 模块拆分
 */

import type { Die, GameState, Enemy, HandResult } from '../types/game';
import type { MutableRef, StateSetter, AddFloatingText } from '../types/battleContexts';
import type { ExpectedOutcomeResult } from './expectedOutcomeTypes';
import type { EnemyQuotes } from '../config/enemies';
import { getDiceDef } from '../data/dice';
import { STATUS_INFO } from '../data/statusInfo';
import { ANIMATION_TIMING } from '../config';

// ============================================================
// Context 接口
// ============================================================

export interface DamageAppContext {
  game: GameState;
  enemies: Enemy[];
  dice: Die[];
  selected: Die[];
  outcome: ExpectedOutcomeResult;
  targetEnemy: Enemy;
  settleDice: Die[];  // 来自 settlementAnimation 的返回值
  currentHands: HandResult;
  targetUid: string;
  isAoeActive: boolean;

  // Ref
  playsPerEnemyRef: MutableRef<Record<string, number>>;

  // Callbacks
  setEnemies: StateSetter<Enemy[]>;
  setGame: StateSetter<GameState>;
  setArmorGained: StateSetter<boolean>;
  setHpGained: StateSetter<boolean>;
  setPlayerEffect: StateSetter<string | null>;
  setEnemyEffectForUid: (uid: string, effect: string | null) => void;
  enemyQuotedLowHp: Set<string>;
  setEnemyQuotedLowHp: StateSetter<Set<string>>;
  addFloatingText: AddFloatingText;
  playSound: (id: string) => void;
  showEnemyQuote: (uid: string, text: string, duration: number) => void;
  getEnemyQuotes: (configId: string) => EnemyQuotes | undefined;
  pickQuote: (quotes?: string[]) => string | undefined;
}

// ============================================================
// 主函数
// ============================================================

export function applyDamageToEnemies(ctx: DamageAppContext): {
  hasAoe: boolean;
  isElementalAoe: boolean;
  finalEnemyHp: number;
} {
  const {
    game, enemies, selected, outcome, targetEnemy,
    currentHands, targetUid, isAoeActive,
    playsPerEnemyRef,
    setEnemies, setGame, setArmorGained, setHpGained, setPlayerEffect,
    setEnemyEffectForUid, enemyQuotedLowHp, setEnemyQuotedLowHp,
    addFloatingText, playSound, showEnemyQuote, getEnemyQuotes, pickQuote,
  } = ctx;

  // --- Apply damage to enemy (with AOE support) ---
  const selectedDefs = selected.map(d => getDiceDef(d.diceDefId));
  const hasThunderElement = selected.some(d => d.element === 'thunder');
  const hasAoe = hasThunderElement || selectedDefs.some(def => def.onPlay?.aoe) || currentHands.activeHands.some(h => ['顺子', '4顺', '5顺', '6顺'].includes(h));
  // 同元素牌型的状态效果AOE（对所有敌人施加状态）
  const isElementalAoe = currentHands.activeHands.some(h => ['元素顺', '元素葫芦', '皇家元素顺'].includes(h));
  
  if (outcome.damage > 0) {
    if (hasAoe) {
      // AOE: 对所有存活敌人造成伤害
      const aliveEnemies = enemies.filter(e => e.hp > 0);
      // AOE也算攻击过这些敌人（避免后续首杀魂晶误判）
      aliveEnemies.forEach(e => {
        if (!playsPerEnemyRef.current[e.uid]) {
          playsPerEnemyRef.current = { ...playsPerEnemyRef.current, [e.uid]: 1 };
        }
      });
      aliveEnemies.forEach((e, idx) => {
        setTimeout(() => {
          const absorbed = Math.min(e.armor, outcome.damage);
          const hpDamage = Math.max(0, outcome.damage - absorbed);
          if (absorbed > 0) addFloatingText(`-${absorbed}`, 'text-blue-400', undefined, 'enemy');
          if (hpDamage > 0) addFloatingText(`-${hpDamage}`, 'text-red-500', undefined, 'enemy');
        }, idx * 150);
      });
    } else {
      const absorbed = Math.min(targetEnemy.armor, outcome.damage);
      const hpDamage = Math.max(0, outcome.damage - absorbed);
      if (absorbed > 0) addFloatingText(`-${absorbed}`, 'text-blue-400', undefined, 'enemy');
      if (hpDamage > 0) setTimeout(() => addFloatingText(`-${hpDamage}`, 'text-red-500', undefined, 'enemy'), absorbed > 0 ? 150 : 0);
    }
  }

  // Apply to player
  if (outcome.armor > 0) {
    setArmorGained(true);
    playSound('armor');
    addFloatingText(`+${outcome.armor}`, 'text-blue-400', undefined, 'player');
    setTimeout(() => setArmorGained(false), 500);
  }
  if (outcome.heal > 0) {
    setHpGained(true);
    playSound('heal');
    addFloatingText(`+${outcome.heal}`, 'text-emerald-500', undefined, 'player');
    setTimeout(() => setHpGained(false), 500);
  }
  
  // Status effects on enemies
  if (outcome.statusEffects && outcome.statusEffects.length > 0) {
    if (isElementalAoe) {
      // 高阶同元素牌型：状态效果AOE全体敌人
      addFloatingText('元素爆发!', 'text-[var(--pixel-gold)]', undefined, 'enemy');
    }
    outcome.statusEffects.forEach((s, idx) => {
      setTimeout(() => {
        const info = STATUS_INFO[s.type];
        addFloatingText(`${info.label} ${s.value}`, info.color.replace('text-', 'text-'), info.iconKey, 'enemy');
      }, idx * 200);
    });
  }

  // Calculate and apply damage to enemies
  let finalEnemyHp = targetEnemy.hp; // will be updated for single-target path
  if (hasAoe) {
    // AOE: damage all alive enemies
    setEnemies(prev => prev.map(e => {
      if (e.hp <= 0) return e;
      let dmg = outcome.damage;
      let arm = e.armor;
      // 火元素：摧毁护甲
      if (outcome.armorBreak) { arm = 0; }
      if (arm > 0) {
        const absorbed = Math.min(arm, dmg);
        arm -= absorbed;
        dmg -= absorbed;
      }
      const newHp = Math.max(0, e.hp - dmg);
      let newStatuses = [...e.statuses];
      // AOE状态效果也施加给所有敌人
      if (outcome.statusEffects) {
        outcome.statusEffects.forEach(s => {
          const existing = newStatuses.find(es => es.type === s.type);
          if (existing) { existing.value += s.value; }
          else { newStatuses.push({ ...s }); }
        });
      }
      if (newHp <= 0) {
        setEnemyEffectForUid(e.uid, 'death'); playSound('enemy_death');
        const dq2 = getEnemyQuotes(e.configId);
        const dl2 = pickQuote(dq2?.death);
        if (dl2) showEnemyQuote(e.uid, dl2, ANIMATION_TIMING.enemyDeathDuration + 200);
      }
      return { ...e, hp: newHp, armor: arm, statuses: newStatuses };
    }));
  } else {
    // Single target
    let remainingDamage = outcome.damage;
    let enemyArmor = targetEnemy.armor;
    // 火元素：无视护甲，伤害直接作用于HP
    if (outcome.armorBreak) {
      // 摧毁全部护甲 + 伤害不被护甲减免
      enemyArmor = 0;
    } else if (enemyArmor > 0) {
      const absorbed = Math.min(enemyArmor, remainingDamage);
      enemyArmor -= absorbed;
      remainingDamage -= absorbed;
    }
    finalEnemyHp = targetEnemy.hp - remainingDamage; // 保留负值用于overkill计算
    if (finalEnemyHp <= 0) {
      setEnemyEffectForUid(targetUid, 'death'); playSound('enemy_death');
      const dq = getEnemyQuotes(targetEnemy.configId);
      const dl = pickQuote(dq?.death);
      if (dl) showEnemyQuote(targetUid, dl, ANIMATION_TIMING.enemyDeathDuration + 200);
    } else if (finalEnemyHp / targetEnemy.maxHp < 0.3 && !enemyQuotedLowHp.has(targetUid)) {
      const lqc = getEnemyQuotes(targetEnemy.configId);
      const ll = pickQuote(lqc?.lowHp);
      if (ll) {
        showEnemyQuote(targetUid, ll, 3000);
        playSound('enemy_speak');
        setEnemyEffectForUid(targetUid, 'speaking');
        setTimeout(() => setEnemyEffectForUid(targetUid, null), ANIMATION_TIMING.speakingEffectDuration);
        setEnemyQuotedLowHp(prev => new Set([...prev, targetUid]));
      }
    }
    
    setEnemies(prev => prev.map(e => {
      if (e.uid !== targetUid) return e;
      let newStatuses = [...e.statuses];
      if (outcome.statusEffects) {
        outcome.statusEffects.forEach(s => {
          const existing = newStatuses.find(es => es.type === s.type);
          if (existing) { existing.value += s.value; }
          else { newStatuses.push({ ...s }); }
        });
      }
      // 高阶同元素：状态也施加给其他敌人
      return { ...e, hp: Math.max(0, finalEnemyHp), armor: enemyArmor, statuses: newStatuses };
    }));
    
    // 高阶同元素牌型：状态效果AOE施加给非目标敌人
    if (isElementalAoe && outcome.statusEffects && outcome.statusEffects.length > 0) {
      setEnemies(prev => prev.map(e => {
        if (e.uid === targetUid || e.hp <= 0) return e;
        let newStatuses = [...e.statuses];
        outcome.statusEffects.forEach(s => {
          const existing = newStatuses.find(es => es.type === s.type);
          if (existing) { existing.value += Math.floor(s.value * 0.5); }
          else { newStatuses.push({ ...s, value: Math.floor(s.value * 0.5) }); }
        });
        return { ...e, statuses: newStatuses };
      }));
    }
  }
  
  // splinterDamage: 溢出伤害传导给随机其他敌人
  if (!hasAoe && finalEnemyHp < 0) {
    const overkill = Math.abs(finalEnemyHp);
    const hasSplinter = selectedDefs.some(def => def.onPlay?.splinterDamage);
    if (hasSplinter) {
      const splinterRatio = selectedDefs.reduce((max, def) => Math.max(max, def.onPlay?.splinterDamage || 0), 0);
      const splinterDmg = Math.floor(overkill * splinterRatio);
      if (splinterDmg > 0) {
        const otherEnemies = enemies.filter(e => e.uid !== targetUid && e.hp > 0);
        if (otherEnemies.length > 0) {
          const splinterTarget = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          addFloatingText(`溅射-${splinterDmg}`, 'text-orange-400', undefined, 'enemy');
          setEnemies(prev => prev.map(e => {
            if (e.uid !== splinterTarget.uid) return e;
            const sArm = e.armor;
            const sDmg = Math.max(0, splinterDmg - sArm);
            return { ...e, hp: Math.max(0, e.hp - sDmg), armor: Math.max(0, sArm - splinterDmg) };
          }));
        }
      }
    }
  }
  // comboSplashDamage: 连锁打击 — 第2次及以上连击时，对随机另一敌人造成本骰子点数独立伤害
  const comboSplashDie = selected.find(d => getDiceDef(d.diceDefId).onPlay?.comboSplashDamage);
  if (comboSplashDie && (game.comboCount || 0) >= 1) {
    const splashDmg = comboSplashDie.value;
    const otherAlive = enemies.filter(e => e.uid !== targetUid && e.hp > 0);
    if (otherAlive.length > 0) {
      const splashTarget = otherAlive[Math.floor(Math.random() * otherAlive.length)];
      addFloatingText(`连锁-${splashDmg}`, 'text-cyan-300', undefined, 'enemy');
      setEnemies(prev => prev.map(e => {
        if (e.uid !== splashTarget.uid) return e;
        const sArm = e.armor;
        const sDmg = Math.max(0, splashDmg - sArm);
        return { ...e, hp: Math.max(0, e.hp - sDmg), armor: Math.max(0, sArm - splashDmg) };
      }));
    }
  }
  // chainBolt: 奥术飞弹 — 对每个存活敌人各造成一次等于自身点数的独立伤害
  const chainBoltDie = selected.find(d => getDiceDef(d.diceDefId).onPlay?.chainBolt);
  if (chainBoltDie) {
    const boltDmg = chainBoltDie.value;
    const aliveEnemies = enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length > 0) {
      addFloatingText(`奥术飞弹 ×${aliveEnemies.length}`, 'text-blue-300', undefined, 'enemy');
      setEnemies(prev => prev.map(e => {
        if (e.hp <= 0) return e;
        const eArm = e.armor;
        const eDmg = Math.max(0, boltDmg - eArm);
        return { ...e, hp: Math.max(0, e.hp - eDmg), armor: Math.max(0, eArm - boltDmg) };
      }));
    }
  }
  // splashToRandom: 对随机另一敌人造成等于骰子点数的独立伤害
  if (!hasAoe) {
    const hasSplash = selectedDefs.some(def => def.onPlay?.splashToRandom);
    if (hasSplash) {
      const splashDie = selected.find(d => getDiceDef(d.diceDefId).onPlay?.splashToRandom);
      if (splashDie) {
        const otherEnemies = enemies.filter(e => e.uid !== targetUid && e.hp > 0);
        if (otherEnemies.length > 0) {
          const splashTarget = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
          const splashDmg = splashDie.value;
          addFloatingText(`暗影-${splashDmg}`, 'text-green-400', undefined, 'enemy');
          setEnemies(prev => prev.map(e => {
            if (e.uid !== splashTarget.uid) return e;
            const sArm = e.armor;
            const sDmg = Math.max(0, splashDmg - sArm);
            return { ...e, hp: Math.max(0, e.hp - sDmg), armor: Math.max(0, sArm - splashDmg) };
          }));
        }
      }
    }
  }

  setPlayerEffect('attack');
  playSound(isAoeActive ? 'player_aoe' : 'player_attack');
  setTimeout(() => setPlayerEffect(null), 500);
  setGame(prev => ({ 
    ...prev, 
    armor: prev.armor + outcome.armor,
    hp: outcome.heal < 0
      ? Math.max(1, prev.hp + outcome.heal) // 自伤不会杀死玩家
      : Math.min(prev.maxHp, prev.hp + outcome.heal)
  }));

  return { hasAoe, isElementalAoe, finalEnemyHp };
}
