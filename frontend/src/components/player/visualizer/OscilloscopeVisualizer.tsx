import React, { useRef, useEffect } from 'react';
import type { OscilloscopeSettings } from './useVisualizerSettings';

interface Props {
  analyserNode: AnalyserNode;
  settings: OscilloscopeSettings;
}

const TRIGGER_WINDOW = 256;

const OscilloscopeVisualizer: React.FC<Props> = ({ analyserNode, settings }) => {
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
    let destroyed = false;

    const render = () => {
      if (destroyed) return;
      if (document.hidden) { rafRef.current = requestAnimationFrame(render); return; }

      const s = settingsRef.current;
      const { width, height } = canvas;
      const dpr = window.devicePixelRatio || 1;

      analyserNode.getFloatTimeDomainData(buf);

      // Rising zero-crossing trigger for stable display
      const samples = Math.min(s.zoom, buf.length - TRIGGER_WINDOW);
      let start = 0;
      for (let i = 1; i < TRIGGER_WINDOW; i++) {
        if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
      }

      ctx.clearRect(0, 0, width, height);

      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth * dpr;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * width;
        const y = (0.5 - buf[start + i] * 0.45) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Reset shadow for next frame (shadowBlur is slow if not cleared)
      ctx.shadowBlur = 0;

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

export default OscilloscopeVisualizer;
