/**
 * MapScene.ts — 地图场景（α-go 第 4 单 PHASER-SCENE-MAP-MVP）
 *
 * 职责（SRP）：
 *   - 根据 mapGenerator.generateMap() 生成 10-15 层节点的杀戮尖塔风地图
 *   - 按 depth 纵向排布、getNodeX 横向排布节点，画连线，按 NodeType 染色
 *   - 追踪"已完成节点 completed"与"当前位置 currentNodeId"，高亮可走节点（connectedTo 内且 depth = 当前 depth + 1）
 *   - 点击可走节点：
 *       战斗型（enemy/elite/boss）→ 通过 registry 桥接 scene.start BattleScene，回来时读 lastBattleResult 判胜负
 *       非战斗型（event/campfire/treasure/merchant）→ MVP 阶段直接标记 completed + 推进（TODO：单独 Scene 或弹窗处理）
 *
 * 参数传递：
 *   - scene.start('MapScene', { classId, newRun })：
 *     - classId：职业（战士/法师/盗贼），MapScene 只透传给 BattleScene，不自己使用
 *     - newRun（Verify V1 R1 修复）：ClassSelectScene 进入时置 true，强制清空旧地图状态重新生成；
 *       BattleScene 回流不传（保留进度）
 *
 * 场景切换策略（Verify V1 P0 修复后）：
 *   - Map → Battle：`scene.start('BattleScene', ...)` 硬切
 *       副作用：会触发 MapScene.SHUTDOWN → MapScene 不再绑 SHUTDOWN 事件以免过早清 registry 里的回流键
 *   - Battle → Map：同样走 scene.start（由 BattleScene 的 showOverBanner 首按钮"返回地图"触发）
 *   - 回流通信：通过 game.registry 的 pendingBattleNodeId + lastBattleResult 两个 key
 *     - pendingBattleNodeId：Map 进 Battle 前写入，Battle 用它做"fromMap 探测"决定按钮文案
 *     - lastBattleResult：Battle SHUTDOWN 时由 resetBattleResultState 写入
 *     - 消费与清理：MapScene.consumeBattleResultIfAny 一次性读+清
 *
 * MVP 收窄：
 *   - 不做：地图滚动（节点压缩到一屏显示）、小地图预览、节点 tooltip、动画转场
 *   - 做：纯静态节点圆点 + 连线 + 职业信息栏 + 点击判断 + 战斗回流
 *
 * B1 行数控制：目标 ≤ 350 行；若超则拆 MapNodeView.ts
 */

import Phaser from 'phaser';
import type { MapNode, NodeType } from '../types/game';
import type { ClassId } from '../types/game';
import { generateMap, getNodeX } from '../utils/mapGenerator';
import { playSound } from '../utils/sound';
import { GlobalHudBar, readRunState, resetRunState } from './hud/GlobalHudBar';

/** 节点视觉配置：颜色 + 半径 + label（按 NodeType 路由） */
const NODE_STYLE: Record<NodeType, { color: number; radius: number; label: string }> = {
  enemy:    { color: 0xef4444, radius: 18, label: '战' },
  elite:    { color: 0xa855f7, radius: 22, label: '精' },
  boss:     { color: 0xdc2626, radius: 28, label: 'BOSS' },
  event:    { color: 0x3b82f6, radius: 18, label: '？' },
  campfire: { color: 0xf59e0b, radius: 18, label: '营' },
  treasure: { color: 0xfacc15, radius: 18, label: '宝' },
  merchant: { color: 0x22c55e, radius: 18, label: '商' },
};

/** 节点视觉状态染色倍率（完成/当前/可走/锁定） */
const STATE_ALPHA = {
  completed: 0.35,
  current:   1.0,
  available: 1.0,
  locked:    0.25,
} as const;

type NodeState = 'completed' | 'current' | 'available' | 'locked';

