/**
 * enemyAI.ts — 敌人回合AI逻辑
 * 
 * 从 DiceHeroGame.tsx endTurn 函数中提取的敌人AI决策模块。
 * 包含：灼烧/中毒结算、5种combatType决策调度、回合结束处理。
 * 
 * 子模块：
 * - enemySkills.ts: Priest/Caster 技能逻辑 + 状态递减
 * - elites.ts: 精英/Boss 判定与增强逻辑
 * - enemyDialogue.ts: 台词系统
 * - attackCalc.ts: 攻击力计算纯函数
 * - enemyWaveTransition.ts: 波次转换逻辑
 * - enemyStatusSettlement.ts: 敌人灼烧/中毒 DOT 结算（纯函数）
 */

import type { StateSetter } from '../types/battleContexts';
import type { Enemy, GameState, Die, Relic } from '../types/game';
import type { buildRelicContext as BuildRelicContextFn } from '../engine/buildRelicContext';
import { hasFatalProtection as HasFatalProtectionFn } from '../engine/relicQueries';
import { triggerHourglass as TriggerHourglassFn } from '../engine/relicUpdates';
import { getEffectiveAttackDmg, getRangerFollowUpDmg } from './attackCalc';
import { executePriestSkill, executeCasterSkill, tickStatuses } from './enemySkills';
import { processEliteDice, processEliteArmor } from './elites';
import { tryAttackTaunt, type DelayedQuoteAction } from './enemyDialogue';
import { tryWaveTransition } from './enemyWaveTransition';
import { GUARDIAN_CONFIG, ENEMY_ATTACK_MULT, ANIMATION_TIMING } from '../config';
import { settleEnemyBurn, settleEnemyPoison, type DotLogEntry } from './enemyStatusSettlement';

// === EnemyAI 回调接口 ===

