# Visualizer — Fullscreen, Custom Presets & New Types

**Date:** 2026-05-20  
**Status:** Approved

## Scope

Four features added to the existing visualizer system in `frontend/src/components/player/visualizer/`:

1. Fullscreen mode (two mechanisms)
2. Custom MilkDrop preset upload (`.milk` + `.json`, stored in IndexedDB)
3. Three new canvas visualizers: Spectrogram, Oscilloscope, VU Meter
4. A combined Monitoring view

---

## 1. Architecture

### VisualizerType

```ts
type VisualizerType =
  | 'butterchurn'
  | 'audiomotion'
  | 'spectrogram'
  | 'oscilloscope'
  | 'vumeter'
  | 'monitoring';
```

### New files

```
frontend/src/components/player/visualizer/
├── SpectrogramVisualizer.tsx   (new)
├── OscilloscopeVisualizer.tsx  (new)
├── VuMeterVisualizer.tsx       (new)
├── MonitoringVisualizer.tsx    (new)
├── presetDb.ts                 (new — IndexedDB wrapper for custom presets)
├── VisualizerView.tsx          (modified)
├── VisualizerSettings.tsx      (modified)
└── useVisualizerSettings.ts    (modified)
```

### State

`useVisualizerSettings` gains settings structs for the 3 new types:

```ts
interface SpectrogramSettings {
  palette: 'magma' | 'viridis' | 'cyan';
  minHz: number;   // default 20
  maxHz: number;   // default 20000
  dbRange: number; // default 80 (dB)
}

interface OscilloscopeSettings {
  color: string;   // default '#00e5ff'
  lineWidth: number; // default 1.5
  zoom: number;    // samples displayed, default 2048
}

interface VuMeterSettings {
  falloffMs: number;   // default 300
  peakHoldMs: number;  // default 2000
  showRms: boolean;    // default true
}
```

Settings persisted in `localStorage` (same key `sinuzoid_visualizer`).

---

## 2. Fullscreen Mode

Two independent mechanisms, both controlled from `VisualizerView`.

### 2a — Immersive mode (UI hide)

- State: `immersive: boolean` local to `VisualizerView`
- When active: `VisualizerView` renders with `position: fixed, inset: 0, zIndex: 250` via a `createPortal` to `document.body`, covering the `FullscreenPlayer` tab bar and header
- On hover: a bottom bar fades in (title, play/pause, exit button)
- `Escape` key exits immersive mode
- Button: `FiMaximize` icon in the visualizer control overlay

### 2b — Browser Fullscreen API

- `containerRef.current.requestFullscreen()` on the visualizer root div
- `document.exitFullscreen()` on second click or `Escape`
- State tracked via `document.addEventListener('fullscreenchange')`
- Button: `FiMaximize2` icon (distinct from immersive)
- The two modes are cumulative (both can be active simultaneously)

---

## 3. Custom MilkDrop Presets

### Parsing

- **`.json`**: `JSON.parse()` directly — native butterchurn format
- **`.milk`**: dynamic `import('milkdrop-preset-utils')` (lazy, only loaded when a `.milk` file is detected) to convert to butterchurn JSON. Parse errors shown inline with a clear message.

### Storage — `presetDb.ts`

IndexedDB database `sinuzoid-presets`, object store `milkdrop-custom`:

```ts
savePreset(name: string, data: object): Promise<void>
loadAllPresets(): Promise<Record<string, object>>
deletePreset(name: string): Promise<void>
```

Custom presets are merged into `cachedPresets` at `ButterchurnVisualizer` init (after built-in presets load). They appear in the preset list under a "Custom" section above the built-ins, with a `✕` delete button per entry.

### UI in VisualizerSettings (Butterchurn panel)

- "Import preset" button → triggers hidden `<input type="file" accept=".milk,.json" multiple>`
- Inline spinner during parsing
- Inline error message on failure (red, below button)
- Custom presets section in preset list with separator + delete icons

---

## 4. New Visualizers

### Optimization constraints (all three)

- Typed arrays (`Float32Array` / `Uint8Array`) allocated once at init, reused every frame — no GC pressure in RAF loop
- `document.hidden` check in every RAF loop to skip frames when tab is backgrounded
- `fftSize` tuned per visualizer: Spectrogram → 2048, Oscilloscope → 1024, VU Meter → 256
- No object/array/closure allocation inside the RAF loop
- `ResizeObserver` for canvas resize (same pattern as `ButterchurnVisualizer`)

### SpectrogramVisualizer

2D scrolling waterfall: X = time (scrolls left), Y = frequency (bass bottom, treble top), color = intensity.

**Rendering:** Each frame, `ctx.drawImage(canvas, -1, 0)` scrolls existing pixels one pixel left (O(1)). A 1px-wide column is drawn on the right from `getByteFrequencyData`. Color mapped via a precomputed lookup table (256 entries) for the selected palette — computed once at init, not per frame.

`ctx.imageSmoothingEnabled = false` for pixel-perfect rendering.

Frequency range mapped logarithmically (matches human perception).

### OscilloscopeVisualizer

Waveform display from `getFloatTimeDomainData`.

**Zero-crossing trigger:** scan the buffer for a rising zero-crossing before drawing — stabilizes the waveform display. Single `lineTo` path per frame, no per-sample canvas state changes.

Style: thin line (configurable width), CRT-like glow achieved with a single `shadowBlur` pass (not multiple draw calls).

### VuMeterVisualizer

Two vertical bars (L/R). RMS computed from `getFloatTimeDomainData` buffer (sqrt of mean square over the frame). Peak hold: tracked in a ref, reset after `peakHoldMs`.

**Color zones:**
- Green: below -12 dBFS
- Yellow: -12 to -3 dBFS  
- Red: above -3 dBFS

Drawn as a single filled rect per channel (no per-pixel drawing). Graduation marks pre-computed at init.

**Stereo note:** `AnalyserNode` in the current project is mono. Both L/R bars display the same signal — they mirror each other. A `ChannelSplitterNode` is out of scope; the mirrored display is the expected behaviour for now.

### MonitoringVisualizer

Fixed layout: Spectrogram top (60% height), Oscilloscope + VU Meter side-by-side bottom (40% height). Renders all three sub-components, each with its own `<canvas>`. They share the same `AnalyserNode` prop.

No dedicated settings panel — each sub-component uses its own settings from `useVisualizerSettings`.

---

## 5. Type Selector UI

A **popover triggered by the active type button** replaces the current two-pill toggle.

- Single button in the overlay showing the active type name + icon
- Click opens a 2×3 grid popover (positioned below the button, auto-dismissed on outside click or type selection)
- Each cell: icon + label
- Icons: FiWind (Milkdrop), FiBarChart2 (Spectrum), FiGrid (Spectrogram), FiActivity (Oscilloscope), FiSliders (VU Meter), FiLayout (Monitoring)

---

## Out of Scope

- Server-side preset storage
- Stereo splitter (deferred — mono fallback is graceful)
- Preset export
- Custom color palette editor
