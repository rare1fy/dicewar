import Phaser from "phaser";

/**
 * 启动场景：验证 Phaser 跑通 + 一颗可交互骰子。
 * POC-1 用途：点击骰子触发 roll 动画，随机出 1-6 点数。
 */
export class BootScene extends Phaser.Scene {
  private diceValue = 1;
  private diceContainer!: Phaser.GameObjects.Container;
  private diceFaceText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private isRolling = false;

  constructor() {
    super("BootScene");
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add.text(centerX, 160, "Dice Hero - Phaser POC", {
      fontFamily: "Arial, sans-serif",
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.diceContainer = this.add.container(centerX, centerY);

    const diceBg = this.add.rectangle(0, 0, 280, 280, 0xffffff)
      .setStrokeStyle(6, 0x333333);

    this.diceFaceText = this.add.text(0, 0, String(this.diceValue), {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "180px",
      color: "#222222",
    }).setOrigin(0.5);

    this.diceContainer.add([diceBg, this.diceFaceText]);
    this.diceContainer.setSize(280, 280);
    this.diceContainer.setInteractive(
      new Phaser.Geom.Rectangle(-140, -140, 280, 280),
      Phaser.Geom.Rectangle.Contains
    );
    this.diceContainer.on("pointerdown", this.handleRoll, this);

    this.hintText = this.add.text(centerX, centerY + 280, "点击骰子 Roll", {
      fontFamily: "Arial, sans-serif",
      fontSize: "32px",
      color: "#888888",
    }).setOrigin(0.5);

    this.add.text(centerX, this.scale.height - 60, `FPS: --`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#4ade80",
    }).setOrigin(0.5).setName("fps");

    // 进入牌型判定自测页
    const toTestBtn = this.add.text(centerX, this.scale.height - 160, "→ 牌型判定自测", {
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#7c3aed",
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    toTestBtn.on("pointerdown", () => this.scene.start("HandTestScene"));
  }

  update(): void {
    const fpsLabel = this.children.getByName("fps") as Phaser.GameObjects.Text | null;
    if (fpsLabel) {
      fpsLabel.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }
  }

  private handleRoll(): void {
    if (this.isRolling) return;
    this.isRolling = true;
    this.hintText.setText("Rolling...");

    const rollDuration = 600;
    const flickerInterval = 60;
    const flickers = Math.floor(rollDuration / flickerInterval);

    for (let step = 0; step < flickers; step += 1) {
      this.time.delayedCall(step * flickerInterval, () => {
        this.diceFaceText.setText(String(Phaser.Math.Between(1, 6)));
      });
    }

    this.tweens.add({
      targets: this.diceContainer,
      angle: { from: 0, to: 360 },
      scale: { from: 1, to: 1.15, yoyo: true },
      duration: rollDuration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.diceContainer.setAngle(0);
        this.diceValue = Phaser.Math.Between(1, 6);
        this.diceFaceText.setText(String(this.diceValue));
        this.hintText.setText(`点数：${this.diceValue}（再次点击继续）`);
        this.isRolling = false;
      },
    });
  }
}