# Dice Hero (dicewar)

> Phaser 3 版本 · 2026-04-21 起 · 正式仓库

[![Deploy](https://github.com/rare1fy/dicewar/actions/workflows/deploy.yml/badge.svg)](https://github.com/rare1fy/dicewar/actions/workflows/deploy.yml)

骰子 + 肉鸽 + 牌型构筑的单机战斗游戏。当前阶段：**POC 迁移期**，从 React 版原型 (`rare1fy/dicehero`) 往 Phaser 3 迁移，目标微信小游戏 + Steam 双端。

## 在线试玩

https://rare1fy.github.io/dicewar/（推 master 后由 GitHub Actions 自动部署）

## 技术栈

| 层 | 选型 |
|---|---|
| 游戏引擎 | Phaser 3.90 |
| 语言 | TypeScript 5.6 (strict) |
| 构建 | Vite 5.4 |
| 画面 | 720 × 1280 竖屏 |
| 目标包体 | ≤ 4 MB（微信小游戏限制） |
| 目标帧率 | ≥ 50 FPS |

## 目录结构

```
src/
├── main.ts                  # Phaser Game 入口
├── scenes/
│   ├── BootScene.ts         # 首屏 + 骰子 roll demo
│   └── HandTestScene.ts     # 牌型判定自测页
├── types/                   # 类型（从 dicehero2 迁入）
├── data/                    # 静态数据（牌型、骰子、职业）
├── utils/                   # 纯函数工具（handEvaluator 等）
└── engine/                  # 纯函数引擎（遗物触发，待迁入）
```

## 本地开发

```bash
npm install
npm run dev          # dev server @ http://localhost:5173
npm run typecheck    # tsc --noEmit 零错门禁
npm run build        # 生产构建到 dist/
```

## 部署

**自动部署**：`git push origin master` 即可，GitHub Actions 会跑 `npm run build` 并发布到 GitHub Pages。

**首次启用**：需要在 https://github.com/rare1fy/dicewar/settings/pages 把 Source 切成 "GitHub Actions"（一次性配置）。

## 迁移进度

| 阶段 | 状态 |
|---|---|
| PHASER-INIT 脚手架 | ✅ 骰子 roll 动画 |
| MIG-01 types + utils | ✅ 6 文件 1169 行 |
| MIG-02 牌型判定 | ✅ 17 种牌型在 HandTestScene 可视化自测通过 |
| MIG-03 engine 纯函数层 | 🔄 进行中 |
| MIG-04 数据表 | ⏳ |
| MIG-05 战斗逻辑 | ⏳ |
| UI-01 最小战斗闭环 | ⏳ |
| WX-01 微信小游戏适配 | ⏳ |

## 已知欠账

- **PHASER-FIX-STRAIGHT-UPGRADE**：`handEvaluator.checkHands` 的 `straightUpgrade` 参数未接线（继承自原型历史 bug），代码里以 `_options` 装死绕过。正式迁 engine 前必须补。见 `src/utils/handEvaluator.ts` 顶部注释。

## 相关仓库

- **原型（已冻结）**：https://github.com/rare1fy/dicehero (tag `v1.0-prototype`)
- **本仓库**：https://github.com/rare1fy/dicewar

## License

Private · All rights reserved