export interface EnemyAICallbacks {
  setGame: (update: GameState | ((prev: GameState) => GameState)) => void;
  setEnemies: (update: Enemy[] | ((prev: Enemy[]) => Enemy[])) => void;
  setEnemyEffects: (update: Record<string, string | null> | ((prev: Record<string, string | null>) => Record<string, string | null>)) => void;
  setDyingEnemies: (update: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setEnemyEffectForUid: (uid: string, effect: string | null) => void;
  enemyPreAction: (e: Enemy, quoteType: string) => Promise<boolean>;
  addLog: (msg: string) => void;
  /** [Y1] icon 参数为 string 类型（非 string），逻辑层不依赖 React */
  addFloatingText: (text: string, color: string, icon?: string, target?: 'player' | 'enemy', large?: boolean) => void;
  addToast: (msg: string, type: string) => void;
  playSound: (id: string) => void;
  setScreenShake: (v: boolean) => void;
  setPlayerEffect: StateSetter<string | null>;
  showEnemyQuote: (uid: string, text: string, duration?: number) => void;
  /** 延迟台词执行器：接收 DelayedQuoteAction 描述，在 UI 层调度定时器 */
  scheduleDelayedQuote: (action: DelayedQuoteAction) => void;
  getEnemyQuotes: (enemyId: string) => { attack?: string[]; defend?: string[]; skill?: string[]; heal?: string[]; enter?: string[]; hurt?: string[] } | undefined;
  pickQuote: (arr?: string[]) => string | null;
  setRerollCount: (v: number | ((prev: number) => number)) => void;
  setWaveAnnouncement: (v: number | null) => void;
  setDice: (v: Die[]) => void;
  rollAllDice: (force?: boolean) => void;
  buildRelicContext: typeof BuildRelicContextFn;
  hasFatalProtection: typeof HasFatalProtectionFn;
  triggerHourglass: typeof TriggerHourglassFn;
  handleVictory: () => void;
  gameRef: { current: GameState };
}

// === 辅助：对DOT结算结果执行副作用 ===

/**
 * 对本次DOT结算产生的日志条目，在setState updater之外执行副作用。
 * 包括：日志、浮动文字、死亡特效、死亡音效、标记dying。
 */
function applyDotSettlementSideEffects(logs: DotLogEntry[], cb: EnemyAICallbacks): void {
  for (const entry of logs) {
    cb.addLog(`${entry.name} 因${entry.color === 'text-orange-500' ? '灼烧' : '中毒'}受到了 ${entry.damage} 点伤害。`);
    cb.addFloatingText(`-${entry.damage}`, entry.color, undefined, 'enemy');
    if (entry.died) {
      cb.setEnemyEffectForUid(entry.uid, 'death');
      cb.playSound('enemy_death');
      cb.setDyingEnemies(prevSet => new Set([...prevSet, entry.uid]));
    }
  }
}

// === 主函数 ===

/**
 * 执行敌人回合
 * 
 * 完整流程：
 * 1. 标记进入敌人回合
 * 2. 玩家中毒结算
 * 3. 敌人灼烧结算（含全灭→转波）
 * 4. 敌人中毒结算（含全灭→转波）
 * 5. 每个存活敌人执行AI决策
 * 6. 精英/Boss塞废骰子
 * 7. 精英/Boss叠护甲
 * 8. 敌人回合结束→玩家回合（灼烧结算+状态递减）
 */
export async function executeEnemyTurn(
  _game: GameState,
  enemies: Enemy[],
  dice: Die[],
  rerollCount: number,
  cb: EnemyAICallbacks
): Promise<number> {
  // 0. 标记进入敌人回合
  cb.setGame(prev => ({ ...prev, isEnemyTurn: true, bloodRerollCount: 0, comboCount: 0, lastPlayHandType: undefined, blackMarketUsedThisTurn: false }));

  // 1. 玩家中毒结算（E5: death check 在回调内部完成）
  cb.setGame((prev: GameState) => {
    let nextStatuses = [...prev.statuses];
    let poisonDamage = 0;
    const poison = prev.statuses.find(s => s.type === 'poison');
    if (poison && poison.value > 0) {
      poisonDamage = poison.value;
      cb.addLog(`你因中毒受到了 ${poisonDamage} 点伤害。`);
      cb.addFloatingText(`-${poisonDamage}`, 'text-purple-400', undefined, 'player');
      nextStatuses = nextStatuses.map(s => s.type === 'poison' ? { ...s, value: s.value - 1 } : s).filter(s => s.value > 0);
    }
    let newHp = Math.max(0, prev.hp - poisonDamage);
    if (newHp <= 0 && prev.hp > 0) {
      if (cb.hasFatalProtection(prev.relics)) {
        newHp = prev.hp;
        return { ...prev, hp: newHp, relics: cb.triggerHourglass(prev.relics), statuses: nextStatuses };
      }
      return { ...prev, hp: 0, phase: 'gameover' as const, statuses: nextStatuses };
    }
    if (prev.hp <= 0 && (prev as { phase: string }).phase !== 'gameover') {
      return { ...prev, phase: 'gameover' as const };
    }
    return { ...prev, hp: newHp, statuses: nextStatuses };
  });

  await new Promise(r => setTimeout(r, 600));
  if (cb.gameRef.current.hp <= 0) { cb.playSound('player_death'); return 0; }

  // 2. 敌人灼烧结算（纯函数 + 副作用分离）
  type DotResult = { updatedEnemies: Enemy[]; allDead: boolean; logs: DotLogEntry[] };
  let burnResult: DotResult | undefined;
  cb.setEnemies((prev: Enemy[]) => {
    burnResult = settleEnemyBurn(prev);
    return burnResult!.updatedEnemies;
  });
  // RED-3: 副作用在 setState updater 之外执行
  if (burnResult) {
    applyDotSettlementSideEffects(burnResult.logs, cb);
  }

  await new Promise(r => setTimeout(r, 600));
  if (burnResult?.allDead) {
    await new Promise(r => setTimeout(r, ANIMATION_TIMING.enemyDeathCleanupDelay));
    const currentGame = cb.gameRef.current;
    if (!tryWaveTransition(currentGame, cb)) cb.handleVictory();
    return cb.gameRef.current.hp;
  }

  // 3. 敌人中毒结算（纯函数 + 副作用分离）
  let poisonResult: DotResult | undefined;
  cb.setEnemies((prev: Enemy[]) => {
    poisonResult = settleEnemyPoison(prev);
    return poisonResult!.updatedEnemies;
  });
  // RED-3: 副作用在 setState updater 之外执行
  if (poisonResult) {
    applyDotSettlementSideEffects(poisonResult.logs, cb);
  }

  await new Promise(r => setTimeout(r, 600));
  if (poisonResult?.allDead) {
    await new Promise(r => setTimeout(r, ANIMATION_TIMING.enemyDeathCleanupDelay));
    const currentGame = cb.gameRef.current;
    if (!tryWaveTransition(currentGame, cb)) cb.handleVictory();
    return cb.gameRef.current.hp;
  }

  // 4. 每个存活敌人执行AI决策
  // [KNOWN-BUG PHASER-FIX-ENEMYAI-STALE-ENEMIES]
  // 此处 currentEnemies 使用入参 enemies 的快照，未包含步骤 2（灼烧）和步骤 3（中毒）
  // 的 setEnemies 更新结果。可能导致：
  //   (1) 被 DOT 扣血但未扣死的敌人，后续 AI 仍读旧 HP/statuses
  //   (2) 状态（freeze/slow/poison）duration 递减后，AI 本帧仍按递减前判定
  // 该行为沿袭 dicehero2 祖传代码，MIG-05C 迁移期不修正，保持逻辑等价。
  // 修复留给独立任务 PHASER-FIX-ENEMYAI-STALE-ENEMIES，需 Designer 先裁定是否为有意设计。
  const currentEnemies = [...enemies];
  for (const e of currentEnemies.filter(en => en.hp > 0)) {
    await new Promise(r => setTimeout(r, 350));

    const isFrozen = e.statuses.some(s => s.type === 'freeze' && (s.duration ?? 0) > 0);
    if (isFrozen) {
      cb.addLog(`${e.name} 被冻结，无法行动！`);
      cb.addFloatingText('冻结', 'text-cyan-400', undefined, 'enemy');
      cb.setEnemyEffectForUid(e.uid, 'shake');
      await new Promise(r => setTimeout(r, 400));
      cb.setEnemyEffectForUid(e.uid, null);
      continue;
    }

    const isSlowed = e.statuses.some(s => s.type === 'slow' && (s.duration ?? 0) > 0);
    const isMelee = e.combatType === 'warrior' || e.combatType === 'guardian';

    if (isMelee && e.distance > 0 && isSlowed) {
      cb.addLog(`${e.name} 被减速，无法移动！`);
      continue;
    }
    if (isMelee && e.distance > 0) {
      cb.setEnemies(prev => prev.map(en => en.uid === e.uid ? { ...en, distance: Math.max(0, en.distance - 1) } : en));
      cb.addLog(e.distance === 1 ? `${e.name} 逼近到近身位置！` : `${e.name} 正在逼近...(距离 ${e.distance - 1})`);
      continue;
    }

    // Guardian: 攻防交替+嘲讽
    let guardianDefended = false;
    cb.setGame((prev: GameState) => {
      if (e.combatType === 'guardian' && prev.battleTurn % GUARDIAN_CONFIG.defenseCycle === 0) {
        guardianDefended = true;
      }
      return prev; // 只读判断，不修改状态
    });

    if (guardianDefended) {
      await cb.enemyPreAction(e, 'defend');
      cb.setGame((prev: GameState) => {
        const shieldVal = Math.floor(e.attackDmg * GUARDIAN_CONFIG.shieldMult);
        cb.setEnemyEffectForUid(e.uid, 'defend');
        cb.playSound('enemy_defend');
        cb.setEnemies(prevE => prevE.map(en => en.uid === e.uid ? { ...en, armor: en.armor + shieldVal } : en));
        cb.addLog(`${e.name} 举盾防御（+${shieldVal}护甲），并嘲讽你！`);
        return { ...prev, targetEnemyUid: e.uid };
      });
      await new Promise(r => setTimeout(r, 300));
      cb.setEnemyEffectForUid(e.uid, null);
      continue;
    }

    // Priest: 治疗→自疗→增益→减益
    if (e.combatType === 'priest') {
      await cb.enemyPreAction(e, 'heal');
      cb.setEnemyEffectForUid(e.uid, 'skill');
      cb.playSound('enemy_skill');
      const allies = currentEnemies.filter(en => en.hp > 0 && en.uid !== e.uid);
      const sr = executePriestSkill(e, allies, cb.gameRef.current);
      for (const [uid, updates] of sr.enemyUpdates) {
        cb.setEnemies(prev => prev.map(en => en.uid === uid ? { ...en, ...updates } : en));
      }
      cb.setGame(prev => ({ ...prev, statuses: sr.gameUpdates.statuses(prev.statuses) }));
      if (sr.gameUpdates.ownedDice) {
        cb.setGame(prev => ({
          ...prev,
          ownedDice: sr.gameUpdates.ownedDice!,
          diceBag: sr.gameUpdates.diceBag!,
        }));
      }
      for (const log of sr.logs) cb.addLog(log);
      for (const ft of sr.floats) cb.addFloatingText(ft.text, ft.color, undefined, ft.target as 'player' | 'enemy');
      if (sr.sound) cb.playSound(sr.sound);
      await new Promise(r => setTimeout(r, 300));
      cb.setEnemyEffectForUid(e.uid, null);
      continue;
    }

    // Caster: DoT专属
    if (e.combatType === 'caster') {
      await cb.enemyPreAction(e, 'skill');
      cb.setEnemyEffectForUid(e.uid, 'skill');
      cb.playSound('enemy_skill');
      const sr = executeCasterSkill(e);
      cb.setGame(prev => ({ ...prev, statuses: sr.updateStatuses(prev.statuses) }));
      for (const log of sr.logs) cb.addLog(log);
      for (const ft of sr.floats) {
        if (ft.delay) setTimeout(() => cb.addFloatingText(ft.text, ft.color, undefined, ft.target as 'player' | 'enemy'), ft.delay);
        else cb.addFloatingText(ft.text, ft.color, undefined, ft.target as 'player' | 'enemy');
      }
      await new Promise(r => setTimeout(r, 300));
      cb.setEnemyEffectForUid(e.uid, null);
      continue;
    }

    // Warrior/Ranger/其他: 直接攻击
    await cb.enemyPreAction(e, 'attack');
    cb.setEnemyEffectForUid(e.uid, 'attack');
    cb.setScreenShake(true);

    // Ranger: 更新 attackCount 并立即获取新值
    let currentAttackCount: number | undefined;
    if (e.combatType === 'ranger') {
      const oldCount = e.attackCount || 0;
      const newCount = oldCount + ENEMY_ATTACK_MULT.rangerAttackCountStep;
      cb.setEnemies(prev => prev.map(en => en.uid === e.uid ? { ...en, attackCount: newCount } : en));
      currentAttackCount = newCount;
    }

    cb.setGame((prev: GameState) => {
      const damage = getEffectiveAttackDmg(e, prev.statuses, {
        attackCount: currentAttackCount,
        isSlowed,
      });

      let newArmor = prev.armor;
      let newHp = prev.hp;
      let absorbed = 0;
      if (newArmor > 0) { absorbed = Math.min(newArmor, damage); newArmor -= absorbed; }
      const hpDmg = damage - absorbed;
      if (hpDmg > 0) newHp = Math.max(0, newHp - hpDmg);
      const hpLost = prev.hp - newHp;

      if (absorbed > 0) cb.addFloatingText(`-${absorbed}`, 'text-blue-400', undefined, 'player');
      if (hpDmg > 0) cb.addFloatingText(`-${hpDmg}`, 'text-red-500', undefined, 'player');
      if (absorbed === 0 && hpDmg === 0) cb.addFloatingText('0', 'text-gray-400', undefined, 'player');

      cb.setPlayerEffect('flash');
      cb.addLog(`${e.name} 攻击造成 ${damage} 伤害！`);
      cb.playSound('enemy');

      const delayedQuotes = tryAttackTaunt(e, damage, cb);
      for (const dq of delayedQuotes) {
        cb.scheduleDelayedQuote(dq);
      }

      if (newHp <= 0 && prev.hp > 0) {
        if (cb.hasFatalProtection(prev.relics)) {
          return { ...prev, hp: prev.hp, armor: prev.armor, relics: cb.triggerHourglass(prev.relics) };
        }
        return { ...prev, hp: 0, phase: 'gameover' as const, armor: newArmor };
      }
      return { ...prev, hp: newHp, armor: newArmor, hpLostThisTurn: (prev.hpLostThisTurn || 0) + hpLost, hpLostThisBattle: (prev.hpLostThisBattle || 0) + hpLost };
    });

    // on_damage_taken 遗物
    const latestGame = cb.gameRef.current;
    for (const relic of latestGame.relics.filter((r: Relic) => r.trigger === 'on_damage_taken')) {
      const ctx = cb.buildRelicContext({
        game: latestGame,
        dice,
        targetEnemy: cb.gameRef.current.battleWaves.length > 0
          ? (enemies.find((en: Enemy) => en.hp > 0) || null)
          : null,
        rerollsThisTurn: rerollCount,
        hasPlayedThisTurn: latestGame.playsLeft < latestGame.maxPlays,
      });
      const res = relic.effect(ctx);
      if (res.damage) { cb.setGame(prev => ({ ...prev, rageFireBonus: (prev.rageFireBonus || 0) + res.damage! })); cb.addToast(`${relic.name}: 下次出牌+${res.damage}伤害`, 'buff'); }
      if (res.tempDrawBonus) { cb.setGame(prev => ({ ...prev, relicTempDrawBonus: (prev.relicTempDrawBonus || 0) + res.tempDrawBonus! })); cb.addToast(`${relic.name}: 下回合+${res.tempDrawBonus}手牌`, 'buff'); }
    }

    // 怒火骰子
    const currentOwnedDice = cb.gameRef.current.ownedDice;
    const furyDice = currentOwnedDice.find(od => od.defId === 'w_fury');
    if (furyDice) {
      const furyLevel = furyDice.level || 1;
      cb.setGame(prev => ({ ...prev, furyBonusDamage: (prev.furyBonusDamage || 0) + furyLevel }));
      cb.addFloatingText(`怒火+${furyLevel}`, 'text-orange-400', undefined, 'player');
    }

    // Ranger 追击
    if (e.combatType === 'ranger') {
      await new Promise(r => setTimeout(r, 250));
      const hitCount = currentAttackCount || 0;
      const secondHit = getRangerFollowUpDmg(e, hitCount);

      cb.setGame((prev: GameState) => {
        let newArmor = prev.armor;
        let newHp = prev.hp;
        let abs2 = 0;
        if (newArmor > 0) { abs2 = Math.min(newArmor, secondHit); newArmor -= abs2; }
        const hpD2 = secondHit - abs2;
        if (hpD2 > 0) newHp = Math.max(0, newHp - hpD2);
        const hpLost = prev.hp - newHp;

        if (abs2 > 0) cb.addFloatingText(`-${abs2}`, 'text-blue-400', undefined, 'player');
        if (hpD2 > 0) cb.addFloatingText(`-${hpD2}`, 'text-orange-400', undefined, 'player');

        if (newHp <= 0 && prev.hp > 0) {
          if (cb.hasFatalProtection(prev.relics)) {
            return { ...prev, hp: prev.hp, armor: prev.armor, relics: cb.triggerHourglass(prev.relics) };
          }
          return { ...prev, hp: 0, phase: 'gameover' as const, armor: newArmor };
        }
        return { ...prev, hp: newHp, armor: newArmor, hpLostThisTurn: (prev.hpLostThisTurn || 0) + hpLost, hpLostThisBattle: (prev.hpLostThisBattle || 0) + hpLost };
      });
      cb.addLog(`${e.name} 追击造成 ${secondHit} 伤害！`);
      cb.playSound('enemy');
    }

    await new Promise(r => setTimeout(r, 300));
    cb.setScreenShake(false);
    cb.setEnemyEffectForUid(e.uid, null);
    cb.setPlayerEffect(null);
  }

  // 5. 精英/Boss：塞废骰子
  const gameForEliteDice = cb.gameRef.current;
  for (const e of currentEnemies.filter(en => en.hp > 0)) {
    const dr = processEliteDice(e, gameForEliteDice);
    if (dr.triggered) {
      cb.setGame(prev => ({ ...prev, ...(dr.gameUpdates.ownedDice ? { ownedDice: dr.gameUpdates.ownedDice!, diceBag: dr.gameUpdates.diceBag! } : {}) }));
      for (const log of dr.logs) cb.addLog(log);
      for (const ft of dr.floats) cb.addFloatingText(ft.text, ft.color, undefined, ft.target as 'player' | 'enemy');
      if (dr.sound) cb.playSound(dr.sound);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 6. 精英/Boss：叠护甲
  const gameForEliteArmor = cb.gameRef.current;
  for (const e of currentEnemies.filter(en => en.hp > 0)) {
    const ar = processEliteArmor(e, gameForEliteArmor);
    if (ar.triggered) {
      cb.setEnemies(prev => prev.map(en => en.uid === e.uid ? { ...en, armor: en.armor + ar.armorVal } : en));
      cb.addLog(ar.log);
      cb.addFloatingText(ar.float.text, ar.float.color, undefined, ar.float.target as 'player' | 'enemy');
      cb.playSound(ar.sound);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // 7. 敌人回合结束→玩家回合
  // [BUG-FIX] Use gameRef real HP as default. React 18 batches setGame updaters asynchronously; if we init returnHp=0, the synchronous return fires before updater runs -> upper layer sees 0 -> false gameover trigger.
  let returnHp = cb.gameRef.current.hp;
  cb.setGame((prev: GameState) => {
    if (prev.phase === 'gameover') {
      returnHp = prev.hp;
      return prev;
    }
    const nextTurn = prev.battleTurn + 1;
    let nextStatuses = [...prev.statuses];
    let burnDamage = 0;
    const burn = prev.statuses.find(s => s.type === 'burn');
    if (burn && burn.value > 0) {
      burnDamage = burn.value;
      cb.addLog(`你因灼烧受到了 ${burnDamage} 点伤害。`);
      cb.addFloatingText(`-${burnDamage}`, 'text-orange-500', undefined, 'player');
      nextStatuses = nextStatuses.filter(s => s.type !== 'burn');
    }
    nextStatuses = tickStatuses(nextStatuses);
    let newHp = Math.max(0, prev.hp - burnDamage);
    if (newHp <= 0 && prev.hp > 0) {
      if (cb.hasFatalProtection(prev.relics)) {
        newHp = prev.hp;
        returnHp = newHp;
        return { ...prev, battleTurn: nextTurn, hp: newHp, statuses: nextStatuses, isEnemyTurn: false, relics: cb.triggerHourglass(prev.relics) };
      }
      returnHp = 0;
      return { ...prev, battleTurn: nextTurn, hp: 0, phase: 'gameover' as const, statuses: nextStatuses, isEnemyTurn: false };
    }
    if (prev.hp <= 0 && (prev as { phase: string }).phase !== 'gameover') {
      returnHp = 0;
      return { ...prev, battleTurn: nextTurn, phase: 'gameover' as const, isEnemyTurn: false };
    }
    returnHp = newHp;
    return { ...prev, battleTurn: nextTurn, hp: newHp, statuses: nextStatuses, isEnemyTurn: false };
  });

  return returnHp;
}
