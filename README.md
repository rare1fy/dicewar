# Dice Hero - Phaser

Dice Hero 正式版仓库，Phaser 3 + TypeScript + Vite。

## 项目坐标

- **技术栈**：Phaser 3.90 + TypeScript 5.6 + Vite 5
- **目标平台**：Steam（Electron 壳）+ 微信小游戏（H5 原生适配）
- **硬约束**：包体 ≤ 4MB / 战斗 FPS ≥ 50
- **前身**：`F:\UGit\dicehero2`（v1.0-prototype，已冻结 2026-04-21）
- **交接文档**：`C:\Users\slimboiliu\.agent\context\prototype-retrospective-20260421.md`

## 开发

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
npm run typecheck  # TSC 零错门禁
npm run build      # 生产构建
```

## 目录结构

```
src/
├── main.ts          # 入口
├── scenes/          # Phaser 场景
├── logic/           # 纯函数业务逻辑（搬自 dicehero2/src/logic）
├── types/           # 类型定义（搬自 dicehero2/src/types）
└── config/          # 数据配置（搬自 dicehero2/src/data、src/config）
```

## 迁移原则

- **可直接搬**：`engine/ logic/ data/ config/ types/` 共 12420 行纯逻辑（约 46%）
- **必须重写**：`components/ hooks/ contexts/` 共 13120 行 React 层（约 54%）
- **先 1:1 复刻**：数值不改，视觉最简实现
- **铁律**：继承 `C:\Users\slimboiliu\.agent\context\RULES.md`（单文件 ≤ 600 行）