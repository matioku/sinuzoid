import React, { useRef, useEffect } from 'react';
import type { SpectrogramSettings } from './useVisualizerSettings';

interface Props {
  analyserNode: AnalyserNode;
  settings: SpectrogramSettings;
}

type Palette = SpectrogramSettings['palette'];

function buildLUT(palette: Palette): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;
    if (palette === 'magma') {
      r = Math.round(Math.min(255, 10 + t * 245));
      g = Math.round(Math.min(255, Math.pow(t, 2.5) * 220));
      b = Math.round(Math.min(255, t < 0.4 ? t * 2.5 * 160 : Math.max(0, (1 - (t - 0.4) / 0.6) * 160)));
    } else if (palette === 'viridis') {
      r = Math.round(Math.min(255, t > 0.75 ? (t - 0.75) / 0.25 * 255 : t * 80));
      g = Math.round(Math.min(255, 20 + t * 220));
      b = Math.round(Math.min(255, t < 0.5 ? 130 + t * 200 : Math.max(0, (1 - t) * 300)));
    } else {
      // cyan (sinuzoid theme)
      r = Math.round(Math.min(255, t > 0.75 ? (t - 0.75) / 0.25 * 200 : 0));
      g = Math.round(Math.min(255, t * 235));
      b = Math.round(Math.min(255, t * 255));
    }
    lut[i * 4 + 0] = r;
    lut[i * 4 + 1] = g;
    lut[i * 4 + 2] = b;
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

const SpectrogramVisualizer: React.FC<Props> = ({ analyserNode, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    analyserNode.fftSize = 2048;
    const bufLen = analyserNode.frequencyBinCount; // 1024
    const buf = new Uint8Array(bufLen);

    let lut = buildLUT(settings.palette);
    let lastPalette = settings.palette;
    let colData: ImageData | null = null;
    let destroyed = false;

    const render = () => {
      if (destroyed) return;
      if (document.hidden) { rafRef.current = requestAnimationFrame(render); return; }

      const s = settingsRef.current;
      const { width, height } = canvas;

      if (s.palette !== lastPalette) {
        lut = buildLUT(s.palette);
        lastPalette = s.palette;
      }
      if (!colData || colData.height !== height) {
        colData = ctx.createImageData(1, height);
      }

      analyserNode.getByteFrequencyData(buf);

      // Scroll existing pixels left by 1
      ctx.drawImage(canvas, -1, 0);

      // Build new rightmost column
      const sampleRate = analyserNode.context.sampleRate;
      const nyquist = sampleRate / 2;
      const minHz = Math.max(1, s.minHz);
      const maxHz = Math.min(nyquist, s.maxHz);
      const logMin = Math.log10(minHz);
      const logMax = Math.log10(maxHz);

      const data = colData.data;
      for (let y = 0; y < height; y++) {
        // y=0 → high freq, y=height-1 → low freq
        const t = 1 - y / (height - 1);
        const freq = Math.pow(10, logMin + t * (logMax - logMin));
        const bin = Math.round((freq / nyquist) * (bufLen - 1));
        const val = buf[Math.min(bin, bufLen - 1)];
        const li = val * 4;
        const di = y * 4;
        data[di]     = lut[li];
        data[di + 1] = lut[li + 1];
        data[di + 2] = lut[li + 2];
        data[di + 3] = 255;
      }

      ctx.putImageData(colData, width - 1, 0);
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
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
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

export default SpectrogramVisualizer;
