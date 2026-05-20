import React, { useRef, useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';

interface Props {
  analyserNode: AnalyserNode;
  audioContext: AudioContext;
  presetName: string;
  blendTime: number;
  randomCycle: boolean;
  cycleInterval: number;
  onPresetChange: (name: string) => void;
}

let cachedPresetKeys: string[] | null = null;
let cachedPresets: Record<string, any> | null = null;

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;

/** Add a preset to the in-memory cache after runtime import (e.g. user upload). */
export function addCachedPreset(name: string, data: object) {
  if (!cachedPresets) cachedPresets = {};
  cachedPresets[name] = data;
  cachedPresetKeys = Object.keys(cachedPresets).sort();
}

/** Remove a preset from the in-memory cache. */
export function removeCachedPreset(name: string) {
  if (cachedPresets) {
    delete cachedPresets[name];
    cachedPresetKeys = Object.keys(cachedPresets).sort();
  }
}

const ButterchurnVisualizer: React.FC<Props> = ({
  analyserNode, audioContext,
  presetName, blendTime, randomCycle, cycleInterval,
  onPresetChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const presetNameRef = useRef(presetName);
  presetNameRef.current = presetName;

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const [butterchurnMod, presetsMod, { loadAllPresets }] = await Promise.all([
        import('butterchurn'),
        import('butterchurn-presets'),
        import('./presetDb'),
      ]);

      if (destroyed || !canvasRef.current) return;

      const butterchurn = butterchurnMod.default || butterchurnMod;
      const presetsModule = presetsMod.default || presetsMod;
      const builtInPresets: Record<string, any> = typeof presetsModule.getPresets === 'function'
        ? presetsModule.getPresets()
        : typeof presetsModule === 'object' ? presetsModule : {};

      // Merge custom presets from IndexedDB on top of built-ins
      const customPresets = await loadAllPresets();
      cachedPresets = { ...builtInPresets, ...customPresets };
      cachedPresetKeys = Object.keys(cachedPresets).sort();

      if (cachedPresetKeys.length === 0) {
        console.error('butterchurn-presets: no presets found');
        return;
      }

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width  = Math.min(rect.width * dpr, MAX_WIDTH);
      const height = Math.min(rect.height * dpr, MAX_HEIGHT);
      canvas.width  = Math.round(width);
      canvas.height = Math.round(height);

      const createViz = butterchurn.createVisualizer || (butterchurn as any).default?.createVisualizer;
      if (!createViz) { console.error('butterchurn: createVisualizer not found'); return; }

      const visualizer = createViz(audioContext, canvas, {
        width: Math.round(width),
        height: Math.round(height),
      });
      visualizer.connectAudio(analyserNode);

      const keys = cachedPresetKeys!;
      const initialPreset = presetNameRef.current && cachedPresets![presetNameRef.current]
        ? presetNameRef.current
        : keys[Math.floor(Math.random() * keys.length)];

      visualizer.loadPreset(cachedPresets![initialPreset], 0);
      if (initialPreset !== presetNameRef.current) onPresetChange(initialPreset);

      visualizerRef.current = visualizer;
      setLoading(false);

      const render = () => {
        if (destroyed) return;
        if (!document.hidden) visualizer.render();
        rafRef.current = requestAnimationFrame(render);
      };
      rafRef.current = requestAnimationFrame(render);
    })();

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      visualizerRef.current = null;
    };
  }, []);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.min(e.contentRect.width * dpr, MAX_WIDTH);
        const h = Math.min(e.contentRect.height * dpr, MAX_HEIGHT);
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        visualizerRef.current?.setRendererSize(Math.round(w), Math.round(h));
      }
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  // Preset change
  useEffect(() => {
    if (!visualizerRef.current || !cachedPresets || !presetName) return;
    const preset = cachedPresets[presetName];
    if (preset) visualizerRef.current.loadPreset(preset, blendTime);
  }, [presetName, blendTime]);

  // Random cycling
  useEffect(() => {
    if (!randomCycle || !cachedPresetKeys) return;
    const interval = setInterval(() => {
      const keys = cachedPresetKeys!;
      let next: string;
      do { next = keys[Math.floor(Math.random() * keys.length)]; }
      while (next === presetNameRef.current && keys.length > 1);
      onPresetChange(next);
    }, cycleInterval * 1000);
    return () => clearInterval(interval);
  }, [randomCycle, cycleInterval, onPresetChange]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)' }}>
          <FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </div>
  );
};

export { cachedPresetKeys };
export default ButterchurnVisualizer;
