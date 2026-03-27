import { useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '../store/audioPlayerStore';
import { useLastFmStore } from '../store/lastfmStore';
import { updateNowPlaying, scrobble } from '../services/lastfmApi';
import { parseDurationSeconds } from '../utils/formatters';

const API_KEY = import.meta.env.VITE_LASTFM_API_KEY ?? '';
const SHARED_SECRET = import.meta.env.VITE_LASTFM_SHARED_SECRET ?? '';

export function useLastFm(): void {
  const { currentTrack, currentTime, isPlaying, duration } = useAudioPlayerStore();
  const { sessionKey, scrobblingEnabled, nowPlayingEnabled, scrobbleThreshold } = useLastFmStore();

  const trackStartTimeRef = useRef<number | null>(null);
  const scrobbledRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);

  // Effect 1: new track → update Now Playing + reset scrobble state
  useEffect(() => {
    if (!currentTrack || currentTrack.id === lastTrackIdRef.current) return;

    lastTrackIdRef.current = currentTrack.id;
    scrobbledRef.current = false;
    trackStartTimeRef.current = Math.floor(Date.now() / 1000);

    if (!sessionKey || !nowPlayingEnabled || !API_KEY) return;

    const artist = currentTrack.metadata?.artist ?? 'Unknown Artist';
    const track = currentTrack.metadata?.title
      ?? currentTrack.original_filename.replace(/\.[^/.]+$/, '');
    const album = currentTrack.metadata?.album ?? undefined;
    const durationSec = currentTrack.duration
      ? parseDurationSeconds(currentTrack.duration)
      : undefined;

    updateNowPlaying({ artist, track, album, duration: durationSec, apiKey: API_KEY, sessionKey, sharedSecret: SHARED_SECRET });
  }, [currentTrack?.id]);

  // Effect 2: scrobble when threshold reached
  useEffect(() => {
    if (!API_KEY || scrobbledRef.current) return;
    if (!currentTrack || !sessionKey || !scrobblingEnabled || !isPlaying) return;
    if (trackStartTimeRef.current === null) return;

    const durationSec = currentTrack.duration
      ? parseDurationSeconds(currentTrack.duration)
      : duration;

    if (!durationSec || durationSec < 30) return;

    const threshold = Math.min(durationSec * scrobbleThreshold, 240);
    if (currentTime < threshold) return;

    scrobbledRef.current = true;
    scrobble({
      artist: currentTrack.metadata?.artist ?? 'Unknown Artist',
      track: currentTrack.metadata?.title
        ?? currentTrack.original_filename.replace(/\.[^/.]+$/, ''),
      timestamp: trackStartTimeRef.current,
      album: currentTrack.metadata?.album ?? undefined,
      duration: Math.round(durationSec),
      apiKey: API_KEY,
      sessionKey,
      sharedSecret: SHARED_SECRET,
    });
  }, [currentTime]);
}
