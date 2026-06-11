import { useEffect, useRef } from 'react';
import { Canvas2DOcean } from './oceanRenderer';

/** 바다 배경 캔버스 — rAF 루프, 부모를 가득 채움 */
export function OceanCanvas({ hour }: { hour: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hourRef = useRef(hour);
  useEffect(() => {
    hourRef.current = hour;
  }, [hour]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ocean = new Canvas2DOcean();
    ocean.init(canvas);

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) ocean.resize(parent.clientWidth, parent.clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      ocean.setTimeOfDay(hourRef.current);
      ocean.render(now - last);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      ocean.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" />;
}
