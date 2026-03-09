import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  FiDisc, FiUser, FiList, FiSearch, FiEdit2, FiPlay,
  FiChevronDown, FiChevronRight, FiMusic, FiCheckSquare,
  FiSquare, FiSave, FiAlertCircle, FiCheck, FiLoader,
  FiX, FiMinus,
} from 'react-icons/fi';
import { useMusicData, useMusicImages, useMusicUtils } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { Track } from '../hooks/useTracks';
import { metadataApi, MetadataUpdate } from '../services/metadataApi';
import { useMusicStore } from '../store/musicStore';
import LogoIcon from '../assets/logos/logo_sinuzoid-cyan.svg?react';

// ── Completeness ──────────────────────────────────────────────────────────────
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
    padding: small ? '1px 6px' : '2px 8px', borderRadius: 20,
    background: `${completenessColor(pct)}1a`,
    border: `1px solid ${completenessColor(pct)}55`,
    fontSize: small ? 10 : 11, fontWeight: 700,
    color: completenessColor(pct), fontFamily: 'Space Grotesk, monospace',
  }}>
    <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: '50%', background: completenessColor(pct), flexShrink: 0 }} />
    {pct}%
  </span>
);

// ── Compact track row (for expanded album/artist sections) ─────────────────────
const CompactTrackRow: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
  const [hovered, setHovered] = useState(false);
  const { toggleTrack, isCurrentTrack, isTrackPlaying } = useAudioPlayer();
  const { formatDuration } = useMusicUtils();
  const navigate = useNavigate();
  const isCurrent = isCurrentTrack(track.id);
  const isPlaying = isTrackPlaying(track.id);
  const pct = getCompleteness(track);
  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
  const artist = track.metadata?.artist;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => toggleTrack(track)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
        background: isCurrent ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.1s ease',
      }}
    >
      {/* # */}
      <div style={{ width: 22, textAlign: 'center', fontSize: 12, flexShrink: 0, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
        {hovered || isPlaying
          ? <FiPlay size={11} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} />
          : (isCurrent ? '♪' : index + 1)}
      </div>

      {/* Title + artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
        {artist && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist}</div>}
      </div>

      {/* Duration */}
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', flexShrink: 0 }}>
        {formatDuration(track.duration)}
      </div>

      {/* Completeness */}
      <div style={{ flexShrink: 0 }}>
        <CompleteBadge pct={pct} small />
      </div>

      {/* Edit */}
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <button
          onClick={() => navigate(`/track/${track.id}`)}
          title="Edit metadata"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 5, cursor: 'pointer',
            color: 'var(--accent)', opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease',
          }}
        >
          <FiEdit2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Full-width track row (Track view) ─────────────────────────────────────────
const MetaTrackRow: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
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
        gridTemplateColumns: '36px 36px 1fr 150px 150px 70px 60px 32px',
        alignItems: 'center', gap: 10, padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
        background: isCurrent ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 12, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
        {hovered || isPlaying
          ? <FiPlay size={12} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} />
          : (isCurrent ? '♪' : index + 1)}
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogoIcon style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} /></div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.metadata?.artist || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unknown</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.metadata?.album || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unknown</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', textAlign: 'right' }}>{formatDuration(track.duration)}</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}><CompleteBadge pct={pct} small /></div>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(`/track/${track.id}`)}
          title="Edit metadata"
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 5, cursor: 'pointer',
            color: 'var(--accent)', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s ease',
          }}
        >
          <FiEdit2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Expandable group (Artist view) ────────────────────────────────────────────
const ExpandableGroup: React.FC<{
  title: string; subtitle: string; avgPct: number; tracks: Track[];
  coverPath?: string; isUnknown?: boolean;
}> = ({ title, subtitle, avgPct, tracks, coverPath, isUnknown }) => {
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

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer',
          background: expanded ? 'var(--bg-overlay)' : 'transparent', transition: 'background 0.12s',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
          {cover
            ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUnknown ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                {isUnknown ? <FiUser size={18} style={{ color: 'var(--text-tertiary)' }} /> : <LogoIcon style={{ width: 20, height: 20, color: 'var(--accent)' }} />}
              </div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isUnknown ? 'var(--text-tertiary)' : 'var(--text-primary)', fontStyle: isUnknown ? 'italic' : 'normal' }}>{title}</span>
            <CompleteBadge pct={avgPct} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {!isUnknown && (
            <button
              onClick={e => { e.stopPropagation(); playAlbum({ tracks, name: title } as any, 0); }}
              className="sz-btn sz-btn-ghost sz-btn-sm" style={{ opacity: 0.7 }} title="Play"
            ><FiPlay size={12} /></button>
          )}
          <div style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
            {expanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
          {tracks.map((track, i) => <CompactTrackRow key={track.id} track={track} index={i} />)}
        </div>
      )}
    </div>
  );
};

