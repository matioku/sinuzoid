import React, { useRef, useEffect } from 'react';
import type { VuMeterSettings } from './useVisualizerSettings';

interface Props {
  analyserNode: AnalyserNode;
  settings: VuMeterSettings;
}

function dbToFrac(db: number): number {
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  level: number, peak: number,
) {
  const cLevel = Math.max(-60, Math.min(0, level));
  const barTop = y + h * (1 - dbToFrac(cLevel));

  const g12Y = y + h * (1 - dbToFrac(-12));
  const g3Y  = y + h * (1 - dbToFrac(-3));

  // Track background
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x, y, w, h);

  // Green zone (bottom → -12 dB)
  {
    const top = Math.max(barTop, g12Y);
    const ht = (y + h) - top;
    if (ht > 0) { ctx.fillStyle = '#00c853'; ctx.fillRect(x, top, w, ht); }
  }
  // Yellow zone (-12 → -3 dB)
  if (cLevel > -12) {
    const top = Math.max(barTop, g3Y);
    const ht = g12Y - top;
    if (ht > 0) { ctx.fillStyle = '#ffd600'; ctx.fillRect(x, top, w, ht); }
  }
  // Red zone (-3 → 0 dB)
  if (cLevel > -3) {
    const ht = g3Y - barTop;
    if (ht > 0) { ctx.fillStyle = '#ff1744'; ctx.fillRect(x, barTop, w, ht); }
  }

  // Peak hold marker
  if (Number.isFinite(peak)) {
    const py = y + h * (1 - dbToFrac(Math.max(-60, Math.min(0, peak))));
    ctx.fillStyle = peak > -3 ? '#ff1744' : peak > -12 ? '#ffd600' : '#00c853';
    ctx.fillRect(x, py - 1, w, 2);
  }

  // Tick marks at key dB values (inside right edge)
  const ticks = [-48, -36, -24, -12, -6, -3, 0];
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (const db of ticks) {
    const ty = y + h * (1 - dbToFrac(db));
    ctx.fillRect(x + w * 0.5, ty, w * 0.5, 1);
  }
}

const VuMeterVisualizer: React.FC<Props> = ({ analyserNode, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    analyserNode.fftSize = 2048;
    const buf = new Float32Array(analyserNode.fftSize);
    let levelL = -60;
    let peakL = -Infinity;
    let peakLTime = 0;
    let destroyed = false;

    const render = (ts: number) => {
      if (destroyed) return;
      if (document.hidden) { rafRef.current = requestAnimationFrame(render); return; }

      const s = settingsRef.current;
      const { width, height } = canvas;
      const dpr = window.devicePixelRatio || 1;

      analyserNode.getFloatTimeDomainData(buf);

      let level: number;
      if (s.showRms) {
        // RMS over first 256 samples
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / 256);
        level = rms > 1e-6 ? 20 * Math.log10(rms) : -Infinity;
      } else {
        // Instantaneous peak
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
        level = peak > 1e-6 ? 20 * Math.log10(peak) : -Infinity;
      }

      // Falloff: 60 dB range falls in falloffMs at ~60fps
      const falloffPerFrame = 1000 / s.falloffMs;
      levelL = Number.isFinite(level)
        ? Math.max(level, levelL - falloffPerFrame)
        : Math.max(-60, levelL - falloffPerFrame);

      // Peak hold
      if (Number.isFinite(level) && level > peakL) { peakL = level; peakLTime = ts; }
      if (ts - peakLTime > s.peakHoldMs) peakL = -Infinity;

      ctx.clearRect(0, 0, width, height);

      // Labels column on left
      const labelW = 22 * dpr;
      const pad = 6 * dpr;
      const gap = 4 * dpr;
      const barW = (width - labelW - pad - gap) / 2;
      const barH = height - pad * 2;

      // dB labels
      const marks = [-48, -36, -24, -12, -6, -3, 0];
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = `${Math.round(Math.max(7, Math.min(9, dpr * 8)))}px "Space Grotesk", monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const db of marks) {
        const ly = pad + barH * (1 - dbToFrac(db));
        ctx.fillText(`${db}`, labelW - 2, ly);
      }

      // Both bars mirror each other (mono source)
      const x1 = labelW + pad;
      const x2 = labelW + pad + barW + gap;
      drawBar(ctx, x1, pad, barW, barH, levelL, peakL);
      drawBar(ctx, x2, pad, barW, barH, levelL, peakL);

      // L / R labels
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = `${Math.round(Math.max(7, dpr * 7))}px "Space Grotesk", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('L', x1 + barW / 2, pad + barH + 2);
      ctx.fillText('R', x2 + barW / 2, pad + barH + 2);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => { destroyed = true; cancelAnimationFrame(rafRef.current); };
  }, [analyserNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(e.contentRect.width * dpr);
        canvas.height = Math.round(e.contentRect.height * dpr);
      }
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
    />
  );
};

export default VuMeterVisualizer;
