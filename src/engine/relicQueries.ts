/**
 * relicQueries.ts 鈥?閬楃墿鏌ヨ鍑芥暟
 *
 * 娑堢伃 DiceHeroGame.tsx 涓墍鏈夌‖缂栫爜鐨?`r.id === 'xxx'` 鏌ヨ銆?
 * 鎵€鏈夐仐鐗╁垽鏂粺涓€璧拌繖灞傦紝閬垮厤瀛楃涓叉暎钀藉悇澶勩€?
 *
 * SRP: 鍙礋璐?鏌ヨ閬楃墿鐘舵€?锛屼笉璐熻矗瑙﹀彂鏁堟灉銆?
 */

import type { Relic, RelicEffect, PassiveRelicKey } from '../types/game';

// ============================================================
// 鏍稿績鏌ヨ锛氭湁/鏃犮€佽鏁板櫒
// ============================================================

/** 鍒ゆ柇鏄惁鎷ユ湁鎸囧畾閬楃墿 */
export const hasRelic = (relics: Relic[], relicId: string): boolean =>
  relics.some(r => r.id === relicId);

/** 鑾峰彇鎸囧畾閬楃墿锛堣繑鍥?undefined 濡傛灉娌℃湁锛?*/
export const getRelic = (relics: Relic[], relicId: string): Relic | undefined =>
  relics.find(r => r.id === relicId);

/** 鑾峰彇鎸囧畾閬楃墿鐨勮鏁板櫒鍊硷紙榛樿0锛?*/
export const getRelicCounter = (relics: Relic[], relicId: string): number =>
  getRelic(relics, relicId)?.counter || 0;

// ============================================================
// 鍏峰悕鏌ヨ锛氭瘡涓‖缂栫爜閬楃墿涓€涓涔夊寲鍑芥暟
// ============================================================

// --- 绐佺牬闄愬埗锛坙imit_breaker锛?--
/** 鏄惁鎷ユ湁绐佺牬闄愬埗锛堥瀛愰潰鍊间笂闄愯В闄わ級 */
export const hasLimitBreaker = (relics: Relic[]): boolean =>
  hasRelic(relics, 'limit_breaker');

// --- 瀵艰埅缃楃洏锛坣avigator_compass锛?--
/** 瀵艰埅缃楃洏璁℃暟鍣?*/
export const getCompassCounter = (relics: Relic[]): number =>
  getRelicCounter(relics, 'navigator_compass');

// --- 绱ф€ユ矙婕忥紙emergency_hourglass锛?--
/** 绱ф€ユ矙婕忔槸鍚﹀彲鐢紙counter === 0 琛ㄧず鍐峰嵈瀹屾瘯锛?*/
export const isHourglassReady = (relics: Relic[]): boolean => {
  const hg = getRelic(relics, 'emergency_hourglass');
  return !!hg && (hg.counter || 0) === 0;
};

/** 绱ф€ユ矙婕忓綋鍓嶅€掕鏃?*/
export const getHourglassCounter = (relics: Relic[]): number =>
  getRelicCounter(relics, 'emergency_hourglass');

// --- 鍡滆楠拌锛坋xtra_free_reroll锛?--
/** 鏄惁鎷ユ湁鍡滆楠拌锛堥潪鎴樺＋涔熻兘鍡滆閲嶆姇锛?*/
export const hasBloodRerollRelic = (relics: Relic[]): boolean =>
  hasRelic(relics, 'extra_free_reroll');

// --- 闄嶇淮鎵撳嚮锛坉imension_crush锛?--
/** 椤哄瓙鍗囩骇閲忥紙0 鎴?1锛?*/
export const getStraightUpgrade = (relics: Relic[]): number =>
  hasRelic(relics, 'dimension_crush') ? 1 : 0;

// --- 灞傚巺寰佹湇鑰咃紙floor_conqueror锛?--
/** 宸查€氬叧灞傛暟 */
export const getFloorsCleared = (relics: Relic[]): number =>
  getRelicCounter(relics, 'floor_conqueror');

// --- 婧㈠嚭瀵肩锛坥verflow_conduit锛?--
/** 鏄惁鎷ユ湁婧㈠嚭瀵肩 */
export const hasOverflowConduit = (relics: Relic[]): boolean =>
  hasRelic(relics, 'overflow_conduit');

// --- 钖涘畾璋旂殑琚嬪瓙锛坰chrodinger_bag锛?--
/** 鏄惁鎷ユ湁钖涘畾璋旂殑琚嬪瓙 */
export const hasSchrodingerBag = (relics: Relic[]): boolean =>
  hasRelic(relics, 'schrodinger_bag');

