import Phaser from "phaser";
import { BootScene } from "@/scenes/BootScene";
import { HandTestScene } from "@/scenes/HandTestScene";

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, HandTestScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};

new Phaser.Game(config);