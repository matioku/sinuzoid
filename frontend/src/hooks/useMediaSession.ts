import { useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '../store/audioPlayerStore';

const SUPPORTED = typeof navigator !== 'undefined' && 'mediaSession' in navigator;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Integrates with the Web MediaSession API so the OS (e.g. KDE Plasma/MPRIS,
 * Windows, macOS) can display track metadata and control playback.
 *
 * @param seekTo - the seekTo function from useAudioElement (via AudioContext)
 */
export function useMediaSession(seekTo: (time: number) => void) {
  // Keep a stable ref so action handlers always call the latest seekTo
  const seekToRef = useRef(seekTo);
  seekToRef.current = seekTo;

  // Register action handlers once on mount
  useEffect(() => {
    if (!SUPPORTED) return;

    const store = () => useAudioPlayerStore.getState();

    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play',          () => store().play()],
      ['pause',         () => store().pause()],
      ['stop',          () => store().stop()],
      ['previoustrack', () => store().previous()],
      ['nexttrack',     () => store().next()],
      ['seekbackward',  (d) => {
        const s = store();
        seekToRef.current(Math.max(0, s.currentTime - ((d as MediaSessionActionDetails).seekOffset ?? 10)));
      }],
      ['seekforward',   (d) => {
        const s = store();
        seekToRef.current(Math.min(s.duration, s.currentTime + ((d as MediaSessionActionDetails).seekOffset ?? 10)));
      }],
      ['seekto',        (d) => {
        if ((d as MediaSessionActionDetails).seekTime != null) {
          seekToRef.current((d as MediaSessionActionDetails).seekTime!);
        }
      }],
    ];

    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    }

    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, []);

  // Update OS metadata whenever the track changes
  const { currentTrack, isPlaying, currentTime, duration } = useAudioPlayerStore();

  // Tracks the cover blob URL we created so we can revoke it on cleanup
  const coverBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SUPPORTED) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const title  = currentTrack.metadata?.title
      || currentTrack.original_filename?.replace(/\.[^/.]+$/, '')
      || '';
    const artist = currentTrack.metadata?.artist || 'Unknown artist';
    const album  = currentTrack.metadata?.album  || '';

    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork: [] });

    const smallPath = currentTrack.cover_thumbnail_path;
    if (!smallPath) return;

    const largePath = smallPath.replace('_thumb_small.', '_thumb_large.');
    const coverPath = largePath || smallPath;

    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const filename = coverPath.split('/').pop();
    if (!filename) return;

    let cancelled = false;

    fetch(`${API_BASE_URL}/files/cover/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.blob() : null))
      .then(blob => {
        if (!blob || cancelled || !SUPPORTED) return;
        // Revoke previous artwork blob URL
        if (coverBlobUrlRef.current) URL.revokeObjectURL(coverBlobUrlRef.current);
        const blobUrl = URL.createObjectURL(blob);
        coverBlobUrlRef.current = blobUrl;
        // Update the live metadata object with artwork
        if (navigator.mediaSession.metadata) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title, artist, album,
            artwork: [{ src: blobUrl, sizes: '600x600', type: 'image/webp' }],
          });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [currentTrack?.id]);

  // Sync playback state
  useEffect(() => {
    if (!SUPPORTED) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Sync position state (throttled to once per second)
  const lastPosUpdate = useRef(0);
  useEffect(() => {
    if (!SUPPORTED || duration <= 0) return;
    const now = Date.now();
    if (now - lastPosUpdate.current < 900) return;
    lastPosUpdate.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch {}
  }, [currentTime, duration]);
}
