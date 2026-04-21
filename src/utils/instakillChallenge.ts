/**
 * instakillChallenge.ts - 洞察弱点系统
 * 
 * 设计原则：
 * - 条件必须极其苛刻，需要放弃正常高伤打法才有可能达成
 * - 不能"顺手"完成，必须每一步都是刻意的、反直觉的操作
 * - 是真正的PLAN B：牌路刚好顺了才值得去搏
 * - 连续条件一旦断链就从0开始，无法容错
 */

import type { Die, HandType } from '../types/game';

export type ChallengeType =
  | 'descending_chain'    // 连续N次出牌点数和严格递减
  | 'all_ones_or_twos'    // 一次出牌≥3颗骰子且全部≤2点
  | 'exact_sequence'      // 连续N次出牌点数和分别恰好等于指定序列
  | 'same_sum_twice'      // 连续N次出牌骰子点数和完全相同
  | 'full_hand_low'       // 一次选中所有手牌出牌且点数和≤N
  | 'forced_normal'       // 连续N次用≥3颗骰子且牌型为普通攻击
  | 'mono_value'          // 一次出牌≥3颗骰子且全部同点数
  | 'alternating_parity'; // 连续N次出牌奇偶交替，每次≥2颗且全同奇/偶

export interface InstakillChallenge {
  type: ChallengeType;
  label: string;
  description: string;
  value?: number;
  progress?: number;
  trackSet?: string[];
  completed: boolean;
}

interface ChallengeTemplate {
  type: ChallengeType;
  weight: number;
  minDepth: number;
  minDice?: number;
  generate: (depth: number, chapter: number, diceCount: number) => InstakillChallenge;
}

// ============================================================
// 普通/精英条件池
// ============================================================
const NORMAL_POOL: ChallengeTemplate[] = [
  // 连续N次出牌，每次点数和比上次更少
  {
    type: 'descending_chain', weight: 16, minDepth: 0,
    generate: (depth) => {
      const n = depth >= 6 ? 4 : 3;
      return { type: 'descending_chain', label: `递减打击`, description: `连续${n}次出牌，每次选中骰子的点数之和必须比上一次更少（断链重计）`, value: n, progress: 0, trackSet: [], completed: false };
    },
  },
  // 连续N次出牌点数和完全相同
  {
    type: 'same_sum_twice', weight: 15, minDepth: 0,
    generate: (depth) => {
      const n = depth >= 6 ? 3 : 2;
      return { type: 'same_sum_twice', label: `镜像之力`, description: `连续${n}次出牌，选中骰子的点数之和必须完全一样（不同则重计）`, value: n, progress: 0, trackSet: [], completed: false };
    },
  },
  // 连续N次出牌点数和分别恰好等于指定的数值
  {
    type: 'exact_sequence', weight: 12, minDepth: 0,
    generate: (_d, _ch, dc) => {
      const mid = Math.round(dc * 2.5);
      const a = mid + 2;
      const b = mid;
      const c = mid - 2;
      return { type: 'exact_sequence', label: `命运密码`, description: `依次出牌3次，点数之和分别恰好为${a}、${b}、${c}（错一步重来）`, value: 3, progress: 0, trackSet: [String(a), String(b), String(c)], completed: false };
    },
  },
  // 连续N次选≥3颗骰子出牌，且牌型判定为普通攻击
  {
    type: 'forced_normal', weight: 14, minDepth: 0, minDice: 4,
    generate: (depth) => {
      const n = depth >= 5 ? 3 : 2;
      return { type: 'forced_normal', label: `负重前行`, description: `连续${n}次选≥3颗骰子出牌，且牌型判定为普通攻击（断链重计）`, value: n, progress: 0, completed: false };
    },
  },
  // 连续N次出牌，每次≥2颗骰子且全同奇或全同偶，并与上次奇偶相反
  {
    type: 'alternating_parity', weight: 12, minDepth: 0,
    generate: (depth) => {
      const n = depth >= 5 ? 4 : 3;
      return { type: 'alternating_parity', label: `阴阳交替`, description: `连续${n}次出牌，每次选≥2颗骰子且全为奇数或全为偶数，并与上次相反（断链重计）`, value: n, progress: 0, trackSet: [], completed: false };
    },
  },
  // 一次选中所有未使用的手牌出牌，且点数和≤N
  {
    type: 'full_hand_low', weight: 10, minDepth: 0,
    generate: (_d, _ch, dc) => {
      const maxSum = Math.round(dc * 2.2);
      return { type: 'full_hand_low', label: `背水一战`, description: `一次选中手中所有骰子出牌，且点数之和≤${maxSum}`, value: maxSum, progress: 0, completed: false };
    },
  },
];