// --- 鍛借繍涔嬭疆锛坒ortune_wheel_relic锛?--
/** 鏄惁鎷ユ湁鍛借繍涔嬭疆涓旀湭浣跨敤 */
export const isFortuneWheelReady = (relics: Relic[], fortuneWheelUsed: boolean): boolean =>
  hasRelic(relics, 'fortune_wheel_relic') && !fortuneWheelUsed;

// ============================================================
// 琚姩閬楃墿鍊兼煡璇紙鏇夸唬 .effect({}) 绌哄璞¤皟鐢級
// ============================================================


/**
 * 鑾峰彇鎵€鏈?passive 閬楃墿鐨勬晥鏋滅疮鍔?
 *
 * [RULES-A4] 琚姩閬楃墿杩斿洖闈欐€佸€硷紝涓嶄緷璧?RelicContext銆?
 * 浣跨敤 PassiveRelicKey 绫诲瀷绾︽潫锛岀‘淇濆彧鑳芥煡璇㈣鍔ㄩ仐鐗╃壒鏈夌殑瀛楁銆?
 * 濡傛灉灏濊瘯鏌ヨ闈炶鍔ㄥ瓧娈碉紙濡?damage/armor锛夛紝TypeScript 浼氱紪璇戞姤閿欍€?
 *
 * @param relics 閬楃墿鍒楄〃
 * @param key 瑕佺疮鍔犵殑 PassiveRelicKey 瀛楁鍚?
 * @returns 鎵€鏈?passive 閬楃墿璇ュ瓧娈电殑绱姞鍊?
 */
export const sumPassiveRelicValue = (
  relics: Relic[],
  key: PassiveRelicKey,
): number => {
  return relics
    .filter(r => r.trigger === 'passive')
    .reduce((sum, r) => {
      const eff = r.effect({});
      const val = eff[key];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
};

/**
 * 鎸夎Е鍙戝櫒绫诲瀷鏌ヨ閬楃墿琚姩灞炴€у€肩疮鍔?
 *
 * [RULES-A4] 鏇夸唬鐩存帴璋冪敤 r.effect({})锛岀粺涓€璧版煡璇㈠眰銆?
 * 浠呯敤浜?鏌ヨ閬楃墿澹版槑鏃惰繑鍥炵殑闈欐€佸睘鎬у€?锛屼笉瑙﹀彂鏁堟灉銆?
 *
 * @param relics 閬楃墿鍒楄〃
 * @param trigger 瑙﹀彂鍣ㄧ被鍨嬶紙濡?'on_reroll'锛?
 * @param key 瑕佺疮鍔犵殑 RelicEffect 瀛楁鍚?
 * @returns 鎸囧畾 trigger 绫诲瀷鐨勬墍鏈夐仐鐗╄瀛楁鐨勭疮鍔犲€?
 */
export const sumRelicValueByTrigger = <K extends keyof RelicEffect>(
  relics: Relic[],
  trigger: string,
  key: K,
): number => {
  return relics
    .filter(r => r.trigger === trigger)
    .reduce((sum, r) => {
      const eff = r.effect({});
      const val = eff[key];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
};

// ============================================================
// on_fatal 鑷村懡淇濇姢鏌ヨ
// ============================================================

/**
 * 妫€鏌?on_fatal 閬楃墿鏄惁鑳介樆姝㈣嚧鍛戒激瀹?
 *
 * [RULES-A3] 缁熶竴 on_fatal 瑙﹀彂鎺ュ彛锛屾浛浠?澶勯噸澶嶇殑 isHourglassReady 鍒ゆ柇銆?
 * 閬嶅巻鎵€鏈?on_fatal 閬楃墿锛屾鏌?effect() 涓槸鍚﹀寘鍚?preventDeath 涓旈仐鐗╁氨缁€?
 * 鐩墠鍙湁鎬ユ晳娌欐紡涓€绉嶏紝浣嗘湭鏉ユ柊澧?on_fatal 閬楃墿鑷姩鐢熸晥銆?
 *
 * @param relics 閬楃墿鍒楄〃
 * @returns 鏄惁鏈?on_fatal 閬楃墿鑳介樆姝㈡湰娆¤嚧鍛戒激瀹?
 */
export const hasFatalProtection = (relics: Relic[]): boolean => {
  return relics
    .filter(r => r.trigger === 'on_fatal')
    .some(r => {
      const eff = r.effect({});
      // 妫€鏌ユ槸鍚︽湁 preventDeath 涓斿氨缁紙counter === 0 琛ㄧず CD 瀹屾瘯锛?
      return eff.preventDeath && (r.counter || 0) === 0;
    });
};
