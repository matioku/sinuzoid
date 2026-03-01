import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FiArrowLeft, FiPlay, FiPause, FiShuffle, FiTrash2 } from 'react-icons/fi';
import { useMusicData, useMusicImages, useMusicUtils, useMusicDeletion } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { TrackMenu, DeleteAlbumModal } from '../components/tracks';
import LogoIcon from '../assets/logos/logo_sinuzoid-cyan.svg?react';

const Album: React.FC = () => {
  const { albumName } = useParams<{ albumName: string }>();
  const navigate = useNavigate();
  const { albums, isLoading } = useMusicData();
  const { getThumbnailUrl, getCoverUrl } = useMusicImages();
  const { formatDuration } = useMusicUtils();
  const { handleAlbumDeleted } = useMusicDeletion();
  const { playAlbum, toggleTrack, isCurrentTrack, isTrackPlaying } = useAudioPlayer();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [blurBg, setBlurBg] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  const album = useMemo(() => {
    if (!albumName) return null;
    return albums.find(a => a.name === decodeURIComponent(albumName)) || null;
  }, [albums, albumName]);

  useEffect(() => {
    const loadCover = async () => {
      if (!album) return;
      const originalCover = album.tracks.find(t => t.cover_path)?.cover_path;
      if (originalCover) {
        const url = await getCoverUrl(originalCover);
        if (url) { setCoverUrl(url); setBlurBg(url); return; }
      }
      if (album.cover_thumbnail_path) {
        const url = await getThumbnailUrl(album.cover_thumbnail_path);
        setCoverUrl(url);
        setBlurBg(url);
      }
    };
    loadCover();
  }, [album, getThumbnailUrl, getCoverUrl]);

  const albumStats = useMemo(() => {
    if (!album) return null;
    let totalSec = 0;
    album.tracks.forEach(t => {
      if (t.duration.startsWith('PT')) {
        const m = t.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
        if (m) totalSec += (parseInt(m[1]||'0')*3600) + (parseInt(m[2]||'0')*60) + Math.floor(parseFloat(m[3]||'0'));
      } else {
        const p = t.duration.split(':');
        if (p.length === 2) totalSec += parseInt(p[0])*60 + parseInt(p[1]);
        else if (p.length === 3) totalSec += parseInt(p[0])*3600 + parseInt(p[1])*60 + parseInt(p[2]);
      }
    });
    const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60);
    const dur = h > 0 ? `${h}h ${m}min` : `${m}min`;
    const codecs: Record<string, number> = {};
    album.tracks.forEach(t => { const c = t.file_type.toUpperCase(); codecs[c] = (codecs[c]||0)+1; });
    const mainCodec = Object.entries(codecs).sort(([,a],[,b])=>b-a)[0]?.[0];
    return { totalDuration: dur, trackCount: album.tracks.length, mainCodec };
  }, [album]);

  const handleShuffle = () => {
    if (!album) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    toggleTrack(shuffled[0]);
  };

  const handleDeleteSuccess = () => {
    handleAlbumDeleted(album!.name);
    navigate('/library');
  };

  // Loading
  if (isLoading && !album) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ display: 'flex', gap: 32 }}>
          <div className="skeleton" style={{ width: 240, height: 240, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, paddingTop: 16 }}>
            <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 4, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: '60%', height: 40, borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '30%', height: 20, borderRadius: 4, marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ width: 100, height: 40, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 100, height: 40, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <LogoIcon style={{ width: 48, height: 48, color: 'var(--text-tertiary)', marginBottom: 16 }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Album not found</h3>
        <button className="sz-btn sz-btn-ghost" onClick={() => navigate('/library')} style={{ marginTop: 8 }}>
          <FiArrowLeft size={14} /> Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Blurred background */}
      {blurBg && (
        <div style={{
          position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0, height: 360,
          backgroundImage: `url(${blurBg})`, backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px)', opacity: 0.18, zIndex: 0, pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Back */}
        <div style={{ padding: '24px 32px 0' }}>
          <button
            className="sz-btn sz-btn-ghost sz-btn-sm"
            onClick={() => navigate('/library')}
            style={{ marginBottom: 24 }}
          >
            <FiArrowLeft size={14} /> Library
          </button>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 32, padding: '0 32px 40px', alignItems: 'flex-end' }}>
          {/* Cover */}
          <div style={{
            width: 220, height: 220, flexShrink: 0, borderRadius: 12, overflow: 'hidden',
            background: 'var(--bg-overlay)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}>
            {coverUrl
              ? <img src={coverUrl} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                  <LogoIcon style={{ width: 80, height: 80, color: 'var(--accent)' }} />
                </div>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Album</div>
            <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {album.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{album.artist || 'Unknown artist'}</span>
              {album.year && <><span style={{ color: 'var(--text-tertiary)' }}>·</span><span>{album.year}</span></>}
              {albumStats && <>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span>{albumStats.trackCount} tracks</span>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span>{albumStats.totalDuration}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--bg-overlay)', borderRadius: 4, padding: '2px 7px', color: 'var(--accent)', border: '1px solid var(--accent-dim)', letterSpacing: '0.06em' }}>
                  {albumStats.mainCodec}
                </span>
              </>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sz-btn sz-btn-primary" onClick={() => playAlbum(album, 0)}>
                <FiPlay size={14} /> Play
              </button>
              <button className="sz-btn sz-btn-secondary" onClick={handleShuffle}>
                <FiShuffle size={14} /> Shuffle
              </button>
              {album.name !== 'Singles and miscellaneous tracks' && (
                <button
                  className="sz-btn sz-btn-ghost sz-btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                  style={{ color: '#ff453a', marginLeft: 4 }}
                  title="Delete album"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Track list */}
        <div style={{ padding: '0 32px 40px' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 80px 40px',
            gap: 12, padding: '0 16px 8px',
            borderBottom: '1px solid var(--border)', marginBottom: 4,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>#</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Duration</span>
            <span />
          </div>

          {album.tracks.map((track, index) => {
            const isCurrent = isCurrentTrack(track.id);
            const isPlaying = isTrackPlaying(track.id);
            const isHovered = hoveredTrack === track.id;
            const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');

            return (
              <div
                key={track.id}
                onMouseEnter={() => setHoveredTrack(track.id)}
                onMouseLeave={() => setHoveredTrack(null)}
                onClick={() => toggleTrack(track)}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 80px 40px',
                  gap: 12, padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                  background: isCurrent ? 'var(--accent-dim)' : isHovered ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'Space Grotesk, monospace', color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {isHovered || isPlaying
                    ? (isPlaying ? <FiPause size={13} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} /> : <FiPlay size={13} style={{ color: 'var(--text-primary)', marginLeft: 2 }} />)
                    : (isCurrent ? <span style={{ color: 'var(--accent)' }}>♪</span> : (track.metadata?.track_number || index + 1))
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{track.metadata?.artist || album.artist || 'Unknown'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
                  {formatDuration(track.duration)}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrackMenu track={track} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DeleteAlbumModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        album={album}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default Album;
