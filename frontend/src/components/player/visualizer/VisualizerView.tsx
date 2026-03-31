import React, { useState, lazy, Suspense } from 'react';
import { FiSettings, FiLoader } from 'react-icons/fi';
import { useAudioContext } from '../../../contexts/AudioContext';
import { useVisualizerSettings } from './useVisualizerSettings';
import type { VisualizerType } from './useVisualizerSettings';
import LogoIcon from '../../../assets/logos/logo_sinuzoid-cyan.svg?react';

const ButterchurnVisualizer = lazy(() => import('./ButterchurnVisualizer'));
const AudioMotionVisualizer = lazy(() => import('./AudioMotionVisualizer'));
const VisualizerSettings = lazy(() => import('./VisualizerSettings'));

const VizLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.35)' }}>
    <FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
  </div>
);

const VisualizerView: React.FC = () => {
  const { analyserNode, webAudioCtx } = useAudioContext();
  const { settings, updateSettings, updateButterchurn, updateAudiomotion } = useVisualizerSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setActiveType = (type: VisualizerType) => updateSettings({ activeType: type });

  if (!analyserNode || !webAudioCtx) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 16, color: 'rgba(255,255,255,0.3)',
      }}>
        <LogoIcon style={{ width: 64, height: 64, opacity: 0.2 }} />
        <div style={{ fontSize: 14, fontFamily: 'Manrope, sans-serif' }}>
          Play a track to activate the visualizer
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Visualizer canvas area */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Suspense fallback={<VizLoader />}>
          {settings.activeType === 'butterchurn' ? (
            <ButterchurnVisualizer
              analyserNode={analyserNode}
              audioContext={webAudioCtx}
              presetName={settings.butterchurn.presetName}
              blendTime={settings.butterchurn.blendTime}
              randomCycle={settings.butterchurn.randomCycle}
              cycleInterval={settings.butterchurn.cycleInterval}
              onPresetChange={(name) => updateButterchurn({ presetName: name })}
            />
          ) : (
            <AudioMotionVisualizer
              analyserNode={analyserNode}
              audioContext={webAudioCtx}
              settings={settings.audiomotion}
            />
          )}
        </Suspense>
      </div>

      {/* Controls overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 5, pointerEvents: 'none',
      }}>
        {/* Type toggle */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(8,8,16,0.65)', backdropFilter: 'blur(12px)',
          borderRadius: 16, padding: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          pointerEvents: 'all',
        }}>
          <TypePill
            label="Milkdrop"
            active={settings.activeType === 'butterchurn'}
            onClick={() => setActiveType('butterchurn')}
          />
          <TypePill
            label="Spectrum"
            active={settings.activeType === 'audiomotion'}
            onClick={() => setActiveType('audiomotion')}
          />
        </div>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(prev => !prev)}
          style={{
            background: settingsOpen ? 'rgba(0,229,255,0.12)' : 'rgba(8,8,16,0.65)',
            backdropFilter: 'blur(12px)',
            border: settingsOpen ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: settingsOpen ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
            transition: 'all 0.2s ease',
            pointerEvents: 'all',
          }}
        >
          <FiSettings size={16} />
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <Suspense fallback={null}>
          <VisualizerSettings
            activeType={settings.activeType}
            butterchurnSettings={settings.butterchurn}
            audiomotionSettings={settings.audiomotion}
            onUpdateButterchurn={updateButterchurn}
            onUpdateAudiomotion={updateAudiomotion}
            onClose={() => setSettingsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

function TypePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
        border: 'none',
        borderRadius: 13,
        padding: '5px 14px',
        cursor: 'pointer',
        color: active ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
        fontSize: 12, fontWeight: 600, fontFamily: 'Manrope, sans-serif',
        letterSpacing: '-0.01em',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );
}

export default VisualizerView;
