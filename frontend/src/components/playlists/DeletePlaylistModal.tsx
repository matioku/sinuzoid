import React, { useState } from 'react';
import { FiTrash2, FiLoader, FiAlertTriangle, FiX } from 'react-icons/fi';
import { Playlist } from '../../types/playlist';
import { usePlaylistOperations } from '../../hooks/usePlaylist';

interface DeletePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onSuccess?: () => void;
}

const DeletePlaylistModal: React.FC<DeletePlaylistModalProps> = ({ isOpen, onClose, playlist, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deletePlaylist } = usePlaylistOperations();

  const handleDelete = async () => {
    if (!playlist) return;
    setIsLoading(true);
    setError(null);
    try {
      await deletePlaylist(playlist.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => { if (!isLoading) { setError(null); onClose(); } };

  if (!isOpen || !playlist) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, paddingTop: 'calc(var(--header-height) + 16px)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', animation: 'scaleIn 0.15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiAlertTriangle size={16} style={{ color: '#ff453a' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Delete playlist</h2>
          </div>
          <button onClick={handleClose} className="sz-btn sz-btn-icon" style={{ width: 32, height: 32 }}>
            <FiX size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{playlist.name}"</strong>? This cannot be undone.
          </p>
          {playlist.tracks && playlist.tracks.length > 0 && (
            <div style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff9f0a' }}>
              This playlist contains {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''}.
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff453a' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="sz-btn sz-btn-ghost" onClick={handleClose} disabled={isLoading}>Cancel</button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="sz-btn"
              style={{ background: '#ff453a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isLoading ? <FiLoader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiTrash2 size={13} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletePlaylistModal;
