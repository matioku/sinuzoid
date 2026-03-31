import React, { useState } from 'react';
import { FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import type { VisualizerType, ButterchurnSettings, AudioMotionSettings } from './useVisualizerSettings';
import { AUDIOMOTION_PRESETS } from './useVisualizerSettings';
import { cachedPresetKeys } from './ButterchurnVisualizer';

interface Props {
  activeType: VisualizerType;
  butterchurnSettings: ButterchurnSettings;
  audiomotionSettings: AudioMotionSettings;
  onUpdateButterchurn: (partial: Partial<ButterchurnSettings>) => void;
  onUpdateAudiomotion: (partial: Partial<AudioMotionSettings>) => void;
  onClose: () => void;
}

const GRADIENT_OPTIONS = [
  { value: 'sinuzoid', label: 'Sinuzoid Cyan' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'classic', label: 'Classic' },
  { value: 'stealth', label: 'Stealth' },
  { value: 'orangered', label: 'Orange Red' },
  { value: 'prism', label: 'Prism' },
];

const MODE_OPTIONS = [
  { value: 0, label: 'Discrete' },
  { value: 1, label: '1/24 octave' },
  { value: 2, label: '1/12 octave' },
  { value: 3, label: '1/8 octave' },
  { value: 4, label: '1/6 octave' },
  { value: 5, label: '1/4 octave' },
  { value: 6, label: '1/3 octave' },
  { value: 8, label: 'Half octave' },
  { value: 10, label: 'Full octave' },
];

const VisualizerSettings: React.FC<Props> = ({
  activeType,
  butterchurnSettings,
  audiomotionSettings,
  onUpdateButterchurn,
  onUpdateAudiomotion,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 300, maxWidth: '85%',
        background: 'rgba(8,8,16,0.88)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        zIndex: 10,
        display: 'flex', flexDirection: 'column',
        animation: 'settingsPanelIn 0.25s ease forwards',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
          fontFamily: 'Space Grotesk, monospace',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          Settings
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}
        >
          <FiX size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {activeType === 'butterchurn' ? (
          <ButterchurnPanel
            settings={butterchurnSettings}
            onUpdate={onUpdateButterchurn}
          />
        ) : (
          <AudioMotionPanel
            settings={audiomotionSettings}
            onUpdate={onUpdateAudiomotion}
          />
        )}
      </div>

      <style>{`
        @keyframes settingsPanelIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* ── Butterchurn Panel ───────────────────────────────────────────────────── */

function ButterchurnPanel({ settings, onUpdate }: {
  settings: ButterchurnSettings;
  onUpdate: (p: Partial<ButterchurnSettings>) => void;
}) {
  const [search, setSearch] = useState('');
  const presetKeys = cachedPresetKeys || [];
  const filtered = search
    ? presetKeys.filter(k => k.toLowerCase().includes(search.toLowerCase()))
    : presetKeys;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Random cycle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SettingLabel>Random Cycle</SettingLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {settings.randomCycle && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Grotesk, monospace' }}>
              {settings.cycleInterval}s
            </span>
          )}
          <Toggle checked={settings.randomCycle} onChange={(v) => onUpdate({ randomCycle: v })} />
        </div>
      </div>

      {settings.randomCycle && (
        <SliderRow label="Cycle interval" value={settings.cycleInterval} min={10} max={120} step={5}
          format={(v) => `${v}s`}
          onChange={(v) => onUpdate({ cycleInterval: v })} />
      )}

      <SliderRow label="Blend time" value={settings.blendTime} min={0} max={5} step={0.5}
        format={(v) => `${v}s`}
        onChange={(v) => onUpdate({ blendTime: v })} />

      {/* Preset search */}
      <div>
        <SettingLabel>Preset</SettingLabel>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets..."
          style={{
            width: '100%', marginTop: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '7px 10px',
            color: '#fff', fontSize: 12, fontFamily: 'Manrope, sans-serif',
            outline: 'none',
          }}
        />
      </div>

      {/* Preset list */}
      <div style={{
        maxHeight: 280, overflowY: 'auto',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            No presets found
          </div>
        )}
        {filtered.map((key) => (
          <div
            key={key}
            onClick={() => onUpdate({ presetName: key })}
            style={{
              padding: '7px 10px',
              fontSize: 11, fontFamily: 'Manrope, sans-serif',
              color: key === settings.presetName ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
              background: key === settings.presetName ? 'rgba(0,229,255,0.06)' : 'transparent',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              transition: 'background 0.1s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AudioMotion Panel ───────────────────────────────────────────────────── */

function AudioMotionPanel({ settings, onUpdate }: {
  settings: AudioMotionSettings;
  onUpdate: (p: Partial<AudioMotionSettings>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyPreset = (name: string) => {
    const preset = AUDIOMOTION_PRESETS[name];
    if (preset) {
      onUpdate({ ...preset, presetName: name });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Presets */}
      <div>
        <SettingLabel>Preset</SettingLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.keys(AUDIOMOTION_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              style={{
                background: settings.presetName === name ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: settings.presetName === name ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '5px 12px',
                color: settings.presetName === name ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                fontSize: 11, fontWeight: 600, fontFamily: 'Manrope, sans-serif',
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {name.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Gradient */}
      <div>
        <SettingLabel>Gradient</SettingLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {GRADIENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ gradient: opt.value })}
              style={{
                background: settings.gradient === opt.value ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: settings.gradient === opt.value ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '5px 12px',
                color: settings.gradient === opt.value ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                fontSize: 11, fontWeight: 600, fontFamily: 'Manrope, sans-serif',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setAdvancedOpen(prev => !prev)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600,
          fontFamily: 'Space Grotesk, monospace',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          padding: '4px 0',
        }}
      >
        {advancedOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        Advanced
      </button>

      {advancedOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mode */}
          <div>
            <SettingLabel>Mode</SettingLabel>
            <select
              value={settings.mode}
              onChange={(e) => onUpdate({ mode: Number(e.target.value) })}
              style={{
                width: '100%', marginTop: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 10px',
                color: '#fff', fontSize: 12, fontFamily: 'Manrope, sans-serif',
                outline: 'none',
              }}
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ToggleRow label="LED bars" checked={settings.ledBars} onChange={(v) => onUpdate({ ledBars: v })} />
            <ToggleRow label="Lumi bars" checked={settings.lumiBars} onChange={(v) => onUpdate({ lumiBars: v })} />
            <ToggleRow label="Show peaks" checked={settings.showPeaks} onChange={(v) => onUpdate({ showPeaks: v })} />
          </div>

          {/* Sliders */}
          <SliderRow label="Bar spacing" value={settings.barSpace} min={0} max={1} step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdate({ barSpace: v })} />

          <SliderRow label="Smoothing" value={settings.smoothing} min={0} max={0.95} step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdate({ smoothing: v })} />

          <SliderRow label="Reflex ratio" value={settings.reflexRatio} min={0} max={0.6} step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdate({ reflexRatio: v })} />

          <SliderRow label="Reflex alpha" value={settings.reflexAlpha} min={0} max={1} step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => onUpdate({ reflexAlpha: v })} />
        </div>
      )}
    </div>
  );
}

/* ── Shared Controls ─────────────────────────────────────────────────────── */

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
      fontFamily: 'Space Grotesk, monospace',
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: 3,
        left: checked ? 19 : 3,
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SettingLabel>{label}</SettingLabel>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <SettingLabel>{label}</SettingLabel>
        <span style={{
          fontSize: 11, color: 'var(--accent)',
          fontFamily: 'Space Grotesk, monospace',
        }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sz-slider"
        style={{ width: '100%' }}
      />
    </div>
  );
}

export default VisualizerSettings;
