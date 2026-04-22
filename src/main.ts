import Phaser from "phaser";
import { StartScene } from "@/scenes/StartScene";
import { ClassSelectScene } from "@/scenes/ClassSelectScene";
import { MapScene } from "@/scenes/MapScene";
import { BootScene } from "@/scenes/BootScene";
import { HandTestScene } from "@/scenes/HandTestScene";
import { BattleScene } from "@/scenes/BattleScene";

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
  // StartScene 首屏 → ClassSelectScene 选职业 → MapScene 选节点 → BattleScene 战斗；BootScene 保留为"开发者菜单"
  scene: [StartScene, ClassSelectScene, MapScene, BootScene, HandTestScene, BattleScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
};

new Phaser.Game(config);