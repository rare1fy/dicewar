/**
 * mapConstraints.ts — 地图约束修正函数
 *
 * 从 mapGenerator.ts 拆分出的纯函数模块，负责：
 * - Boss前营火保障
 * - 路径战斗密度验证与兜底
 *
 * 所有函数均为纯操作（直接修改传入的节点数组），无副作用。
 */

import { MapNode, NodeType } from '../types/game';

// ============================================================
// 扩展类型定义
// ============================================================

/** 地图节点扩展类型 — 含 x 坐标（地图生成内部使用） */
export interface MapNodeExt extends MapNode {
  x: number;
}

// ============================================================
// 类型分类常量
// ============================================================

/** 特殊节点 — 不能与同类或彼此连续 */
export const SPECIAL_TYPES: NodeType[] = ['elite', 'campfire', 'merchant'];

/** 非战斗节点类型 */
export const NON_COMBAT_TYPES: NodeType[] = ['campfire', 'merchant', 'event', 'treasure'];

/** 经济节点类型 */
export const ECONOMIC_TYPES: NodeType[] = ['merchant', 'treasure'];

/** 判断是否为战斗类型节点 */
export function isCombatType(type: NodeType): boolean {
  return type === 'enemy' || type === 'elite' || type === 'boss';
}

/** 递归路径搜索的最大深度限制 */
const MAX_RECURSION_DEPTH = 50;

// ============================================================
// Boss前营火保障
// ============================================================

/**
 * 确保Boss前的节点中至少有 minCount 个 campfire，
 * 且尽量分布在不同的路径上（不相邻位置）。
 *
 * 搜索范围：Boss前2层（preBoss层和preBoss-1层）
 */
export function ensureCampfiresBeforeBoss(
  nodes: MapNodeExt[],
  bossDepth: number,
  minCount: number
): void {
  const preBossDepth = bossDepth - 1;
  const preBoss2Depth = bossDepth - 2;

  // 收集Boss前2层所有节点
  const candidates = nodes.filter(n =>
    n.depth === preBossDepth || n.depth === preBoss2Depth
  );

  // 已有的营火
  const existingCampfires = candidates.filter(n => n.type === 'campfire');

  let needed = minCount - existingCampfires.length;
  if (needed <= 0) return;

  // 找Boss前一层（preBossDepth）的可替换节点
  const preBossNodes = nodes.filter(n => n.depth === preBossDepth);
  // 找Boss前两层（preBoss2Depth）的可替换节点
  const preBoss2Nodes = nodes.filter(n => n.depth === preBoss2Depth);

  // 已有营火的x坐标集合（用于保证分散）
  const campfireXPositions = existingCampfires.map(n => n.x);

  // 优先在preBossDepth层放置，其次preBoss2Depth层
  const allCandidates = [
    ...shuffle(preBossNodes.filter(n => n.type !== 'campfire' && n.type !== 'boss')),
    ...shuffle(preBoss2Nodes.filter(n => n.type !== 'campfire' && n.type !== 'boss')),
  ];

  // 按距离已有营火的最远优先排序（确保分散）
  allCandidates.sort((a, b) => {
    const aMinDist = campfireXPositions.length > 0
      ? Math.min(...campfireXPositions.map(cx => Math.abs(a.x - cx)))
      : Infinity;
    const bMinDist = campfireXPositions.length > 0
      ? Math.min(...campfireXPositions.map(cx => Math.abs(b.x - cx)))
      : Infinity;
    return bMinDist - aMinDist; // 距离远的优先
  });

  for (const candidate of allCandidates) {
    if (needed <= 0) break;

    // 检查是否与已有营火在不同路径上（x距离>15表示不同路径区域）
    const tooClose = campfireXPositions.some(cx => Math.abs(candidate.x - cx) < 15);
    if (tooClose && allCandidates.length > needed) continue; // 有更好选择时跳过

    candidate.type = 'campfire';
    campfireXPositions.push(candidate.x);
    needed--;
  }

  // 如果分散放置后仍不够，强制放置
  if (needed > 0) {
    for (const candidate of allCandidates) {
      if (needed <= 0) break;
      if (candidate.type === 'campfire') continue;
      candidate.type = 'campfire';
      needed--;
    }
  }
}

// ============================================================
// 路径战斗密度验证
// ============================================================

export function validateCombatDensity(
  nodes: MapNodeExt[],
  startDepth: number,
  endDepth: number,
  minCombat: number,
  fixedLayerIds: Set<number>
): void {
  const startNodes = nodes.filter(n => n.depth === startDepth);

  function findMinCombatOnPaths(
    nodeId: string,
    targetDepth: number,
    visited: Set<string> = new Set(),
    depth: number = 0
  ): number {
    if (depth > MAX_RECURSION_DEPTH) return 0;
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    const combatVal = isCombatType(node.type) ? 1 : 0;
    if (node.depth === targetDepth) return combatVal;

    const children = node.connectedTo
      .map(cid => nodes.find(n => n.id === cid))
      .filter((n): n is MapNodeExt => n !== undefined && n.depth <= targetDepth);

    if (children.length === 0) return combatVal;

    let minChildCombat = Infinity;
    for (const child of children) {
      const childMin = findMinCombatOnPaths(child.id, targetDepth, visited, depth + 1);
      if (childMin < minChildCombat) minChildCombat = childMin;
    }
    return combatVal + (minChildCombat === Infinity ? 0 : minChildCombat);
  }

  for (const startNode of startNodes) {
    const minOnPath = findMinCombatOnPaths(startNode.id, endDepth);
    if (minOnPath < minCombat) {
      forceMoreCombat(nodes, startNode.id, endDepth, minCombat, fixedLayerIds);
    }
  }
}

function forceMoreCombat(
  nodes: MapNodeExt[],
  startId: string,
  targetDepth: number,
  minCombat: number,
  fixedLayerIds: Set<number>
): void {
  const path = findWeakestPath(nodes, startId, targetDepth);
  if (!path) return;

  let combatCount = path.filter(n => isCombatType(n.type)).length;
  for (const node of path) {
    if (combatCount >= minCombat) break;
    if (fixedLayerIds.has(node.depth)) continue;
    // 不把营火改掉（保护Boss前的营火）
    if (node.type === 'campfire') continue;
    if (NON_COMBAT_TYPES.includes(node.type)) {
      node.type = 'enemy';
      combatCount++;
    }
  }
}

function findWeakestPath(
  nodes: MapNodeExt[],
  startId: string,
  targetDepth: number,
  visited: Set<string> = new Set(),
  depth: number = 0
): MapNodeExt[] | null {
  if (depth > MAX_RECURSION_DEPTH) return null;
  if (visited.has(startId)) return null;
  visited.add(startId);

  const node = nodes.find(n => n.id === startId);
  if (!node) return null;
  if (node.depth === targetDepth) return [node];

  const children = node.connectedTo
    .map(cid => nodes.find(n => n.id === cid))
    .filter((n): n is MapNodeExt => n !== undefined && n.depth <= targetDepth);

  if (children.length === 0) return [node];

  let weakestSubPath: MapNodeExt[] | null = null;
  let weakestCombat = Infinity;

  for (const child of children) {
    const subPath = findWeakestPath(nodes, child.id, targetDepth, visited, depth + 1);
    if (subPath) {
      const combat = subPath.filter(n => isCombatType(n.type)).length;
      if (combat < weakestCombat) {
        weakestCombat = combat;
        weakestSubPath = subPath;
      }
    }
  }

  return weakestSubPath ? [node, ...weakestSubPath] : [node];
}

// ============================================================
// 共享工具函数
// ============================================================

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
