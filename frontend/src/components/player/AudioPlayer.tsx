import React, { useState, useEffect } from 'react';
import {
  FiPlay, FiPause, FiSkipBack, FiSkipForward,
  FiShuffle, FiRepeat, FiVolume2, FiVolumeX, FiLoader
} from 'react-icons/fi';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useAudioContext } from '../../contexts/AudioContext';
import { formatDuration } from '../../utils/formatters';
import LogoIcon from '../../assets/logos/logo_sinuzoid-cyan.svg?react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AudioPlayerProps {
  variant?: 'bottom' | 'header' | 'mini' | 'full' | 'headerCompact' | 'mobile';
  className?: string;
}

function useCoverUrl(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let blobUrl: string | null = null;
    const token = sessionStorage.getItem('access_token');
    if (!token) return;
    const filename = path.split('/').pop();
    if (!filename) return;
    fetch(`${API_BASE_URL}/files/cover/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.ok ? r.blob() : null)
      .then(blob => { if (blob) { blobUrl = URL.createObjectURL(blob); setUrl(blobUrl); } })
      .catch(() => {});
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [path]);
  return url;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ variant = 'bottom', className = '' }) => {
  const {
    currentTrack, isPlaying, isLoading, isShuffleOn, repeatMode, volume, isMuted,
    playlist, toggle, next, previous, toggleShuffle, toggleRepeat, setVolume, toggleMute,
    currentTime, duration,
  } = useAudioPlayerStore();
  const { seekTo } = useAudioContext();
  const coverUrl = useCoverUrl(currentTrack?.cover_thumbnail_path);

  const hasPlaylist = playlist.length > 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * duration;
    seekTo(Math.max(0, Math.min(duration, newTime)));
  };

  const title = currentTrack?.metadata?.title || currentTrack?.original_filename?.replace(/\.[^/.]+$/, '') || '';
  const artist = currentTrack?.metadata?.artist || 'Unknown artist';

  // Legacy variants — kept for any remaining usage
  if (variant === 'mini' && !currentTrack) return null;
  if (variant !== 'bottom' && variant !== 'mobile') {
    // Fallback thin bar for old usages
    if (!currentTrack) return (
      <div className={`flex items-center justify-center text-sm ${className}`} style={{ color: 'var(--text-tertiary)' }}>
        No track playing
      </div>
    );
    return (
      <div className={`flex flex-col items-center gap-1 w-full ${className}`} style={{ color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <ControlBtn onClick={previous} disabled={!hasPlaylist}><FiSkipBack size={14} /></ControlBtn>
            <PlayBtn onClick={toggle} disabled={!hasPlaylist || isLoading} isLoading={isLoading} isPlaying={isPlaying} size={30} />
            <ControlBtn onClick={next} disabled={!hasPlaylist}><FiSkipForward size={14} /></ControlBtn>
          </div>
        </div>
        <ProgressBar progress={progress} onClick={handleProgressClick} />
      </div>
    );
  }

  // ── Bottom bar ─────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%',
      background: 'rgba(10,10,18,0.96)',
      backdropFilter: 'blur(30px)',
      borderTop: '1px solid var(--border-light)',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 1fr',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
    }} className={className}>
      {/* LEFT — track info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
          background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: currentTrack ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
        }}>
          {coverUrl ? (
            <img src={coverUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <LogoIcon style={{ width: 22, height: 22, color: 'var(--text-tertiary)' }} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: currentTrack ? 'var(--text-primary)' : 'var(--text-tertiary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {currentTrack ? title : 'Nothing playing'}
          </div>
          {currentTrack && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artist}
            </div>
          )}
        </div>
      </div>

      {/* CENTER — controls + progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ControlBtn
            onClick={toggleShuffle}
            active={isShuffleOn}
            title="Shuffle"
          >
            <FiShuffle size={14} />
          </ControlBtn>
          <ControlBtn onClick={previous} disabled={!hasPlaylist} title="Previous">
            <FiSkipBack size={16} />
          </ControlBtn>
          <PlayBtn onClick={toggle} disabled={!hasPlaylist || isLoading} isLoading={isLoading} isPlaying={isPlaying} size={36} />
          <ControlBtn onClick={next} disabled={!hasPlaylist} title="Next">
            <FiSkipForward size={16} />
          </ControlBtn>
          <ControlBtn
            onClick={toggleRepeat}
            active={repeatMode !== 'none'}
            title={`Repeat: ${repeatMode}`}
          >
            <FiRepeat size={14} />
            {repeatMode === 'track' && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--accent)',
              }} />
            )}
          </ControlBtn>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 420 }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', minWidth: 30, textAlign: 'right' }}>
            {formatDuration(currentTime)}
          </span>
          <div className="progress-bar-container" style={{ flex: 1 }} onClick={handleProgressClick}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', minWidth: 30 }}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT — volume */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <ControlBtn onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted || volume === 0 ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
        </ControlBtn>
        <div style={{ width: 80 }}>
          <input
            type="range" min="0" max="1" step="0.02"
            value={isMuted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="sz-slider"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Small helper components ─────────────────────────────────────────────── */
function ControlBtn({ children, onClick, disabled, active, title, style: extraStyle }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        opacity: disabled ? 0.35 : 1,
        padding: 6, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        transition: 'color 0.15s ease',
        ...extraStyle,
      }}
      className="control-btn"
    >
      {children}
      <style>{`.control-btn:hover:not(:disabled) { color: var(--text-primary) !important; background: var(--bg-hover) !important; }`}</style>
    </button>
  );
}

function PlayBtn({ onClick, disabled, isLoading, isPlaying, size }: {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isPlaying: boolean;
  size: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--accent)',
        border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        boxShadow: '0 0 16px var(--accent-glow)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        flexShrink: 0,
        color: '#000',
      }}
      className="play-btn"
    >
      {isLoading
        ? <FiLoader size={size * 0.44} style={{ animation: 'spin 0.8s linear infinite' }} />
        : isPlaying
          ? <FiPause size={size * 0.4} />
          : <FiPlay size={size * 0.4} style={{ marginLeft: 2 }} />
      }
      <style>{`
        .play-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 0 24px var(--accent-glow) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}

function ProgressBar({ progress, onClick }: { progress: number; onClick: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="progress-bar-container" style={{ width: '100%' }} onClick={onClick}>
      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}
