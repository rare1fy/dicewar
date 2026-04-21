/**
 * battleInit.ts — 战斗初始化纯逻辑
 * 从 useBattleLifecycle.ts 拆分 (ARCH-J)
 *
 * 职责：构建战斗初始状态、骰子翻滚动画
 */
import type { StateSetter } from '../types/battleContexts';
import type { Die, MapNode, Enemy, GameState } from '../types/game';
import { getDiceDef, rollDiceDef } from '../data/dice';
import { initDiceBag } from '../data/diceBag';
import { sumPassiveRelicValue, hasLimitBreaker } from '../engine/relicQueries';
import { generateChallenge } from '../utils/instakillChallenge';
import { applyDiceSpecialEffects } from '../logic/diceEffects';
import { ELEMENT_NAMES } from '../utils/uiHelpers';
import { playSound } from '../utils/sound';

// ==================== 战斗初始状态构建 ====================

interface BattleInitParams {
  prev: GameState;
  node: MapNode;
  waves: { enemies: Enemy[] }[];
  firstWave: Enemy[];
  battleChallenge: ReturnType<typeof generateChallenge>;
}

/**
 * 构建战斗初始状态（用于 setGame 的 updater 回调）
 * 纯函数：不依赖外部闭包，仅依赖传入参数
 */
export function buildBattleGameState(
  { prev, node, waves, firstWave, battleChallenge }: BattleInitParams,
): GameState {
  return {
    ...prev,
    phase: 'battle',
    battleTurn: 1,
    currentNodeId: node.id,
    armor: 0,
    statuses: [],
    playsPerEnemy: {},
    chargeStacks: 0,
    mageOverchargeMult: 0,
    bloodRerollCount: 0,
    comboCount: 0,
    lastPlayHandType: undefined,
    fortuneWheelUsed: false,
    relicKeepHighest: 0,
    relicTempDrawBonus: 0,
    relicTempExtraPlay: 0,
    battleWaves: waves,
    currentWaveIndex: 0,
    targetEnemyUid: (firstWave.find(e => e.combatType === 'guardian') || firstWave[0])?.uid || null,
    diceBag: initDiceBag(prev.ownedDice),
    discardPile: [],
    freeRerollsLeft: prev.freeRerollsPerTurn + sumPassiveRelicValue(prev.relics, 'extraReroll'),
    playsLeft: prev.maxPlays + sumPassiveRelicValue(prev.relics, 'extraPlay'),
    isEnemyTurn: false,
    instakillChallenge: battleChallenge,
    instakillCompleted: false,
    playsThisWave: 0,
    rerollsThisWave: 0,
  };
}

// ==================== 骰子翻滚动画 ====================

/** 骰子动画帧间隔 (ms) */
const DICE_FRAME_TIMES = [30, 40, 50, 60, 80, 100, 120, 150];
/** 动画中播放音效的帧索引 */
const DICE_SOUND_FRAME = 3;

export interface DiceRollAnimationCallbacks {
  setDice: StateSetter<Die[]>;
  setGame: (updater: GameState | ((prev: GameState) => GameState)) => void;
  addLog: (msg: string) => void;
}

interface DiceRollAnimationParams {
  drawn: Die[];
  game: GameState;
  cb: DiceRollAnimationCallbacks;
  /** 是否为 startBattle 调用（需要额外统计 totalRerolls + rerollPointBoost） */
  isStartBattle: boolean;
}

/**
 * 执行骰子翻滚动画
 * 提取自 startBattle / rollAllDice 中的重复动画逻辑
 *
 * 调用者需预先调用 setDice 设置 rolling 状态（含初始随机值），
 * 本函数仅负责逐帧翻滚 + 结算
 */
export async function performDiceRollAnimation(
  { drawn, game, cb, isStartBattle }: DiceRollAnimationParams,
): Promise<void> {
  const { setDice, setGame, addLog } = cb;

  for (let f = 0; f < DICE_FRAME_TIMES.length; f++) {
    await new Promise(resolve => setTimeout(resolve, DICE_FRAME_TIMES[f]));
    setDice(prev => prev.map(d => {
      const def = getDiceDef(d.diceDefId);
      const elems = ['fire', 'ice', 'thunder', 'poison', 'holy'] as const;
      const randElem = def.isElemental ? elems[Math.floor(Math.random() * elems.length)] : d.element;
      const boost = isStartBattle ? sumPassiveRelicValue(game.relics, 'rerollPointBoost') : 0;
      const rawValue = rollDiceDef(def) + boost;
      return { ...d, value: Math.min(9, rawValue), element: randElem as Die['element'] };
    }));
    if (f === DICE_SOUND_FRAME) playSound('reroll');
    if (isStartBattle) {
      setGame(prev => ({ ...prev, stats: { ...prev.stats, totalRerolls: prev.stats.totalRerolls + 1 } }));
    }
  }

  setDice(prev => prev.map(d => ({ ...d, rolling: false })));
  setDice(prev => applyDiceSpecialEffects(prev, { hasLimitBreaker: hasLimitBreaker(game.relics), lockedElement: game.lockedElement }));
  playSound('dice_lock');
  addLog(`[骰] ${drawn.map(d => `${d.value}(${ELEMENT_NAMES[d.element]})`).join(' ')}`);
}
