/**
 * GlobalHudBar.ts — 全局顶部 HUD（HP 条 / 金币 / 遗物图标栏）
 *
 * 适用场景：Map / Loot / Battle 三场景常驻。提供"一局内持续可见"的关键状态反馈，
 * 减轻玩家在场景切换时"自己状态到底怎样"的认知负担。
 *
 * 职责（SRP）：
 *   - 渲染顶部横条（背景 + HP 条 + 金币文本 + 遗物图标）
 *   - 提供 update(state) 刷新显示
 *   - 提供 destroy() 场景 SHUTDOWN 时显式清理
 *   - 暴露 runState 工具函数（readRunState / writeRunHp / initRunState / resetRunState）
 *
 * 跨场景状态协议（registry 总线，对齐既有 runRelics 机制）：
 *   - `runHp`: number（当前 HP，BattleScene SHUTDOWN 时写回；其它场景只读）
 *   - `runMaxHp`: number（最大 HP，ClassSelect 选职业时写入，整局不变）
 *   - `runGold`: number（金币，MVP 预留 0；后续 GOLD 单接入）
 *   - `runRelics`: Relic[]（已有，本模块只读不改）
 *
 * 生命周期：
 *   ClassSelectScene.onConfirm → initRunState(scene, classId) 写入 runHp/runMaxHp/runGold
 *   BattleScene.create → new GlobalHudBar(scene, state) + subscribe 推 HP 变化
 *   BattleScene.SHUTDOWN → writeRunHp(scene, currentHp) 写回 registry
 *   MapScene.create → new GlobalHudBar(scene, readRunState(scene))
 *   LootScene.create → 同上（选完遗物后 relics append，HUD 不需要显式 refresh，
 *     因为 LootScene 选完立即 scene.start('MapScene')，下个场景重新 readRunState）
 *
 * 布局：屏幕顶部 40px 高横条，z=8500（低于 Boss 入场 9000，高于常规 UI）
 */

import Phaser from 'phaser';
import { CLASS_DEFS } from '../../data/classes';
import type { Relic, ClassId } from '../../types/game';

/** HUD 显示状态（外部传入，本组件不持有数据源） */
export interface GlobalHudState {
  hp: number;
  maxHp: number;
  gold: number;
  relics: Relic[];
}

/** HUD 布局常量 */
const HUD_HEIGHT = 44;
const HUD_PADDING = 12;
const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 14;
const RELIC_ICON_SIZE = 28;
const RELIC_ICON_GAP = 6;

/**
 * 全局顶部 HUD 组件。构造时渲染一次，后续通过 update() 刷新。
 * 销毁由调用方在场景 SHUTDOWN 时显式 destroy()（registry key 不销毁）。
 */
export class GlobalHudBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private relicsGroup!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, initial: GlobalHudState) {
    this.scene = scene;
    const { width } = scene.scale;

    // 顶层容器，整条 HUD 一起移动/销毁
    this.container = scene.add.container(0, 0).setDepth(8500);

    // 背景横条（半透明黑，低调且不抢视觉）
    const bg = scene.add.rectangle(0, 0, width, HUD_HEIGHT, 0x0b0b14, 0.85)
      .setOrigin(0, 0);
    this.container.add(bg);

    this.buildHpWidget();
    this.buildGoldWidget();
    this.buildRelicsWidget();

