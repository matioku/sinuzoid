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

  // Initialize butterchurn
  useEffect(() => {
    let destroyed = false;

    (async () => {
      const [butterchurnMod, presetsMod] = await Promise.all([
        import('butterchurn'),
        import('butterchurn-presets'),
      ]);

      if (destroyed || !canvasRef.current) return;

      // Handle UMD/ESM interop
      const butterchurn = butterchurnMod.default || butterchurnMod;
      const presetsModule = presetsMod.default || presetsMod;
      // butterchurn-presets exports a class with a static getPresets() method
      const presets = typeof presetsModule.getPresets === 'function'
        ? presetsModule.getPresets()
        : typeof presetsModule === 'object' ? presetsModule : {};
      cachedPresets = presets;
      cachedPresetKeys = Object.keys(presets).sort();

      if (cachedPresetKeys.length === 0) {
        console.error('butterchurn-presets: no presets found. Raw module:', presetsMod);
        return;
      }

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = Math.min(rect.width * (window.devicePixelRatio || 1), MAX_WIDTH);
      const height = Math.min(rect.height * (window.devicePixelRatio || 1), MAX_HEIGHT);
      canvas.width = width;
      canvas.height = height;

      const createViz = butterchurn.createVisualizer || butterchurn.default?.createVisualizer;
      if (!createViz) {
        console.error('butterchurn: createVisualizer not found. Module:', butterchurnMod);
        return;
      }

      const visualizer = createViz(audioContext, canvas, {
        width: Math.round(width),
        height: Math.round(height),
      });

      visualizer.connectAudio(analyserNode);

      // Load initial preset
      const keys = cachedPresetKeys!;
      const initialPreset = presetNameRef.current && presets[presetNameRef.current]
        ? presetNameRef.current
        : keys[Math.floor(Math.random() * keys.length)];

      visualizer.loadPreset(presets[initialPreset], 0);
      if (initialPreset !== presetNameRef.current) {
        onPresetChange(initialPreset);
      }

      visualizerRef.current = visualizer;
      setLoading(false);

      // Animation loop
      const render = () => {
        if (destroyed) return;
        if (!document.hidden) {
          visualizer.render();
        }
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

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.min(width * (window.devicePixelRatio || 1), MAX_WIDTH);
        const h = Math.min(height * (window.devicePixelRatio || 1), MAX_HEIGHT);
        canvas.width = Math.round(w);
        canvas.height = Math.round(h);
        if (visualizerRef.current) {
          visualizerRef.current.setRendererSize(Math.round(w), Math.round(h));
        }
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Preset change
  useEffect(() => {
    if (!visualizerRef.current || !cachedPresets || !presetName) return;
    const preset = cachedPresets[presetName];
    if (preset) {
      visualizerRef.current.loadPreset(preset, blendTime);
    }
  }, [presetName, blendTime]);

  // Random cycling
  useEffect(() => {
    if (!randomCycle || !cachedPresetKeys) return;

    const interval = setInterval(() => {
      const keys = cachedPresetKeys!;
      const current = presetNameRef.current;
      let next: string;
      do {
        next = keys[Math.floor(Math.random() * keys.length)];
      } while (next === current && keys.length > 1);
      onPresetChange(next);
    }, cycleInterval * 1000);

    return () => clearInterval(interval);
  }, [randomCycle, cycleInterval, onPresetChange]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
        }}>
          <FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </div>
  );
};

export { cachedPresetKeys };
export default ButterchurnVisualizer;
