import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  FiArrowLeft, FiCamera, FiSave, FiRotateCcw, FiMusic,
  FiCheck, FiAlertCircle, FiLoader, FiInfo
} from 'react-icons/fi';
import { useTrackMetadata } from '../hooks/useTrackMetadata';
import { metadataApi, type MetadataUpdate } from '../services/metadataApi';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(dur: string | number | undefined): string {
  if (!dur) return '—';
  if (typeof dur === 'number') {
    const m = Math.floor(dur / 60);
    const s = Math.floor(dur % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  if (typeof dur === 'string') {
    const iso = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (iso) {
      const h = parseInt(iso[1] || '0');
      const m = parseInt(iso[2] || '0');
      const s = Math.floor(parseFloat(iso[3] || '0'));
      return h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;
    }
    return dur;
  }
  return '—';
}

function formatBytes(b: number | undefined): string {
  if (!b) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), sizes.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatBitrate(bps: number | undefined): string {
  if (!bps) return '—';
  return `${Math.round(bps / 1000)} kbps`;
}

function formatSampleRate(hz: number | undefined): string {
  if (!hz) return '—';
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${hz} Hz`;
}

function formatChannels(n: number | undefined): string {
  if (!n) return '—';
  return n === 1 ? 'Mono' : n === 2 ? 'Stereo' : `${n} ch`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: keyof MetadataUpdate;
  value: string;
  type?: 'text' | 'number';
  placeholder?: string;
  hint?: string;
  error?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (name: keyof MetadataUpdate, value: string) => void;
}

const Field: React.FC<FieldProps> = ({
  label, name, value, type = 'text', placeholder, hint, error, step, min, max, onChange,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
      {label}
    </label>
    <input
      className="sz-input"
      type={type}
      value={value}
      placeholder={placeholder ?? label}
      step={step}
      min={min}
      max={max}
      onChange={e => onChange(name, e.target.value)}
      style={{ fontSize: 14, borderColor: error ? 'rgba(239,68,68,0.6)' : undefined }}
    />
    {hint && !error && (
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>
    )}
    {error && (
      <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>
    )}
  </div>
);

interface TextareaFieldProps {
  label: string;
  name: keyof MetadataUpdate;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (name: keyof MetadataUpdate, value: string) => void;
}

const TextareaField: React.FC<TextareaFieldProps> = ({ label, name, value, placeholder, rows = 4, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
      {label}
    </label>
    <textarea
      className="sz-input"
      value={value}
      placeholder={placeholder ?? label}
      rows={rows}
      onChange={e => onChange(name, e.target.value)}
      style={{ fontSize: 14, resize: 'vertical', minHeight: rows * 24 + 16, fontFamily: 'inherit' }}
    />
  </div>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {children}
    </div>
  </div>
);

interface TechRowProps { label: string; value: string; }
const TechRow: React.FC<TechRowProps> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'Space Grotesk', monospace" }}>{value}</span>
  </div>
);

// ─── main page ───────────────────────────────────────────────────────────────

const EMPTY_FORM: Required<Record<keyof MetadataUpdate, string>> = {
  title: '', artist: '', album: '', albumartist: '', date: '', genre: '',
  track: '', disc: '', comment: '', lyrics: '',
  bpm: '', key: '', remixer: '', producer: '',
  label: '', catalog_number: '', isrc: '', barcode: '',
};

const TrackMetadata: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { track, metadata, isLoading, isSaving, isUpdatingCover, error, success, updateMetadata, updateCover } =
    useTrackMetadata(trackId);

  const [form, setForm] = useState<Record<keyof MetadataUpdate, string>>(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof MetadataUpdate, string>>>({});
  const [coverBlobUrl, setCoverBlobUrl] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string | null>(null);
  const [showRawMeta, setShowRawMeta] = useState(false);

  // Populate form when metadata loads
  useEffect(() => {
    if (!isLoading && metadata) {
      setForm({
        title: String(metadata.title ?? ''),
        artist: String(metadata.artist ?? ''),
        album: String(metadata.album ?? ''),
        albumartist: String(metadata.albumartist ?? ''),
        date: String(metadata.date ?? ''),
        genre: String(metadata.genre ?? ''),
        track: String(metadata.track ?? ''),
        disc: String(metadata.disc ?? ''),
        comment: String(metadata.comment ?? ''),
        lyrics: String(metadata.lyrics ?? ''),
        bpm: metadata.bpm != null ? String(metadata.bpm) : '',
        key: String(metadata.key ?? ''),
        remixer: String(metadata.remixer ?? ''),
        producer: String(metadata.producer ?? ''),
        label: String(metadata.label ?? ''),
        catalog_number: String(metadata.catalog_number ?? ''),
        isrc: String(metadata.isrc ?? ''),
        barcode: String(metadata.barcode ?? ''),
      });
      setIsDirty(false);
    }
  }, [metadata, isLoading]);

  // Load cover blob URL
  useEffect(() => {
    let revoke: string | null = null;
    if (track?.cover_path) {
      metadataApi.getCoverBlobUrl(track.cover_path).then(url => {
        if (url) { revoke = url; setCoverBlobUrl(url); }
      });
    } else {
      setCoverBlobUrl(null);
    }
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [track?.cover_path]);

  // Revoke pending cover preview on unmount
  useEffect(() => {
    return () => { if (pendingCoverPreview) URL.revokeObjectURL(pendingCoverPreview); };
  }, [pendingCoverPreview]);

  const handleChange = useCallback((name: keyof MetadataUpdate, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (validationErrors[name]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  }, [validationErrors]);

  const validate = (): Partial<Record<keyof MetadataUpdate, string>> => {
    const errs: Partial<Record<keyof MetadataUpdate, string>> = {};
    const bpmVal = parseFloat(form.bpm);
    if (form.bpm !== '' && (isNaN(bpmVal) || bpmVal < 0 || bpmVal > 300)) {
      errs.bpm = 'Must be 0 – 300';
    }
    if (form.date && form.date.length > 10) {
      errs.date = 'Max 10 chars (YYYY or YYYY-MM-DD)';
    }
    if (form.track && !/^\d+(\/\d+)?$/.test(form.track)) {
      errs.track = 'Format: "1" or "1/12"';
    }
    if (form.disc && !/^\d+(\/\d+)?$/.test(form.disc)) {
      errs.disc = 'Format: "1" or "1/2"';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }

    // Build payload — only send non-empty strings; empty string → null to clear the field
    const payload: MetadataUpdate = {};
    (Object.keys(EMPTY_FORM) as (keyof MetadataUpdate)[]).forEach(k => {
      const v = form[k];
      if (k === 'bpm') {
        payload[k] = v !== '' ? parseFloat(v) : null;
      } else {
        (payload as Record<keyof MetadataUpdate, string | null>)[k] = v !== '' ? v : null;
      }
    });

    await updateMetadata(payload);
    setIsDirty(false);
  };

  const handleReset = () => {
    if (!metadata) return;
    setForm({
      title: String(metadata.title ?? ''),
      artist: String(metadata.artist ?? ''),
      album: String(metadata.album ?? ''),
      albumartist: String(metadata.albumartist ?? ''),
      date: String(metadata.date ?? ''),
      genre: String(metadata.genre ?? ''),
      track: String(metadata.track ?? ''),
      disc: String(metadata.disc ?? ''),
      comment: String(metadata.comment ?? ''),
      lyrics: String(metadata.lyrics ?? ''),
      bpm: metadata.bpm != null ? String(metadata.bpm) : '',
      key: String(metadata.key ?? ''),
      remixer: String(metadata.remixer ?? ''),
      producer: String(metadata.producer ?? ''),
      label: String(metadata.label ?? ''),
      catalog_number: String(metadata.catalog_number ?? ''),
      isrc: String(metadata.isrc ?? ''),
      barcode: String(metadata.barcode ?? ''),
    });
    setIsDirty(false);
    setValidationErrors({});
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingCoverPreview) URL.revokeObjectURL(pendingCoverPreview);
    setPendingCoverFile(file);
    setPendingCoverPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCoverApply = async () => {
    if (!pendingCoverFile) return;
    await updateCover(pendingCoverFile);
    setPendingCoverFile(null);
    if (pendingCoverPreview) { URL.revokeObjectURL(pendingCoverPreview); setPendingCoverPreview(null); }
  };

  const handleCoverCancel = () => {
    setPendingCoverFile(null);
    if (pendingCoverPreview) { URL.revokeObjectURL(pendingCoverPreview); setPendingCoverPreview(null); }
  };

  const displayedCover = pendingCoverPreview ?? coverBlobUrl;
  const trackTitle = metadata.title || track?.original_filename?.replace(/\.[^/.]+$/, '') || 'Track';
  const trackArtist = String(metadata.artist ?? '');

  // ─── skeleton loading ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }} className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 240, height: 28, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: 12 }} />
            <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 10 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[120, 160, 100, 80].map((h, i) => (
              <div key={i} className="skeleton" style={{ width: '100%', height: h, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!track && !isLoading) {
    return (
      <div style={{ padding: '80px 48px', textAlign: 'center' }}>
        <FiAlertCircle size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Track not found or you don't have access.</p>
        <button className="sz-btn sz-btn-secondary sz-btn-md" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  // ─── main render ────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 48px 80px', maxWidth: 1200, margin: '0 auto' }} className="fade-in">

      {/* ── page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 36, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            className="sz-btn sz-btn-ghost sz-btn-sm"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <FiArrowLeft size={16} />
            Back
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {trackTitle}
            </h1>
            {trackArtist && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{trackArtist}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            className="sz-btn sz-btn-secondary sz-btn-md"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <FiRotateCcw size={14} />
            Reset
          </button>
          <button
            className="sz-btn sz-btn-primary sz-btn-md"
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 130 }}
          >
            {isSaving
              ? <><FiLoader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
              : <><FiSave size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>

      {/* ── global feedback banner ── */}
      {(error || success) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 8, marginBottom: 24,
          background: error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${error ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
          color: error ? '#f87171' : '#4ade80',
          fontSize: 14,
        }}>
          {error ? <FiAlertCircle size={16} /> : <FiCheck size={16} />}
          <span>{error ?? success}</span>
        </div>
      )}

      {/* ── two-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cover art */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => coverInputRef.current?.click()}
              style={{
                position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 12,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                overflow: 'hidden', cursor: 'pointer',
                boxShadow: displayedCover ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {displayedCover ? (
                <img src={displayedCover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <FiMusic size={48} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No cover art</span>
                </div>
              )}
              {/* hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: 0, transition: 'all 0.2s ease',
              }}
                className="cover-hover-overlay"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '0';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)';
                }}
              >
                <FiCamera size={24} style={{ color: '#fff' }} />
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>Change Cover</span>
              </div>
            </div>

            {/* Pending cover actions */}
            {pendingCoverFile && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  className="sz-btn sz-btn-primary sz-btn-sm"
                  onClick={handleCoverApply}
                  disabled={isUpdatingCover}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {isUpdatingCover
                    ? <FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <FiCheck size={13} />
                  }
                  {isUpdatingCover ? 'Applying…' : 'Apply Cover'}
                </button>
                <button
                  className="sz-btn sz-btn-ghost sz-btn-sm"
                  onClick={handleCoverCancel}
                  disabled={isUpdatingCover}
                >
                  Cancel
                </button>
              </div>
            )}

            {!pendingCoverFile && (
              <button
                className="sz-btn sz-btn-ghost sz-btn-sm"
                onClick={() => coverInputRef.current?.click()}
                style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <FiCamera size={13} />
                Change Cover
              </button>
            )}

            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverSelect} />
          </div>

          {/* Technical info */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
              Technical Info
            </div>
            <TechRow label="Format" value={(metadata.format || track?.file_type || '—').toUpperCase()} />
            <TechRow label="Bitrate" value={formatBitrate(metadata.bitrate)} />
            <TechRow label="Sample Rate" value={formatSampleRate(metadata.sample_rate)} />
            <TechRow label="Channels" value={formatChannels(metadata.channels)} />
            {metadata.bits_per_sample && <TechRow label="Bit Depth" value={`${metadata.bits_per_sample}-bit`} />}
            {metadata.encoder && <TechRow label="Encoder" value={String(metadata.encoder)} />}
            <TechRow label="Duration" value={formatDuration(track?.duration)} />
            <TechRow label="File Size" value={formatBytes(track?.file_size)} />
            <TechRow label="Uploaded" value={formatDate(track?.upload_date)} />
            {track?.last_accessed && <TechRow label="Last Played" value={formatDate(track.last_accessed)} />}
          </div>

          {/* Extra metadata (energy, mood, etc.) if present */}
          {(metadata.energy != null || metadata.mood || metadata.tempo != null || metadata.loudness_lufs != null) && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
                Audio Analysis
              </div>
              {metadata.energy != null && <TechRow label="Energy" value={String(metadata.energy)} />}
              {metadata.mood && <TechRow label="Mood" value={String(metadata.mood)} />}
              {metadata.tempo != null && <TechRow label="Tempo" value={`${metadata.tempo} BPM`} />}
              {metadata.initial_key && <TechRow label="Initial Key" value={String(metadata.initial_key)} />}
              {metadata.loudness_lufs != null && <TechRow label="Loudness" value={`${metadata.loudness_lufs} LUFS`} />}
              {metadata.dynamic_range != null && <TechRow label="Dynamic Range" value={String(metadata.dynamic_range)} />}
            </div>
          )}

          {/* Raw metadata toggle */}
          {(metadata.discogs || metadata.custom_tags) && (
            <button
              className="sz-btn sz-btn-ghost sz-btn-sm"
              onClick={() => setShowRawMeta(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiInfo size={13} />
              {showRawMeta ? 'Hide' : 'Show'} Raw Metadata
            </button>
          )}
          {showRawMeta && (
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px 18px',
              border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)',
              fontFamily: "'Space Grotesk', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 320, overflowY: 'auto',
            }}>
              {JSON.stringify({ discogs: metadata.discogs, custom_tags: metadata.custom_tags }, null, 2)}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: editable form ── */}
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 16, padding: '28px 28px 32px',
          border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 28,
        }}>
          {/* Basic Info */}
          <Section title="Basic Info">
            <Field label="Title"       name="title"       value={form.title}       onChange={handleChange} />
            <Field label="Artist"      name="artist"      value={form.artist}      onChange={handleChange} />
            <Field label="Album"       name="album"       value={form.album}       onChange={handleChange} />
            <Field label="Album Artist" name="albumartist" value={form.albumartist} onChange={handleChange} placeholder="Album Artist" />
            <Field label="Date"        name="date"        value={form.date}        onChange={handleChange} placeholder="YYYY or YYYY-MM-DD" hint="Max 10 characters" error={validationErrors.date} />
            <Field label="Genre"       name="genre"       value={form.genre}       onChange={handleChange} />
          </Section>

          {/* Track Details */}
          <Section title="Track Details">
            <Field label="Track Number" name="track" value={form.track} onChange={handleChange} placeholder='e.g. "3" or "3/12"' hint='Format: "N" or "N/Total"' error={validationErrors.track} />
            <Field label="Disc Number" name="disc"  value={form.disc}  onChange={handleChange} placeholder='e.g. "1" or "1/2"'  hint='Format: "N" or "N/Total"' error={validationErrors.disc} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Comment" name="comment" value={form.comment} onChange={handleChange} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <TextareaField label="Lyrics" name="lyrics" value={form.lyrics} onChange={handleChange} rows={6} placeholder="Paste lyrics here…" />
            </div>
          </Section>

          {/* DJ / Producer */}
          <Section title="DJ / Producer">
            <Field
              label="BPM" name="bpm" value={form.bpm} type="number" step={0.1} min={0} max={300}
              onChange={handleChange} placeholder="e.g. 128.0" hint="0 – 300" error={validationErrors.bpm}
            />
            <Field label="Key"      name="key"      value={form.key}      onChange={handleChange} placeholder='e.g. "A minor"' />
            <Field label="Remixer"  name="remixer"  value={form.remixer}  onChange={handleChange} />
            <Field label="Producer" name="producer" value={form.producer} onChange={handleChange} />
          </Section>

          {/* Publishing */}
          <Section title="Publishing">
            <Field label="Label"          name="label"          value={form.label}          onChange={handleChange} />
            <Field label="Catalog Number" name="catalog_number" value={form.catalog_number} onChange={handleChange} placeholder="Catalog #" />
            <Field label="ISRC"           name="isrc"           value={form.isrc}           onChange={handleChange} placeholder="e.g. USAT29900609" />
            <Field label="Barcode"        name="barcode"        value={form.barcode}        onChange={handleChange} />
          </Section>

          {/* Bottom save row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <button
              className="sz-btn sz-btn-secondary sz-btn-md"
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <FiRotateCcw size={14} />
              Reset
            </button>
            <button
              className="sz-btn sz-btn-primary sz-btn-md"
              onClick={handleSave}
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 130 }}
            >
              {isSaving
                ? <><FiLoader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                : <><FiSave size={14} /> Save Changes</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackMetadata;
