import {
  rgbToCss,
  timeEnv,
  type IOceanRenderer,
  type OceanQuality,
  type OceanTheme,
} from '@pangaea/core';

/**
 * Canvas 2D 바다 (M1-C3, 기획서 §4.8 — M1은 최소 품질도 "움직이는 바다")
 * 시간대별 하늘/바다 그라데이션 + 사인 파도 + 낮 스파클.
 * M3에서 WebGL 구현으로 교체 — IOceanRenderer 인터페이스 유지.
 */
export class Canvas2DOcean implements IOceanRenderer<HTMLCanvasElement> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private hour = 13;
  private quality: OceanQuality = 'mid';
  private t = 0;
  private width = 0;
  private height = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  setTimeOfDay(hour: number): void {
    this.hour = hour;
  }

  setQuality(level: OceanQuality): void {
    this.quality = level;
  }

  setTheme(_theme: OceanTheme): void {
    // M3-B3 퍼스널 컬러에서 구현
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  render(dt: number): void {
    const ctx = this.ctx;
    if (!ctx || this.width === 0) return;
    this.t += dt / 1000;

    const env = timeEnv(this.hour);
    const horizon = this.height * 0.28;

    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgbToCss(env.skyTop));
    sky.addColorStop(1, rgbToCss(env.skyBottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, horizon);

    // 바다
    const sea = ctx.createLinearGradient(0, horizon, 0, this.height);
    sea.addColorStop(0, rgbToCss(env.seaTop));
    sea.addColorStop(1, rgbToCss(env.seaBottom));
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    // 파도 줄기 (사인 곡선 여러 겹)
    const waveCount = this.quality === 'min' ? 3 : 6;
    for (let i = 0; i < waveCount; i++) {
      const yBase = horizon + ((this.height - horizon) * (i + 1)) / (waveCount + 1);
      const amp = 2.5 + i * 1.2;
      const speed = 0.4 + i * 0.12;
      const wl = 90 + i * 45;
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 8) {
        const y =
          yBase + Math.sin((x / wl + this.t * speed) * Math.PI * 2) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.035 + env.illuminance * 0.035})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 스파클 (정오 최대 — 기획서 §4.8.1 대기 효과)
    if (this.quality !== 'min' && env.illuminance > 0.5) {
      const count = Math.round(15 * (env.illuminance - 0.5) * 2);
      for (let i = 0; i < count; i++) {
        // 결정적 의사 난수 (i 기반) — 프레임마다 흔들리지 않게
        const px = ((i * 197.3) % 1) * this.width;
        const py = horizon + ((i * 83.7) % 1) * (this.height - horizon);
        const tw = (Math.sin(this.t * 2 + i * 1.7) + 1) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.25 * tw * env.illuminance})`;
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }

    // 별 (밤 — nightness 기반)
    if (env.nightness > 0.3) {
      const count = Math.round(50 * env.nightness);
      for (let i = 0; i < count; i++) {
        const px = ((i * 127.1) % 1) * this.width;
        const py = ((i * 311.7) % 1) * horizon;
        const tw = (Math.sin(this.t * 0.8 + i * 2.3) + 1) / 2;
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + 0.5 * tw) * env.nightness})`;
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
  }

  dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
}
