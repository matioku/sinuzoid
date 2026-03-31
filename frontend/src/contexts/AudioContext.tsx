import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioElement } from '../hooks/useAudioElement';
import { useMediaSession } from '../hooks/useMediaSession';
import { useLastFm } from '../hooks/useLastFm';

interface AudioContextType {
  isReady: boolean;
  seekTo: (time: number) => void;
  analyserNode: AnalyserNode | null;
  webAudioCtx: AudioContext | null;
}

const AudioReactContext = createContext<AudioContextType | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const { isReady, seekTo, analyserNode, webAudioCtx } = useAudioElement();
  useMediaSession(seekTo);
  useLastFm();

  return (
    <AudioReactContext.Provider value={{ isReady, seekTo, analyserNode, webAudioCtx }}>
      {children}
    </AudioReactContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = useContext(AudioReactContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};
