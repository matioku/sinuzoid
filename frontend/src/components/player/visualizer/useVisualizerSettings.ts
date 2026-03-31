import { useState, useEffect, useCallback } from 'react';

export type VisualizerType = 'butterchurn' | 'audiomotion';

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
  cycleInterval: number; // seconds
}

export interface VisualizerSettings {
  activeType: VisualizerType;
  butterchurn: ButterchurnSettings;
  audiomotion: AudioMotionSettings;
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
};

export const AUDIOMOTION_PRESETS: Record<string, Partial<AudioMotionSettings>> = {
  spectrum: {
    mode: 3,
    barSpace: 0.2,
    ledBars: false,
    lumiBars: false,
    reflexRatio: 0.3,
    reflexAlpha: 0.15,
    showPeaks: true,
    smoothing: 0.7,
  },
  'led-matrix': {
    mode: 3,
    barSpace: 0.5,
    ledBars: true,
    lumiBars: false,
    reflexRatio: 0,
    reflexAlpha: 0,
    showPeaks: true,
    smoothing: 0.65,
  },
  'mirror-reflex': {
    mode: 10,
    barSpace: 0.1,
    ledBars: false,
    lumiBars: true,
    reflexRatio: 0.5,
    reflexAlpha: 0.25,
    showPeaks: false,
    smoothing: 0.8,
  },
  minimal: {
    mode: 6,
    barSpace: 0.3,
    ledBars: false,
    lumiBars: false,
    reflexRatio: 0,
    reflexAlpha: 0,
    showPeaks: false,
    smoothing: 0.85,
  },
};

function loadSettings(): VisualizerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed, butterchurn: { ...defaults.butterchurn, ...parsed.butterchurn }, audiomotion: { ...defaults.audiomotion, ...parsed.audiomotion } };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveSettings(settings: VisualizerSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function useVisualizerSettings() {
  const [settings, setSettingsState] = useState<VisualizerSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<VisualizerSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }));
  }, []);

  const updateButterchurn = useCallback((partial: Partial<ButterchurnSettings>) => {
    setSettingsState(prev => ({
      ...prev,
      butterchurn: { ...prev.butterchurn, ...partial },
    }));
  }, []);

  const updateAudiomotion = useCallback((partial: Partial<AudioMotionSettings>) => {
    setSettingsState(prev => ({
      ...prev,
      audiomotion: { ...prev.audiomotion, ...partial },
    }));
  }, []);

  return { settings, updateSettings, updateButterchurn, updateAudiomotion };
}
