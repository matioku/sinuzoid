import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioElement } from '../hooks/useAudioElement';
import { useMediaSession } from '../hooks/useMediaSession';

interface AudioContextType {
  isReady: boolean;
  seekTo: (time: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const { isReady, seekTo } = useAudioElement();
  useMediaSession(seekTo);

  return (
    <AudioContext.Provider value={{ isReady, seekTo }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};
