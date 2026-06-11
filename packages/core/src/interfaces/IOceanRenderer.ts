import type { OceanQuality, OceanTheme } from '../types/config';

/**
 * 바다 렌더러 인터페이스 (기획서 §16.0)
 * M1: Canvas 2D 구현 → M3: WebGL 구현으로 교체. 캔버스 타입은 DOM 의존을 피하기 위해 제네릭.
 */
export interface IOceanRenderer<TCanvas = unknown> {
  init(canvas: TCanvas): void;
  /** 0~24 (소수 허용) — 시간대별 조명 (기획서 §4.8.1) */
  setTimeOfDay(hour: number): void;
  setQuality(level: OceanQuality): void;
  setTheme(theme: OceanTheme): void;
  /** dt: 직전 프레임으로부터의 경과 시간(ms) */
  render(dt: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