interface MapSceneData {
  classId?: string;
  /**
   * 【Verify V1 R1 修复】新局标记：从 ClassSelectScene 进来的"正式开局"会置 true，
   * MapScene.init 据此显式清掉旧地图状态，强制重新 generateMap()。
   * 战斗回流路径（BattleScene.backToMap）不传此字段 → 保留 nodes/currentNodeId 进度。
   */
  newRun?: boolean;
}

export class MapScene extends Phaser.Scene {
  // α-go 第 8 单 HUD：全局顶部栏（HP/金币/遗物）；构造于 create，销毁于 SHUTDOWN
  private hudBar: GlobalHudBar | null = null;

  private classId: string = 'warrior';
  private nodes: MapNode[] = [];
  /** 当前玩家所在节点 ID；null 表示还未踏入（初始状态：任一 depth=0 节点都可选） */
  private currentNodeId: string | null = null;
  /** 节点 id → Graphics 圆点（用于后续状态刷新着色） */
  private nodeGfxMap: Map<string, Phaser.GameObjects.Container> = new Map();
  /** 用于重绘连线的 Graphics 层（全量重绘，节点数量小，成本可接受） */
  private edgesGfx: Phaser.GameObjects.Graphics | null = null;
  /** 正在等战斗结算，避免玩家快速点另一节点触发重入 */
  private isEnteringBattle: boolean = false;

  /**
   * 【地图滚动 + 拖拽状态】
   * 采用"整张地图长条（高 = layers × LAYER_GAP）+ 相机垂直滚动"模式，参考原型 MapScreen.tsx 的 scroll 容器行为。
   *   - drag.active：标记一次按下-移动的"拖动模式"；阈值 > DRAG_THRESHOLD 才算拖动，否则视为点击
   *   - drag.startCamY / startPointerY：记录按下瞬间相机与指针 Y，拖动中用差值回写 cameras.main.scrollY
   *   - drag.movedBy：按下至抬起累计位移；抬起时若 > DRAG_THRESHOLD → 吞掉即将冒泡的节点 pointerup 点击
   * 手机触屏和桌面鼠标走同一套 pointer 事件，无需分支。
   */
  private drag: { active: boolean; startCamY: number; startPointerY: number; movedBy: number } = {
    active: false, startCamY: 0, startPointerY: 0, movedBy: 0,
  };
  /** 滑过此阈值（像素）视为"拖动"而非"点击"；8px 在桌面和触屏都足够过滤抖动 */
  private static readonly DRAG_THRESHOLD = 8;
  /** 层间垂直间距（像素）。原 MVP 把 10-15 层压一屏每层 ~73px 太挤；拉到 160 后总高 ~2400 需要滚动查看 */
  private static readonly LAYER_GAP = 160;
  /** 地图总高（depth 展开后的绝对高度），由 setupMapLayout 计算 */
  private mapContentHeight: number = 0;

  constructor() {
    super('MapScene');
  }

  init(data: MapSceneData): void {
    if (data && data.classId) this.classId = data.classId;
    // 【Verify V1 R1 修复】新局信号：显式清 nodes / currentNodeId / isEnteringBattle
    // Phaser 3 SceneManager 复用 Scene 实例，类字段不会自动复位；
    // 不清 → 玩家"回首屏再进游戏"会看到上一局的已完成地图（僵尸数据）
    if (data && data.newRun) {
      this.nodes = [];
      this.currentNodeId = null;
      this.isEnteringBattle = false;
      // 同步清 registry 中任何可能残留的战斗回流键（例如玩家上一局中途退出没走完回流）
      this.registry.remove('pendingBattleNodeId');
      this.registry.remove('lastBattleResult');
      // α-go 第 6 单 LOOT：顺手清 run-scoped 遗物池（双保险，ClassSelectScene 已清一次）
      this.registry.remove('runRelics');
    }
  }