// ============================================================
// Boss 专用条件池（更苛刻）
// ============================================================
const BOSS_POOL: ChallengeTemplate[] = [
  // 一次出牌≥3颗且全部同点数（纯欧皇）
  {
    type: 'mono_value', weight: 16, minDepth: 0, minDice: 4,
    generate: () => ({
      type: 'mono_value', label: `天命齐心`, description: `一次出牌选≥3颗骰子，且全部点数完全相同`, value: 1, progress: 0, completed: false,
    }),
  },
  // 一次出牌≥3颗且全部≤2点
  {
    type: 'all_ones_or_twos', weight: 14, minDepth: 0, minDice: 3,
    generate: () => ({
      type: 'all_ones_or_twos', label: `微光破晓`, description: `一次出牌选≥3颗骰子，且全部点数≤2`, value: 1, progress: 0, completed: false,
    }),
  },
  // 连续4次点数和递减
  {
    type: 'descending_chain', weight: 14, minDepth: 0,
    generate: () => ({
      type: 'descending_chain', label: `灭世倒计时`, description: `连续4次出牌，每次选中骰子的点数之和必须比上一次更少（断链重计）`, value: 4, progress: 0, trackSet: [], completed: false,
    }),
  },
  // 连续3次点数和完全相同
  {
    type: 'same_sum_twice', weight: 14, minDepth: 0,
    generate: () => ({
      type: 'same_sum_twice', label: `绝对镜像`, description: `连续3次出牌，选中骰子的点数之和必须完全一样（不同则重计）`, value: 3, progress: 0, trackSet: [], completed: false,
    }),
  },
  // 连续5次奇偶交替
  {
    type: 'alternating_parity', weight: 10, minDepth: 0,
    generate: () => ({
      type: 'alternating_parity', label: `阴阳轮转`, description: `连续5次出牌，每次选≥2颗骰子且全为奇数或全为偶数，并与上次相反（断链重计）`, value: 5, progress: 0, trackSet: [], completed: false,
    }),
  },
  // 精确序列（Boss版：4个数）
  {
    type: 'exact_sequence', weight: 10, minDepth: 0,
    generate: (_d, _ch, dc) => {
      const mid = Math.round(dc * 2.5);
      const a = mid + 3;
      const b = mid + 1;
      const c = mid - 1;
      const d2 = mid - 3;
      return { type: 'exact_sequence', label: `命运解码`, description: `依次出牌4次，点数之和分别恰好为${a}、${b}、${c}、${d2}（错一步重来）`, value: 4, progress: 0, trackSet: [String(a), String(b), String(c), String(d2)], completed: false };
    },
  },
  // 全出低点（Boss更低）
  {
    type: 'full_hand_low', weight: 8, minDepth: 0,
    generate: (_d, _ch, dc) => {
      const maxSum = Math.round(dc * 1.8);
      return { type: 'full_hand_low', label: `置之死地`, description: `一次选中手中所有骰子出牌，且点数之和≤${maxSum}`, value: maxSum, progress: 0, completed: false };
    },
  },
  // 连续3次≥3颗骰子打普通攻击
  {
    type: 'forced_normal', weight: 10, minDepth: 0, minDice: 5,
    generate: () => ({
      type: 'forced_normal', label: `自废武功`, description: `连续3次选≥3颗骰子出牌，且牌型判定均为普通攻击（断链重计）`, value: 3, progress: 0, completed: false,
    }),
  },
];

// ============================================================
// 生成挑战
// ============================================================

export function generateChallenge(
  depth: number,
  chapter: number,
  diceCount?: number,
  nodeType?: string,
): InstakillChallenge {
  const dc = diceCount || 3;
  const isBoss = nodeType === 'boss';
  const pool = isBoss ? BOSS_POOL : NORMAL_POOL;

  const available = pool.filter(c => depth >= c.minDepth && dc >= (c.minDice || 0));
  if (available.length === 0) {
    // 兜底：递减打击
    return NORMAL_POOL[0].generate(depth, chapter, dc);
  }
  const totalWeight = available.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tmpl of available) {
    roll -= tmpl.weight;
    if (roll <= 0) return tmpl.generate(depth, chapter, dc);
  }
  return available[0].generate(depth, chapter, dc);
}

// ============================================================
// 条件检测
// ============================================================

export interface ChallengeCheckContext {
  selectedDice?: Die[];
  activeHands?: HandType[];
  pointSum?: number;
  rerollsUsedSinceLastPlay?: number;
  totalDiceInHand?: number;
  ownedDiceTypes?: string[];
  killedThisPlay?: number;
}

