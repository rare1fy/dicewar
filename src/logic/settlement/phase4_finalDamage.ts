/**
 * settlement/phase4_finalDamage.ts — Phase 4 最终伤害飞出 + 清理
 *
 * ARCH-17 从 settlementAnimation.ts L428-L474 拆出
 * 包含：
 *   - 卡肉顿帧：根据伤害比例分三档（Massive / Heavy / 普通）
 *   - 伤害/护甲/治疗飘字 overlay
 *   - 清理 settlementPhase / settlementData / 关闭遗物面板
 */

import type { SettlementContext } from './types';

export async function runPhase4FinalDamage(ctx: SettlementContext): Promise<void> {
  const {
    enemies, outcome,
    setSettlementData, setSettlementPhase, setShowRelicPanel,
    setShowDamageOverlay, setScreenShake,
    playSound, playHeavyImpact,
  } = ctx;

  // ========================================
  // Phase 4: 最终伤害飞出 (0.8s)
  // ========================================
  setSettlementPhase('damage');
  // 卡肉顿帧：大伤害时冻结画面+重击音效+强烈震动
  const maxEnemyHp = enemies.reduce((max, e) => Math.max(max, e.maxHp || e.hp), 1);
  const damageRatio = outcome.damage / maxEnemyHp;
  const isHeavyHit = damageRatio >= 0.5 || outcome.damage >= 60;
  const isMassiveHit = damageRatio >= 1.0 || outcome.damage >= 120;

  if (isMassiveHit) {
    // 毁灭级：重击音效 + 长顿帧 + 强震
    playHeavyImpact(1.0);
    setScreenShake(true);
    await new Promise(r => setTimeout(r, 150)); // 卡肉冻结
    playSound('critical');
    setTimeout(() => playSound('critical'), 120);
    setTimeout(() => playSound('critical'), 250);
  } else if (isHeavyHit) {
    // 重击：双重暴击 + 中等顿帧
    playHeavyImpact(0.6);
    setScreenShake(true);
    await new Promise(r => setTimeout(r, 100)); // 卡肉冻结
    playSound('critical');
    setTimeout(() => playSound('critical'), 150);
  } else if (outcome.damage >= 20) {
    playSound('critical');
    setScreenShake(true);
  } else if (outcome.damage > 0) {
    playSound('hit');
    setScreenShake(true);
  }
  setShowDamageOverlay({ damage: outcome.damage, armor: outcome.armor, heal: outcome.heal || 0 });
  setTimeout(() => setShowDamageOverlay(null), isMassiveHit ? 2500 : 1800);
  setTimeout(() => setScreenShake(false), isMassiveHit ? 500 : isHeavyHit ? 400 : 300);

  await new Promise(r => setTimeout(r, isMassiveHit ? 1200 : isHeavyHit ? 1000 : 800));

  // ========================================
  // 清理结算演出，应用实际效果
  // ========================================
  setSettlementPhase(null);
  setSettlementData(null);
  setShowRelicPanel(false); // 结算结束关闭遗物面板
}