import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FiDisc, FiUser, FiList, FiSearch, FiEdit2, FiPlay,
  FiChevronDown, FiChevronRight, FiMusic,
} from 'react-icons/fi';
import { useMusicData, useMusicImages, useMusicUtils } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { Track } from '../hooks/useTracks';
import LogoIcon from '../assets/logos/logo_sinuzoid-cyan.svg?react';

// ── Completeness scoring ───────────────────────────────────────────────────────
const KEY_FIELDS = ['title', 'artist', 'album', 'genre', 'date'] as const;

function getCompleteness(track: Track): number {
  const md = track.metadata as Record<string, unknown> | undefined;
  const filled = KEY_FIELDS.filter(f => {
    const v = md?.[f];
    return v !== null && v !== undefined && String(v).trim() !== '';
  }).length;
  return Math.round((filled / KEY_FIELDS.length) * 100);
}

function completenessColor(pct: number): string {
  if (pct >= 80) return '#4ade80';
  if (pct >= 40) return '#facc15';
  return '#f87171';
}

const CompleteBadge: React.FC<{ pct: number; small?: boolean }> = ({ pct, small }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: small ? 3 : 4,
    padding: small ? '1px 6px' : '2px 8px',
    borderRadius: 20,
    background: `${completenessColor(pct)}1a`,
    border: `1px solid ${completenessColor(pct)}55`,
    fontSize: small ? 10 : 11, fontWeight: 700,
    color: completenessColor(pct),
    fontFamily: 'Space Grotesk, monospace',
  }}>
    <span style={{ width: small ? 6 : 7, height: small ? 6 : 7, borderRadius: '50%', background: completenessColor(pct), flexShrink: 0 }} />
    {pct}%
  </span>
);

