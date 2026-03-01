import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { FiRefreshCw, FiSearch, FiGrid, FiList, FiPlay, FiPause, FiShuffle } from 'react-icons/fi';
import { Track } from '../hooks/useTracks';
import { useMusicData, useMusicUtils, useMusicImages } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { usePlaylistData } from '../hooks/usePlaylist';
import { DownloadIconButton } from '../components/DownloadButton';
import { TrackMenu } from '../components/tracks';
import LogoIcon from '../assets/logos/logo_sinuzoid-cyan.svg?react';

// ── Track row ─────────────────────────────────────────────────────────────────
const TrackRow: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const { getThumbnailUrl } = useMusicImages();
  const { toggleTrack, isCurrentTrack, isTrackPlaying } = useAudioPlayer();
  const isCurrent = isCurrentTrack(track.id);
  const isPlaying = isTrackPlaying(track.id);
  const { formatDuration: fmtDur } = useMusicUtils();

  useEffect(() => {
    if (!track.cover_thumbnail_path) return;
    let alive = true;
    getThumbnailUrl(track.cover_thumbnail_path).then(u => { if (alive) setCover(u); });
    return () => { alive = false; };
  }, [track.cover_thumbnail_path]);

  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
  const artist = track.metadata?.artist;
  const album = track.metadata?.album;
  const dur = fmtDur(track.duration);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => toggleTrack(track)}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 44px 1fr 1fr 80px 40px',
        alignItems: 'center',
        gap: 12,
        padding: '6px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isCurrent ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      {/* # / play indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk, monospace', fontSize: 13, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)' }}>
        {hovered || isPlaying
          ? (isPlaying
              ? <FiPause size={14} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} />
              : <FiPlay size={14} style={{ color: 'var(--text-primary)', marginLeft: 2 }} />)
          : (isCurrent ? <span style={{ color: 'var(--accent)' }}>♪</span> : index + 1)}
      </div>

      {/* Thumbnail */}
      <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogoIcon style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
            </div>
        }
      </div>

      {/* Title + artist */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
        {artist && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{artist}</div>}
      </div>

      {/* Album */}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album || '—'}</div>

      {/* Duration */}
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', textAlign: 'right' }}>{dur || '—'}</div>

      {/* Menu */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TrackMenu track={track} />
      </div>
    </div>
  );
};

// ── Album card ─────────────────────────────────────────────────────────────────
const AlbumThumb: React.FC<{ album: any; onPlay: () => void; onClick: () => void }> = ({ album, onPlay, onClick }) => {
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
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-overlay)', marginBottom: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {cover
            ? <img src={cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                <LogoIcon style={{ width: '40%', height: '40%', color: 'var(--accent)' }} />
              </div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              onClick={e => { e.stopPropagation(); onPlay(); }}
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-glow)' }}
            >
              <FiPlay size={18} style={{ color: '#000', marginLeft: 2 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{album.artist || 'Unknown'} · {album.tracks.length} tracks</div>
    </div>
  );
};

