import { moonPosition, sunPosition, timeEnv } from './time';

/**
 * 블록 그림자 계산 (기획서 §4.8.1)
 * 방향 = 광원 azimuth의 반대. 길이 = h × (1/tan(altitude)) × 0.4.
 */

export interface ShadowParams {
  /** 화면 px 오프셋 (아이소메트릭 보정: dy = dx의 절반 비율) */
  dx: number;
  dy: number;
  blur: number;
  opacity: number;
}

const MAX_SHADOW_LENGTH = 40; // 과장 방지 상한 (px)

export function blockShadow(blockHeightPx: number, hour: number): ShadowParams | null {
  const sun = sunPosition(hour);
  const moon = moonPosition(hour);
  const light = sun.visible ? sun : moon.visible ? moon : null;
  if (!light || light.altitudeDeg <= 1) return null;

  const env = timeEnv(hour);
  const altRad = (light.altitudeDeg * Math.PI) / 180;
  const length = Math.min(MAX_SHADOW_LENGTH, blockHeightPx * (1 / Math.tan(altRad)) * 0.4);

  // 그림자는 광원 반대 방향: 화면상 x축 기준 (동=화면 좌측에서 뜨는 것으로 가정)
  const shadowAzimuthRad = ((light.azimuthDeg + 180) * Math.PI) / 180;
  const moonFactor = sun.visible ? 1 : 0.3; // 달빛 그림자는 ×0.3

  return {
    dx: Math.cos(shadowAzimuthRad) * length,
    dy: Math.sin(shadowAzimuthRad) * length * 0.5, // 아이소메트릭 보정
    blur: length * 0.3,
    opacity: 0.08 * (1 - env.illuminance * 0.5) * moonFactor,
  };
}