    // 首次渲染
    this.update(initial);
  }

  // ==========================================================================
  // 子控件构建（只搭骨架，文本/宽度由 update 填充）
  // ==========================================================================

  /** HP 条：左侧（红心图标位）+ HP 条 + "20 / 120" 文本 */
  private buildHpWidget(): void {
    const x = HUD_PADDING;
    const y = (HUD_HEIGHT - HP_BAR_HEIGHT) / 2;

    // 心形图标（用字符代替，避免依赖贴图资源）
    const heart = this.scene.add.text(x, HUD_HEIGHT / 2, '❤', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '18px',
      color: '#f87171',
    }).setOrigin(0, 0.5);
    this.container.add(heart);

    // HP 条底（灰）
    this.hpBarBg = this.scene.add.rectangle(x + 24, y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x1f2937)
      .setOrigin(0, 0);
    // HP 条前（动态颜色，绿→黄→红按比例切）
    this.hpBar = this.scene.add.rectangle(x + 24, y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x4ade80)
      .setOrigin(0, 0);
    // HP 文本
    this.hpText = this.scene.add.text(x + 24 + HP_BAR_WIDTH + 8, HUD_HEIGHT / 2, '', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: '#e5e7eb',
    }).setOrigin(0, 0.5);

    this.container.add([this.hpBarBg, this.hpBar, this.hpText]);
  }

  /** 金币：HP 右侧一段空距后挂金币图标 + 数字 */
  private buildGoldWidget(): void {
    const x = HUD_PADDING + 24 + HP_BAR_WIDTH + 80;
    const coin = this.scene.add.text(x, HUD_HEIGHT / 2, '◈', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '18px',
      color: '#fbbf24',
    }).setOrigin(0, 0.5);
    this.goldText = this.scene.add.text(x + 24, HUD_HEIGHT / 2, '0', {
      fontFamily: 'FusionPixel, monospace',
      fontSize: '14px',
      color: '#fde68a',
    }).setOrigin(0, 0.5);
    this.container.add([coin, this.goldText]);
  }

  /** 遗物栏：屏幕右端往左排；update 时动态增删图标 */
  private buildRelicsWidget(): void {
    this.relicsGroup = this.scene.add.container(0, HUD_HEIGHT / 2);
    this.container.add(this.relicsGroup);
  }

  // ==========================================================================
  // 更新 / 销毁
  // ==========================================================================

  /** 刷新显示。update 可安全反复调用，内部幂等。 */
  update(state: GlobalHudState): void {
    // HP 条宽度 + 颜色
    const maxHp = Math.max(1, state.maxHp);
    const hpRatio = Math.max(0, Math.min(1, state.hp / maxHp));
    this.hpBar.setDisplaySize(HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT);
    const hpColor = hpRatio > 0.5 ? 0x4ade80 : hpRatio > 0.2 ? 0xfbbf24 : 0xef4444;
    this.hpBar.setFillStyle(hpColor);
    this.hpText.setText(`${state.hp} / ${state.maxHp}`);

    // 金币
    this.goldText.setText(String(state.gold));

    // 遗物栏：清旧重绘（数量一般 ≤ 10，开销可忽略）
    this.relicsGroup.removeAll(true);
    const { width } = this.scene.scale;
    const startX = width - HUD_PADDING - RELIC_ICON_SIZE;
    for (let i = 0; i < state.relics.length; i++) {
      const relic = state.relics[i];
      const x = startX - i * (RELIC_ICON_SIZE + RELIC_ICON_GAP);
      // 用 emoji 作图标（遗物 data 里有 emoji 字段）；没有则回退 ✨
      const icon = this.scene.add.text(x, 0, (relic as Relic & { emoji?: string }).emoji ?? '✨', {
        fontFamily: 'FusionPixel, monospace',
        fontSize: '20px',
      }).setOrigin(0, 0.5);
      this.relicsGroup.add(icon);
    }
  }

  /** 场景 SHUTDOWN 时调用；registry key 不随 destroy 清除 */
  destroy(): void {
    if (this.container.active) {
      this.container.destroy();
    }
  }
}

// ============================================================================
// runState 工具函数 —— 对 registry 的封装，避免各场景硬编码 key 字符串
// ============================================================================

const KEY_HP = 'runHp';
const KEY_MAX_HP = 'runMaxHp';
const KEY_GOLD = 'runGold';
const KEY_RELICS = 'runRelics';

/**
 * 读取当前 run 的 HUD 状态。registry key 缺失时回退安全默认：
 *   - hp/maxHp: 来自职业配置 CLASS_DEFS（用 classId 参数）；若 classId 也不给则回退 warrior
 *   - gold: 0
 *   - relics: []
 *
 * @param scene   任意 Scene（提供 registry 访问）
 * @param classId 可选，用于给出职业相关的 maxHp 默认值
 */
export function readRunState(scene: Phaser.Scene, classId?: ClassId): GlobalHudState {
  const fallbackClass = CLASS_DEFS[classId ?? 'warrior'] ?? CLASS_DEFS.warrior;
  const maxHp = (scene.registry.get(KEY_MAX_HP) as number | undefined) ?? fallbackClass.maxHp;
  const hp = (scene.registry.get(KEY_HP) as number | undefined) ?? maxHp;
  const gold = (scene.registry.get(KEY_GOLD) as number | undefined) ?? 0;
  const relics = (scene.registry.get(KEY_RELICS) as Relic[] | undefined) ?? [];
  return { hp, maxHp, gold, relics };
}

/**
 * 选择职业时初始化一局的 runState（覆盖旧值）。
 * 同时**不**清 runRelics，因为 ClassSelectScene.onConfirmPress 已显式 remove。
 */
export function initRunState(scene: Phaser.Scene, classId: ClassId): void {
  const cls = CLASS_DEFS[classId] ?? CLASS_DEFS.warrior;
  scene.registry.set(KEY_HP, cls.maxHp);
  scene.registry.set(KEY_MAX_HP, cls.maxHp);
  scene.registry.set(KEY_GOLD, 0);
}

/** BattleScene SHUTDOWN 时写回当前玩家 HP，其它场景下次 readRunState 就能读到最新值 */
export function writeRunHp(scene: Phaser.Scene, hp: number): void {
  scene.registry.set(KEY_HP, Math.max(0, Math.floor(hp)));
}

/**
 * 新局时重置所有 HUD 状态（配合 StartScene → ClassSelectScene 进入新局）。
 * MapScene 的 newRun 路径会清 runRelics；本函数配合清 hp/maxHp/gold。
 * 独立暴露是为了将来"直接重开"这类入口也能一把梭。
 */
export function resetRunState(scene: Phaser.Scene): void {
  scene.registry.remove(KEY_HP);
  scene.registry.remove(KEY_MAX_HP);
  scene.registry.remove(KEY_GOLD);
  scene.registry.remove(KEY_RELICS);
}
