import { blendRgb, hexToRgb, type Rgb } from './color';

/**
 * 시간대별 조명 시스템 (기획서 §4.8.1)
 * 8단계 시간대 + 선형 보간. 태양/달 위치 공식.
 */

interface PhaseAnchor {
  hour: number;
  skyTop: Rgb;
  skyBottom: Rgb;
  seaTop: Rgb;
  seaBottom: Rgb;
  illuminance: number;
}

// 8단계 시간대의 앵커 포인트 (각 시간대 중심 + 자정 랩어라운드)
const ANCHORS: PhaseAnchor[] = [
  // 심야 00~04
  { hour: 2, skyTop: hexToRgb('#050A18'), skyBottom: hexToRgb('#0A1628'), seaTop: hexToRgb('#060C1A'), seaBottom: hexToRgb('#04080F'), illuminance: 0.1 },
  // 새벽 04~06
  { hour: 5, skyTop: hexToRgb('#1A1530'), skyBottom: hexToRgb('#3A2845'), seaTop: hexToRgb('#0D1B30'), seaBottom: hexToRgb('#1A2A45'), illuminance: 0.2 },
  // 일출 06~08
  { hour: 7, skyTop: hexToRgb('#E88A5A'), skyBottom: hexToRgb('#5BA3D9'), seaTop: hexToRgb('#2A5A7A'), seaBottom: hexToRgb('#1A7AB0'), illuminance: 0.5 },
  // 오전 08~12
  { hour: 10, skyTop: hexToRgb('#5BA3D9'), skyBottom: hexToRgb('#1F6FA0'), seaTop: hexToRgb('#1A7AB0'), seaBottom: hexToRgb('#0F4A6E'), illuminance: 0.9 },
  // 정오 12~14
  { hour: 13, skyTop: hexToRgb('#4A95D0'), skyBottom: hexToRgb('#1F6FA0'), seaTop: hexToRgb('#1870A5'), seaBottom: hexToRgb('#0F4A6E'), illuminance: 1.0 },
  // 오후 14~17
  { hour: 15.5, skyTop: hexToRgb('#5BA3D9'), skyBottom: hexToRgb('#7AB0D0'), seaTop: hexToRgb('#1A7AB0'), seaBottom: hexToRgb('#1A6898'), illuminance: 0.85 },
  // 일몰 17~19
  { hour: 18, skyTop: hexToRgb('#D4784A'), skyBottom: hexToRgb('#2A1530'), seaTop: hexToRgb('#1A5A80'), seaBottom: hexToRgb('#0D1B30'), illuminance: 0.4 },
  // 밤 19~24
  { hour: 21.5, skyTop: hexToRgb('#0A1628'), skyBottom: hexToRgb('#0A1628'), seaTop: hexToRgb('#0A1628'), seaBottom: hexToRgb('#060C1A'), illuminance: 0.15 },
];

export interface TimeEnv {
  skyTop: Rgb;
  skyBottom: Rgb;
  seaTop: Rgb;
  seaBottom: Rgb;
  /** 0~1 — 모든 시각 요소의 밝기 베이스라인 */
  illuminance: number;
  /** 0=낮 팔레트, 1=밤 팔레트 (블록 색상 블렌딩용) */
  nightness: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 시각(0~24, 소수 허용) → 환경 색/조도. 앵커 간 선형 보간(랩어라운드 포함). */
export function timeEnv(hour: number): TimeEnv {
  const h = ((hour % 24) + 24) % 24;
  // h를 감싸는 두 앵커 찾기 (랩어라운드)
  let prev = ANCHORS[ANCHORS.length - 1]!;
  let next = ANCHORS[0]!;
  let prevHour = prev.hour - 24;
  let nextHour = next.hour;
  for (let i = 0; i < ANCHORS.length; i++) {
    const a = ANCHORS[i]!;
    if (a.hour <= h) {
      prev = a;
      prevHour = a.hour;
      next = ANCHORS[(i + 1) % ANCHORS.length]!;
      nextHour = i + 1 < ANCHORS.length ? next.hour : next.hour + 24;
    }
  }
  const t = nextHour === prevHour ? 0 : (h - prevHour) / (nextHour - prevHour);
  const illuminance = prev.illuminance + (next.illuminance - prev.illuminance) * t;
  return {
    skyTop: blendRgb(prev.skyTop, next.skyTop, t),
    skyBottom: blendRgb(prev.skyBottom, next.skyBottom, t),
    seaTop: blendRgb(prev.seaTop, next.seaTop, t),
    seaBottom: blendRgb(prev.seaBottom, next.seaBottom, t),
    illuminance,
    nightness: 1 - smoothstep(0.15, 0.6, illuminance),
  };
}

export interface CelestialPosition {
  /** 동(0°) → 남(90°) → 서(180°) */
  azimuthDeg: number;
  /** 수평선 위 고도. 0 이하 = 보이지 않음 */
  altitudeDeg: number;
  visible: boolean;
}

const SUN_MAX_ALTITUDE = 65;
const MOON_MAX_ALTITUDE = 45;

/** 태양 위치: azimuth = (hour-6)/12×180°, altitude = sin((hour-6)/12×π)×65° (기획서 §4.8.1) */
export function sunPosition(hour: number): CelestialPosition {
  const h = ((hour % 24) + 24) % 24;
  const t = (h - 6) / 12;
  const altitudeDeg = Math.sin(t * Math.PI) * SUN_MAX_ALTITUDE;
  return { azimuthDeg: t * 180, altitudeDeg, visible: altitudeDeg > 0 };
}

/** 달 위치: 일몰 후 동 → 자정 남 → 새벽 서 */
export function moonPosition(hour: number): CelestialPosition {
  const h = ((hour % 24) + 24) % 24;
  // 18시 기준으로 12시간 주기 (18~06시)
  const since18 = h >= 18 ? h - 18 : h + 6;
  const t = since18 / 12;
  const altitudeDeg = Math.sin(t * Math.PI) * MOON_MAX_ALTITUDE;
  return { azimuthDeg: t * 180, altitudeDeg, visible: altitudeDeg > 0 && (h >= 18 || h < 6) };
}