// ── Album panel track row (full-width, inside expanded album section) ─────────
const AlbumPanelTrackRow: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
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
        gridTemplateColumns: '36px 36px 1fr 150px 70px 60px 32px',
        alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 7, cursor: 'pointer',
        background: isCurrent ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 12, color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
        {hovered || isPlaying
          ? <FiPlay size={12} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} />
          : (isCurrent ? '♪' : (track.metadata?.track_number || index + 1))}
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
        {cover
          ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogoIcon style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} /></div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.metadata?.artist || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Unknown</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', textAlign: 'right' }}>{formatDuration(track.duration)}</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}><CompleteBadge pct={pct} small /></div>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(`/track/${track.id}`)}
          title="Edit metadata"
          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'var(--accent)', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s ease' }}
        ><FiEdit2 size={13} /></button>
      </div>
    </div>
  );
};

// ── Album card (Album view) ───────────────────────────────────────────────────
const AlbumCard: React.FC<{
  album: { name: string; artist?: string; tracks: Track[]; cover_thumbnail_path?: string };
  isUnknown?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}> = ({ album, isUnknown, isSelected, onSelect }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
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
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer' }} onClick={onSelect}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-overlay)', marginBottom: 8, boxShadow: isSelected ? '0 0 0 2px var(--accent), 0 4px 20px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)', transition: 'box-shadow 0.15s' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {cover
            ? <img src={cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUnknown ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                {isUnknown ? <FiMusic size={32} style={{ color: 'var(--text-tertiary)' }} /> : <LogoIcon style={{ width: '38%', height: '38%', color: 'var(--accent)' }} />}
              </div>}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!isUnknown && (
              <div onClick={e => { e.stopPropagation(); playAlbum({ tracks: album.tracks, name: album.name } as any, 0); }} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--accent-glow)' }}>
                <FiPlay size={16} style={{ color: '#000', marginLeft: 2 }} />
              </div>
            )}
          </div>
          <div style={{ position: 'absolute', top: 8, right: 8 }}><CompleteBadge pct={avgPct} small /></div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSelected ? 'var(--accent)' : isUnknown ? 'var(--text-tertiary)' : 'var(--text-primary)', fontStyle: isUnknown ? 'italic' : 'normal' }}>
        {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{album.artist || 'Unknown'} · {album.tracks.length} tracks</div>
    </div>
  );
};

// ── Batch edit ────────────────────────────────────────────────────────────────
type BatchStatus = 'idle' | 'saving' | 'done' | 'error';

const BATCH_FIELDS: { key: keyof MetadataUpdate; label: string; type?: 'number' | 'textarea' }[] = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'albumartist', label: 'Album Artist' },
  { key: 'date', label: 'Year / Date' },
  { key: 'genre', label: 'Genre' },
  { key: 'track', label: 'Track #' },
  { key: 'disc', label: 'Disc #' },
  { key: 'bpm', label: 'BPM', type: 'number' },
  { key: 'key', label: 'Key' },
  { key: 'remixer', label: 'Remixer' },
  { key: 'producer', label: 'Producer' },
  { key: 'label', label: 'Label' },
  { key: 'catalog_number', label: 'Catalog #' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'comment', label: 'Comment', type: 'textarea' },
];

// Get the value of a field across selected tracks for the placeholder
function getFieldValue(tracks: Track[], key: keyof MetadataUpdate): string {
  const values = tracks.map(t => {
    const md = t.metadata as Record<string, unknown> | undefined;
    const v = md?.[key];
    return v !== null && v !== undefined ? String(v) : '';
  });
  if (values.length === 0) return '';
  const first = values[0];
  return values.every(v => v === first) ? first : '';
}

function isMixed(tracks: Track[], key: keyof MetadataUpdate): boolean {
  const values = tracks.map(t => {
    const md = t.metadata as Record<string, unknown> | undefined;
    const v = md?.[key];
    return v !== null && v !== undefined ? String(v) : '';
  });
  if (values.length <= 1) return false;
  return !values.every(v => v === values[0]);
}

