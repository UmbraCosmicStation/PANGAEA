import { describe, expect, it } from 'vitest';
import { activityColor, blendRgb, hexToRgb, rgbToCss, sideColor } from '../domain/render/color';
import { blockHeight, isoProject, zOrder } from '../domain/render/isometric';
import { moonPosition, sunPosition, timeEnv } from '../domain/render/time';
import { blockShadow } from '../domain/render/shadow';

describe('color', () => {
  it('보간표 앵커값이 정확하다 (기획서 §4.2)', () => {
    expect(activityColor(0)).toEqual([95, 158, 105]);
    expect(activityColor(0.5)).toEqual([220, 205, 58]);
    expect(activityColor(1)).toEqual([225, 68, 42]);
    expect(activityColor(0, 1)).toEqual([28, 52, 72]); // 밤 모드
  });

  it('중간값은 선형 보간된다', () => {
    // 0.125 = 0과 0.25의 중간
    const c = activityColor(0.125);
    expect(c[0]).toBe(Math.round((95 + 148) / 2));
  });

  it('범위 밖 활성도는 클램프된다', () => {
    expect(activityColor(-1)).toEqual(activityColor(0));
    expect(activityColor(2)).toEqual(activityColor(1));
  });

  it('측면색 = 상단색 × 0.55', () => {
    expect(sideColor([200, 100, 50])).toEqual([110, 55, 28]);
  });

  it('hex ↔ rgb 변환', () => {
    expect(hexToRgb('#F0C95C')).toEqual([240, 201, 92]);
    expect(rgbToCss([1, 2, 3])).toBe('rgb(1,2,3)');
    expect(blendRgb([0, 0, 0], [100, 100, 100], 0.5)).toEqual([50, 50, 50]);
  });
});

describe('isometric', () => {
  it('아이소 변환 공식: sx=(x−y)cos30°, sy=(x+y)sin30°', () => {
    const { sx, sy } = isoProject(10, 4);
    expect(sx).toBeCloseTo(6 * Math.cos(Math.PI / 6), 5);
    expect(sy).toBeCloseTo(14 * 0.5, 5);
  });

  it('z-order: 행이 클수록 앞 (화가 알고리즘)', () => {
    expect(zOrder(0, 1, 10)).toBeGreaterThan(zOrder(9, 0, 10));
  });

  it('블록 높이: 2 + min(9, kb/20×9), 상한 11', () => {
    expect(blockHeight(0)).toBe(2);
    expect(blockHeight(20 * 1024)).toBe(11); // 20KB → 최대
    expect(blockHeight(10 * 1024)).toBeCloseTo(6.5, 5); // 10KB → 중간
    expect(blockHeight(1024 * 1024)).toBe(11); // 1MB → 캡
  });
});

describe('time', () => {
  it('정오: 조도 1.0, 태양 최고점', () => {
    expect(timeEnv(13).illuminance).toBeCloseTo(1.0, 1);
    const sun = sunPosition(12);
    expect(sun.altitudeDeg).toBeCloseTo(65, 0);
    expect(sun.azimuthDeg).toBeCloseTo(90, 0);
  });

  it('심야: 조도 0.1, 태양 안 보임, 달 보임', () => {
    expect(timeEnv(2).illuminance).toBeCloseTo(0.1, 1);
    expect(sunPosition(0).visible).toBe(false);
    expect(moonPosition(0).visible).toBe(true);
  });

  it('시간대 간 연속적 보간 — 급격한 점프 없음', () => {
    let prev = timeEnv(0).illuminance;
    for (let h = 0.5; h <= 24; h += 0.5) {
      const cur = timeEnv(h).illuminance;
      expect(Math.abs(cur - prev)).toBeLessThan(0.2);
      prev = cur;
    }
  });

  it('nightness: 낮=0, 밤=1', () => {
    expect(timeEnv(13).nightness).toBe(0);
    expect(timeEnv(2).nightness).toBe(1);
  });

  it('랩어라운드: 24시 = 0시', () => {
    expect(timeEnv(24)).toEqual(timeEnv(0));
  });
});

describe('shadow', () => {
  it('정오: 그림자가 짧고 옅다', () => {
    const noon = blockShadow(10, 12)!;
    const evening = blockShadow(10, 17)!;
    const len = (s: { dx: number; dy: number }) => Math.hypot(s.dx, s.dy);
    expect(len(noon)).toBeLessThan(len(evening));
    expect(noon.opacity).toBeLessThan(evening.opacity);
  });

  it('밤(달빛): 그림자 투명도가 태양 대비 약함', () => {
    const moonShadow = blockShadow(10, 22);
    if (moonShadow) {
      expect(moonShadow.opacity).toBeLessThan(blockShadow(10, 17)!.opacity);
    }
  });

  it('광원이 수평선 아래면 그림자 없음', () => {
    // 일출 직전 — 태양도 달도 수평선 근처
    expect(blockShadow(10, 6)).toBeNull();
  });
});