  create(): void {
    // Phaser Scene 实例复用 + scene.start 路径不走 wake：每次 create 必须清掉旧 GameObject 的 Map 索引
    // （Phaser 自己会在 SHUTDOWN 时 destroy 场上 GO，但 nodeGfxMap 里的引用会变成野指针）
    this.nodeGfxMap.clear();
    this.edgesGfx = null;

    // 只在首次创建时生成一次地图；后续复用既有 nodes（保留 completed 进度）
    if (this.nodes.length === 0) {
      this.nodes = generateMap();
    }
    this.drawBackground();
    // HUD 全局顶部栏：放在业务顶栏之前渲染，保证 HUD 在最顶
    //   readRunState 若 registry 缺失 → 按 classId 回退 maxHp 默认值（首场合理）
    this.hudBar = new GlobalHudBar(this, readRunState(this, this.classId as ClassId));
    this.drawTopBar();
    // 先计算地图总高，再把相机的可滚动范围开出来 —— 之后 drawEdges/drawNodes 用到的 nodeCenter 已经是绝对坐标
    this.setupMapLayout();
    this.drawEdges();
    this.drawNodes();
    this.setupDrag();

    // 从战斗回来（scene.start 硬切路径）：直接在 create 里消费 registry 战果，不依赖 wake 事件
    this.consumeBattleResultIfAny();
    // 把相机落到"当前节点/起点"居中，避免玩家进来看到一片空白（原型 scrollIntoView center 的等价实现）
    this.centerOnCurrent(false);

    // wake 事件保留监听（将来做 sleep/run 软切时用，当前路径不会触发）
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);

