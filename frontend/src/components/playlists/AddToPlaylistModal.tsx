import React, { useState } from 'react';
import { FiX, FiPlus, FiMusic, FiCheck, FiLoader } from 'react-icons/fi';
import { Track } from '../../hooks/useTracks';
import { usePlaylistData, usePlaylistOperations } from '../../hooks/usePlaylist';
import { Playlist } from '../../types/playlist';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ isOpen, onClose, track }) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { playlists, isLoading: playlistsLoading } = usePlaylistData();
  const { createPlaylist, addTrackToPlaylist } = usePlaylistOperations();

  const handleAdd = async (playlist: Playlist) => {
    if (!track) return;
    setAddingTo(playlist.id);
    try {
      await addTrackToPlaylist(playlist.id, track.id);
      setTimeout(() => { setAddingTo(null); onClose(); }, 800);
    } catch { setAddingTo(null); }
  };

  const handleCreateAndAdd = async () => {
    if (!track || !newName.trim()) return;
    setCreating(true);
    try {
      const pl = await createPlaylist({ name: newName.trim(), description: newDesc.trim() || undefined });
      await addTrackToPlaylist(pl.id, track.id);
      setNewName(''); setNewDesc(''); setShowNewForm(false);
      setTimeout(() => { setCreating(false); onClose(); }, 800);
    } catch { setCreating(false); }
  };

  if (!isOpen || !track) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'scaleIn 0.15s ease', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Add to playlist</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {track.metadata?.title || track.original_filename}
            </p>
          </div>
          <button onClick={onClose} className="sz-btn sz-btn-icon" style={{ width: 32, height: 32, flexShrink: 0 }}>
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* New playlist toggle */}
          <button
            onClick={() => setShowNewForm(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--accent-dim)', border: `1px dashed var(--accent)`, borderRadius: 10, cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600, width: '100%' }}
          >
            <FiPlus size={15} /> New playlist
          </button>

          {/* New playlist form */}
          {showNewForm && (
            <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Playlist name"
                autoFocus
                className="sz-input"
                style={{ width: '100%' }}
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'Manrope, sans-serif', resize: 'none', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateAndAdd} disabled={!newName.trim() || creating} className="sz-btn sz-btn-primary" style={{ flex: 1 }}>
                  {creating && <FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  Create & add
                </button>
                <button onClick={() => setShowNewForm(false)} className="sz-btn sz-btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Existing playlists */}
          {playlistsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              Loading playlists…
            </div>
          ) : playlists.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => handleAdd(pl)}
                  disabled={addingTo === pl.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: addingTo === pl.id ? 'var(--accent-dim)' : 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                  className="playlist-add-item"
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {addingTo === pl.id ? <FiCheck size={15} style={{ color: 'var(--accent)' }} /> : <FiMusic size={15} style={{ color: 'var(--text-tertiary)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{pl.tracks?.length || 0} tracks</div>
                  </div>
                  {addingTo === pl.id && <span style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>Added!</span>}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>
              <FiMusic size={28} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              No playlists yet — create one above.
            </div>
          )}
        </div>
      </div>
      <style>{`.playlist-add-item:hover { background: var(--bg-hover) !important; border-color: var(--border) !important; }`}</style>
    </div>
  );
};

export default AddToPlaylistModal;
