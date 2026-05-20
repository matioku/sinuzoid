# Visualizer — Fullscreen, Custom Presets & New Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Sinuzoid visualizer with fullscreen modes, custom MilkDrop preset upload, and three new canvas-based visualizers (spectrogram, oscilloscope, VU meter) plus a combined monitoring view.

**Architecture:** All new visualizers are standalone React components using `<canvas>` + Web Audio API, following the same pattern as `ButterchurnVisualizer.tsx`. The type selector in `VisualizerView` becomes a popover grid. Fullscreen has two independent mechanisms: an immersive portal overlay (z-index 250) and the browser Fullscreen API. Custom presets are stored in IndexedDB.

**Tech Stack:** React 19, TypeScript, Canvas 2D API, Web Audio API (`AnalyserNode`), IndexedDB, `milkdrop-preset-utils` (npm), existing `react-icons/fi`.

---

## File Map

| Status | Path |
|--------|------|
| Create | `frontend/src/components/player/visualizer/presetDb.ts` |
| Create | `frontend/src/components/player/visualizer/SpectrogramVisualizer.tsx` |
| Create | `frontend/src/components/player/visualizer/OscilloscopeVisualizer.tsx` |
| Create | `frontend/src/components/player/visualizer/VuMeterVisualizer.tsx` |
| Create | `frontend/src/components/player/visualizer/MonitoringVisualizer.tsx` |
| Modify | `frontend/src/components/player/visualizer/useVisualizerSettings.ts` |
| Modify | `frontend/src/components/player/visualizer/ButterchurnVisualizer.tsx` |
| Modify | `frontend/src/components/player/visualizer/VisualizerSettings.tsx` |
| Modify | `frontend/src/components/player/visualizer/VisualizerView.tsx` |

---

## Task 1: Install `milkdrop-preset-utils` and extend `useVisualizerSettings.ts`

**Files:**
- Modify: `frontend/src/components/player/visualizer/useVisualizerSettings.ts`

- [ ] **Step 1: Install the MilkDrop parser**

```bash
cd frontend && bun add milkdrop-preset-utils
```

If `milkdrop-preset-utils` is not found on npm, check `butterchurn-preset-utils` as an alternative. The expected API is `import { convertPreset } from 'milkdrop-preset-utils'` where `convertPreset(milkText: string)` returns a butterchurn-compatible object.

- [ ] **Step 2: Replace `useVisualizerSettings.ts` with the extended version**

Replace the entire file with:

```typescript
import { useState, useEffect, useCallback } from 'react';

export type VisualizerType =
  | 'butterchurn'
  | 'audiomotion'
  | 'spectrogram'
  | 'oscilloscope'
  | 'vumeter'
  | 'monitoring';

export interface AudioMotionSettings {
  presetName: string;
  mode: number;
  barSpace: number;
  ledBars: boolean;
  lumiBars: boolean;
  gradient: string;
  reflexRatio: number;
  reflexAlpha: number;
  showPeaks: boolean;
  smoothing: number;
}

export interface ButterchurnSettings {
  presetName: string;
  blendTime: number;
  randomCycle: boolean;
  cycleInterval: number;
}

export interface SpectrogramSettings {
  palette: 'magma' | 'viridis' | 'cyan';
  minHz: number;
  maxHz: number;
  dbRange: number;
}

export interface OscilloscopeSettings {
  color: string;
  lineWidth: number;
  zoom: number;
}

export interface VuMeterSettings {
  falloffMs: number;
  peakHoldMs: number;
  showRms: boolean;
}

export interface VisualizerSettings {
  activeType: VisualizerType;
  butterchurn: ButterchurnSettings;
  audiomotion: AudioMotionSettings;
  spectrogram: SpectrogramSettings;
  oscilloscope: OscilloscopeSettings;
  vumeter: VuMeterSettings;
}

const STORAGE_KEY = 'sinuzoid_visualizer';

const defaults: VisualizerSettings = {
  activeType: 'butterchurn',
  butterchurn: {
    presetName: '',
    blendTime: 2.0,
    randomCycle: false,
    cycleInterval: 30,
  },
  audiomotion: {
    presetName: 'spectrum',
    mode: 3,
    barSpace: 0.2,
    ledBars: false,
    lumiBars: false,
    gradient: 'sinuzoid',
    reflexRatio: 0.3,
    reflexAlpha: 0.15,
    showPeaks: true,
    smoothing: 0.7,
  },
  spectrogram: {
    palette: 'cyan',
    minHz: 20,
    maxHz: 20000,
    dbRange: 80,
  },
  oscilloscope: {
    color: '#00e5ff',
    lineWidth: 1.5,
    zoom: 1024,
  },
  vumeter: {
    falloffMs: 300,
    peakHoldMs: 2000,
    showRms: true,
  },
};

export const AUDIOMOTION_PRESETS: Record<string, Partial<AudioMotionSettings>> = {
  spectrum: {
    mode: 3, barSpace: 0.2, ledBars: false, lumiBars: false,
    reflexRatio: 0.3, reflexAlpha: 0.15, showPeaks: true, smoothing: 0.7,
  },
  'led-matrix': {
    mode: 3, barSpace: 0.5, ledBars: true, lumiBars: false,
    reflexRatio: 0, reflexAlpha: 0, showPeaks: true, smoothing: 0.65,
  },
  'mirror-reflex': {
    mode: 10, barSpace: 0.1, ledBars: false, lumiBars: true,
    reflexRatio: 0.5, reflexAlpha: 0.25, showPeaks: false, smoothing: 0.8,
  },
  minimal: {
    mode: 6, barSpace: 0.3, ledBars: false, lumiBars: false,
    reflexRatio: 0, reflexAlpha: 0, showPeaks: false, smoothing: 0.85,
  },
};

function loadSettings(): VisualizerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        butterchurn: { ...defaults.butterchurn, ...parsed.butterchurn },
        audiomotion: { ...defaults.audiomotion, ...parsed.audiomotion },
        spectrogram: { ...defaults.spectrogram, ...parsed.spectrogram },
        oscilloscope: { ...defaults.oscilloscope, ...parsed.oscilloscope },
        vumeter: { ...defaults.vumeter, ...parsed.vumeter },
      };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveSettings(s: VisualizerSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function useVisualizerSettings() {
  const [settings, setSettingsState] = useState<VisualizerSettings>(loadSettings);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const updateSettings = useCallback((partial: Partial<VisualizerSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }));
  }, []);

  const updateButterchurn = useCallback((partial: Partial<ButterchurnSettings>) => {
    setSettingsState(prev => ({ ...prev, butterchurn: { ...prev.butterchurn, ...partial } }));
  }, []);

  const updateAudiomotion = useCallback((partial: Partial<AudioMotionSettings>) => {
    setSettingsState(prev => ({ ...prev, audiomotion: { ...prev.audiomotion, ...partial } }));
  }, []);

  const updateSpectrogram = useCallback((partial: Partial<SpectrogramSettings>) => {
    setSettingsState(prev => ({ ...prev, spectrogram: { ...prev.spectrogram, ...partial } }));
  }, []);

  const updateOscilloscope = useCallback((partial: Partial<OscilloscopeSettings>) => {
    setSettingsState(prev => ({ ...prev, oscilloscope: { ...prev.oscilloscope, ...partial } }));
  }, []);

  const updateVuMeter = useCallback((partial: Partial<VuMeterSettings>) => {
    setSettingsState(prev => ({ ...prev, vumeter: { ...prev.vumeter, ...partial } }));
  }, []);

  return {
    settings,
    updateSettings,
    updateButterchurn,
    updateAudiomotion,
    updateSpectrogram,
    updateOscilloscope,
    updateVuMeter,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && bun run build 2>&1 | head -40
```