const BatchEditPanel: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
  const forceFetch = useMusicStore(s => s.forceFetch);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<BatchStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  // Reset form when selection changes
  useEffect(() => {
    setForm({});
    setStatus('idle');
    setErrors([]);
  }, [tracks.map(t => t.id).join(',')]);

  const handleSave = useCallback(async () => {
    // Build payload from non-empty form fields only
    const payload: MetadataUpdate = {};
    BATCH_FIELDS.forEach(({ key, type }) => {
      const v = form[key];
      if (v !== undefined && v !== '') {
        if (type === 'number') {
          const n = parseFloat(v);
          if (!isNaN(n)) (payload as Record<string, unknown>)[key] = n;
        } else {
          (payload as Record<string, unknown>)[key] = v;
        }
      }
    });

    if (Object.keys(payload).length === 0) return;

    setStatus('saving');
    setProgress(0);
    setErrors([]);
    const errs: string[] = [];
    let done = 0;

    for (const track of tracks) {
      try {
        await metadataApi.updateTrackMetadata(track.id, payload);
      } catch (e) {
        const title = track.metadata?.title || track.original_filename;
        errs.push(`${title}: ${(e as Error).message}`);
      }
      done++;
      setProgress(Math.round((done / tracks.length) * 100));
    }

    setSuccessCount(tracks.length - errs.length);
    setErrors(errs);
    setStatus(errs.length === 0 ? 'done' : 'error');
    await forceFetch();
  }, [form, tracks, forceFetch]);

  const filledFields = Object.values(form).filter(v => v !== '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          Editing {tracks.length} track{tracks.length !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {filledFields > 0
            ? <><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{filledFields} field{filledFields !== 1 ? 's' : ''}</span> will be applied to all selected tracks</>
            : 'Fill fields to apply to all selected tracks. Leave blank to keep existing values.'}
        </div>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BATCH_FIELDS.map(({ key, label, type }) => {
          const mixed = isMixed(tracks, key);
          const existingVal = getFieldValue(tracks, key);
          const currentVal = form[key] ?? '';
          const hasValue = currentVal !== '';

          return (
            <div key={key}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: hasValue ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 4 }}>
                {label}
                {hasValue && <FiCheck size={10} style={{ color: 'var(--accent)' }} />}
              </label>
              {type === 'textarea' ? (
                <textarea
                  className="sz-input"
                  rows={2}
                  placeholder={mixed ? 'Mixed values…' : (existingVal || `Set ${label.toLowerCase()} for all…`)}
                  value={currentVal}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                />
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    className="sz-input"
                    type={type === 'number' ? 'number' : 'text'}
                    placeholder={mixed ? 'Mixed values…' : (existingVal || `Set ${label.toLowerCase()} for all…`)}
                    value={currentVal}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', fontSize: 13, paddingRight: hasValue ? 32 : undefined }}
                  />
                  {hasValue && (
                    <button
                      onClick={() => setForm(f => { const n = { ...f }; delete n[key]; return n; })}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}
                      title="Clear"
                    ><FiX size={12} /></button>
                  )}
                </div>
              )}
              {mixed && !hasValue && (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <FiMinus size={9} /> Mixed values across selection
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Progress bar */}
        {status === 'saving' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 3, background: 'var(--bg-overlay)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.2s ease', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Saving {progress}%…</div>
          </div>
        )}

        {/* Status messages */}
        {status === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80', marginBottom: 10 }}>
            <FiCheck size={13} /> {successCount} track{successCount !== 1 ? 's' : ''} updated successfully
          </div>
        )}
        {status === 'error' && errors.length > 0 && (
          <div style={{ marginBottom: 10, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.25)', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff453a', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <FiAlertCircle size={12} /> {errors.length} error{errors.length !== 1 ? 's' : ''}
            </div>
            {errors.slice(0, 3).map((e, i) => <div key={i} style={{ fontSize: 11, color: '#ff453a', marginTop: 2 }}>{e}</div>)}
            {errors.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>…and {errors.length - 3} more</div>}
          </div>
        )}

        <button
          className="sz-btn sz-btn-primary"
          onClick={handleSave}
          disabled={filledFields === 0 || status === 'saving'}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {status === 'saving'
            ? <><FiLoader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
            : <><FiSave size={13} /> Apply to {tracks.length} track{tracks.length !== 1 ? 's' : ''}</>}
        </button>
      </div>
    </div>
  );
};