// ── Track row ─────────────────────────────────────────────────────────────────
const MetaTrackRow: React.FC<{
  track: Track;
  index: number;
  showAlbum?: boolean;
  showArtist?: boolean;
}> = ({ track, index, showAlbum = true, showArtist = true }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const { getThumbnailUrl } = useMusicImages();
  const { formatDuration } = useMusicUtils();
  const { toggleTrack, isCurrentTrack, isTrackPlaying } = useAudioPlayer();
  const navigate = useNavigate();
  const isCurrent = isCurrentTrack(track.id);
  const isPlaying = isTrackPlaying(track.id);
  const pct = getCompleteness(track);
  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');

  useEffect(() => {
    if (!track.cover_thumbnail_path) return;
    let alive = true;
    getThumbnailUrl(track.cover_thumbnail_path).then(u => { if (alive) setCover(u); });
    return () => { alive = false; };
  }, [track.cover_thumbnail_path]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => toggleTrack(track)}
      style={{
        display: 'grid',
        gridTemplateColumns: `36px 36px 1fr ${showArtist ? '140px' : ''} ${showAlbum ? '140px' : ''} 60px 60px 32px`,
        alignItems: 'center', gap: 10, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
        background: isCurrent ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      {/* # */}
      <div style={{ textAlign: 'center', fontSize: 12, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
        {hovered || isPlaying
          ? (isPlaying ? <FiPlay size={12} style={{ color: 'var(--accent)' }} /> : <FiPlay size={12} style={{ color: 'var(--text-primary)', marginLeft: 1 }} />)
          : (isCurrent ? '♪' : index + 1)}
      </div>

      {/* Thumb */}
      <div style={{ width: 32, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogoIcon style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />
            </div>
        }
      </div>

      {/* Title */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
      </div>

      {/* Artist */}
      {showArtist && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.metadata?.artist || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unknown</span>}
        </div>
      )}

      {/* Album */}
      {showAlbum && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.metadata?.album || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unknown</span>}
        </div>
      )}

      {/* Duration */}
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', textAlign: 'right' }}>
        {formatDuration(track.duration)}
      </div>

      {/* Completeness */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompleteBadge pct={pct} small />
      </div>

      {/* Edit */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(`/track/${track.id}`)}
          title="Edit metadata"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 5, cursor: 'pointer',
            color: 'var(--accent)', opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          <FiEdit2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Expandable group ──────────────────────────────────────────────────────────
const ExpandableGroup: React.FC<{
  title: string;
  subtitle: string;
  avgPct: number;
  tracks: Track[];
  showArtist?: boolean;
  showAlbum?: boolean;
  coverPath?: string;
  isUnknown?: boolean;
}> = ({ title, subtitle, avgPct, tracks, showArtist = true, showAlbum = true, coverPath, isUnknown }) => {
  const [expanded, setExpanded] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const { getThumbnailUrl } = useMusicImages();
  const { playAlbum } = useAudioPlayer();

  useEffect(() => {
    if (!coverPath) return;
    let alive = true;
    getThumbnailUrl(coverPath).then(u => { if (alive) setCover(u); });
    return () => { alive = false; };
  }, [coverPath]);

  const fakeTracks = tracks.map((t, i) => ({ ...t, _idx: i }));

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', marginBottom: 8,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 16px', cursor: 'pointer',
          background: expanded ? 'var(--bg-overlay)' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        {/* Cover or icon */}
        <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
          {cover
            ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUnknown ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                {isUnknown
                  ? <FiMusic size={18} style={{ color: 'var(--text-tertiary)' }} />
                  : <LogoIcon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                }
              </div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14, fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: isUnknown ? 'var(--text-tertiary)' : 'var(--text-primary)',
              fontStyle: isUnknown ? 'italic' : 'normal',
            }}>{title}</span>
            <CompleteBadge pct={avgPct} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</div>
        </div>

        {/* Play + chevron */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {!isUnknown && (
            <button
              onClick={e => { e.stopPropagation(); playAlbum({ tracks, name: title } as any, 0); }}
              className="sz-btn sz-btn-ghost sz-btn-sm"
              style={{ opacity: 0.7 }}
              title="Play"
            >
              <FiPlay size={12} />
            </button>
          )}
          <div style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
            {expanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
          </div>
        </div>
      </div>

      {/* Tracks list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '6px 4px' }}>
          {fakeTracks.map((track, i) => (
            <MetaTrackRow key={track.id} track={track} index={i} showAlbum={showAlbum} showArtist={showArtist} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Album card grid (Album view) ──────────────────────────────────────────────
const AlbumCard: React.FC<{
  album: { name: string; artist?: string; tracks: Track[]; cover_thumbnail_path?: string };
  isUnknown?: boolean;
}> = ({ album, isUnknown }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { getThumbnailUrl } = useMusicImages();
  const { playAlbum } = useAudioPlayer();

  const avgPct = Math.round(album.tracks.reduce((s, t) => s + getCompleteness(t), 0) / album.tracks.length);

  const coverPath = album.cover_thumbnail_path || album.tracks.find(t => t.cover_thumbnail_path)?.cover_thumbnail_path;

  useEffect(() => {
    if (!coverPath) return;
    let alive = true;
    getThumbnailUrl(coverPath).then(u => { if (alive) setCover(u); });
    return () => { alive = false; };
  }, [coverPath]);

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Artwork */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-overlay)', marginBottom: 8, boxShadow: expanded ? '0 0 0 2px var(--accent)' : '0 4px 12px rgba(0,0,0,0.3)', transition: 'box-shadow 0.15s' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            {cover
              ? <img src={cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUnknown ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                  {isUnknown ? <FiMusic size={32} style={{ color: 'var(--text-tertiary)' }} /> : <LogoIcon style={{ width: '38%', height: '38%', color: 'var(--accent)' }} />}
                </div>
            }

            {/* Hover overlay with play */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!isUnknown && (
                <div
                  onClick={e => { e.stopPropagation(); playAlbum({ tracks: album.tracks, name: album.name } as any, 0); }}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--accent-glow)' }}
                >
                  <FiPlay size={16} style={{ color: '#000', marginLeft: 2 }} />
                </div>
              )}
            </div>

            {/* Completeness badge */}
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <CompleteBadge pct={avgPct} small />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isUnknown ? 'var(--text-tertiary)' : 'var(--text-primary)', fontStyle: isUnknown ? 'italic' : 'normal' }}>
          {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {album.artist || 'Unknown'} · {album.tracks.length} tracks
        </div>
      </div>

      {/* Expanded track list */}
      {expanded && (
        <div style={{ marginTop: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 4px', animation: 'fadeIn 0.15s ease' }}>
          {album.tracks.map((track, i) => (
            <MetaTrackRow key={track.id} track={track} index={i} showAlbum={false} showArtist />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
type ViewMode = 'album' | 'artist' | 'track';

const MetadataBrowser: React.FC = () => {
  const { tracks, albums, isLoading } = useMusicData();
  const [viewMode, setViewMode] = useState<ViewMode>('album');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(t =>
      t.metadata?.title?.toLowerCase().includes(q) ||
      t.metadata?.artist?.toLowerCase().includes(q) ||
      t.metadata?.album?.toLowerCase().includes(q) ||
      t.metadata?.genre?.toLowerCase().includes(q) ||
      t.original_filename.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const avgPct = tracks.length ? Math.round(tracks.reduce((s, t) => s + getCompleteness(t), 0) / tracks.length) : 0;
    const complete = tracks.filter(t => getCompleteness(t) === 100).length;
    const missing = tracks.filter(t => getCompleteness(t) === 0).length;
    return { avgPct, complete, missing };
  }, [tracks]);

  // Album data enriched with avg completeness
  const albumsData = useMemo(() => {
    return albums.map(a => ({
      ...a,
      avgPct: a.tracks.length ? Math.round(a.tracks.reduce((s, t) => s + getCompleteness(t), 0) / a.tracks.length) : 0,
    }));
  }, [albums]);

  // Artist groups
  const artistGroups = useMemo(() => {
    const map = new Map<string, Track[]>();
    filteredTracks.forEach(t => {
      const artist = t.metadata?.artist || '__unknown__';
      if (!map.has(artist)) map.set(artist, []);
      map.get(artist)!.push(t);
    });
    // Sort: known artists alphabetically, unknown last
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === '__unknown__') return 1;
        if (b === '__unknown__') return -1;
        return a.localeCompare(b);
      })
      .map(([artist, grpTracks]) => ({
        artist,
        isUnknown: artist === '__unknown__',
        tracks: grpTracks,
        avgPct: Math.round(grpTracks.reduce((s, t) => s + getCompleteness(t), 0) / grpTracks.length),
      }));
  }, [filteredTracks]);

  // Album groups filtered
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albumsData;
    const filteredIds = new Set(filteredTracks.map(t => t.id));
    return albumsData
      .map(a => ({ ...a, tracks: a.tracks.filter(t => filteredIds.has(t.id)) }))
      .filter(a => a.tracks.length > 0)
      .map(a => ({
        ...a,
        avgPct: Math.round(a.tracks.reduce((s, t) => s + getCompleteness(t), 0) / a.tracks.length),
      }));
  }, [albumsData, filteredTracks, searchQuery]);

  const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'album', label: 'Albums', icon: <FiDisc size={13} /> },
    { key: 'artist', label: 'Artists', icon: <FiUser size={13} /> },
    { key: 'track', label: 'Tracks', icon: <FiList size={13} /> },
  ];

  return (
    <div style={{ padding: '32px 32px 80px' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Metadata Browser</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {tracks.length} tracks · avg completeness&nbsp;
            <span style={{ color: completenessColor(stats.avgPct), fontWeight: 700 }}>{stats.avgPct}%</span>
            {stats.missing > 0 && <> · <span style={{ color: '#f87171' }}>{stats.missing} untagged</span></>}
          </p>
        </div>

        {/* Completeness overview pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Complete', pct: 100, count: stats.complete, color: '#4ade80' },
            { label: 'Partial', pct: 50, count: tracks.filter(t => { const p = getCompleteness(t); return p >= 40 && p < 80; }).length, color: '#facc15' },
            { label: 'Missing', pct: 0, count: stats.missing, color: '#f87171' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            className="sz-input"
            style={{ paddingLeft: 36, width: '100%' }}
            placeholder="Search tracks, artists, albums…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: viewMode === tab.key ? 'var(--bg-overlay)' : 'transparent',
                color: viewMode === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ paddingBottom: '100%', borderRadius: 10 }} />)}
        </div>
      )}

      {/* ── Album view ── */}
      {!isLoading && viewMode === 'album' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {filteredAlbums.length === 0
            ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No albums match your search.</div>
            : filteredAlbums.map(album => (
                <AlbumCard
                  key={album.name}
                  album={album}
                  isUnknown={album.name === 'Singles and miscellaneous tracks'}
                />
              ))
          }
        </div>
      )}

      {/* ── Artist view ── */}
      {!isLoading && viewMode === 'artist' && (
        <div>
          {artistGroups.length === 0
            ? <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No artists found.</div>
            : artistGroups.map(({ artist, isUnknown, tracks: grpTracks, avgPct }) => (
                <ExpandableGroup
                  key={artist}
                  title={isUnknown ? 'Unknown Artist' : artist}
                  subtitle={`${grpTracks.length} track${grpTracks.length !== 1 ? 's' : ''}`}
                  avgPct={avgPct}
                  tracks={grpTracks}
                  showArtist={false}
                  showAlbum
                  coverPath={grpTracks.find(t => t.cover_thumbnail_path)?.cover_thumbnail_path}
                  isUnknown={isUnknown}
                />
              ))
          }
        </div>
      )}

      {/* ── Track view ── */}
      {!isLoading && viewMode === 'track' && (
        <div>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 36px 1fr 140px 140px 60px 60px 32px',
            gap: 10, padding: '0 12px 8px',
            borderBottom: '1px solid var(--border)', marginBottom: 4,
          }}>
            {['#', '', 'Title', 'Artist', 'Album', 'Duration', 'Complete', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 5 ? 'right' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {filteredTracks.length === 0
            ? <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No tracks match your search.</div>
            : filteredTracks.map((track, i) => (
                <MetaTrackRow key={track.id} track={track} index={i} showAlbum showArtist />
              ))
          }
        </div>
      )}
    </div>
  );
};

export default MetadataBrowser;