Expected: no errors related to `useVisualizerSettings`. Existing callers (`VisualizerView`, `VisualizerSettings`) will show type errors — those are fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/bun.lockb frontend/src/components/player/visualizer/useVisualizerSettings.ts
git commit -m "feat(visualizer): extend types and settings for new visualizers"
```

---

## Task 2: Create `presetDb.ts`

**Files:**
- Create: `frontend/src/components/player/visualizer/presetDb.ts`

- [ ] **Step 1: Create the IndexedDB wrapper**

```typescript
// frontend/src/components/player/visualizer/presetDb.ts

const DB_NAME = 'sinuzoid-presets';
const STORE = 'milkdrop-custom';
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePreset(name: string, data: object): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllPresets(): Promise<Record<string, object>> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const keysReq = store.getAllKeys();
    const valuesReq = store.getAll();
    const result: Record<string, object> = {};
    tx.oncomplete = () => {
      (keysReq.result as string[]).forEach((k, i) => {
        result[k] = valuesReq.result[i] as object;
      });
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePreset(name: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/presetDb.ts
git commit -m "feat(visualizer): add IndexedDB wrapper for custom MilkDrop presets"
```

---

## Task 3: Create `SpectrogramVisualizer.tsx`

**Files:**
- Create: `frontend/src/components/player/visualizer/SpectrogramVisualizer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/player/visualizer/SpectrogramVisualizer.tsx

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
    // Pre-allocated column ImageData — rebuilt on resize
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/SpectrogramVisualizer.tsx
git commit -m "feat(visualizer): add SpectrogramVisualizer (canvas waterfall)"
```

---

## Task 4: Create `OscilloscopeVisualizer.tsx`

**Files:**
- Create: `frontend/src/components/player/visualizer/OscilloscopeVisualizer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/player/visualizer/OscilloscopeVisualizer.tsx

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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/OscilloscopeVisualizer.tsx
git commit -m "feat(visualizer): add OscilloscopeVisualizer (canvas waveform)"
```

---

## Task 5: Create `VuMeterVisualizer.tsx`

**Files:**
- Create: `frontend/src/components/player/visualizer/VuMeterVisualizer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/player/visualizer/VuMeterVisualizer.tsx

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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/VuMeterVisualizer.tsx
git commit -m "feat(visualizer): add VuMeterVisualizer (canvas PPM/RMS bars)"
```

---

## Task 6: Create `MonitoringVisualizer.tsx`

**Files:**
- Create: `frontend/src/components/player/visualizer/MonitoringVisualizer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/player/visualizer/MonitoringVisualizer.tsx

import React, { lazy, Suspense } from 'react';
import type { SpectrogramSettings, OscilloscopeSettings, VuMeterSettings } from './useVisualizerSettings';

const SpectrogramVisualizer = lazy(() => import('./SpectrogramVisualizer'));
const OscilloscopeVisualizer = lazy(() => import('./OscilloscopeVisualizer'));
const VuMeterVisualizer = lazy(() => import('./VuMeterVisualizer'));

interface Props {
  analyserNode: AnalyserNode;
  spectrogramSettings: SpectrogramSettings;
  oscilloscopeSettings: OscilloscopeSettings;
  vuMeterSettings: VuMeterSettings;
}

const MonitoringVisualizer: React.FC<Props> = ({
  analyserNode,
  spectrogramSettings,
  oscilloscopeSettings,
  vuMeterSettings,
}) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Spectrogram: top 60% */}
      <div style={{ flex: '0 0 60%', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Suspense fallback={null}>
          <SpectrogramVisualizer analyserNode={analyserNode} settings={spectrogramSettings} />
        </Suspense>
      </div>
      {/* Oscilloscope + VU Meter: bottom 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 3, overflow: 'hidden' }}>
          <Suspense fallback={null}>
            <OscilloscopeVisualizer analyserNode={analyserNode} settings={oscilloscopeSettings} />
          </Suspense>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <Suspense fallback={null}>
            <VuMeterVisualizer analyserNode={analyserNode} settings={vuMeterSettings} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default MonitoringVisualizer;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/MonitoringVisualizer.tsx
git commit -m "feat(visualizer): add MonitoringVisualizer (combined layout)"
```

---

## Task 7: Update `ButterchurnVisualizer.tsx`

**Files:**
- Modify: `frontend/src/components/player/visualizer/ButterchurnVisualizer.tsx`

Load custom presets from IndexedDB at init and export helpers for adding/removing custom presets dynamically (so the settings panel can update without remounting).

- [ ] **Step 1: Replace the file**

```typescript
// frontend/src/components/player/visualizer/ButterchurnVisualizer.tsx

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

      const createViz = butterchurn.createVisualizer || butterchurn.default?.createVisualizer;
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/ButterchurnVisualizer.tsx
git commit -m "feat(visualizer): load custom presets from IndexedDB in ButterchurnVisualizer"
```

---

## Task 8: Rewrite `VisualizerSettings.tsx`

**Files:**
- Modify: `frontend/src/components/player/visualizer/VisualizerSettings.tsx`

Adds new props for the 3 new types, new settings panels, and preset import UI in the Butterchurn panel.

- [ ] **Step 1: Replace the file**

```typescript
// frontend/src/components/player/visualizer/VisualizerSettings.tsx

import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiChevronDown, FiChevronRight, FiUpload, FiTrash2, FiLoader } from 'react-icons/fi';
import type {
  VisualizerType, ButterchurnSettings, AudioMotionSettings,
  SpectrogramSettings, OscilloscopeSettings, VuMeterSettings,
} from './useVisualizerSettings';
import { AUDIOMOTION_PRESETS } from './useVisualizerSettings';
import { cachedPresetKeys, addCachedPreset, removeCachedPreset } from './ButterchurnVisualizer';
import { savePreset, loadAllPresets, deletePreset } from './presetDb';

interface Props {
  activeType: VisualizerType;
  butterchurnSettings: ButterchurnSettings;
  audiomotionSettings: AudioMotionSettings;
  spectrogramSettings: SpectrogramSettings;
  oscilloscopeSettings: OscilloscopeSettings;
  vuMeterSettings: VuMeterSettings;
  onUpdateButterchurn: (p: Partial<ButterchurnSettings>) => void;
  onUpdateAudiomotion: (p: Partial<AudioMotionSettings>) => void;
  onUpdateSpectrogram: (p: Partial<SpectrogramSettings>) => void;
  onUpdateOscilloscope: (p: Partial<OscilloscopeSettings>) => void;
  onUpdateVuMeter: (p: Partial<VuMeterSettings>) => void;
  onClose: () => void;
}

const GRADIENT_OPTIONS = [
  { value: 'sinuzoid', label: 'Sinuzoid Cyan' },
  { value: 'rainbow',  label: 'Rainbow' },
  { value: 'classic',  label: 'Classic' },
  { value: 'stealth',  label: 'Stealth' },
  { value: 'orangered',label: 'Orange Red' },
  { value: 'prism',    label: 'Prism' },
];

const MODE_OPTIONS = [
  { value: 0, label: 'Discrete' }, { value: 1, label: '1/24 octave' },
  { value: 2, label: '1/12 octave' }, { value: 3, label: '1/8 octave' },
  { value: 4, label: '1/6 octave' }, { value: 5, label: '1/4 octave' },
  { value: 6, label: '1/3 octave' }, { value: 8, label: 'Half octave' },
  { value: 10, label: 'Full octave' },
];

const OSCILLO_COLORS = [
  { color: '#00e5ff', label: 'Cyan' }, { color: '#00ff88', label: 'Green' },
  { color: '#ff6b35', label: 'Orange' }, { color: '#ffffff', label: 'White' },
  { color: '#c77dff', label: 'Purple' },
];

const VisualizerSettings: React.FC<Props> = ({
  activeType,
  butterchurnSettings, audiomotionSettings,
  spectrogramSettings, oscilloscopeSettings, vuMeterSettings,
  onUpdateButterchurn, onUpdateAudiomotion,
  onUpdateSpectrogram, onUpdateOscilloscope, onUpdateVuMeter,
  onClose,
}) => {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 300, maxWidth: '85%',
      background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(24px)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      zIndex: 10, display: 'flex', flexDirection: 'column',
      animation: 'settingsPanelIn 0.25s ease forwards',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: 'Space Grotesk, monospace', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Settings</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <FiX size={14} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {activeType === 'butterchurn'  && <ButterchurnPanel  settings={butterchurnSettings}  onUpdate={onUpdateButterchurn} />}
        {activeType === 'audiomotion'  && <AudioMotionPanel  settings={audiomotionSettings}  onUpdate={onUpdateAudiomotion} />}
        {activeType === 'spectrogram'  && <SpectrogramPanel  settings={spectrogramSettings}  onUpdate={onUpdateSpectrogram} />}
        {activeType === 'oscilloscope' && <OscilloscopePanel settings={oscilloscopeSettings} onUpdate={onUpdateOscilloscope} />}
        {activeType === 'vumeter'      && <VuMeterPanel      settings={vuMeterSettings}      onUpdate={onUpdateVuMeter} />}
        {activeType === 'monitoring'   && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Manrope, sans-serif', textAlign: 'center', paddingTop: 16 }}>
            Configure each visualizer individually via its own type.
          </div>
        )}
      </div>
      <style>{`
        @keyframes settingsPanelIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

/* ── Butterchurn Panel ─────────────────────────────────────────────────────── */

function ButterchurnPanel({ settings, onUpdate }: { settings: ButterchurnSettings; onUpdate: (p: Partial<ButterchurnSettings>) => void }) {
  const [search, setSearch] = useState('');
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllPresets().then(p => setCustomNames(Object.keys(p)));
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setImportError(null);

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        let presetData: object;
        const name = file.name.replace(/\.(milk|json)$/i, '');

        if (file.name.toLowerCase().endsWith('.json')) {
          presetData = JSON.parse(text);
        } else {
          // .milk — dynamic import of parser
          const mod = await import('milkdrop-preset-utils' as any);
          const convert: ((t: string) => object) | undefined =
            mod.default?.convertPreset ?? mod.convertPreset ?? mod.default;
          if (typeof convert !== 'function') throw new Error('milkdrop-preset-utils: no convertPreset function found. Check the package API.');
          presetData = convert(text);
        }

        await savePreset(name, presetData);
        addCachedPreset(name, presetData);
        setCustomNames(prev => [...new Set([...prev, name])]);
        onUpdate({ presetName: name });
      } catch (err: any) {
        setImportError(err?.message ?? 'Import failed');
      }
    }
    setImporting(false);
  };

  const handleDelete = async (name: string) => {
    await deletePreset(name);
    removeCachedPreset(name);
    setCustomNames(prev => prev.filter(n => n !== name));
    if (settings.presetName === name) onUpdate({ presetName: '' });
  };

  const presetKeys = cachedPresetKeys || [];
  const builtInKeys = presetKeys.filter(k => !customNames.includes(k));
  const filtered = (arr: string[]) =>
    search ? arr.filter(k => k.toLowerCase().includes(search.toLowerCase())) : arr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Random cycle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SettingLabel>Random Cycle</SettingLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings.randomCycle && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Grotesk, monospace' }}>{settings.cycleInterval}s</span>}
          <Toggle checked={settings.randomCycle} onChange={v => onUpdate({ randomCycle: v })} />
        </div>
      </div>
      {settings.randomCycle && (
        <SliderRow label="Cycle interval" value={settings.cycleInterval} min={10} max={120} step={5} format={v => `${v}s`} onChange={v => onUpdate({ cycleInterval: v })} />
      )}
      <SliderRow label="Blend time" value={settings.blendTime} min={0} max={5} step={0.5} format={v => `${v}s`} onChange={v => onUpdate({ blendTime: v })} />

      {/* Import button */}
      <div>
        <SettingLabel>Custom Presets</SettingLabel>
        <input ref={fileInputRef} type="file" accept=".milk,.json" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}
        >
          {importing ? <FiLoader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiUpload size={12} />}
          {importing ? 'Importing…' : 'Import .milk / .json'}
        </button>
        {importError && <div style={{ marginTop: 6, fontSize: 11, color: '#ff5252', fontFamily: 'Manrope, sans-serif' }}>{importError}</div>}
      </div>

      {/* Search */}
      <div>
        <SettingLabel>Preset</SettingLabel>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search presets…"
          style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Preset list */}
      <div style={{ maxHeight: 260, overflowY: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Custom section */}
        {filtered(customNames).length > 0 && (
          <>
            <div style={{ padding: '5px 10px 3px', fontSize: 10, color: 'rgba(0,229,255,0.6)', fontFamily: 'Space Grotesk, monospace', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>Custom</div>
            {filtered(customNames).map(key => (
              <div key={key} onClick={() => onUpdate({ presetName: key })} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', fontSize: 11, fontFamily: 'Manrope, sans-serif', color: key === settings.presetName ? 'var(--accent)' : 'rgba(255,255,255,0.55)', background: key === settings.presetName ? 'rgba(0,229,255,0.06)' : 'transparent', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: 6 }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(key); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.55)', padding: 2, display: 'flex', flexShrink: 0 }}>
                  <FiTrash2 size={11} />
                </button>
              </div>
            ))}
            {builtInKeys.length > 0 && <div style={{ padding: '5px 10px 3px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk, monospace', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>Built-in</div>}
          </>
        )}
        {/* Built-in presets */}
        {filtered(builtInKeys).map(key => (
          <div key={key} onClick={() => onUpdate({ presetName: key })}
            style={{ padding: '7px 10px', fontSize: 11, fontFamily: 'Manrope, sans-serif', color: key === settings.presetName ? 'var(--accent)' : 'rgba(255,255,255,0.55)', background: key === settings.presetName ? 'rgba(0,229,255,0.06)' : 'transparent', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {key}
          </div>
        ))}
        {filtered(presetKeys).length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>No presets found</div>
        )}
      </div>
    </div>
  );
}

/* ── AudioMotion Panel ─────────────────────────────────────────────────────── */

function AudioMotionPanel({ settings, onUpdate }: { settings: AudioMotionSettings; onUpdate: (p: Partial<AudioMotionSettings>) => void }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyPreset = (name: string) => {
    const p = AUDIOMOTION_PRESETS[name];
    if (p) onUpdate({ ...p, presetName: name });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <SettingLabel>Preset</SettingLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.keys(AUDIOMOTION_PRESETS).map(name => (
            <PillBtn key={name} active={settings.presetName === name} onClick={() => applyPreset(name)}>
              {name.replace(/-/g, ' ')}
            </PillBtn>
          ))}
        </div>
      </div>
      <div>
        <SettingLabel>Gradient</SettingLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {GRADIENT_OPTIONS.map(opt => (
            <PillBtn key={opt.value} active={settings.gradient === opt.value} onClick={() => onUpdate({ gradient: opt.value })}>
              {opt.label}
            </PillBtn>
          ))}
        </div>
      </div>
      <button onClick={() => setAdvancedOpen(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, fontFamily: 'Space Grotesk, monospace', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '4px 0' }}>
        {advancedOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />} Advanced
      </button>
      {advancedOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <SettingLabel>Mode</SettingLabel>
            <select value={settings.mode} onChange={e => onUpdate({ mode: Number(e.target.value) })}
              style={{ width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none' }}>
              {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <ToggleRow label="LED bars"    checked={settings.ledBars}   onChange={v => onUpdate({ ledBars: v })} />
          <ToggleRow label="Lumi bars"   checked={settings.lumiBars}  onChange={v => onUpdate({ lumiBars: v })} />
          <ToggleRow label="Show peaks"  checked={settings.showPeaks} onChange={v => onUpdate({ showPeaks: v })} />
          <SliderRow label="Bar spacing" value={settings.barSpace}    min={0} max={1}    step={0.05} format={v => v.toFixed(2)} onChange={v => onUpdate({ barSpace: v })} />
          <SliderRow label="Smoothing"   value={settings.smoothing}   min={0} max={0.95} step={0.05} format={v => v.toFixed(2)} onChange={v => onUpdate({ smoothing: v })} />
          <SliderRow label="Reflex ratio" value={settings.reflexRatio} min={0} max={0.6} step={0.05} format={v => v.toFixed(2)} onChange={v => onUpdate({ reflexRatio: v })} />
          <SliderRow label="Reflex alpha" value={settings.reflexAlpha} min={0} max={1}   step={0.05} format={v => v.toFixed(2)} onChange={v => onUpdate({ reflexAlpha: v })} />
        </div>
      )}
    </div>
  );
}

/* ── Spectrogram Panel ─────────────────────────────────────────────────────── */

function SpectrogramPanel({ settings, onUpdate }: { settings: SpectrogramSettings; onUpdate: (p: Partial<SpectrogramSettings>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <SettingLabel>Color Palette</SettingLabel>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {(['magma', 'viridis', 'cyan'] as const).map(p => (
            <PillBtn key={p} active={settings.palette === p} onClick={() => onUpdate({ palette: p })}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </PillBtn>
          ))}
        </div>
      </div>
      <SliderRow label="dB Range"  value={settings.dbRange} min={40}  max={120}  step={10}   format={v => `${v} dB`}   onChange={v => onUpdate({ dbRange: v })} />
      <SliderRow label="Min Hz"    value={settings.minHz}   min={20}  max={500}  step={10}   format={v => `${v} Hz`}   onChange={v => onUpdate({ minHz: v })} />
      <SliderRow label="Max Hz"    value={settings.maxHz}   min={2000} max={20000} step={1000} format={v => `${(v/1000).toFixed(0)}kHz`} onChange={v => onUpdate({ maxHz: v })} />
    </div>
  );
}

/* ── Oscilloscope Panel ────────────────────────────────────────────────────── */

function OscilloscopePanel({ settings, onUpdate }: { settings: OscilloscopeSettings; onUpdate: (p: Partial<OscilloscopeSettings>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <SettingLabel>Color</SettingLabel>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {OSCILLO_COLORS.map(({ color, label }) => (
            <button key={color} onClick={() => onUpdate({ color })} title={label}
              style={{ width: 24, height: 24, borderRadius: '50%', border: settings.color === color ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)', background: color, cursor: 'pointer', transition: 'border 0.15s' }} />
          ))}
        </div>
      </div>
      <SliderRow label="Line width" value={settings.lineWidth} min={0.5} max={4}    step={0.5} format={v => `${v}px`} onChange={v => onUpdate({ lineWidth: v })} />
      <SliderRow label="Zoom"       value={settings.zoom}      min={256} max={2048} step={256} format={v => `${v}`}   onChange={v => onUpdate({ zoom: v })} />
    </div>
  );
}

/* ── VU Meter Panel ────────────────────────────────────────────────────────── */

function VuMeterPanel({ settings, onUpdate }: { settings: VuMeterSettings; onUpdate: (p: Partial<VuMeterSettings>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ToggleRow label="RMS mode (vs peak)" checked={settings.showRms} onChange={v => onUpdate({ showRms: v })} />
      <SliderRow label="Falloff time" value={settings.falloffMs}  min={50}  max={1000} step={50}  format={v => `${v}ms`} onChange={v => onUpdate({ falloffMs: v })} />
      <SliderRow label="Peak hold"    value={settings.peakHoldMs} min={500} max={5000} step={500} format={v => `${v}ms`} onChange={v => onUpdate({ peakHoldMs: v })} />
    </div>
  );
}

/* ── Shared Controls ───────────────────────────────────────────────────────── */

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontFamily: 'Space Grotesk, monospace', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: active ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '5px 12px', color: active ? 'var(--accent)' : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, fontFamily: 'Manrope, sans-serif', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SettingLabel>{label}</SettingLabel>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <SettingLabel>{label}</SettingLabel>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'Space Grotesk, monospace' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="sz-slider" style={{ width: '100%' }} />
    </div>
  );
}

export default VisualizerSettings;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/player/visualizer/VisualizerSettings.tsx
git commit -m "feat(visualizer): add new settings panels and MilkDrop preset import UI"
```

---

## Task 9: Rewrite `VisualizerView.tsx`

**Files:**
- Modify: `frontend/src/components/player/visualizer/VisualizerView.tsx`

Adds the type popover, all 6 visualizer dispatches, immersive mode portal, and browser Fullscreen API support.

- [ ] **Step 1: Replace the file**

```typescript
// frontend/src/components/player/visualizer/VisualizerView.tsx

import React, { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FiSettings, FiLoader,
  FiWind, FiBarChart2, FiGrid, FiActivity, FiSliders, FiLayout,
  FiMaximize, FiMaximize2, FiMinimize, FiMinimize2,
  FiChevronDown, FiPlay, FiPause,
} from 'react-icons/fi';
import { useAudioContext } from '../../../contexts/AudioContext';
import { useAudioPlayerStore } from '../../../store/audioPlayerStore';
import { useVisualizerSettings } from './useVisualizerSettings';
import type { VisualizerType } from './useVisualizerSettings';
import LogoIcon from '../../../assets/logos/logo_sinuzoid-cyan.svg?react';

const ButterchurnVisualizer  = lazy(() => import('./ButterchurnVisualizer'));
const AudioMotionVisualizer  = lazy(() => import('./AudioMotionVisualizer'));
const SpectrogramVisualizer  = lazy(() => import('./SpectrogramVisualizer'));
const OscilloscopeVisualizer = lazy(() => import('./OscilloscopeVisualizer'));
const VuMeterVisualizer      = lazy(() => import('./VuMeterVisualizer'));
const MonitoringVisualizer   = lazy(() => import('./MonitoringVisualizer'));
const VisualizerSettings     = lazy(() => import('./VisualizerSettings'));

const TYPE_META: Record<VisualizerType, { label: string; icon: React.ReactNode }> = {
  butterchurn:  { label: 'Milkdrop',     icon: <FiWind size={15} /> },
  audiomotion:  { label: 'Spectrum',     icon: <FiBarChart2 size={15} /> },
  spectrogram:  { label: 'Spectrogram',  icon: <FiGrid size={15} /> },
  oscilloscope: { label: 'Oscilloscope', icon: <FiActivity size={15} /> },
  vumeter:      { label: 'VU Meter',     icon: <FiSliders size={15} /> },
  monitoring:   { label: 'Monitoring',   icon: <FiLayout size={15} /> },
};

const VizLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.35)' }}>
    <FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const overlayBtn: React.CSSProperties = {
  background: 'rgba(8,8,16,0.65)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'rgba(255,255,255,0.55)', transition: 'all 0.15s ease',
};

const VisualizerView: React.FC = () => {
  const { analyserNode, webAudioCtx } = useAudioContext();
  const {
    settings, updateSettings,
    updateButterchurn, updateAudiomotion,
    updateSpectrogram, updateOscilloscope, updateVuMeter,
  } = useVisualizerSettings();
  const { currentTrack, isPlaying, toggle } = useAudioPlayerStore();

  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [immersive, setImmersive]           = useState(false);
  const [showImmersiveCtrls, setShowImmersiveCtrls] = useState(true);
  const [isBrowserFS, setIsBrowserFS]       = useState(false);

  const containerRef  = useRef<HTMLDivElement>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout>>();

  const setActiveType = (type: VisualizerType) => {
    updateSettings({ activeType: type });
    setTypePopoverOpen(false);
  };

  // Track browser fullscreen state
  useEffect(() => {
    const h = () => setIsBrowserFS(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // Escape exits immersive mode (browser fullscreen has its own Escape handling)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && immersive && !document.fullscreenElement) setImmersive(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [immersive]);

  // Auto-hide immersive controls after 3s of no mouse movement
  const resetHideTimer = useCallback(() => {
    setShowImmersiveCtrls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowImmersiveCtrls(false), 3000);
  }, []);

  useEffect(() => {
    if (immersive) { resetHideTimer(); }
    return () => clearTimeout(hideTimerRef.current);
  }, [immersive, resetHideTimer]);

  const handleBrowserFS = () => {
    if (isBrowserFS) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  };

  if (!analyserNode || !webAudioCtx) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'rgba(255,255,255,0.3)' }}>
        <LogoIcon style={{ width: 64, height: 64, opacity: 0.2 }} />
        <div style={{ fontSize: 14, fontFamily: 'Manrope, sans-serif' }}>Play a track to activate the visualizer</div>
      </div>
    );
  }

  const vizCanvas = (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<VizLoader />}>
        {settings.activeType === 'butterchurn' && (
          <ButterchurnVisualizer
            analyserNode={analyserNode} audioContext={webAudioCtx}
            presetName={settings.butterchurn.presetName}
            blendTime={settings.butterchurn.blendTime}
            randomCycle={settings.butterchurn.randomCycle}
            cycleInterval={settings.butterchurn.cycleInterval}
            onPresetChange={name => updateButterchurn({ presetName: name })}
          />
        )}
        {settings.activeType === 'audiomotion' && (
          <AudioMotionVisualizer analyserNode={analyserNode} audioContext={webAudioCtx} settings={settings.audiomotion} />
        )}
        {settings.activeType === 'spectrogram' && (
          <SpectrogramVisualizer analyserNode={analyserNode} settings={settings.spectrogram} />
        )}
        {settings.activeType === 'oscilloscope' && (
          <OscilloscopeVisualizer analyserNode={analyserNode} settings={settings.oscilloscope} />
        )}
        {settings.activeType === 'vumeter' && (
          <VuMeterVisualizer analyserNode={analyserNode} settings={settings.vumeter} />
        )}
        {settings.activeType === 'monitoring' && (
          <MonitoringVisualizer
            analyserNode={analyserNode}
            spectrogramSettings={settings.spectrogram}
            oscilloscopeSettings={settings.oscilloscope}
            vuMeterSettings={settings.vumeter}
          />
        )}
      </Suspense>
    </div>
  );

  // ── Immersive portal ──────────────────────────────────────────────────────
  if (immersive) {
    const trackTitle = currentTrack?.metadata?.title
      || currentTrack?.original_filename?.replace(/\.[^/.]+$/, '')
      || '';

    return createPortal(
      <div
        onMouseMove={resetHideTimer}
        style={{ position: 'fixed', inset: 0, zIndex: 250, background: '#000', cursor: showImmersiveCtrls ? 'default' : 'none' }}
      >
        {vizCanvas}

        {/* Hover controls */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '28px 24px 24px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          opacity: showImmersiveCtrls ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: showImmersiveCtrls ? 'all' : 'none',
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Manrope, sans-serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {trackTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={toggle} style={{ ...overlayBtn, color: '#fff' }}>
              {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
            </button>
            <button onClick={handleBrowserFS} title={isBrowserFS ? 'Exit browser fullscreen' : 'Browser fullscreen'} style={overlayBtn}>
              {isBrowserFS ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
            </button>
            <button onClick={() => setImmersive(false)} title="Exit immersive mode" style={overlayBtn}>
              <FiMinimize size={15} />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // ── Normal layout ─────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {vizCanvas}

      {/* Controls overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 5, pointerEvents: 'none',
      }}>
        {/* Type popover button */}
        <div style={{ position: 'relative', pointerEvents: 'all' }}>
          <button
            onClick={() => { setTypePopoverOpen(p => !p); setSettingsOpen(false); }}
            style={{
              background: typePopoverOpen ? 'rgba(0,229,255,0.12)' : 'rgba(8,8,16,0.65)',
              backdropFilter: 'blur(12px)',
              border: typePopoverOpen ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '6px 12px 6px 10px',
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              color: typePopoverOpen ? 'var(--accent)' : 'rgba(255,255,255,0.75)',
              fontSize: 12, fontWeight: 600, fontFamily: 'Manrope, sans-serif',
              transition: 'all 0.2s ease',
            }}
          >
            {TYPE_META[settings.activeType].icon}
            <span>{TYPE_META[settings.activeType].label}</span>
            <FiChevronDown size={11} style={{ opacity: 0.6, marginLeft: 2 }} />
          </button>

          {typePopoverOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
              background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(20px)',
              borderRadius: 12, padding: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 230,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              {(Object.keys(TYPE_META) as VisualizerType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: type === settings.activeType ? 'rgba(0,229,255,0.12)' : 'transparent',
                    color: type === settings.activeType ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
                    cursor: 'pointer', fontSize: 12, fontFamily: 'Manrope, sans-serif',
                    fontWeight: 600, transition: 'all 0.15s', textAlign: 'left',
                  }}
                >
                  {TYPE_META[type].icon}
                  {TYPE_META[type].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: immersive, browser fullscreen, settings */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
          <button onClick={() => setImmersive(true)} title="Immersive mode" style={overlayBtn}>
            <FiMaximize size={15} />
          </button>
          <button onClick={handleBrowserFS} title={isBrowserFS ? 'Exit browser fullscreen' : 'Browser fullscreen'} style={overlayBtn}>
            {isBrowserFS ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
          </button>
          <button
            onClick={() => { setSettingsOpen(p => !p); setTypePopoverOpen(false); }}
            style={{ ...overlayBtn, background: settingsOpen ? 'rgba(0,229,255,0.12)' : 'rgba(8,8,16,0.65)', border: settingsOpen ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)', color: settingsOpen ? 'var(--accent)' : 'rgba(255,255,255,0.55)' }}
          >
            <FiSettings size={16} />
          </button>
        </div>
      </div>

      {/* Click-away overlay for type popover */}
      {typePopoverOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4 }} onClick={() => setTypePopoverOpen(false)} />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <Suspense fallback={null}>
          <VisualizerSettings
            activeType={settings.activeType}
            butterchurnSettings={settings.butterchurn}
            audiomotionSettings={settings.audiomotion}
            spectrogramSettings={settings.spectrogram}
            oscilloscopeSettings={settings.oscilloscope}
            vuMeterSettings={settings.vumeter}
            onUpdateButterchurn={updateButterchurn}
            onUpdateAudiomotion={updateAudiomotion}
            onUpdateSpectrogram={updateSpectrogram}
            onUpdateOscilloscope={updateOscilloscope}
            onUpdateVuMeter={updateVuMeter}
            onClose={() => setSettingsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default VisualizerView;
```

- [ ] **Step 2: Build to catch TypeScript errors**

```bash
cd frontend && bun run build 2>&1 | grep -E "error TS|Error"
```

Expected: no TypeScript errors. Fix any that appear before continuing.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
cd frontend && bun run dev
```

Open `http://localhost:5173`, play a track, open the fullscreen player (click the expand button in the bottom bar), navigate to the Visualizer tab, and verify:

1. The type selector button shows "Milkdrop" with a wind icon and a chevron
2. Clicking it opens the 2×3 grid popover with all 6 types
3. Switching to Spectrogram, Oscilloscope, VU Meter, and Monitoring all render without errors
4. The settings panel (⚙️ button) opens correctly for each type
5. The immersive button (Maximize icon) makes the visualizer cover the full screen; hover shows controls; Escape exits
6. The browser fullscreen button (Maximize2 icon) triggers the browser's native fullscreen
7. Both fullscreen modes work together

- [ ] **Step 4: Test preset import**

1. Navigate to Milkdrop visualizer → open settings → click "Import .milk / .json"
2. Select a `.json` butterchurn preset file → verify it appears in the "Custom" section
3. Click the preset to load it → verify it loads in the visualizer
4. Click the ✕ button → verify it's removed from the list
5. Try importing a `.milk` file → if `milkdrop-preset-utils` is correctly installed and the API matches, the preset should import. If the package has a different API than expected (`convertPreset` not found), the error message will appear inline — in that case, check the package's actual export and fix the dynamic import in `VisualizerSettings.tsx` at the `handleFiles` function.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/player/visualizer/VisualizerView.tsx
git commit -m "feat(visualizer): add fullscreen modes, new visualizer types, and type popover"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Fullscreen (immersive portal + browser API) ✓ | Custom preset upload (IndexedDB + milkdrop-preset-utils) ✓ | Spectrogram ✓ | Oscilloscope ✓ | VU Meter ✓ | Monitoring layout ✓ | Type popover ✓
- [x] **No placeholders:** All steps have concrete code
- [x] **Type consistency:** `updateSpectrogram`, `updateOscilloscope`, `updateVuMeter` defined in Task 1 and consumed in Tasks 8 and 9 | `addCachedPreset`/`removeCachedPreset` defined in Task 7, imported in Task 8 | `SpectrogramSettings`, `OscilloscopeSettings`, `VuMeterSettings` defined in Task 1, used in Tasks 3–9
- [x] **Optimization constraints:** Pre-allocated buffers (`new Float32Array(...)` outside RAF) ✓ | `document.hidden` check in all RAF loops ✓ | `drawImage(canvas, -1, 0)` for spectrogram scroll ✓ | No allocation inside RAF ✓ | `ResizeObserver` in all canvas components ✓ | `imageSmoothingEnabled = false` on spectrogram ✓
- [x] **Stereo VU Meter:** Both bars mirror mono signal, labeled L/R — documented in spec as expected behaviour ✓
