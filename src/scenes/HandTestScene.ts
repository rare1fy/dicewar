import Phaser from "phaser";
import { checkHands } from "@/utils/handEvaluator";
import type { Die, DiceElement, HandResult } from "@/types/game";

/**
 * 牌型判定自测场景（PHASER-DEMO-HAND）
 *
 * 用途：可视化验证 MIG-02 搬入的 `checkHands()` 17 种牌型识别是否正确。
 * 交互：6 个骰子槽位，每槽可调点数（1-6）和元素；点数变化实时刷新结果。
 */
export class HandTestScene extends Phaser.Scene {
  private static readonly SLOT_COUNT = 6;
  private static readonly ELEMENTS: DiceElement[] = [
    "normal", "fire", "ice", "thunder", "poison", "holy",
  ];
  private static readonly ELEMENT_COLORS: Record<DiceElement, number> = {
    normal: 0xe5e7eb,
    fire: 0xef4444,
    ice: 0x60a5fa,
    thunder: 0xfacc15,
    poison: 0x22c55e,
    holy: 0xfbbf24,
    shadow: 0x6b7280,
  };

  private slots: SlotModel[] = [];
  private bestHandText!: Phaser.GameObjects.Text;
  private activeHandsText!: Phaser.GameObjects.Text;
  private sumText!: Phaser.GameObjects.Text;
  private presetHintText!: Phaser.GameObjects.Text;

  constructor() {
    super("HandTestScene");
  }

