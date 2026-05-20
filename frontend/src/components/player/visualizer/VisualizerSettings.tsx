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
        const name = file.name.replace(/\.json$/i, '');

        presetData = JSON.parse(text);

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
        <input ref={fileInputRef} type="file" accept=".json" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'Manrope, sans-serif' }}
        >
          {importing ? <FiLoader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiUpload size={12} />}
          {importing ? 'Importing…' : 'Import .json preset'}
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