    // α-go 第 8 单 HUD：SHUTDOWN 时释放 HUD + 解绑 WAKE 监听，避免 Scene 复用实例累积
    //   Verify A-2 修复：现有 WAKE 监听每次 create 都 on 一次无 off，Scene 实例复用会堆积
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.WAKE, this.onWake, this);
      if (this.hudBar) {
        this.hudBar.destroy();
        this.hudBar = null;
      }
    });
    // 注意：MapScene 不绑 SHUTDOWN 清 registry —— 因为 scene.start('BattleScene') 会 stop MapScene
    // 触发 SHUTDOWN，此时 pendingBattleNodeId 正在协议中不能清。
    // registry 清理唯一时机是战果消费完成后（见 consumeBattleResultIfAny 末尾的 remove）。
  }

  /** 背景：深色底 + 径向暗角（复用 StartScene 套路，纯 Graphics）
   *  【相机滚动】背景绑定视口，不参与 camera.scrollY */
  private drawBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0812).setScrollFactor(0);
    const vignette = this.add.graphics().setScrollFactor(0);
    vignette.fillGradientStyle(0x040306, 0x040306, 0x0a0812, 0x0a0812, 0.7, 0.7, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.25);
  }

  /** 顶栏：当前职业 + 返回选职业按钮（MVP 先不做存档，点回直接重开）
   *  α-go 第 8 单 HUD：全局 HUD 占位 y=0-44，本业务顶栏下移到 y=54 起避让。 */
  private drawTopBar(): void {
    const classLabel = this.classId === 'warrior' ? '战士'
                    : this.classId === 'mage' ? '法师'
                    : this.classId === 'rogue' ? '盗贼' : this.classId;
    // 【相机滚动】顶栏三件套全部 setScrollFactor(0)，钉在视口上，不随地图上下滑
    this.add.text(24, 54, `职业：${classLabel}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#e5e7eb',
    }).setScrollFactor(0);
    this.add.text(this.scale.width / 2, 54, '征途之路', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    const backBtn = this.add.text(this.scale.width - 24, 54, '换职业', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#475569',
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      if (this.isEnteringBattle) return;
      // Verify A-1 修复：换职业等于"弃掉当前 run"，清 runState 避免旧局 HP/maxHp/gold 污染新局
      resetRunState(this);
      this.scene.start('ClassSelectScene');
    });
  }

  /** 画所有连线（全量重绘；节点数 < 100，成本可忽略） */
  private drawEdges(): void {
    if (this.edgesGfx) {
      this.edgesGfx.clear();
    } else {
      this.edgesGfx = this.add.graphics();
    }
    const gfx = this.edgesGfx;
    gfx.lineStyle(2, 0x4b5563, 0.6);
    for (const node of this.nodes) {
      const from = this.nodeCenter(node);
      for (const toId of node.connectedTo) {
        const to = this.nodes.find(n => n.id === toId);
        if (!to) continue;
        const toPos = this.nodeCenter(to);
        gfx.strokeLineShape(new Phaser.Geom.Line(from.x, from.y, toPos.x, toPos.y));
      }
    }
  }

  /** 画所有节点圆点 */
  private drawNodes(): void {
    for (const node of this.nodes) {
      this.drawOneNode(node);
    }
  }

  /** 画单个节点（container = 圆+文字；交互绑定） */
  private drawOneNode(node: MapNode): void {
    const { x, y } = this.nodeCenter(node);
    const style = NODE_STYLE[node.type];
    const container = this.add.container(x, y);

    const circle = this.add.circle(0, 0, style.radius, style.color);
    circle.setStrokeStyle(2, 0xffffff, 0.8);
    const label = this.add.text(0, 0, style.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: style.label.length >= 2 ? '12px' : '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([circle, label]);

    // 【命中区放大】style.radius 负责视觉，hitRadius 负责命中 —— 手机拇指 ~44px 对应 hitRadius +12 足够宽容
    const hitRadius = style.radius + 12;
    container.setSize(hitRadius * 2, hitRadius * 2);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, hitRadius), Phaser.Geom.Circle.Contains);
    // pointerup 而非 pointerdown：和 setupDrag 的 movedBy 阈值判定配合 —— 按下即开始拖时不应触发节点点击
    container.on('pointerup', () => {
      if (this.drag.movedBy > MapScene.DRAG_THRESHOLD) return; // 拖动手势，不是点击
      this.onNodeClick(node);
    });

    this.nodeGfxMap.set(node.id, container);
    this.applyNodeState(node, this.deriveState(node));
  }

  /** 推断单节点视觉状态 */
  private deriveState(node: MapNode): NodeState {
    if (node.completed) return 'completed';
    if (this.currentNodeId === node.id) return 'current';
    if (this.isReachable(node)) return 'available';
    return 'locked';
  }

  /** 节点是否可走（未入场时 depth=0 都可选；入场后必须是 current.connectedTo 内下一层） */
  private isReachable(node: MapNode): boolean {
    if (node.completed) return false;
    if (this.currentNodeId === null) return node.depth === 0;
    const current = this.nodes.find(n => n.id === this.currentNodeId);
    if (!current) return false;
    return current.connectedTo.includes(node.id);
  }

  /** 应用视觉状态：alpha + 描边颜色 */
  private applyNodeState(node: MapNode, state: NodeState): void {
    const container = this.nodeGfxMap.get(node.id);
    if (!container) return;
    container.setAlpha(STATE_ALPHA[state]);
    // current 态金边、available 态白边、其他默认暗边
    const circle = container.list[0] as Phaser.GameObjects.Arc;
    if (state === 'current') {
      circle.setStrokeStyle(3, 0xfbbf24, 1);
    } else if (state === 'available') {
      circle.setStrokeStyle(3, 0xffffff, 1);
    } else {
      circle.setStrokeStyle(2, 0xffffff, 0.4);
    }
    // locked 节点关闭交互，available/current 保留点击（命中半径同 drawOneNode 的 hitRadius）
    if (state === 'locked' || state === 'completed') {
      container.disableInteractive();
    } else {
      const hitRadius = NODE_STYLE[node.type].radius + 12;
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, hitRadius),
        Phaser.Geom.Circle.Contains,
      );
    }
  }

  /** 刷新所有节点状态（战斗回来后调一次即可） */
  private refreshAllNodes(): void {
    for (const node of this.nodes) {
      this.applyNodeState(node, this.deriveState(node));
    }
  }

  /**
   * 节点中心"世界坐标"：每层固定 LAYER_GAP 间距展开，depth 0（起点）在最下、boss 在最上。
   * 不再压缩到一屏 —— 总高 mapContentHeight，相机滚动区间由 setupMapLayout 控制。
   * 世界坐标 → 屏幕坐标由 camera.scrollY 负责，GameObject 默认 scrollFactor=1 会自然跟随。
   */
  private nodeCenter(node: MapNode): { x: number; y: number } {
    const { width } = this.scale;
    // 世界 y：起点（depth=0）在 worldBottom 附近；boss 在最上；按 LAYER_GAP 均匀展开
    const worldBottom = this.mapContentHeight - 160;
    const y = worldBottom - node.depth * MapScene.LAYER_GAP;

    const leftPad = 60;
    const rightPad = 60;
    const usableW = width - leftPad - rightPad;
    const xRatio = getNodeX(node, this.nodes) / 100; // getNodeX 返回 0-100
    const x = leftPad + xRatio * usableW;

    return { x, y };
  }

  /** 节点点击入口 */
  private onNodeClick(node: MapNode): void {
    if (this.isEnteringBattle) return;
    if (!this.isReachable(node)) return;

    playSound('button_click');

    // 战斗节点：进 BattleScene
    if (node.type === 'enemy' || node.type === 'elite' || node.type === 'boss') {
      this.enterBattle(node);
      return;
    }
    // MVP 非战斗节点：直接标记完成并前进（后续单独接 Event/Campfire/Merchant/Treasure 场景）
    this.currentNodeId = node.id;
    node.completed = true;
    this.refreshAllNodes();
  }

  /** 进战斗前：记位置 + 清 registry 上次结果 + start BattleScene */
  private enterBattle(targetNode: MapNode): void {
    this.isEnteringBattle = true;
    // 记录"正在尝试进入的目标节点"：
    //   - BattleScene 用它作为"我是不是从 Map 来的"信号，动态把 showOverBanner 的 "再战一局" 按钮改成 "返回地图"
    //   - MapScene 胜利回来时用它定位要更新哪个节点 completed
    this.registry.set('pendingBattleNodeId', targetNode.id);
    // 清上次战果，避免 consumeBattleResultIfAny 读到旧值
    this.registry.remove('lastBattleResult');

    // 走 scene.start 硬切（而非 sleep/run）：Phaser Scene 实例复用特性下，硬切的成本低且路径单一；
    // BattleScene SHUTDOWN 时会把战果写入 game.registry，MapScene.create 回来时消费。
    //
    // α-go 第 7 单 BOSS-MVP：把节点类型映射为 battleType 传下去
    //   - enemy → 'normal'（BattleType 里用 'normal' 更语义）
    //   - elite → 'elite'（未来差异化入口）
    //   - boss  → 'boss'（触发 BossEntrance 演出 + 切 bgm_boss）
    const battleType = targetNode.type === 'enemy' ? 'normal' : targetNode.type;
    this.scene.start('BattleScene', { classId: this.classId, battleType });
  }

  /** wake 钩子（预留）：未来做 roundtrip 时会跑到这里 */
  private onWake(): void {
    this.consumeBattleResultIfAny();
  }

  /**
   * 消费 registry 里战斗结果（create 和 wake 双入口复用）。
   * 胜利 → 标记对应节点 completed + 更新 currentNodeId；
   * 失败或缺失 → 不动节点（让玩家重新选或换职业）。
   */
  private consumeBattleResultIfAny(): void {
    const result = this.registry.get('lastBattleResult') as 'victory' | 'defeat' | null | undefined;
    const nodeId = this.registry.get('pendingBattleNodeId') as string | null | undefined;
    if (result === 'victory' && nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        node.completed = true;
        this.currentNodeId = nodeId;
      }
    }
    this.registry.remove('lastBattleResult');
    this.registry.remove('pendingBattleNodeId');
    this.isEnteringBattle = false;
    this.refreshAllNodes();
    // 战斗胜利后 currentNodeId 已推进，相机平滑滚到新位置让玩家看清下一层可走节点
    if (result === 'victory') this.centerOnCurrent(true);
  }

  // ============================================================================
  // 【以下为 α-go 第 4 单后补：镜头跟随 / 拖拽滚动 / 命中区放大】
  // 设计背景：原型 MapScreen.tsx 用 DOM overflow:auto + scrollIntoView(center)；Phaser 用 camera.scrollY 等价实现。
  // ============================================================================

  /**
   * 计算地图总高，开相机可滚范围。
   *   mapContentHeight = layers × LAYER_GAP + 顶底缓冲
   *   camera bounds 纵向从 0 → mapContentHeight；横向不滚（后续要做横向地图再开 X 轴）
   *   若 mapContentHeight 小于视口高（极端情况 depth=0），走"不滚动"分支避免 bounds 报错
   */
  private setupMapLayout(): void {
    const { width, height } = this.scale;
    const maxDepth = this.nodes.reduce((m, n) => Math.max(m, n.depth), 0) || 1;
    // +1 是因为 depth 从 0 开始，共 maxDepth+1 层；头尾各留 200 像素缓冲
    this.mapContentHeight = Math.max(height, (maxDepth + 1) * MapScene.LAYER_GAP + 400);
    // camera bounds：world 坐标 y 从 0 到 mapContentHeight，相机 scrollY 可在 [0, mapContentHeight - height] 间移动
    this.cameras.main.setBounds(0, 0, width, this.mapContentHeight);
  }

  /**
   * 注册全局拖拽监听（scene.input.on，不依赖任何 GameObject）。
   *   pointerdown  → 记录起始相机 Y + 指针 Y，movedBy 归零
   *   pointermove  → 更新 movedBy 累计，若超阈值就 setScrollY 实时跟手
   *   pointerup    → 重置 drag 态；节点自己的 pointerup 回调用 movedBy 判断是否吞掉点击
   * 注意：这些监听 Scene 级别，走 scene.events 的 SHUTDOWN 会自动清理 scene.input 的所有监听，无需手动 off。
   */
  private setupDrag(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.drag.active = true;
      this.drag.startPointerY = pointer.y;
      this.drag.startCamY = this.cameras.main.scrollY;
      this.drag.movedBy = 0;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.drag.active) return;
      const delta = pointer.y - this.drag.startPointerY;
      this.drag.movedBy = Math.abs(delta);
      if (this.drag.movedBy > MapScene.DRAG_THRESHOLD) {
        // 跟手：相机向"与手指相反"方向移动 → 视觉上地图跟手指走
        this.cameras.main.setScroll(0, this.drag.startCamY - delta);
      }
    });
    this.input.on('pointerup', () => {
      this.drag.active = false;
      // movedBy 保留到下一次 pointerdown 才清零；节点 pointerup 回调在此之后触发时读得到
    });
    // 指针意外离开 canvas：同 pointerup，避免拖拽状态卡死
    this.input.on('pointerupoutside', () => {
      this.drag.active = false;
    });
  }

  /**
   * 把相机纵向居中到 currentNodeId 的世界 y；没有 currentNode 时居中到 depth=0 的起点。
   * @param animate true 用 tween 平滑滚（0.4s）；false 瞬移（进场 / newRun 用）
   */
  private centerOnCurrent(animate: boolean): void {
    const { height } = this.scale;
    const focusNode =
      (this.currentNodeId && this.nodes.find(n => n.id === this.currentNodeId)) ||
      this.nodes.find(n => n.depth === 0) ||
      this.nodes[0];
    if (!focusNode) return;
    const { y: worldY } = this.nodeCenter(focusNode);
    // 让 focus 节点出现在视口中央：scrollY = worldY - height/2
    const targetScrollY = Phaser.Math.Clamp(
      worldY - height / 2,
      0,
      Math.max(0, this.mapContentHeight - height),
    );
    if (!animate) {
      this.cameras.main.setScroll(0, targetScrollY);
      return;
    }
    this.tweens.add({
      targets: this.cameras.main,
      scrollY: targetScrollY,
      duration: 400,
      ease: 'Cubic.easeOut',
    });
  }
}
