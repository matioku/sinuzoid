import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FiChevronDown,
  FiShuffle, FiSkipBack, FiSkipForward, FiRepeat,
  FiVolume2, FiVolumeX,
  FiMusic, FiInfo, FiList,
  FiLoader, FiPlay, FiPause,
} from 'react-icons/fi';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useAudioContext } from '../../contexts/AudioContext';
import { formatDuration } from '../../utils/formatters';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import { Scrubber } from './Scrubber';
import { Track } from '../../hooks/useTracks';
import LogoIcon from '../../assets/logos/logo_sinuzoid-cyan.svg?react';

type FSView = 'now-playing' | 'details' | 'queue';

interface FullscreenPlayerProps {
  open: boolean;
  onClose: () => void;
}

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({ open, onClose }) => {
  const [view, setView] = useState<FSView>('now-playing');

  const {
    currentTrack, isPlaying, isLoading, isShuffleOn, repeatMode,
    volume, isMuted, playlist, currentIndex,
    toggle, next, previous, toggleShuffle, toggleRepeat,
    setVolume, toggleMute, currentTime, duration, skipToTrack,
  } = useAudioPlayerStore();
  const { seekTo } = useAudioContext();

  // Derive large thumbnail path from small one (150 → 600px)
  const largeThumbnailPath = currentTrack?.cover_thumbnail_path
    ?.replace('_thumb_small.', '_thumb_large.');
  const largeCoverUrl = useCoverUrl(largeThumbnailPath || currentTrack?.cover_path);
  const ambientCoverUrl = useCoverUrl(currentTrack?.cover_thumbnail_path);

  const hasPlaylist = playlist.length > 0;
  const title = currentTrack?.metadata?.title || currentTrack?.original_filename?.replace(/\.[^/.]+$/, '') || '';
  const artist = currentTrack?.metadata?.artist || 'Unknown artist';
  const album = currentTrack?.metadata?.album;

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const content = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        transition: 'opacity 0.38s cubic-bezier(0.4, 0, 0.2, 1), transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        pointerEvents: open ? 'all' : 'none',
      }}
    >
      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div
        key={currentTrack?.id}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}
      >
        {/* Solid opaque base — always rendered first */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(155deg, #06061c 0%, #0d0527 28%, #050f1e 58%, #07070f 100%)',
        }} />
        {/* Ambient color from cover — layered on top of the solid base */}
        {ambientCoverUrl && (
          <img
            src={ambientCoverUrl}
            alt=""
            style={{
              position: 'absolute', inset: '-30%',
              width: '160%', height: '160%',
              objectFit: 'cover',
              filter: 'blur(90px) saturate(2.2)',
              opacity: 0.35,
              transform: 'scale(1.1)',
              animation: 'fsAmbientIn 1s ease forwards',
            }}
          />
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px 6px', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.65)',
              transition: 'background 0.15s ease, color 0.15s ease',
              flexShrink: 0,
            }}
            className="fs-close-btn"
          >
            <FiChevronDown size={20} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Space Grotesk, monospace', fontWeight: 600,
            }}>
              {view === 'now-playing' ? 'Now Playing' : view === 'details' ? 'Track Details' : 'Queue'}
            </div>
          </div>

          <div style={{ width: 36 }} />
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view === 'now-playing' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <NowPlayingView
                currentTrack={currentTrack}
                largeCoverUrl={largeCoverUrl}
                title={title} artist={artist} album={album ?? undefined}
                isPlaying={isPlaying} isLoading={isLoading}
                isShuffleOn={isShuffleOn} repeatMode={repeatMode}
                volume={volume} isMuted={isMuted} hasPlaylist={hasPlaylist}
                currentTime={currentTime} duration={duration}
                toggle={toggle} next={next} previous={previous}
                toggleShuffle={toggleShuffle} toggleRepeat={toggleRepeat}
                setVolume={setVolume} toggleMute={toggleMute} seekTo={seekTo}
              />
            </div>
          )}
          {view === 'details' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DetailsView
                currentTrack={currentTrack}
                largeCoverUrl={largeCoverUrl}
                title={title} artist={artist} album={album ?? undefined}
              />
            </div>
          )}
          {view === 'queue' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <QueueView
                playlist={playlist}
                currentIndex={currentIndex}
                skipToTrack={skipToTrack}
              />
            </div>
          )}
        </div>

        {/* Tab bar — transparent so it blends with the gradient background */}
        <div style={{
          flexShrink: 0,
          background: 'transparent',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 20px 16px',
          display: 'flex', justifyContent: 'center', gap: 6,
        }}>
          {(['now-playing', 'details', 'queue'] as FSView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? 'rgba(0,229,255,0.10)' : 'transparent',
                border: view === v ? '1px solid rgba(0,229,255,0.18)' : '1px solid transparent',
                borderRadius: 20, padding: '7px 22px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                color: view === v ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
                fontSize: 13, fontFamily: 'Manrope, sans-serif', fontWeight: 600,
                transition: 'all 0.2s ease', letterSpacing: '-0.01em',
              }}
            >
              {v === 'now-playing' && <FiMusic size={14} />}
              {v === 'details'     && <FiInfo size={14} />}
              {v === 'queue'       && <FiList size={14} />}
              {v === 'now-playing' ? 'Now Playing' : v === 'details' ? 'Details' : 'Queue'}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .fs-close-btn:hover { background: rgba(255,255,255,0.13) !important; color: #fff !important; }
        .fs-ctrl-btn:hover:not(:disabled) { color: #fff !important; background: rgba(255,255,255,0.08) !important; }
        .fs-play-btn:hover:not(:disabled) { transform: scale(1.06) !important; box-shadow: 0 0 40px rgba(255,255,255,0.22), 0 4px 20px rgba(0,0,0,0.5) !important; }
        .fs-queue-item:hover { background: rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

/* ── Now Playing view ─────────────────────────────────────────────────────── */

interface NowPlayingProps {
  currentTrack: Track | null;
  largeCoverUrl: string | null;
  title: string; artist: string; album?: string;
  isPlaying: boolean; isLoading: boolean;
  isShuffleOn: boolean; repeatMode: 'none' | 'track' | 'playlist';
  volume: number; isMuted: boolean; hasPlaylist: boolean;
  currentTime: number; duration: number;
  toggle: () => void; next: () => void; previous: () => void;
  toggleShuffle: () => void; toggleRepeat: () => void;
  setVolume: (v: number) => void; toggleMute: () => void;
  seekTo: (t: number) => void;
}

function NowPlayingView({
  currentTrack, largeCoverUrl, title, artist, album,
  isPlaying, isLoading, isShuffleOn, repeatMode,
  volume, isMuted, hasPlaylist, currentTime, duration,
  toggle, next, previous, toggleShuffle, toggleRepeat,
  setVolume, toggleMute, seekTo,
}: NowPlayingProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px 24px 24px', maxWidth: 520, margin: '0 auto', width: '100%',
    }}>
      {/* Cover art */}
      <div
        key={currentTrack?.id}
        style={{
          width: '100%', maxWidth: 300, aspectRatio: '1 / 1',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 28px 72px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.45)',
          background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginBottom: 32,
          animation: 'fsCoverIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {largeCoverUrl ? (
          <img src={largeCoverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <LogoIcon style={{ width: 80, height: 80, color: 'rgba(255,255,255,0.12)' }} />
        )}
      </div>

      {/* Track info */}
      <div style={{ textAlign: 'center', width: '100%', marginBottom: 28 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', color: '#fff',
          lineHeight: 1.2, margin: 0, marginBottom: 7,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title || '—'}
        </h2>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.62)', margin: 0,
          marginBottom: album ? 4 : 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {artist}
        </p>
        {album && (
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {album}
          </p>
        )}
      </div>

      {/* Scrubber */}
      <div style={{ width: '100%', marginBottom: 24 }}>
        <Scrubber currentTime={currentTime} duration={duration} onSeek={seekTo} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'Space Grotesk, monospace' }}>
            {formatDuration(currentTime)}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: 'Space Grotesk, monospace' }}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28 }}>
        <FSCtrlBtn onClick={toggleShuffle} active={isShuffleOn} title="Shuffle">
          <FiShuffle size={18} />
        </FSCtrlBtn>
        <FSCtrlBtn onClick={previous} disabled={!hasPlaylist} title="Previous">
          <FiSkipBack size={22} />
        </FSCtrlBtn>
        <FSPlayBtn
          onClick={toggle}
          disabled={!hasPlaylist || isLoading}
          isLoading={isLoading}
          isPlaying={isPlaying}
        />
        <FSCtrlBtn onClick={next} disabled={!hasPlaylist} title="Next">
          <FiSkipForward size={22} />
        </FSCtrlBtn>
        <FSCtrlBtn
          onClick={toggleRepeat}
          active={repeatMode !== 'none'}
          title={`Repeat: ${repeatMode}`}
        >
          <FiRepeat size={18} />
          {repeatMode === 'track' && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
            }} />
          )}
        </FSCtrlBtn>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 280 }}>
        <button
          onClick={toggleMute}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 4, flexShrink: 0,
          }}
        >
          {isMuted || volume === 0 ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
        </button>
        <input
          type="range" min="0" max="1" step="0.02"
          value={isMuted ? 0 : volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="sz-slider"
          style={{ flex: 1, '--slider-fill': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/* ── Details view ─────────────────────────────────────────────────────────── */

interface DetailsProps {
  currentTrack: Track | null;
  largeCoverUrl: string | null;
  title: string; artist: string; album?: string;
}

function DetailsView({ currentTrack, largeCoverUrl, title, artist, album }: DetailsProps) {
  if (!currentTrack) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
        No track playing
      </div>
    );
  }

  const { metadata, original_filename, file_size, file_type, duration, upload_date } = currentTrack;

  const trackMeta = [
    { label: 'Title',        value: metadata?.title || title },
    { label: 'Artist',       value: metadata?.artist || artist },
    { label: 'Album Artist', value: metadata?.albumartist && metadata.albumartist !== metadata?.artist ? metadata.albumartist : null },
    { label: 'Album',        value: album },
    { label: 'Year',         value: metadata?.year },
    { label: 'Genre',        value: metadata?.genre },
    { label: 'Track',        value: metadata?.track_number },
  ].filter(r => r.value != null && r.value !== '') as { label: string; value: string | number }[];

  const fileMeta = [
    { label: 'Duration', value: formatDuration(duration) },
    { label: 'Format',   value: (file_type?.split('/')[1] || file_type)?.toUpperCase() },
    { label: 'Size',     value: formatFileSize(file_size) },
    { label: 'Filename', value: original_filename },
    { label: 'Uploaded', value: formatDate(upload_date) },
  ].filter(r => r.value != null && r.value !== '') as { label: string; value: string }[];

  const standardKeys = new Set(['title', 'artist', 'albumartist', 'album', 'year', 'genre', 'track_number', 'duration']);
  const extended = metadata
    ? Object.entries(metadata).filter(([k, v]) => !standardKeys.has(k) && v != null && v !== '')
    : [];

  return (
    <div style={{
      display: 'flex', gap: 40, padding: '24px 40px 32px',
      maxWidth: 720, margin: '0 auto', width: '100%',
      flexWrap: 'wrap',
    }}>
      {/* Cover */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 200, height: 200, borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {largeCoverUrl ? (
            <img src={largeCoverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <LogoIcon style={{ width: 60, height: 60, color: 'rgba(255,255,255,0.12)' }} />
          )}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <MetaRows rows={trackMeta} />
        <Divider />
        <MetaRows rows={fileMeta} />
        {extended.length > 0 && (
          <>
            <Divider />
            <MetaRows rows={extended.map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: String(v) }))} />
          </>
        )}
      </div>
    </div>
  );
}

function MetaRows({ rows }: { rows: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            fontSize: 10, fontFamily: 'Space Grotesk, monospace',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.32)', minWidth: 76, flexShrink: 0, paddingTop: 2,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,0.82)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />;
}

/* ── Queue view ───────────────────────────────────────────────────────────── */

function QueueView({ playlist, currentIndex, skipToTrack }: {
  playlist: Track[];
  currentIndex: number;
  skipToTrack: (i: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll current track into view on open
  useEffect(() => {
    const el = containerRef.current;
    if (!el || currentIndex < 0) return;
    const item = el.children[currentIndex] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentIndex]);

  return (
    <div style={{ padding: '16px 24px 24px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 14, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', fontFamily: 'Space Grotesk, monospace' }}>
        {playlist.length} {playlist.length === 1 ? 'TRACK' : 'TRACKS'} IN QUEUE
      </div>
      <div ref={containerRef}>
        {playlist.map((track, i) => (
          <QueueItem
            key={track.id}
            track={track}
            index={i}
            isCurrent={i === currentIndex}
            onClick={() => skipToTrack(i)}
          />
        ))}
        {playlist.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.28)', fontSize: 14 }}>
            Queue is empty
          </div>
        )}
      </div>
    </div>
  );
}

function QueueItem({ track, index, isCurrent, onClick }: {
  track: Track; index: number; isCurrent: boolean; onClick: () => void;
}) {
  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
  const artist = track.metadata?.artist || 'Unknown artist';

  return (
    <div
      onClick={onClick}
      className="fs-queue-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: isCurrent ? 'rgba(0,229,255,0.07)' : 'transparent',
        border: isCurrent ? '1px solid rgba(0,229,255,0.12)' : '1px solid transparent',
        marginBottom: 2, transition: 'background 0.15s ease',
      }}
    >
      <div style={{
        width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: 'Space Grotesk, monospace',
        color: isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.28)', flexShrink: 0,
      }}>
        {isCurrent ? <FiPlay size={12} /> : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
          color: isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {artist}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'Space Grotesk, monospace', flexShrink: 0 }}>
        {formatDuration(track.duration)}
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────────────── */

function FSCtrlBtn({ children, onClick, disabled, active, title }: {
  children: React.ReactNode;
  onClick?: () => void; disabled?: boolean; active?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="fs-ctrl-btn"
      style={{
        background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: active ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
        opacity: disabled ? 0.35 : 1,
        padding: 10, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', transition: 'color 0.15s ease, background 0.15s ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function FSPlayBtn({ onClick, disabled, isLoading, isPlaying }: {
  onClick: () => void; disabled?: boolean; isLoading?: boolean; isPlaying: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="fs-play-btn"
      style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#fff', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: '0 0 30px rgba(255,255,255,0.18), 0 4px 16px rgba(0,0,0,0.45)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        color: '#0a0a1a', flexShrink: 0, margin: '0 6px',
      }}
    >
      {isLoading
        ? <FiLoader size={26} style={{ animation: 'spin 0.8s linear infinite' }} />
        : isPlaying
          ? <FiPause size={26} />
          : <FiPlay size={26} style={{ marginLeft: 3 }} />
      }
    </button>
  );
}
