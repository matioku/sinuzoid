import React, { useMemo, useState, useEffect } from 'react';
import { FiClock, FiPlay } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { useMusicData, useMusicImages } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import LogoIcon from '../assets/logos/logo_sinuzoid-cyan.svg?react';

const AlbumThumb: React.FC<{ album: any; onClick: () => void; onPlay: () => void }> = ({ album, onClick, onPlay }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const { getThumbnailUrl } = useMusicImages();

  useEffect(() => {
    const path = album.cover_thumbnail_path || album.tracks[0]?.cover_thumbnail_path;
    if (!path) return;
    let alive = true;
    getThumbnailUrl(path).then(u => { if (alive) setCover(u); });
    return () => { alive = false; };
  }, [album]);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer' }} onClick={onClick}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-overlay)', marginBottom: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {cover ? <img src={cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.3s' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <LogoIcon style={{ width: '40%', height: '40%', color: 'var(--accent)' }} />
              </div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => { e.stopPropagation(); onPlay(); }} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <FiPlay size={18} style={{ color: '#000', marginLeft: 2 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
        {album.artist || 'Unknown'} · {album.tracks.length} tracks
      </div>
    </div>
  );
};

const RecentlyAdded: React.FC = () => {
  const navigate = useNavigate();
  const { albums, tracks, isLoading } = useMusicData();
  const { playAlbum } = useAudioPlayer();

  const recentAlbums = useMemo(() =>
    [...albums]
      .filter(a => a.name !== 'Singles and miscellaneous tracks')
      .sort((a, b) => {
        const latestA = Math.max(...a.tracks.map(t => new Date(t.upload_date).getTime()));
        const latestB = Math.max(...b.tracks.map(t => new Date(t.upload_date).getTime()));
        return latestB - latestA;
      })
      .slice(0, 20),
  [albums]);

  return (
    <div style={{ padding: '32px 32px 0' }} className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiClock size={26} style={{ color: 'var(--accent)' }} />
          Recently Added
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Your latest music, freshest first</p>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ paddingBottom: '100%', borderRadius: 10 }} />)}
        </div>
      )}

      {!isLoading && recentAlbums.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="section-header">
            <h2 className="section-title">Recent Albums</h2>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{recentAlbums.length} albums</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
            {recentAlbums.map(album => (
              <AlbumThumb
                key={`${album.name}-${album.artist}`}
                album={album}
                onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                onPlay={() => playAlbum(album, 0)}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <LogoIcon style={{ width: 48, height: 48, color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Nothing here yet</h3>
          <p style={{ fontSize: 14 }}>Upload music to see it here.</p>
        </div>
      )}
    </div>
  );
};

export default RecentlyAdded;
