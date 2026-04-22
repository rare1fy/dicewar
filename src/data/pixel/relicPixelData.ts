/**
 * 遗物像素图标数据 — 色板、像素矩阵、映射表
 * 从 PixelRelicIcons.tsx 拆分而来 (ARCH-10)
 *
 * [RULES-B2-EXEMPT] 纯像素色板 + 遗物 SVG 平铺矩阵（按遗物分组的 7x7 数组字面量）；
 * 按遗物拆文件反而损失横向可比性、增加维护开销。超长属正常。— 狗鲨 2026-04-21 (ARCH-21)
 */

// 色板
const G = '#a0a0b0'; const W = '#e8e8f0'; const D = '#606070';
const R = '#e04040'; const Rd = '#a03030'; const O = '#e07830'; const Od = '#b06020';
const Y = '#e8d068'; const Yd = '#c8a83c'; const Gr = '#40c060';
const B = '#4080e0'; const P = '#a040d0'; const Pd = '#7030a0';
const C = '#40d0d0'; const Cd = '#2898a0'; const _ = '';

// ===== 逐个遗物图标 =====

// 磨刀石 - 磨石+火花
const grindstone: string[][] = [
  [_,_,_,_,_,Y,_],
  [_,_,_,_,Y,_,_],
  [_,D,D,D,D,D,_],
  [D,G,G,G,G,G,D],
  [D,W,W,W,W,W,D],
  [D,G,G,G,G,G,D],
  [_,D,D,D,D,D,_],
];
// 铁血战旗 - 红旗
const iron_banner: string[][] = [
  [_,G,R,R,R,R,_],
  [_,G,R,W,R,Rd,_],
  [_,G,R,R,Rd,Rd,_],
  [_,G,R,Rd,Rd,_,_],
  [_,G,_,_,_,_,_],
  [_,G,_,_,_,_,_],
  [_,D,_,_,_,_,_],
];
// 重金属核心 - 铁球
const heavy_metal_core: string[][] = [
  [_,_,D,D,D,_,_],
  [_,D,G,G,W,D,_],
  [D,G,W,W,G,G,D],
  [D,G,W,G,G,D,D],
  [D,G,G,G,D,D,D],
  [_,D,G,D,D,D,_],
  [_,_,D,D,D,_,_],
];
// 混沌摆锤 - 摆锤
const chaos_pendulum: string[][] = [
  [_,_,_,Y,_,_,_],
  [_,_,_,D,_,_,_],
  [_,_,D,_,_,_,_],
  [_,D,_,_,_,_,_],
  [_,D,_,_,_,_,_],
  [D,D,D,_,_,_,_],
  [D,G,D,_,_,_,_],
];
// 铁皮护符 - 盾牌
const iron_skin: string[][] = [
  [_,D,D,D,D,D,_],
  [D,B,B,W,B,B,D],
  [D,B,W,W,W,B,D],
  [D,B,B,W,B,B,D],
  [_,D,B,B,B,D,_],
  [_,_,D,B,D,_,_],
  [_,_,_,D,_,_,_],
];
// 散射弹幕 - 三道光线
const scattershot: string[][] = [
  [_,_,_,_,_,_,Y],
  [_,_,_,_,Y,Y,_],
  [O,O,O,O,O,_,_],
  [_,_,_,_,_,_,_],
  [O,O,O,O,_,_,_],
  [_,_,_,_,Y,_,_],
  [O,O,O,O,O,O,_],
];
// 猩红圣杯 - 红色杯
const crimson_grail: string[][] = [
  [_,R,_,_,_,R,_],
  [_,R,R,R,R,R,_],
  [_,_,R,Rd,R,_,_],
  [_,_,R,Rd,R,_,_],
  [_,_,_,D,_,_,_],
  [_,_,D,D,D,_,_],
  [_,D,D,D,D,D,_],
];
// 等差数列仪 - 递增阶梯
const arithmetic_gauge: string[][] = [
  [_,_,_,_,_,_,B],
  [_,_,_,_,_,B,B],
  [_,_,_,_,B,B,_],
  [_,_,_,B,B,_,_],
  [_,_,B,B,_,_,_],
  [_,B,B,_,_,_,_],
  [B,B,_,_,_,_,_],
];
// 镜像棱镜 - 菱形棱镜
const mirror_prism: string[][] = [
  [_,_,_,C,_,_,_],
  [_,_,C,W,C,_,_],
  [_,C,W,C,W,C,_],
  [C,W,C,_,C,W,C],
  [_,C,W,C,W,C,_],
  [_,_,C,W,C,_,_],
  [_,_,_,C,_,_,_],
];
// 元素共鸣器 - 三色环
const elemental_resonator: string[][] = [
  [_,_,R,R,R,_,_],
  [_,R,_,_,_,B,_],
  [R,_,_,_,_,_,B],
  [R,_,_,_,_,_,B],
  [Gr,_,_,_,_,_,B],
  [_,Gr,_,_,_,Gr,_],
  [_,_,Gr,Gr,Gr,_,_],
];
// 完美主义强迫症 - 闪耀钻石
const perfectionist: string[][] = [
  [_,_,_,Y,_,_,_],
  [_,_,Y,W,Y,_,_],
  [_,Y,W,Y,W,Y,_],
  [Y,W,Y,_,Y,W,Y],
  [_,Y,W,Y,W,Y,_],
  [_,_,Y,W,Y,_,_],
  [_,_,_,Y,_,_,_],
];
// 双子星 - 两颗星
const twin_stars: string[][] = [
  [_,Y,_,_,_,Y,_],
  [Y,W,Y,_,Y,W,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,Yd,Yd,Yd,_,_],
  [_,_,_,Yd,_,_,_],
];
// 虚空回响 - 紫色波纹
const void_echo: string[][] = [
  [_,_,_,P,_,_,_],
  [_,_,P,_,P,_,_],
  [_,P,_,_,_,P,_],
  [P,_,_,Pd,_,_,P],
  [_,P,_,_,_,P,_],
  [_,_,P,_,P,_,_],
  [_,_,_,P,_,_,_],
];
// 玻璃大炮 - 大炮
const glass_cannon: string[][] = [
  [_,_,_,_,R,O,_],
  [_,G,G,G,D,R,_],
  [G,W,W,G,G,D,_],
  [G,W,G,G,G,D,_],
  [G,G,G,G,G,D,_],
  [_,G,G,G,D,_,_],
  [_,D,_,_,D,_,_],
];
// 急救沙漏 - 沙漏
const emergency_hourglass: string[][] = [
  [D,D,D,D,D,D,D],
  [_,Y,Y,Y,Y,Y,_],
  [_,_,Y,Y,Y,_,_],
  [_,_,_,Y,_,_,_],
  [_,_,Od,Od,Od,_,_],
  [_,Od,Od,Od,Od,Od,_],
  [D,D,D,D,D,D,D],
];
// 吸血鬼假牙 - 獠牙
const vampire_fangs: string[][] = [
  [_,_,_,_,_,_,_],
  [_,W,_,_,_,W,_],
  [_,W,_,_,_,W,_],
  [_,G,_,_,_,G,_],
  [_,G,_,_,_,G,_],
  [_,_,R,_,R,_,_],
  [_,_,_,R,_,_,_],
];
// 黑市合同 - 卷轴
const black_market: string[][] = [
  [_,D,D,D,D,D,_],
  [_,D,Yd,_,_,D,_],
  [_,D,_,Yd,_,D,_],
  [_,D,_,_,Yd,D,_],
  [_,D,Yd,Yd,Yd,D,_],
  [_,D,_,_,_,D,_],
  [_,D,D,D,D,D,_],
];
// 废品回收站 - 回收标志
const scrap_yard: string[][] = [
  [_,_,Gr,Gr,_,_,_],
  [_,Gr,_,_,Gr,_,_],
  [Gr,_,_,_,Gr,_,_],
  [_,_,Gr,_,_,Gr,_],
  [_,_,Gr,_,_,_,Gr],
  [_,_,Gr,Gr,_,Gr,_],
  [_,_,_,_,Gr,_,_],
];
// 点石成金 (merchants_eye) - 金色手+硬币
const merchants_eye: string[][] = [
  [_,_,_,Y,Y,_,_],
  [_,_,Y,W,Y,_,_],
  [_,_,_,Y,_,_,_],
  [_,Y,Y,Y,Y,Y,_],
  [Y,Y,Y,Y,Y,Y,_],
  [_,Y,Y,Y,Y,_,_],
  [_,_,Y,Y,_,_,_],
];
// 战争商人 - 金币+剑
const war_profiteer: string[][] = [
  [_,_,_,_,_,W,G],
  [_,Y,Y,_,W,G,_],
  [Y,Yd,Y,W,G,_,_],
  [Y,Y,Y,G,_,_,_],
  [_,Y,Od,Y,_,_,_],
  [_,_,Y,Od,_,_,_],
  [_,_,_,_,Od,_,_],
];
// 利息存款 - 叠金币
const interest: string[][] = [
  [_,_,Y,Y,Y,_,_],
  [_,Y,Yd,Yd,Y,_,_],
  [_,Y,Y,Y,Y,_,_],
  [_,Y,Yd,Yd,Y,_,_],
  [_,Y,Y,Y,Y,_,_],
  [Y,Yd,Yd,Yd,Yd,Y,_],
  [Y,Y,Y,Y,Y,Y,_],
];
// 痛觉放大器 - 红色心+闪电
const pain_amplifier: string[][] = [
  [_,R,R,_,R,R,_],
  [R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R],
  [_,R,R,Y,R,R,_],
  [_,_,R,Y,R,_,_],
  [_,_,Y,Y,_,_,_],
  [_,_,_,Y,_,_,_],
];
// 受虐狂 - 碎心+盾
const masochist: string[][] = [
  [_,R,R,_,R,R,_],
  [R,R,D,D,R,R,R],
  [R,D,B,B,D,R,R],
  [_,D,B,B,D,R,_],
  [_,_,D,D,R,_,_],
  [_,_,_,D,_,_,_],
  [_,_,_,_,_,_,_],
];
// 溢出导管 - 分叉箭头
const overflow_conduit: string[][] = [
  [_,_,_,O,_,_,_],
  [_,_,O,O,O,_,_],
  [_,_,_,O,_,_,_],
  [_,_,_,O,_,_,_],
  [_,O,_,O,_,O,_],
  [O,_,O,_,O,_,O],
  [_,O,_,_,_,O,_],
];
// 量子观测仪 - 眼睛+光
const quantum_observer: string[][] = [
  [_,_,Y,_,Y,_,_],
  [_,_,_,C,_,_,_],
  [_,C,C,W,C,C,_],
  [C,C,P,W,P,C,C],
  [_,C,C,W,C,C,_],
  [_,_,_,C,_,_,_],
  [_,_,Y,_,Y,_,_],
];
// 狂暴小丑 - 小丑面具
const limit_breaker: string[][] = [
  [_,_,P,P,P,_,_],
  [_,P,W,P,W,P,_],
  [P,W,R,P,R,W,P],
  [P,W,W,P,W,W,P],
  [P,_,_,_,_,_,P],
  [_,P,R,R,R,P,_],
  [_,_,P,P,P,_,_],
];
// 薛定谔的袋子 - 袋子+问号
const schrodinger_bag: string[][] = [
  [_,_,D,D,D,_,_],
  [_,D,Yd,Yd,Yd,D,_],
  [D,Yd,_,P,_,Yd,D],
  [D,Yd,P,_,P,Yd,D],
  [D,Yd,_,P,_,Yd,D],
  [D,Yd,_,_,_,Yd,D],
  [_,D,Yd,P,Yd,D,_],
];
// 连招大师 - 连击拳
const combo_master: string[][] = [
  [_,_,_,_,W,W,_],
  [_,_,_,W,W,W,_],
  [O,_,W,W,W,_,_],
  [O,O,W,W,_,_,_],
  [_,O,O,_,_,_,_],
  [_,_,O,O,_,_,_],
  [_,_,_,O,O,_,_],
];
// 导航罗盘 - 指南针
const navigator_compass: string[][] = [
  [_,_,D,R,D,_,_],
  [_,D,_,R,_,D,_],
  [D,_,_,R,_,_,D],
  [D,B,B,W,_,_,D],
  [D,_,_,_,_,_,D],
  [_,D,_,_,_,D,_],
  [_,_,D,D,D,_,_],
];
// 点数统计器 - 叠层+盾
const point_accumulator: string[][] = [
  [_,_,B,B,B,_,_],
  [_,B,B,W,B,B,_],
  [_,B,W,W,W,B,_],
  [_,B,B,W,B,B,_],
  [_,_,B,B,B,_,_],
  [D,D,D,D,D,D,D],
  [_,D,D,D,D,D,_],
];
// 层厅征服者 - 王冠+剑
const floor_conqueror: string[][] = [
  [_,Y,_,Y,_,Y,_],
  [_,Y,Y,Y,Y,Y,_],
  [_,Yd,Yd,Yd,Yd,Yd,_],
  [_,_,_,W,_,_,_],
  [_,_,_,G,_,_,_],
  [_,_,Od,G,Od,_,_],
  [_,_,_,Od,_,_,_],
];
// 治愈之风 - 绿色风
const healing_breeze: string[][] = [
  [_,_,_,_,Gr,Gr,_],
  [_,Gr,Gr,Gr,_,_,_],
  [Gr,_,_,_,Gr,_,_],
  [_,_,Gr,Gr,_,_,_],
  [_,Gr,_,_,Gr,Gr,_],
  [Gr,_,_,_,_,_,Gr],
  [_,Gr,Gr,Gr,Gr,Gr,_],
];
// 磨砺石 - 剑+火花
const sharp_edge: string[][] = [
  [_,_,_,_,_,W,Y],
  [_,_,_,_,W,G,_],
  [_,_,_,W,G,_,_],
  [_,_,W,G,_,_,_],
  [D,W,G,_,_,_,_],
  [_,D,W,_,_,_,_],
  [D,_,_,_,_,_,_],
];
// 幸运铜板 - 金币
const lucky_coin: string[][] = [
  [_,_,Y,Y,Y,_,_],
  [_,Y,Yd,Yd,Yd,Y,_],
  [Y,Yd,Y,Y,Y,Yd,Y],
  [Y,Yd,Y,Yd,Y,Yd,Y],
  [Y,Yd,Y,Y,Y,Yd,Y],
  [_,Y,Yd,Yd,Yd,Y,_],
  [_,_,Y,Y,Y,_,_],
];
// 厚皮兽甲 - 厚盾
const thick_hide: string[][] = [
  [D,Od,Od,Od,Od,Od,D],
  [D,Od,Od,W,Od,Od,D],
  [D,Od,W,W,W,Od,D],
  [D,Od,Od,W,Od,Od,D],
  [_,D,Od,Od,Od,D,_],
  [_,_,D,Od,D,_,_],
  [_,_,_,D,_,_,_],
];
// 余烬暖石 - 暖色石头
const warm_ember: string[][] = [
  [_,_,O,O,O,_,_],
  [_,O,Y,Y,O,_,_],
  [O,Y,W,Y,O,_,_],
  [O,Y,Y,O,_,_,_],
  [_,O,O,_,_,_,_],
  [_,_,_,_,Gr,_,_],
  [_,_,_,Gr,Gr,Gr,_],
];
// 寻宝直觉 - 指南针+金币
const treasure_sense: string[][] = [
  [_,_,Y,Y,Y,_,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,_,Y,_,_,Y],
  [Y,_,Y,Y,Y,_,Y],
  [Y,_,_,Y,_,_,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,Y,Y,Y,_,_],
];
// 点金之手 - 金色手
const golden_touch: string[][] = [
  [_,Y,_,Y,_,_,_],
  [_,Y,_,Y,Y,_,_],
  [_,Y,_,Y,Y,Y,_],
  [_,Y,Y,Y,Y,Y,_],
  [_,_,Y,Y,Y,Y,_],
  [_,_,_,Y,Y,_,_],
  [_,_,_,Y,_,_,_],
];
// 讨价还价 - 打折标签
const haggler: string[][] = [
  [Y,Y,Y,Y,Y,Y,_],
  [Y,W,_,_,_,Y,Y],
  [Y,_,Y,_,Y,_,Y],
  [Y,_,_,Y,_,_,Y],
  [Y,_,Y,_,Y,_,Y],
  [Y,_,_,_,_,_,Y],
  [Y,Y,Y,Y,Y,Y,Y],
];
// 元素过载 - 多色闪电
const element_overload: string[][] = [
  [_,_,_,R,B,_,_],
  [_,_,R,B,_,_,_],
  [_,R,B,B,B,_,_],
  [_,_,_,R,B,_,_],
  [_,_,R,B,_,_,_],
  [_,R,B,_,_,_,_],
  [R,B,_,_,_,_,_],
];
// 葫芦爆裂 - 爆炸
const full_house_blast: string[][] = [
  [_,_,Y,_,Y,_,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,O,O,O,_,Y],
  [_,O,R,R,R,O,_],
  [Y,_,O,O,O,_,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,Y,_,Y,_,_],
];
// 连锁闪电 - 闪电链
const chain_lightning: string[][] = [
  [Y,_,_,_,_,_,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,Y,Y,Y,_,_],
  [_,_,Y,W,Y,_,_],
  [_,_,Y,Y,Y,_,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,_,_,_,_,Y],
];
// 霜冻屏障 - 冰盾
const frost_barrier: string[][] = [
  [_,C,C,C,C,C,_],
  [C,C,W,C,W,C,C],
  [C,W,W,W,W,W,C],
  [C,C,W,W,W,C,C],
  [_,C,C,W,C,C,_],
  [_,_,C,C,C,_,_],
  [_,_,_,C,_,_,_],
];
// 灵魂收割 - 镰刀
const soul_harvest: string[][] = [
  [_,_,P,P,P,P,_],
  [_,P,_,_,_,_,P],
  [_,_,_,_,_,P,_],
  [_,_,_,_,P,_,_],
  [_,_,_,P,_,_,_],
  [_,_,P,_,_,_,_],
  [_,D,_,_,_,_,_],
];
// 压力点 - 手指按压
const pressure_point: string[][] = [
  [_,_,_,W,_,_,_],
  [_,_,W,W,W,_,_],
  [_,_,_,W,_,_,_],
  [_,_,_,D,_,_,_],
  [_,_,R,R,R,_,_],
  [_,R,_,R,_,R,_],
  [R,_,_,R,_,_,R],
];
// 基本直觉 - 拳头
const basic_instinct: string[][] = [
  [_,_,W,W,W,_,_],
  [_,W,W,W,W,W,_],
  [_,W,W,W,W,W,_],
  [_,_,W,W,W,_,_],
  [_,_,W,W,W,_,_],
  [_,_,_,W,_,_,_],
  [_,_,_,D,_,_,_],
];
// 连击本能 - 双拳
const rapid_strikes: string[][] = [
  [_,W,_,_,_,W,_],
  [W,W,W,_,W,W,W],
  [_,W,_,_,_,W,_],
  [_,_,O,_,O,_,_],
  [_,_,_,O,_,_,_],
  [_,_,O,_,O,_,_],
  [_,_,_,_,_,_,_],
];
// 血之契约 - 血滴+文书
const blood_pact: string[][] = [
  [_,_,R,_,R,_,_],
  [_,_,_,R,_,_,_],
  [_,D,D,D,D,D,_],
  [_,D,R,_,R,D,_],
  [_,D,_,R,_,D,_],
  [_,D,R,R,R,D,_],
  [_,D,D,D,D,D,_],
];
// 极简主义 - 单点
const minimalist: string[][] = [
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,_,W,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
  [Y,Y,Y,Y,Y,Y,Y],
];
// 血骰契约 - 红色骰子
const blood_dice: string[][] = [
  [R,R,R,R,R,R,R],
  [R,W,_,_,_,_,R],
  [R,_,_,_,_,_,R],
  [R,_,_,W,_,_,R],
  [R,_,_,_,_,_,R],
  [R,_,_,_,_,W,R],
  [R,R,R,R,R,R,R],
];
// 肾上腺素 - 心跳线
const adrenaline_rush: string[][] = [
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,_,_,R,_,_],
  [R,_,_,R,_,R,_],
  [_,R,R,_,_,_,R],
  [_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_],
];
// 狂掷风暴 - 旋风
const reroll_frenzy: string[][] = [
  [_,_,_,C,_,_,_],
  [_,_,C,_,C,_,_],
  [_,C,_,_,_,C,_],
  [C,_,_,W,_,_,C],
  [_,C,_,_,_,C,_],
  [_,_,C,_,C,_,_],
  [_,_,_,C,_,_,_],
];
// 骰子大师 - 皇冠骰子
const dice_master: string[][] = [
  [_,Y,_,Y,_,Y,_],
  [_,Y,Y,Y,Y,Y,_],
  [W,W,W,W,W,W,W],
  [W,G,_,_,_,G,W],
  [W,_,_,G,_,_,W],
  [W,G,_,_,_,G,W],
  [W,W,W,W,W,W,W],
];
// 命运之轮 - 轮盘
const fortune_wheel: string[][] = [
  [_,_,Y,Y,Y,_,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,R,_,B,_,Y],
  [Y,_,_,W,_,_,Y],
  [Y,_,Gr,_,P,_,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,Y,Y,Y,_,_],
];
// 战场急救 - 红十字
const battle_medic: string[][] = [
  [_,_,R,R,R,_,_],
  [_,_,R,W,R,_,_],
  [R,R,R,W,R,R,R],
  [R,W,W,W,W,W,R],
  [R,R,R,W,R,R,R],
  [_,_,R,W,R,_,_],
  [_,_,R,R,R,_,_],
];
// 怒火燎原 - 火焰+拳
const rage_fire: string[][] = [
  [_,_,R,_,R,_,_],
  [_,R,O,R,O,R,_],
  [_,R,O,O,O,R,_],
  [_,_,R,O,R,_,_],
  [_,_,_,W,_,_,_],
  [_,_,W,W,W,_,_],
  [_,_,_,W,_,_,_],
];
// 藏宝图 - 地图+X
const treasure_map: string[][] = [
  [Yd,Yd,Yd,Yd,Yd,Yd,D],
  [Yd,_,_,D,_,_,Yd],
  [Yd,_,D,_,D,_,Yd],
  [Yd,D,D,D,D,D,Yd],
  [Yd,_,D,_,D,_,Yd],
  [Yd,_,_,R,_,_,Yd],
  [D,Yd,Yd,Yd,Yd,Yd,Yd],
];
// 降维打击 - 压缩箭头
const dimension_crush: string[][] = [
  [_,_,_,P,_,_,_],
  [_,_,P,P,P,_,_],
  [_,P,_,P,_,P,_],
  [P,_,_,P,_,_,P],
  [_,_,_,P,_,_,_],
  [_,_,_,P,_,_,_],
  [_,_,_,P,_,_,_],
];
// 万象归一 - 合一符号
const universal_pair: string[][] = [
  [_,P,_,_,_,P,_],
  [P,_,P,_,P,_,P],
  [P,_,_,P,_,_,P],
  [_,P,P,W,P,P,_],
  [_,_,P,_,P,_,_],
  [_,P,_,_,_,P,_],
  [P,_,_,_,_,_,P],
];
// 混沌骰面 - 骰子+上箭头
const chaos_face: string[][] = [
  [_,_,_,Gr,_,_,_],
  [_,_,Gr,Gr,Gr,_,_],
  [_,_,_,Gr,_,_,_],
  [G,G,G,G,G,G,G],
  [G,W,_,_,_,W,G],
  [G,_,_,W,_,_,G],
  [G,G,G,G,G,G,G],
];
// 贪婪之手 - 大手抓骰子
const greedy_hand: string[][] = [
  [_,W,_,W,_,W,_],
  [_,W,_,W,_,W,_],
  [_,W,_,W,_,W,W],
  [_,W,W,W,W,W,W],
  [_,_,W,W,W,W,_],
  [_,_,_,W,W,_,_],
  [_,_,_,_,_,_,_],
];
// 双重打击 - 双剑
const double_strike: string[][] = [
  [W,_,_,_,_,_,W],
  [_,W,_,_,_,W,_],
  [_,_,W,_,W,_,_],
  [_,_,Od,W,Od,_,_],
  [_,Od,_,_,_,Od,_],
  [Od,_,_,_,_,_,Od],
  [_,_,_,_,_,_,_],
];
// 命运硬币 - 硬币翻转
const fate_coin: string[][] = [
  [_,Y,Y,Y,Y,Y,_],
  [Y,Yd,_,_,Yd,Y,_],
  [Y,_,Y,Y,_,_,Y],
  [Y,_,Y,Yd,Y,_,Y],
  [Y,_,_,Y,Y,_,Y],
  [_,Y,Yd,_,_,Y,_],
  [_,_,Y,Y,Y,_,_],
];
// 元素亲和 - 四色点
const element_affinity: string[][] = [
  [_,_,_,_,_,_,_],
  [_,R,_,_,_,B,_],
  [_,_,_,_,_,_,_],
  [_,_,_,W,_,_,_],
  [_,_,_,_,_,_,_],
  [_,Gr,_,_,_,P,_],
  [_,_,_,_,_,_,_],
];
// 对称追求者 - 对称菱形
const symmetry_seeker: string[][] = [
  [_,_,_,Y,_,_,_],
  [_,_,Y,_,Y,_,_],
  [_,Y,_,_,_,Y,_],
  [Y,_,_,W,_,_,Y],
  [_,Y,_,_,_,Y,_],
  [_,_,Y,_,Y,_,_],
  [_,_,_,Y,_,_,_],
];

