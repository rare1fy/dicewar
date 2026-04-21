/**
 * enemyNormal.ts - 5章普通敌人配置
 *
 * 章1: 幽暗森林 — 亡灵/蜘蛛/狼人/树精
 * 章2: 冰封山脉 — 冰巨人/雪狼/冰元素/霜巫
 * 章3: 熔岩深渊 — 火元素/熔岩犬/黑铁矮人/地狱火
 * 章4: 暗影要塞 — 暗影刺客/恶魔卫兵/邪能术士/堕落天使
 * 章5: 永恒之巅 — 光铸卫士/时光龙/虚空行者/泰坦造物
 */

import type { EnemyConfig } from './enemyTypes';

// ============================================================
// 章1: 幽暗森林 — 亡灵/野兽/腐化生物
// ============================================================
export const ch1_normals: EnemyConfig[] = [
  {
    id: 'forest_ghoul', name: '食尸鬼', emoji: '', chapter: 1,
    baseHp: 28, baseDmg: 7, category: 'normal', combatType: 'warrior',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 7 },
      { type: '攻击', baseValue: 9, description: '撕咬' },
      { type: '技能', baseValue: 1, description: '虚弱', scalable: false },
    ]}],
    quotes: {
      enter: ['嘎嘎……新鲜的肉……', '从坟墓里爬出来了……'],
      death: ['骨头……散了……', '回到……土里……'],
      attack: ['撕！', '咬碎你！', '嘎嘎嘎！'],
      hurt: ['嘎！', '腐肉……掉了……'],
      lowHp: ['不……还没吃饱……'],
    },
  },
  {
    id: 'forest_spider', name: '剧毒蛛母', emoji: '', chapter: 1,
    baseHp: 18, baseDmg: 3, category: 'normal', combatType: 'ranger',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '剧毒', scalable: false },
      { type: '攻击', baseValue: 4 },
      { type: '攻击', baseValue: 4 },
    ]}],
    quotes: {
      enter: ['嘶嘶……陷阱已经布好了……', '（密集的爬行声）'],
      death: ['嘶……蛛卵……会替我……', '（扭曲倒地）'],
      attack: ['毒牙！', '吐丝！', '缠住你！'],
      hurt: ['嘶！', '我的……腿！'],
      lowHp: ['蛛巢……不会忘记你……'],
    },
  },
  {
    id: 'forest_treant', name: '腐化树人', emoji: '', chapter: 1,
    baseHp: 42, baseDmg: 4, category: 'normal', combatType: 'guardian',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '防御', baseValue: 8 },
      { type: '攻击', baseValue: 5 },
      { type: '防御', baseValue: 6 },
      { type: '攻击', baseValue: 7, description: '根须缠绕' },
    ]}],
    quotes: {
      enter: ['这片……森林……不欢迎你……', '（树根从地面涌出）'],
      death: ['森林……会记住……', '倒下了……但种子……已经播下……'],
      attack: ['根须！', '大地之力！'],
      hurt: ['树皮……裂了……', '不过是……划痕……'],
      lowHp: ['我的根……断了……但森林……永存……'],
    },
  },
  {
    id: 'forest_banshee', name: '哀嚎女妖', emoji: '', chapter: 1,
    baseHp: 16, baseDmg: 3, category: 'normal', combatType: 'caster',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 1, description: '易伤', scalable: false },
      { type: '攻击', baseValue: 5 },
      { type: '技能', baseValue: 1, description: '虚弱', scalable: false },
    ]}],
    quotes: {
      enter: ['啊啊啊——！', '听到了吗……死亡的歌声……'],
      death: ['终于……安息了……', '（哀鸣渐弱）'],
      attack: ['尖叫！', '死亡之歌！', '颤抖吧！'],
      hurt: ['（刺耳尖啸）', '痛苦……是我的养分……'],
      lowHp: ['最后……一曲……送你上路！'],
    },
  },
  {
    id: 'forest_wolf_priest', name: '月光狼灵', emoji: '', chapter: 1,
    baseHp: 20, baseDmg: 2, category: 'normal', combatType: 'priest',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '剧毒', scalable: false },
      { type: '技能', baseValue: 1, description: '易伤', scalable: false },
      { type: '攻击', baseValue: 4 },
    ]}],
    quotes: {
      enter: ['呜——月光指引着我……', '嗅到了……猎物的气息……'],
      death: ['月光……暗了……', '呜……（倒下）'],
      attack: ['狼牙！', '月光之噬！'],
      hurt: ['嗷！', '这……不可能……'],
      lowHp: ['月光……给我力量……'],
    },
  },
];