// ── Batch track row (with checkbox) ──────────────────────────────────────────
const BatchTrackRow: React.FC<{
  track: Track;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}> = ({ track, selected, onToggle }) => {
  const [cover, setCover] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const { getThumbnailUrl } = useMusicImages();
  const { formatDuration } = useMusicUtils();
  const pct = getCompleteness(track);
  const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
  const artist = track.metadata?.artist;

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
      onClick={() => onToggle(track.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
        background: selected ? 'var(--accent-dim)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.1s ease', borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {/* Checkbox */}
      <div style={{ flexShrink: 0, color: selected ? 'var(--accent)' : 'var(--text-tertiary)', display: 'flex' }}>
        {selected ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
      </div>

      {/* Thumb */}
      <div style={{ width: 30, height: 30, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-overlay)', flexShrink: 0 }}>
        {cover ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogoIcon style={{ width: 12, height: 12, color: 'var(--text-tertiary)' }} /></div>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: selected ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
        {artist && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{artist}</div>}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>{formatDuration(track.duration)}</span>
        <CompleteBadge pct={pct} small />
      </div>
    </div>
  );
};

// ── Batch edit view ───────────────────────────────────────────────────────────
const BatchEditView: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return tracks;
    const q = search.toLowerCase();
    return tracks.filter(t =>
      t.metadata?.title?.toLowerCase().includes(q) ||
      t.metadata?.artist?.toLowerCase().includes(q) ||
      t.metadata?.album?.toLowerCase().includes(q) ||
      t.original_filename.toLowerCase().includes(q)
    );
  }, [tracks, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));

  const toggleTrack = (id: string) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(t => n.delete(t.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(t => n.add(t.id)); return n; });
    }
  };

  const selectedTracks = tracks.filter(t => selected.has(t.id));

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 220px)', minHeight: 400, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Left: track list */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        {/* Search + select all */}
        <div style={{ padding: '12px 12px 8px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input className="sz-input" style={{ paddingLeft: 32, width: '100%', fontSize: 13 }} placeholder="Filter tracks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            onClick={toggleAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, width: '100%',
              padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: allFilteredSelected ? 'var(--accent-dim)' : 'transparent',
              color: allFilteredSelected ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {allFilteredSelected ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
            {allFilteredSelected ? 'Deselect all' : `Select all (${filtered.length})`}
            {selected.size > 0 && !allFilteredSelected && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{selected.size} selected</span>
            )}
          </button>
        </div>

        {/* Track list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No tracks found</div>
            : filtered.map((track, i) => (
                <BatchTrackRow key={track.id} track={track} index={i} selected={selected.has(track.id)} onToggle={toggleTrack} />
              ))
          }
        </div>

        {/* Footer count */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>
          {selected.size} of {tracks.length} tracks selected
        </div>
      </div>

      {/* Right: edit form */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedTracks.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-tertiary)', padding: 32 }}>
            <FiCheckSquare size={36} style={{ opacity: 0.25 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Select tracks to edit</div>
            <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              Check one or more tracks on the left. Fields you fill in will be applied to all selected tracks. Empty fields are left unchanged.
            </div>
          </div>
        ) : (
          <BatchEditPanel tracks={selectedTracks} />
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
type ViewMode = 'album' | 'artist' | 'track' | 'batch';

const MetadataBrowser: React.FC = () => {
  const { tracks, albums, isLoading } = useMusicData();
  const [viewMode, setViewMode] = useState<ViewMode>('album');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    const avgPct = tracks.length ? Math.round(tracks.reduce((s, t) => s + getCompleteness(t), 0) / tracks.length) : 0;
    const complete = tracks.filter(t => getCompleteness(t) === 100).length;
    const partial = tracks.filter(t => { const p = getCompleteness(t); return p >= 40 && p < 100; }).length;
    const missing = tracks.filter(t => getCompleteness(t) < 40).length;
    return { avgPct, complete, partial, missing };
  }, [tracks]);

  const albumsData = useMemo(() =>
    albums.map(a => ({
      ...a,
      avgPct: a.tracks.length ? Math.round(a.tracks.reduce((s, t) => s + getCompleteness(t), 0) / a.tracks.length) : 0,
    }))
  , [albums]);

  const artistGroups = useMemo(() => {
    const map = new Map<string, Track[]>();
    filteredTracks.forEach(t => {
      const artist = t.metadata?.artist || '__unknown__';
      if (!map.has(artist)) map.set(artist, []);
      map.get(artist)!.push(t);
    });
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === '__unknown__') return 1;
        if (b === '__unknown__') return -1;
        return a.localeCompare(b);
      })
      .map(([artist, grpTracks]) => ({
        artist, isUnknown: artist === '__unknown__', tracks: grpTracks,
        avgPct: Math.round(grpTracks.reduce((s, t) => s + getCompleteness(t), 0) / grpTracks.length),
      }));
  }, [filteredTracks]);

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albumsData;
    const ids = new Set(filteredTracks.map(t => t.id));
    return albumsData
      .map(a => ({ ...a, tracks: a.tracks.filter(t => ids.has(t.id)) }))
      .filter(a => a.tracks.length > 0)
      .map(a => ({ ...a, avgPct: Math.round(a.tracks.reduce((s, t) => s + getCompleteness(t), 0) / a.tracks.length) }));
  }, [albumsData, filteredTracks, searchQuery]);

  const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'album', label: 'Albums', icon: <FiDisc size={13} /> },
    { key: 'artist', label: 'Artists', icon: <FiUser size={13} /> },
    { key: 'track', label: 'Tracks', icon: <FiList size={13} /> },
    { key: 'batch', label: 'Batch Edit', icon: <FiCheckSquare size={13} /> },
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
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Complete', count: stats.complete, color: '#4ade80' },
            { label: 'Partial', count: stats.partial, color: '#facc15' },
            { label: 'Missing', count: stats.missing, color: '#f87171' },
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
        {viewMode !== 'batch' && (
          <div style={{ flex: 1, position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input className="sz-input" style={{ paddingLeft: 36, width: '100%' }} placeholder="Search tracks, artists, albums…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2, marginLeft: viewMode === 'batch' ? 'auto' : undefined }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: viewMode === tab.key
                  ? (tab.key === 'batch' ? 'var(--accent-dim)' : 'var(--bg-overlay)')
                  : 'transparent',
                color: viewMode === tab.key
                  ? (tab.key === 'batch' ? 'var(--accent)' : 'var(--text-primary)')
                  : 'var(--text-tertiary)',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ paddingBottom: '100%', borderRadius: 10 }} />)}
        </div>
      )}

      {/* Album view */}
      {!isLoading && viewMode === 'album' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
            {filteredAlbums.length === 0
              ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No albums match your search.</div>
              : filteredAlbums.map(album => (
                  <AlbumCard
                    key={album.name}
                    album={album}
                    isUnknown={album.name === 'Singles and miscellaneous tracks'}
                    isSelected={selectedAlbum === album.name}
                    onSelect={() => setSelectedAlbum(prev => prev === album.name ? null : album.name)}
                  />
                ))}
          </div>

          {/* Full-width expanded track panel */}
          {selectedAlbum && (() => {
            const album = filteredAlbums.find(a => a.name === selectedAlbum);
            if (!album) return null;
            const avgPct = Math.round(album.tracks.reduce((s, t) => s + getCompleteness(t), 0) / album.tracks.length);
            return (
              <div style={{ marginTop: 24, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', animation: 'fadeIn 0.18s ease' }}>
                {/* Panel header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {album.name === 'Singles and miscellaneous tracks' ? 'Singles' : album.name}
                      </span>
                      <CompleteBadge pct={avgPct} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {album.artist || 'Unknown'} · {album.tracks.length} tracks
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAlbum(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4, borderRadius: 4 }}
                    title="Close"
                  ><FiX size={16} /></button>
                </div>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 36px 1fr 150px 70px 60px 32px', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                  {['#', '', 'Title', 'Artist', 'Duration', 'Complete', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 4 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {/* Tracks */}
                <div style={{ padding: '4px 4px 8px' }}>
                  {album.tracks.map((track, i) => <AlbumPanelTrackRow key={track.id} track={track} index={i} />)}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Artist view */}
      {!isLoading && viewMode === 'artist' && (
        <div>
          {artistGroups.length === 0
            ? <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No artists found.</div>
            : artistGroups.map(({ artist, isUnknown, tracks: grpTracks, avgPct }) => (
                <ExpandableGroup
                  key={artist}
                  title={isUnknown ? 'Unknown Artist' : artist}
                  subtitle={`${grpTracks.length} track${grpTracks.length !== 1 ? 's' : ''}`}
                  avgPct={avgPct} tracks={grpTracks}
                  coverPath={grpTracks.find(t => t.cover_thumbnail_path)?.cover_thumbnail_path}
                  isUnknown={isUnknown}
                />
              ))}
        </div>
      )}

      {/* Track view */}
      {!isLoading && viewMode === 'track' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 36px 1fr 150px 150px 70px 60px 32px', gap: 10, padding: '0 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            {['#', '', 'Title', 'Artist', 'Album', 'Duration', 'Complete', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 5 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {filteredTracks.length === 0
            ? <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>No tracks match your search.</div>
            : filteredTracks.map((track, i) => <MetaTrackRow key={track.id} track={track} index={i} />)}
        </div>
      )}

      {/* Batch edit view */}
      {!isLoading && viewMode === 'batch' && (
        <BatchEditView tracks={tracks} />
      )}
    </div>
  );
};

export default MetadataBrowser;
