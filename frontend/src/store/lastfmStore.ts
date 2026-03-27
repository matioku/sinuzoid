import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LastFmState {
  sessionKey: string | null;
  username: string | null;
  scrobblingEnabled: boolean;
  nowPlayingEnabled: boolean;
  scrobbleThreshold: number; // 0.5–1.0, fraction of track duration
  setSession: (key: string, username: string) => void;
  clearSession: () => void;
  setScrobblingEnabled: (enabled: boolean) => void;
  setNowPlayingEnabled: (enabled: boolean) => void;
  setScrobbleThreshold: (value: number) => void;
}

export const useLastFmStore = create<LastFmState>()(
  persist(
    (set) => ({
      sessionKey: null,
      username: null,
      scrobblingEnabled: true,
      nowPlayingEnabled: true,
      scrobbleThreshold: 0.5,
      setSession: (key, username) => set({ sessionKey: key, username }),
      clearSession: () => set({ sessionKey: null, username: null }),
      setScrobblingEnabled: (enabled) => set({ scrobblingEnabled: enabled }),
      setNowPlayingEnabled: (enabled) => set({ nowPlayingEnabled: enabled }),
      setScrobbleThreshold: (value) => set({ scrobbleThreshold: Math.min(1, Math.max(0.5, value)) }),
    }),
    {
      name: 'lastfm-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