export function checkChallenge(
  challenge: InstakillChallenge,
  ctx: ChallengeCheckContext
): InstakillChallenge {
  if (challenge.completed) return challenge;

  switch (challenge.type) {

    case 'descending_chain': {
      const sum = ctx.pointSum || 0;
      const prevSums = challenge.trackSet || [];
      if (prevSums.length > 0) {
        const lastSum = Number(prevSums[prevSums.length - 1]);
        if (sum < lastSum) {
          const newSums = [...prevSums, String(sum)];
          if (newSums.length >= (challenge.value || 3)) return { ...challenge, trackSet: newSums, progress: newSums.length, completed: true };
          return { ...challenge, trackSet: newSums, progress: newSums.length };
        }
        // 没有递减，断链从当前值重新开始
        return { ...challenge, trackSet: [String(sum)], progress: 1 };
      }
      return { ...challenge, trackSet: [String(sum)], progress: 1 };
    }

    case 'same_sum_twice': {
      const sum = ctx.pointSum || 0;
      const prev = challenge.trackSet || [];
      if (prev.length > 0 && Number(prev[0]) === sum) {
        const streak = (challenge.progress || 0) + 1;
        if (streak >= (challenge.value || 2)) return { ...challenge, trackSet: [String(sum)], progress: streak, completed: true };
        return { ...challenge, trackSet: [String(sum)], progress: streak };
      }
      return { ...challenge, trackSet: [String(sum)], progress: 1 };
    }

    case 'exact_sequence': {
      const sum = ctx.pointSum || 0;
      const targets = challenge.trackSet || [];
      const currentStep = challenge.progress || 0;
      if (currentStep < targets.length && sum === Number(targets[currentStep])) {
        const newProgress = currentStep + 1;
        if (newProgress >= (challenge.value || 3)) return { ...challenge, progress: newProgress, completed: true };
        return { ...challenge, progress: newProgress };
      }
      // 不匹配，检查是否匹配第一步
      if (sum === Number(targets[0])) {
        return { ...challenge, progress: 1 };
      }
      return { ...challenge, progress: 0 };
    }

    case 'alternating_parity': {
      // 每次≥2颗骰子，全同奇或全同偶，与上次相反
      if (ctx.selectedDice && ctx.selectedDice.length >= 2) {
        const parities = ctx.selectedDice.map(d => d.value % 2);
        const allSame = parities.every(p => p === parities[0]);
        if (!allSame) {
          return { ...challenge, trackSet: [], progress: 0 };
        }
        const currentParity = parities[0]; // 0=偶 1=奇
        const prev = challenge.trackSet || [];
        if (prev.length > 0) {
          const lastParity = Number(prev[prev.length - 1]);
          if (currentParity !== lastParity) {
            const newTrack = [...prev, String(currentParity)];
            if (newTrack.length >= (challenge.value || 3)) return { ...challenge, trackSet: newTrack, progress: newTrack.length, completed: true };
            return { ...challenge, trackSet: newTrack, progress: newTrack.length };
          }
          return { ...challenge, trackSet: [String(currentParity)], progress: 1 };
        }
        return { ...challenge, trackSet: [String(currentParity)], progress: 1 };
      }
      // 不足2颗，断链
      return { ...challenge, trackSet: [], progress: 0 };
    }

    case 'full_hand_low': {
      if (ctx.selectedDice && ctx.totalDiceInHand) {
        if (ctx.selectedDice.length === ctx.totalDiceInHand && ctx.selectedDice.length >= 2) {
          if ((ctx.pointSum || 0) <= (challenge.value || 10)) {
            return { ...challenge, progress: 1, completed: true };
          }
        }
      }
      break;
    }

    case 'mono_value': {
      if (ctx.selectedDice && ctx.selectedDice.length >= 3) {
        const vals = new Set(ctx.selectedDice.map(d => d.value));
        if (vals.size === 1) {
          return { ...challenge, progress: 1, completed: true };
        }
      }
      break;
    }

    case 'all_ones_or_twos': {
      if (ctx.selectedDice && ctx.selectedDice.length >= 3) {
        if (ctx.selectedDice.every(d => d.value <= 2)) {
          return { ...challenge, progress: 1, completed: true };
        }
      }
      break;
    }

    case 'forced_normal': {
      if (ctx.selectedDice && ctx.selectedDice.length >= 3 &&
          ctx.activeHands && ctx.activeHands.length === 1 && ctx.activeHands[0] === '普通攻击') {
        const p = (challenge.progress || 0) + 1;
        if (p >= (challenge.value || 2)) return { ...challenge, progress: p, completed: true };
        return { ...challenge, progress: p };
      }
      return { ...challenge, progress: 0 };
    }
  }
  return challenge;
}
