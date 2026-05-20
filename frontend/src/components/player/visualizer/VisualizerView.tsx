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
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // -- Immersive portal -------------------------------------------------------
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

  // -- Normal layout ----------------------------------------------------------
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
