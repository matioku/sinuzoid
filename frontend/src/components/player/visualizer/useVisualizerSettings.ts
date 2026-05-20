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
