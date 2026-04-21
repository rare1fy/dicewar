/**
 * rogueComboEffects.ts — 影锋刺客连击效果处理
 *
 * ARCH-I: 从 useBattleCombat.tsx playHand 中提取的影锋刺客职业专属连击逻辑。
 * 包含连击预备（减重投次数）和连击终击（伤害加成提示）。
 */

/** 连击效果回调集合 */
export interface RogueComboCallbacks {
  setRerollCount: (fn: (prev: number) => number) => void;
  addFloatingText: (text: string, className: string, icon: unknown, target: string) => void;
}

/**
 * 处理影锋刺客连击预备效果（连击第0击）
 *
 * 条件：影锋刺客 + 当前连击数为0
 * 效果：200ms 后重投次数 -1 + 浮动文字提示
 */
export function handleRogueComboPrep(
  playerClass: string,
  currentCombo: number,
  cb: RogueComboCallbacks,
): void {
  if (playerClass === 'rogue' && currentCombo === 0) {
    setTimeout(() => {
      cb.setRerollCount(prev => Math.max(0, prev - 1));
      cb.addFloatingText('连击预备: +1免费重投', 'text-cyan-300', undefined, 'player');
    }, 200);
  }
}

/**
 * 处理影锋刺客连击终击效果（连击第1击且非普通攻击）
 *
 * 条件：影锋刺客 + 当前连击数为1 + 牌型非普通攻击
 * 效果：200ms 后浮动文字提示 +20%伤害
 */
export function handleRogueComboHit(
  playerClass: string,
  currentCombo: number,
  thisHandType: string,
  addFloatingText: (text: string, className: string, icon: unknown, target: string) => void,
): void {
  if (playerClass === 'rogue' && currentCombo === 1 && thisHandType !== '普通攻击') {
    setTimeout(() => {
      addFloatingText('连击! +20%伤害', 'text-cyan-300', undefined, 'player');
    }, 200);
  }
}
