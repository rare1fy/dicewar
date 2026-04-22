/**
 * LootScene.ts — 战后奖励选择场景（α-go 第 6 单）
 *
 * 生命周期流向：
 *   BattleScene (victory + fromMap) → scene.start('LootScene', { classId })
 *     → 玩家 3 选 1 或 Skip
 *     → scene.start('MapScene')  // 不传 newRun，保留地图进度
 *
 * 跨场景持久化（registry 总线）：
 *   - `runRelics`：当前整局累积的遗物数组（Relic[]）；本场景 append 后写回
 *   - `pendingBattleNodeId`：由 MapScene 的 consumeBattleResultIfAny 负责清，本场景不动
 *   - `lastBattleResult`：由 MapScene 消费，本场景不动（本场景本就只在 victory 时进来）
 *
 * 设计决策：
 *   - 3 张卡 + 1 个 Skip 按钮（玩家可以不选，避免 Loot 池耗尽卡关）
 *   - 选中卡后 800ms 视觉确认（淡出其他卡 + 闪光）再跳转，给反馈
 *   - 卡池通过 LootPicker 按稀有度加权随机，排除已持有遗物
 *   - 卡池不足 3 张（池耗尽）时只渲染实际可抽到的数量
 */

import Phaser from 'phaser';
import { LootCard } from './loot/LootCard';
import { pickLootCandidates } from './loot/LootPicker';
import { playSound } from '../utils/sound';
import type { Relic } from '../types/game';

interface LootSceneData {
  classId?: string;
}

export class LootScene extends Phaser.Scene {
  private classId: string = 'warrior';
  private cards: LootCard[] = [];
  private isLeaving: boolean = false;

  constructor() {
    super('LootScene');
  }

  init(data: LootSceneData): void {
    if (data && data.classId) this.classId = data.classId;
    this.cards = [];
    this.isLeaving = false;
  }

  create(): void {
    this.drawBackground();
    this.drawTitle();
    this.drawCards();
    this.drawSkipButton();
  }

  // ==========================================================================
  // 渲染
  // ==========================================================================

  /** 深色底 + 顶部暗角，复用 Map/Start 风格 */
  private drawBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0812);
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x040306, 0x040306, 0x0a0812, 0x0a0812, 0.7, 0.7, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.25);
  }

  private drawTitle(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 60, '战利品', {
      fontFamily: 'FusionPixel',
      fontSize: '40px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 108, '选择一件遗物加入你的 Build，或跳过', {
      fontFamily: 'FusionPixel',
      fontSize: '16px',
      color: '#d1d5db',
    }).setOrigin(0.5);
  }

  /** 读取当前 runRelics 作为排除集，抽 3 张卡并渲染 */
  private drawCards(): void {
    const ownedIds = this.getOwnedRelicIds();
    const candidates = pickLootCandidates(ownedIds, 3);

    if (candidates.length === 0) {
      // 卡池耗尽（玩家已持有所有遗物）——给一行提示，Skip 依然可用
      this.add.text(this.scale.width / 2, this.scale.height / 2, '所有遗物均已拥有，无新战利品可选', {
        fontFamily: 'FusionPixel',
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      return;
    }

    const { width } = this.scale;
    const centerY = 340;
    const gap = 240; // 卡宽 200 + 间距 40
    const totalW = (candidates.length - 1) * gap;
    const startX = width / 2 - totalW / 2;

    for (let i = 0; i < candidates.length; i++) {
      const card = new LootCard({
        scene: this,
        x: startX + i * gap,
        y: centerY,
        relic: candidates[i],
        onPick: (r) => this.onPickRelic(r),
      });
      this.cards.push(card);
    }
  }

  private drawSkipButton(): void {
    const { width, height } = this.scale;
    const btn = this.add.text(width / 2, height - 80, '跳过奖励', {
      fontFamily: 'FusionPixel',
      fontSize: '18px',
      color: '#e5e7eb',
      backgroundColor: '#475569',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#64748b' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#475569' }));
    btn.on('pointerup', () => this.leaveToMap());
  }

  // ==========================================================================
  // 交互
  // ==========================================================================

  /** 读取 run-scoped 已持有遗物 id 集合；首场 Loot 时 registry 空 → 回退空 Set */
  private getOwnedRelicIds(): ReadonlySet<string> {
    const runRelics = (this.registry.get('runRelics') as Relic[] | undefined) ?? [];
    return new Set(runRelics.map((r) => r.id));
  }

  /**
   * 玩家点选遗物：追加到 runRelics，播放确认音效 + 短暂停留，再跳 Map。
   * 防重入：isLeaving 守 + 立刻禁用所有卡交互。
   */
  private onPickRelic(relic: Relic): void {
    if (this.isLeaving) return;
    this.isLeaving = true;

    // 禁用所有卡片交互（防止动画中继续点击别的卡）
    for (const card of this.cards) {
      card.disableInteractive();
    }

    // append 到 runRelics
    const prev = (this.registry.get('runRelics') as Relic[] | undefined) ?? [];
    this.registry.set('runRelics', [...prev, relic]);

    playSound('relic');

    // 视觉确认：被选中的卡保持亮显，其他卡淡出
    this.tweens.add({
      targets: this.cards.filter((c) => c !== this.findCardByRelic(relic)),
      alpha: 0.3,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    // 800ms 后跳 Map
    this.time.delayedCall(800, () => {
      this.scene.start('MapScene', { classId: this.classId });
    });
  }

  /** 在 this.cards 里找出绑定给定 relic 的卡（用于视觉确认时的目标定位） */
  private findCardByRelic(relic: Relic): LootCard | null {
    // LootCard 构造时传 relic 但没暴露 getter；这里按构建顺序 + 候选顺序反查
    // 简化实现：顺序与 drawCards 里 candidates 的插入顺序一致
    for (const card of this.cards) {
      // card.list 里有 bg/border/icon/text，直接比对 relic 字段不方便；改用 data 存 id
      if (card.getData('relicId') === relic.id) return card;
    }
    return null;
  }

  /** 跳过奖励：直接回 Map。不改动 runRelics。 */
  private leaveToMap(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.scene.start('MapScene', { classId: this.classId });
  }
}