// ── Library page ──────────────────────────────────────────────────────────────
const Library: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tracks, albums, isLoading, error, refetch } = useMusicData();
  const { playlists } = usePlaylistData();
  const { formatFileSize: _fmtSize } = useMusicUtils();
  const { toggleTrack, playAlbum } = useAudioPlayer();

  const [viewMode, setViewMode] = useState<'albums' | 'tracks'>('albums');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('album');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'tracks' || view === 'albums') setViewMode(view);
    const search = params.get('search');
    if (search) setSearchQuery(search);
    const sort = params.get('sort');
    if (sort) setSortBy(sort);
  }, [location.search]);

  useEffect(() => {
    if (location.state) {
      const { searchQuery: q, viewMode: v } = location.state as any;
      if (q) setSearchQuery(q);
      if (v) setViewMode(v);
    }
  }, [location.state]);

  const filtered = useMemo(() => {
    let filteredTracks = tracks;
    let filteredAlbums = albums;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredTracks = tracks.filter(t =>
        t.original_filename.toLowerCase().includes(q) ||
        t.metadata?.title?.toLowerCase().includes(q) ||
        t.metadata?.artist?.toLowerCase().includes(q) ||
        t.metadata?.album?.toLowerCase().includes(q)
      );
      filteredAlbums = albums.map(a => ({ ...a, tracks: a.tracks.filter(t =>
        t.original_filename.toLowerCase().includes(q) ||
        t.metadata?.title?.toLowerCase().includes(q) ||
        t.metadata?.artist?.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      )})).filter(a => a.tracks.length > 0);
    }
    switch (sortBy) {
      case 'artist':
        filteredTracks = [...filteredTracks].sort((a, b) => (a.metadata?.artist || '').localeCompare(b.metadata?.artist || ''));
        filteredAlbums = [...filteredAlbums].sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        break;
      case 'year':
        filteredTracks = [...filteredTracks].sort((a, b) => (b.metadata?.year || 0) - (a.metadata?.year || 0));
        filteredAlbums = [...filteredAlbums].sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case 'recent':
        filteredTracks = [...filteredTracks].sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
        break;
      case 'name':
        filteredTracks = [...filteredTracks].sort((a, b) => (a.metadata?.title || a.original_filename).localeCompare(b.metadata?.title || b.original_filename));
        filteredAlbums = [...filteredAlbums].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return { tracks: filteredTracks, albums: filteredAlbums };
  }, [tracks, albums, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const totalAlbums = albums.filter(a => a.name !== 'Singles and miscellaneous tracks').length;
    return { totalAlbums };
  }, [albums]);

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 10, padding: '16px 20px', color: '#ff3b30', marginBottom: 16 }}>{error}</div>
        <button className="sz-btn sz-btn-secondary" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 0' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Library</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {tracks.length} tracks · {stats.totalAlbums} albums · {playlists.length} playlists
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="sz-btn sz-btn-ghost sz-btn-sm"
            onClick={() => { if (tracks.length > 0) { const t = [...tracks]; const r = t[Math.floor(Math.random() * t.length)]; toggleTrack(r); } }}
            title="Shuffle all"
          >
            <FiShuffle size={14} />
          </button>
          <DownloadIconButton variant="all" className="" />
          <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={refetch} disabled={isLoading} title="Refresh">
            <FiRefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            className="sz-input"
            style={{ paddingLeft: 36, width: '100%' }}
            placeholder="Search your library…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort */}
        <select
          className="sz-input"
          style={{ width: 'auto', paddingRight: 32, cursor: 'pointer', fontSize: 13 }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="album">Sort: Album</option>
          <option value="artist">Sort: Artist</option>
          <option value="name">Sort: Title</option>
          <option value="recent">Sort: Recent</option>
          <option value="year">Sort: Year</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['albums', 'tracks'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: viewMode === mode ? 'var(--bg-overlay)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              {mode === 'albums' ? <FiGrid size={13} /> : <FiList size={13} />}
              {mode === 'albums' ? 'Albums' : 'Tracks'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ paddingBottom: '100%', borderRadius: 10 }} />)}
        </div>
      )}

      {/* Albums grid */}
      {!isLoading && viewMode === 'albums' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {filtered.albums.length > 0
            ? filtered.albums.map(album => (
                <AlbumThumb
                  key={`${album.name}-${album.artist}`}
                  album={album}
                  onPlay={() => playAlbum(album, 0)}
                  onClick={() => navigate(`/album/${encodeURIComponent(album.name)}`)}
                />
              ))
            : <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No albums match your search.' : 'No albums yet. Upload some music to get started.'}
              </div>
          }
        </div>
      )}

      {/* Tracks table */}
      {!isLoading && viewMode === 'tracks' && (
        <div>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 44px 1fr 1fr 80px 40px',
            alignItems: 'center', gap: 12, padding: '0 16px 8px',
            borderBottom: '1px solid var(--border)', marginBottom: 4,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</span>
            <span />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Album</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Duration</span>
            <span />
          </div>

          {filtered.tracks.length > 0
            ? filtered.tracks.map((track, i) => <TrackRow key={track.id} track={track} index={i} />)
            : <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No tracks match your search.' : 'No tracks yet. Upload some music to get started.'}
              </div>
          }
        </div>
      )}
    </div>
  );
};

export default Library;
