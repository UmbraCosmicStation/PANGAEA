/**
 * 활성도 → 블록 색상 보간 (기획서 §4.2 색상 보간표)
 */

export type Rgb = readonly [number, number, number];

const DAY_STOPS: ReadonlyArray<[number, Rgb]> = [
  [0.0, [95, 158, 105]],
  [0.25, [148, 190, 72]],
  [0.5, [220, 205, 58]],
  [0.75, [245, 155, 48]],
  [1.0, [225, 68, 42]],
];

const NIGHT_STOPS: ReadonlyArray<[number, Rgb]> = [
  [0.0, [28, 52, 72]],
  [0.25, [42, 82, 92]],
  [0.5, [85, 125, 62]],
  [0.75, [205, 135, 48]],
  [1.0, [235, 88, 52]],
];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function blendRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function interpolateStops(stops: ReadonlyArray<[number, Rgb]>, t: number): Rgb {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i]!;
    const [t0, c0] = stops[i - 1]!;
    if (clamped <= t1) {
      const local = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0);
      return blendRgb(c0, c1, local);
    }
  }
  return stops[stops.length - 1]![1];
}

/** 활성도(0~1) → 블록 상단색. nightness 0=낮, 1=밤 (연속 블렌딩 지원). */
export function activityColor(activity: number, nightness = 0): Rgb {
  const day = interpolateStops(DAY_STOPS, activity);
  if (nightness <= 0) return day;
  const night = interpolateStops(NIGHT_STOPS, activity);
  if (nightness >= 1) return night;
  return blendRgb(day, night, nightness);
}

/** 측면색 = 상단색 × 0.55 (기획서 §4.2) */
export function sideColor(top: Rgb): Rgb {
  return [Math.round(top[0] * 0.55), Math.round(top[1] * 0.55), Math.round(top[2] * 0.55)];
}

export function rgbToCss(c: Rgb, alpha = 1): string {
  return alpha >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
