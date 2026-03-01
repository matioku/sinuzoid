import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FiUpload, FiMusic, FiList, FiClock, FiPlay } from 'react-icons/fi';
import SinuzoidLogo from '../assets/logos/logo_sinuzoid-cyan.svg?react';
import { useTracks, Track, Album } from '../hooks/useTracks';
import { useAuth } from '../contexts/AuthContext';
import { useMusicImages } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

function useCoverBlob(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const { getThumbnailUrl } = useMusicImages();
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let alive = true;
    getThumbnailUrl(path).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path]);
  return url;
}

/* ── Track card ────────────────────────────────────────────────────────── */
const TrackCard: React.FC<{ track: Track }> = ({ track }) => {
  const cover = useCoverBlob(track.cover_thumbnail_path);
  const { toggleTrack, isCurrentTrack, isPlaying } = useAudioPlayer();
  const playing = isCurrentTrack(track.id) && isPlaying;
  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
  const artist = track.metadata?.artist || 'Unknown artist';

  return (
    <div
      onClick={() => toggleTrack(track)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: playing ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        border: `1px solid ${playing ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
        transition: 'all 0.15s ease',
      }}
      className="home-track-card"
    >
      <div style={{
        width: 44, height: 44, borderRadius: 6, flexShrink: 0,
        background: 'var(--bg-overlay)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {cover ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <SinuzoidLogo style={{ width: 20, height: 20, color: 'var(--text-tertiary)' }} />}
        {playing && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,229,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiPlay size={14} style={{ color: 'var(--accent)' }} />
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: playing ? 'var(--accent)' : 'var(--text-primary)',
        }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{artist}</div>
      </div>
      <style>{`.home-track-card:hover { background: var(--bg-overlay) !important; border-color: var(--border-light) !important; }`}</style>
    </div>
  );
};

/* ── Album card ────────────────────────────────────────────────────────── */
const AlbumCard: React.FC<{ album: Album }> = ({ album }) => {
  const cover = useCoverBlob(album.cover_thumbnail_path);
  const navigate = useNavigate();
  const { playAlbum } = useAudioPlayer();

  return (
    <div
      style={{ cursor: 'pointer', flex: '0 0 160px' }}
      onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
      className="album-thumb-card"
    >
      <div style={{
        width: 160, height: 160, borderRadius: 10, overflow: 'hidden',
        background: 'var(--bg-overlay)', marginBottom: 10, position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        {cover
          ? <img src={cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
              <SinuzoidLogo style={{ width: 48, height: 48, color: 'var(--accent)' }} />
            </div>
        }
        <div
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s ease',
          }}
          className="album-play-overlay"
          onClick={e => { e.stopPropagation(); playAlbum(album, 0); }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--accent-glow)',
          }}>
            <FiPlay size={18} style={{ color: '#000', marginLeft: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
        {album.artist || 'Unknown'} · {album.tracks.length} tracks
      </div>
      <style>{`
        .album-thumb-card:hover .album-play-overlay { opacity: 1 !important; }
        .album-thumb-card:hover > div:first-child { transform: translateY(-2px); transition: transform 0.2s ease; }
      `}</style>
    </div>
  );
};

/* ── Quick action ──────────────────────────────────────────────────────── */
const QuickAction: React.FC<{ icon: React.ReactNode; label: string; to: string; accent?: string }> = ({ icon, label, to, accent }) => (
  <Link
    to={to}
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 10,
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      textDecoration: 'none', color: 'var(--text-primary)',
      fontSize: 14, fontWeight: 600,
      transition: 'all 0.15s ease',
    }}
    className="quick-action"
  >
    <span style={{ color: accent || 'var(--accent)', display: 'flex' }}>{icon}</span>
    {label}
    <style>{`.quick-action:hover { background: var(--bg-overlay) !important; border-color: var(--border-light) !important; transform: translateX(2px); }`}</style>
  </Link>
);

/* ── Home page ─────────────────────────────────────────────────────────── */
const Home: React.FC = () => {
  const { tracks, albums, isLoading } = useTracks();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [featuredAlbums, setFeaturedAlbums] = useState<Album[]>([]);

  useEffect(() => {
    if (tracks.length > 0) {
      setRecentTracks([...tracks].sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()).slice(0, 8));
    }
    if (albums.length > 0) {
      setFeaturedAlbums(albums.slice(0, 10));
    }
  }, [tracks, albums]);

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 32, textAlign: 'center' }}>
        <SinuzoidLogo style={{ width: 64, height: 64, color: 'var(--accent)', marginBottom: 24 }} />
        <h1 style={{ fontSize: 40, fontWeight: 200, letterSpacing: '-0.03em', marginBottom: 12 }}>
          Welcome to <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Sinuzoid</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 400 }}>
          Your self-hosted music streaming platform. Upload, organize, and stream your collection.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="sz-btn sz-btn-primary sz-btn-lg" onClick={() => navigate('/register')}>Get started</button>
          <button className="sz-btn sz-btn-secondary sz-btn-lg" onClick={() => navigate('/login')}>Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 0' }} className="fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Good {getGreeting()}, <span style={{ color: 'var(--accent)' }}>{user.username}</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 6 }}>
          {tracks.length > 0 ? `${tracks.length} tracks · ${albums.length} albums in your library` : 'Your library is empty — start uploading music'}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 48 }}>
        <QuickAction icon={<FiUpload size={16} />} label="Upload music" to="/upload" accent="var(--accent)" />
        <QuickAction icon={<FiMusic size={16} />} label="Library" to="/library" accent="#ff9f0a" />
        <QuickAction icon={<FiList size={16} />} label="Playlists" to="/playlists" accent="#bf5af2" />
        <QuickAction icon={<FiClock size={16} />} label="Recently added" to="/recently-added" accent="#30d158" />
      </div>

      {isLoading && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 48, overflow: 'hidden' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ width: 160, height: 200, flexShrink: 0 }} />)}
        </div>
      )}

      {/* Recently added tracks */}
      {recentTracks.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="section-header">
            <h2 className="section-title">Recently Added</h2>
            <Link to="/recently-added" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>See all</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {recentTracks.slice(0, 8).map(track => <TrackCard key={track.id} track={track} />)}
          </div>
        </section>
      )}

      {/* Albums */}
      {featuredAlbums.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div className="section-header">
            <h2 className="section-title">Your Albums</h2>
            <Link to="/library" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>See all</Link>
          </div>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {featuredAlbums.map(album => <AlbumCard key={album.name} album={album} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tracks.length === 0 && !isLoading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '64px 32px', textAlign: 'center',
          border: '1px dashed var(--border-light)', borderRadius: 16, marginBottom: 48,
        }}>
          <SinuzoidLogo style={{ width: 48, height: 48, color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your library is empty</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 340 }}>
            Upload your music files to get started. Supports MP3, FLAC, WAV, M4A, and more.
          </p>
          <button className="sz-btn sz-btn-primary" onClick={() => navigate('/upload')}>
            <FiUpload size={14} /> Upload music
          </button>
        </div>
      )}
    </div>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export default Home;