// ============================================================
// 章2: 冰封山脉 — 冰霜生物
// ============================================================
export const ch2_normals: EnemyConfig[] = [
  {
    id: 'ice_yeti', name: '雪原雪人', emoji: '', chapter: 2,
    baseHp: 36, baseDmg: 9, category: 'normal', combatType: 'warrior',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 9 },
      { type: '攻击', baseValue: 11, description: '冰拳' },
    ]}],
    quotes: {
      enter: ['吼————！', '（地面在颤抖）'],
      death: ['吼……（倒地，掀起雪浪）', '冰……碎了……'],
      attack: ['砸！', '冰拳！', '吼！'],
      hurt: ['吼！疼！', '（愤怒咆哮）'],
      lowHp: ['吼……不会……倒下……'],
    },
  },
  {
    id: 'ice_mage', name: '霜寒女巫', emoji: '', chapter: 2,
    baseHp: 18, baseDmg: 4, category: 'normal', combatType: 'caster',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 1, description: '冻结', scalable: false },
      { type: '攻击', baseValue: 6 },
      { type: '技能', baseValue: 2, description: '虚弱', scalable: false },
    ]}],
    quotes: {
      enter: ['冰霜……会冻结一切……', '寒冬……已经来临……'],
      death: ['冰……碎了……但寒意……永存……', '（冰晶四散）'],
      attack: ['冰锥！', '寒冰箭！', '冻住！'],
      hurt: ['冰盾……裂了……', '不……可能……'],
      lowHp: ['暴风雪……最后的咏唱……'],
    },
  },
  {
    id: 'ice_wolf', name: '霜鬃狼', emoji: '', chapter: 2,
    baseHp: 22, baseDmg: 5, category: 'normal', combatType: 'ranger',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 5 },
      { type: '攻击', baseValue: 7, description: '冰霜撕咬' },
      { type: '技能', baseValue: 1, description: '灼烧', scalable: false },
    ]}],
    quotes: {
      enter: ['（低沉的咆哮）', '嗅到了……温暖的血……'],
      death: ['呜……（倒在雪中）', '（低吟消散）'],
      attack: ['嗷！', '撕咬！', '冰牙！'],
      hurt: ['嗷呜！', '（退后一步，龇牙）'],
      lowHp: ['呜……群狼……会替我报仇……'],
    },
  },
  {
    id: 'ice_golem', name: '寒冰石像', emoji: '', chapter: 2,
    baseHp: 44, baseDmg: 4, category: 'normal', combatType: 'guardian',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '防御', baseValue: 10 },
      { type: '攻击', baseValue: 5 },
      { type: '防御', baseValue: 8 },
    ]}],
    quotes: {
      enter: ['（冰晶嘎吱作响）', '不许……通过……'],
      death: ['（碎裂成冰块）', '使命……完成……'],
      attack: ['碾压！', '冰拳！'],
      hurt: ['裂缝……', '（冰块脱落）'],
      lowHp: ['还能……守住……'],
    },
  },
];

