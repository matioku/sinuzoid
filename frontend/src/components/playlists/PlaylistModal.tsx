import React, { useState, useEffect } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import { Playlist, PlaylistCreate, PlaylistUpdate } from '../../types/playlist';
import { usePlaylistOperations } from '../../hooks/usePlaylist';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist?: Playlist;
  onSuccess?: (playlist: Playlist) => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({ isOpen, onClose, playlist, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createPlaylist, updatePlaylist } = usePlaylistOperations();
  const isEditing = !!playlist;

  useEffect(() => {
    if (isOpen) {
      setName(playlist?.name || '');
      setDescription(playlist?.description || '');
      setError(null);
    }
  }, [isOpen, playlist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Playlist name is required'); return; }
    setIsLoading(true);
    setError(null);
    try {
      let result: Playlist;
      if (isEditing && playlist) {
        const updateData: PlaylistUpdate = { name: name.trim(), description: description.trim() || undefined };
        result = await updatePlaylist(playlist.id, updateData);
      } else {
        const createData: PlaylistCreate = { name: name.trim(), description: description.trim() || undefined };
        result = await createPlaylist(createData);
      }
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, paddingTop: 'calc(var(--header-height) + 16px)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'scaleIn 0.15s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{isEditing ? 'Edit playlist' : 'New playlist'}</h2>
          <button onClick={() => !isLoading && onClose()} className="sz-btn sz-btn-icon" style={{ width: 32, height: 32 }}>
            <FiX size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff453a' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Playlist name"
              disabled={isLoading}
              maxLength={100}
              className="sz-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Description <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your playlist…"
              disabled={isLoading}
              rows={3}
              maxLength={500}
              style={{
                width: '100%', background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14,
                fontFamily: 'Manrope, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginTop: 4 }}>{description.length}/500</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="sz-btn sz-btn-ghost" onClick={() => !isLoading && onClose()} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="sz-btn sz-btn-primary" disabled={isLoading || !name.trim()}>
              {isLoading && <FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {isEditing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaylistModal;