  create(): void {
    const { width } = this.scale;
    const centerX = width / 2;

    // 标题
    this.add.text(centerX, 60, "牌型判定自测 · MIG-02 验证", {
      fontFamily: "Arial, sans-serif",
      fontSize: "38px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // 返回按钮
    const backBtn = this.add.text(20, 20, "← 返回", {
      fontFamily: "Arial, sans-serif",
      fontSize: "26px",
      color: "#60a5fa",
      backgroundColor: "#1f2937",
      padding: { x: 12, y: 6 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => this.scene.start("BootScene"));

    // 6 个骰子槽位
    this.buildSlots();

    // 结果面板
    this.buildResultPanel();

    // 预设按钮
    this.buildPresetButtons();

    // 初次计算
    this.refreshResult();
  }

  // ========================================================
  // 骰子槽位
  // ========================================================

  private buildSlots(): void {
    const slotWidth = 100;
    const slotGap = 12;
    const totalWidth = HandTestScene.SLOT_COUNT * slotWidth + (HandTestScene.SLOT_COUNT - 1) * slotGap;
    const startX = (this.scale.width - totalWidth) / 2 + slotWidth / 2;
    const slotY = 260;

    for (let i = 0; i < HandTestScene.SLOT_COUNT; i += 1) {
      const x = startX + i * (slotWidth + slotGap);
      const model = this.buildSingleSlot(i, x, slotY, slotWidth);
      this.slots.push(model);
    }
  }

  private buildSingleSlot(index: number, x: number, y: number, size: number): SlotModel {
    const active = index < 5; // 默认激活前 5 颗（普通战斗常见手牌数）
    const model: SlotModel = {
      active,
      value: 1,
      element: "normal",
      container: this.add.container(x, y),
      faceText: null as unknown as Phaser.GameObjects.Text,
      elementChip: null as unknown as Phaser.GameObjects.Rectangle,
    };

    // 骰子面板
    const bg = this.add.rectangle(0, 0, size, size, 0xffffff).setStrokeStyle(4, 0x333333);
    model.faceText = this.add.text(0, 0, "1", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "62px",
      color: "#222222",
    }).setOrigin(0.5);

    // 元素色块
    model.elementChip = this.add.rectangle(0, size / 2 + 16, size - 10, 14, HandTestScene.ELEMENT_COLORS.normal);

    model.container.add([bg, model.faceText, model.elementChip]);

    // 激活开关
    const activeToggle = this.add.text(0, -size / 2 - 30, active ? "ON" : "OFF", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: active ? "#4ade80" : "#6b7280",
      backgroundColor: "#1f2937",
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    activeToggle.on("pointerdown", () => {
      model.active = !model.active;
      activeToggle.setText(model.active ? "ON" : "OFF");
      activeToggle.setColor(model.active ? "#4ade80" : "#6b7280");
      model.container.setAlpha(model.active ? 1 : 0.35);
      this.refreshResult();
    });
    model.container.add(activeToggle);
    model.container.setAlpha(active ? 1 : 0.35);

    // 点数 ±
    const plus = this.makeStepButton("+", () => this.bumpValue(model, +1));
    const minus = this.makeStepButton("-", () => this.bumpValue(model, -1));
    plus.setPosition(size / 2 - 16, size / 2 + 44);
    minus.setPosition(-size / 2 + 16, size / 2 + 44);
    model.container.add([plus, minus]);

    // 元素循环
    const elemBtn = this.add.text(0, size / 2 + 44, "元素", {
      fontFamily: "Arial, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: "#374151",
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    elemBtn.on("pointerdown", () => this.cycleElement(model));
    model.container.add(elemBtn);

    return model;
  }

  private makeStepButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.add.text(0, 0, label, {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#2563eb",
      padding: { x: 10, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on("pointerdown", onClick);
    return btn;
  }

  private bumpValue(model: SlotModel, delta: number): void {
    model.value = ((model.value - 1 + delta + 6) % 6) + 1;
    model.faceText.setText(String(model.value));
    this.refreshResult();
  }

  private cycleElement(model: SlotModel): void {
    const idx = HandTestScene.ELEMENTS.indexOf(model.element);
    const next = HandTestScene.ELEMENTS[(idx + 1) % HandTestScene.ELEMENTS.length];
    model.element = next;
    model.elementChip.setFillStyle(HandTestScene.ELEMENT_COLORS[next]);
    this.refreshResult();
  }

  // ========================================================
  // 结果面板
  // ========================================================

  private buildResultPanel(): void {
    const panelY = 500;
    const centerX = this.scale.width / 2;

    this.add.rectangle(centerX, panelY + 120, this.scale.width - 40, 280, 0x111827)
      .setStrokeStyle(2, 0x374151);

    this.add.text(40, panelY, "结果", {
      fontFamily: "Arial, sans-serif",
      fontSize: "26px",
      color: "#9ca3af",
    });

    this.bestHandText = this.add.text(40, panelY + 40, "", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "44px",
      color: "#fbbf24",
    });

    this.activeHandsText = this.add.text(40, panelY + 110, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#d1d5db",
      wordWrap: { width: this.scale.width - 80 },
    });

    this.sumText = this.add.text(40, panelY + 180, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#60a5fa",
    });

    this.presetHintText = this.add.text(40, panelY + 220, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      color: "#9ca3af",
    });
  }

  // ========================================================
  // 预设按钮
  // ========================================================

  private buildPresetButtons(): void {
    const presets: PresetCase[] = [
      { name: "对子", values: [3, 3, 0, 0, 0, 0], elements: ["normal", "normal"] },
      { name: "顺子", values: [1, 2, 3, 0, 0, 0], elements: ["normal", "normal", "normal"] },
      { name: "三条", values: [5, 5, 5, 0, 0, 0], elements: ["normal", "normal", "normal"] },
      { name: "葫芦", values: [4, 4, 4, 2, 2, 0], elements: ["normal", "normal", "normal", "normal", "normal"] },
      { name: "同元素", values: [1, 3, 5, 6, 0, 0], elements: ["fire", "fire", "fire", "fire"] },
      { name: "皇家", values: [1, 2, 3, 4, 5, 6], elements: ["fire", "fire", "fire", "fire", "fire", "fire"] },
    ];

    const btnY = 1180;
    const btnW = 108;
    const gap = 8;
    const totalW = presets.length * btnW + (presets.length - 1) * gap;
    const startX = (this.scale.width - totalW) / 2 + btnW / 2;

    presets.forEach((preset, idx) => {
      const x = startX + idx * (btnW + gap);
      const btn = this.add.text(x, btnY, preset.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#7c3aed",
        padding: { x: 12, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.applyPreset(preset));
    });
  }

  private applyPreset(preset: PresetCase): void {
    this.slots.forEach((slot, i) => {
      const value = preset.values[i] ?? 0;
      const element = preset.elements[i] ?? "normal";
      slot.active = value > 0;
      slot.value = value > 0 ? value : 1;
      slot.element = element;
      slot.faceText.setText(String(slot.value));
      slot.elementChip.setFillStyle(HandTestScene.ELEMENT_COLORS[element]);
      slot.container.setAlpha(slot.active ? 1 : 0.35);
      // 同步激活开关显示
      const toggle = slot.container.list.find(
        (obj): obj is Phaser.GameObjects.Text =>
          obj instanceof Phaser.GameObjects.Text &&
          (obj.text === "ON" || obj.text === "OFF")
      );
      if (toggle) {
        toggle.setText(slot.active ? "ON" : "OFF");
        toggle.setColor(slot.active ? "#4ade80" : "#6b7280");
      }
    });
    this.presetHintText.setText(`预设：${preset.name}`);
    this.refreshResult();
  }

  // ========================================================
  // 核心：调 checkHands
  // ========================================================

  private refreshResult(): void {
    const dice: Die[] = this.slots
      .filter(s => s.active)
      .map((s, i) => ({
        id: i + 1,
        diceDefId: "standard",
        value: s.value,
        element: s.element,
        selected: true,
        spent: false,
      }));

    const result: HandResult = checkHands(dice);
    const sum = dice.reduce((a, d) => a + d.value, 0);

    this.bestHandText.setText(result.bestHand || "—");
    this.activeHandsText.setText(`activeHands: [${result.activeHands.join(", ")}]`);
    this.sumText.setText(`dice: ${dice.length} 颗  |  点数和: ${sum}`);
  }
}

interface SlotModel {
  active: boolean;
  value: number;
  element: DiceElement;
  container: Phaser.GameObjects.Container;
  faceText: Phaser.GameObjects.Text;
  elementChip: Phaser.GameObjects.Rectangle;
}

interface PresetCase {
  name: string;
  values: number[];
  elements: DiceElement[];
}