// ============================================================
// 章3: 熔岩深渊 — 火焰/恶魔生物
// ============================================================
export const ch3_normals: EnemyConfig[] = [
  {
    id: 'lava_hound', name: '地狱火犬', emoji: '', chapter: 3,
    baseHp: 30, baseDmg: 8, category: 'normal', combatType: 'warrior',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 8 },
      { type: '攻击', baseValue: 10, description: '烈焰撕咬' },
      { type: '技能', baseValue: 2, description: '灼烧', scalable: false },
    ]}],
    quotes: {
      enter: ['（烈焰从口中喷出）', '吼！猎物！'],
      death: ['（化为灰烬）', '火……灭了……'],
      attack: ['烈焰！', '烧！', '吞噬！'],
      hurt: ['（痛苦嚎叫）', '嗷！'],
      lowHp: ['最后……一口火焰……'],
    },
  },
  {
    id: 'lava_imp', name: '小恶魔', emoji: '', chapter: 3,
    baseHp: 16, baseDmg: 4, category: 'normal', combatType: 'caster',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '灼烧', scalable: false },
      { type: '攻击', baseValue: 5 },
      { type: '技能', baseValue: 1, description: '易伤', scalable: false },
      { type: '攻击', baseValue: 6, description: '火球' },
    ]}],
    quotes: {
      enter: ['嘻嘻嘻！又来送死的！', '火焰……是最好的玩具！'],
      death: ['嘻……不好玩了……', '（砰——消散）'],
      attack: ['接火球！', '嘻嘻！烫吧！', '燃烧吧！'],
      hurt: ['哎呀！', '嘻……你打得到我？'],
      lowHp: ['不行了……要逃了……才怪！吃火球！'],
    },
  },
  {
    id: 'lava_guardian', name: '黑铁卫士', emoji: '', chapter: 3,
    baseHp: 48, baseDmg: 5, category: 'normal', combatType: 'guardian',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '防御', baseValue: 12 },
      { type: '攻击', baseValue: 6 },
      { type: '防御', baseValue: 8 },
      { type: '攻击', baseValue: 8, description: '锻造重击' },
    ]}],
    quotes: {
      enter: ['黑铁之盾，坚不可摧！', '没有通行令，不许过！'],
      death: ['盾……碎了……', '黑铁……不灭……（倒下）'],
      attack: ['锤击！', '黑铁之力！'],
      hurt: ['叮！', '铁甲……凹了？'],
      lowHp: ['只要……盾还在……就不会倒！'],
    },
  },
  {
    id: 'lava_shaman', name: '火焰萨满', emoji: '', chapter: 3,
    baseHp: 22, baseDmg: 3, category: 'normal', combatType: 'priest',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '灼烧', scalable: false },
      { type: '技能', baseValue: 1, description: '力量', scalable: false },
      { type: '攻击', baseValue: 5 },
    ]}],
    quotes: {
      enter: ['烈焰之灵……降临吧！', '火焰赐予我力量！'],
      death: ['火灵……离开了我……', '（火焰熄灭）'],
      attack: ['烈焰冲击！', '焚烧！'],
      hurt: ['火盾……碎了……', '灵体……动摇了……'],
      lowHp: ['最后的祈祷……烈焰之怒！'],
    },
  },
];

// ============================================================
// 章4: 暗影要塞 — 恶魔/堕落生物
// ============================================================
export const ch4_normals: EnemyConfig[] = [
  {
    id: 'shadow_assassin', name: '暗影刺客', emoji: '', chapter: 4,
    baseHp: 24, baseDmg: 12, category: 'normal', combatType: 'ranger',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 12, description: '背刺' },
      { type: '技能', baseValue: 2, description: '剧毒', scalable: false },
      { type: '攻击', baseValue: 8 },
    ]}],
    quotes: {
      enter: ['（从阴影中浮现）', '你……看不见我……'],
      death: ['影子……消散了……', '（无声倒下）'],
      attack: ['背刺！', '影杀！', '无声之刃！'],
      hurt: ['嘶……被发现了……', '不……可能……'],
      lowHp: ['影遁……最后一击……'],
    },
  },
  {
    id: 'shadow_felguard', name: '邪能卫兵', emoji: '', chapter: 4,
    baseHp: 46, baseDmg: 6, category: 'normal', combatType: 'guardian',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 7 },
      { type: '防御', baseValue: 14 },
      { type: '攻击', baseValue: 9, description: '邪能重斩' },
    ]}],
    quotes: {
      enter: ['受主人之命……消灭一切入侵者！', '邪能……流淌在我的血脉中！'],
      death: ['主人……恕我……', '邪能……回归虚空……'],
      attack: ['邪能斩！', '毁灭！', '碾碎你！'],
      hurt: ['邪能护甲……', '不过如此……'],
      lowHp: ['主人的力量……赐予我……最后一击！'],
    },
  },
  {
    id: 'shadow_warlock', name: '邪能术士', emoji: '', chapter: 4,
    baseHp: 20, baseDmg: 5, category: 'normal', combatType: 'caster',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '剧毒', scalable: false },
      { type: '攻击', baseValue: 6 },
      { type: '技能', baseValue: 2, description: '灼烧', scalable: false },
      { type: '攻击', baseValue: 7, description: '暗影箭' },
    ]}],
    quotes: {
      enter: ['邪能……是最强大的力量！', '痛苦……才刚刚开始……'],
      death: ['不……我的灵魂……', '邪能……反噬了……'],
      attack: ['暗影箭！', '燃烧吧！', '腐蚀！'],
      hurt: ['灵魂石……碎了……', '不可能……我的结界……'],
      lowHp: ['生命分流！用你的生命……延续我的！'],
    },
  },
  {
    id: 'shadow_knight', name: '堕落死亡骑士', emoji: '', chapter: 4,
    baseHp: 34, baseDmg: 10, category: 'normal', combatType: 'warrior',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 10 },
      { type: '技能', baseValue: 1, description: '虚弱', scalable: false },
      { type: '攻击', baseValue: 12, description: '凋零打击' },
    ]}],
    quotes: {
      enter: ['曾经……我也是光明的骑士……', '背叛了光……便无路可退……'],
      death: ['光……我又看到了……光……', '（黑色铠甲碎裂）'],
      attack: ['凋零！', '黑暗之力！', '受死吧！'],
      hurt: ['这具身体……已经不怕痛了……', '无用的抵抗……'],
      lowHp: ['即便倒下……黑暗……也不会消失……'],
    },
  },
];