/** 遗物ID → 像素数据映射 */
export const RELIC_PIXEL_DATA: Record<string, string[][]> = {
  grindstone, iron_banner, heavy_metal_core, chaos_pendulum,
  iron_skin_relic: iron_skin, scattershot_relic: scattershot,
  crimson_grail, arithmetic_gauge, mirror_prism, elemental_resonator,
  perfectionist, twin_stars_relic: twin_stars, void_echo_relic: void_echo,
  glass_cannon_relic: glass_cannon,
  emergency_hourglass, vampire_fangs, black_market_contract: black_market,
  scrap_yard, merchants_eye_relic: merchants_eye, war_profiteer_relic: war_profiteer,
  interest_relic: interest, pain_amplifier_relic: pain_amplifier, masochist_relic: masochist,
  overflow_conduit, quantum_observer, limit_breaker, schrodinger_bag,
  combo_master_relic: combo_master,
  navigator_compass, point_accumulator, floor_conqueror,
  healing_breeze, sharp_edge_relic: sharp_edge, lucky_coin_relic: lucky_coin,
  thick_hide_relic: thick_hide, warm_ember_relic: warm_ember,
  treasure_sense_relic: treasure_sense, golden_touch_relic: golden_touch,
  haggler_relic: haggler, element_overload_relic: element_overload,
  full_house_blast_relic: full_house_blast, chain_lightning_relic: chain_lightning,
  frost_barrier_relic: frost_barrier, soul_harvest_relic: soul_harvest,
  pressure_point_relic: pressure_point, basic_instinct_relic: basic_instinct,
  rapid_strikes_relic: rapid_strikes, blood_pact_relic: blood_pact,
  minimalist_relic: minimalist, blood_dice_relic: blood_dice,
  adrenaline_rush_relic: adrenaline_rush, reroll_frenzy_relic: reroll_frenzy,
  dice_master_relic: dice_master, fortune_wheel_relic: fortune_wheel,
  battle_medic_relic: battle_medic, rage_fire_relic: rage_fire,
  treasure_map_relic: treasure_map,
  dimension_crush, universal_pair, chaos_face, greedy_hand,
  double_strike, fate_coin, element_affinity, symmetry_seeker,
  less_is_more_relic: [
    [_,_,_,Y,_,_,_],
    [_,_,Y,Yd,Y,_,_],
    [_,_,_,Yd,_,_,_],
    [_,C,_,Yd,_,C,_],
    [_,_,C,Yd,C,_,_],
    [_,_,_,Cd,_,_,_],
    [_,_,C,Cd,C,_,_],
  ],
  blood_eye: [
    [_,_,R,_,R,_,_],
    [_,R,_,Rd,_,R,_],
    [_,_,R,O,R,_,_],
    [_,R,O,Rd,O,R,_],
    [_,_,R,O,R,_,_],
    [_,R,_,Rd,_,R,_],
    [_,_,R,_,R,_,_],
  ],
};

// 默认图标（问号）
export const DEFAULT_ICON: string[][] = [
  [_,_,G,G,G,_,_],
  [_,G,_,_,_,G,_],
  [_,_,_,_,G,_,_],
  [_,_,_,G,_,_,_],
  [_,_,_,G,_,_,_],
  [_,_,_,_,_,_,_],
  [_,_,_,G,_,_,_],
];
