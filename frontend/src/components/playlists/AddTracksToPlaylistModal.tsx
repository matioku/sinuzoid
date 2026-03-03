import React, { useState } from 'react';
import { FiX, FiSearch, FiPlus, FiLoader, FiCheck, FiMusic } from 'react-icons/fi';
import { useMusicData } from '../../hooks/useMusicStore';
import { usePlaylistOperations } from '../../hooks/usePlaylist';

interface AddTracksToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  existingTrackIds: string[];
  onTracksAdded?: () => void;
}

const AddTracksToPlaylistModal: React.FC<AddTracksToPlaylistModalProps> = ({
  isOpen, onClose, playlistId, existingTrackIds, onTracksAdded
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [addingTracks, setAddingTracks] = useState(false);

  const { tracks, isLoading: tracksLoading } = useMusicData();
  const { addTrackToPlaylist } = usePlaylistOperations();

  const availableTracks = tracks.filter(t => !existingTrackIds.includes(t.id));
  const filteredTracks = availableTracks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.original_filename.toLowerCase().includes(q) ||
      t.metadata?.title?.toLowerCase().includes(q) ||
      t.metadata?.artist?.toLowerCase().includes(q) ||
      t.metadata?.album?.toLowerCase().includes(q)
    );
  });

  const handleToggle = (id: string) =>
    setSelectedTracks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAdd = async () => {
    if (!selectedTracks.length) return;
    setAddingTracks(true);
    try {
      for (const id of selectedTracks) {
        try { await addTrackToPlaylist(playlistId, id); } catch {}
      }
      setSelectedTracks([]); setSearchQuery('');
      onTracksAdded?.();
      onClose();
    } finally { setAddingTracks(false); }
  };

  const fmtDur = (d: string) => {
    if (d.startsWith('PT') || d.startsWith('P')) {
      const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
      if (m) {
        const h = parseInt(m[1] || '0'), min = parseInt(m[2] || '0'), s = Math.floor(parseFloat(m[3] || '0'));
        return h > 0 ? `${h}:${min.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${min}:${s.toString().padStart(2,'0')}`;
      }
    }
    return d;
  };

  if (!isOpen || !playlistId) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, paddingTop: 'calc(var(--header-height) + 16px)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'scaleIn 0.15s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>Add tracks</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Select tracks to add to this playlist</p>
          </div>
          <button onClick={onClose} className="sz-btn sz-btn-icon" style={{ width: 32, height: 32 }}>
            <FiX size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search tracks…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="sz-input"
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
        </div>

        {/* Track list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {tracksLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              Loading tracks…
            </div>
          ) : filteredTracks.length > 0 ? (
            filteredTracks.map((track, i) => {
              const sel = selectedTracks.includes(track.id);
              return (
                <div
                  key={track.id}
                  onClick={() => handleToggle(track.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                    background: sel ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${sel ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
                    transition: 'all 0.12s',
                    marginBottom: i < filteredTracks.length - 1 ? 2 : 0,
                  }}
                  className="track-add-row"
                >
                  {/* Checkbox */}
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? 'var(--accent)' : 'var(--border-light)'}`, background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                    {sel && <FiCheck size={11} style={{ color: '#000' }} />}
                  </div>
                  {/* Track icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiMusic size={13} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.metadata?.artist || 'Unknown artist'}{track.metadata?.album ? ` · ${track.metadata.album}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace', flexShrink: 0 }}>
                    {fmtDur(track.duration)}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>
              <FiMusic size={28} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              {searchQuery ? 'No tracks match your search.' : 'All your tracks are already in this playlist.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-overlay)', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {selectedTracks.length} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="sz-btn sz-btn-ghost">Cancel</button>
            <button onClick={handleAdd} disabled={!selectedTracks.length || addingTracks} className="sz-btn sz-btn-primary">
              {addingTracks ? <FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiPlus size={13} />}
              Add{selectedTracks.length > 0 ? ` (${selectedTracks.length})` : ''}
            </button>
          </div>
        </div>
      </div>
      <style>{`.track-add-row:hover { background: var(--bg-hover) !important; }`}</style>
    </div>
  );
};

export default AddTracksToPlaylistModal;