// ============================================================
// 章5: 永恒之巅 — 光铸/泰坦/时光造物
// ============================================================
export const ch5_normals: EnemyConfig[] = [
  {
    id: 'eternal_sentinel', name: '光铸哨兵', emoji: '', chapter: 5,
    baseHp: 40, baseDmg: 8, category: 'normal', combatType: 'guardian',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '防御', baseValue: 14 },
      { type: '攻击', baseValue: 8 },
      { type: '防御', baseValue: 10 },
      { type: '攻击', baseValue: 10, description: '圣光裁决' },
    ]}],
    quotes: {
      enter: ['此地……不可侵犯。', '以泰坦之名——退下！'],
      death: ['任务……失败……', '光……指引我……回家……'],
      attack: ['裁决！', '净化！', '圣光之锤！'],
      hurt: ['圣光护盾……动摇了……', '不过是……考验……'],
      lowHp: ['即使倒下……光明……永不熄灭……'],
    },
  },
  {
    id: 'eternal_chrono', name: '时光龙人', emoji: '', chapter: 5,
    baseHp: 26, baseDmg: 7, category: 'normal', combatType: 'caster',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '虚弱', scalable: false },
      { type: '攻击', baseValue: 8, description: '时光冲击' },
      { type: '技能', baseValue: 1, description: '冻结', scalable: false },
    ]}],
    quotes: {
      enter: ['你的时间线……出了偏差……', '过去、现在、未来……我都能看见……'],
      death: ['时间线……修复了……', '这个结果……也在预料之中……'],
      attack: ['时光逆转！', '沙漏之力！', '时间停止！'],
      hurt: ['时间流……紊乱了……', '这不在……预言中……'],
      lowHp: ['最后的沙粒……也快流尽了……'],
    },
  },
  {
    id: 'eternal_archer', name: '星界游侠', emoji: '', chapter: 5,
    baseHp: 22, baseDmg: 10, category: 'normal', combatType: 'ranger',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '攻击', baseValue: 10 },
      { type: '攻击', baseValue: 12, description: '星辰之箭' },
      { type: '技能', baseValue: 1, description: '易伤', scalable: false },
    ]}],
    quotes: {
      enter: ['星光……指引我的箭矢……', '（弓弦轻响）'],
      death: ['星辰……暗了……', '（化为星尘）'],
      attack: ['星箭！', '穿透！', '星光之雨！'],
      hurt: ['嘶……', '星光……偏移了……'],
      lowHp: ['最后一箭……献给星辰……'],
    },
  },
  {
    id: 'eternal_priest', name: '泰坦祭司', emoji: '', chapter: 5,
    baseHp: 24, baseDmg: 3, category: 'normal', combatType: 'priest',
    drops: { gold: 20, relic: false },
    phases: [{ actions: [
      { type: '技能', baseValue: 2, description: '力量', scalable: false },
      { type: '技能', baseValue: 1, description: '易伤', scalable: false },
      { type: '攻击', baseValue: 6, description: '圣光惩击' },
    ]}],
    quotes: {
      enter: ['泰坦的意志……不容亵渎。', '圣光……会审判一切。'],
      death: ['泰坦……我……回来了……', '（光芒消散）'],
      attack: ['惩击！', '圣光！', '泰坦之怒！'],
      hurt: ['信仰……不会动摇……', '只是……皮肉之伤……'],
      lowHp: ['圣光……赐予我……最后的力量……'],
    },
  },
];
