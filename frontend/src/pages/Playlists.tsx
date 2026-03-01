import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { FiPlus, FiRefreshCw, FiMusic, FiPlay, FiMoreHorizontal, FiEdit, FiTrash2 } from 'react-icons/fi';
import { usePlaylistData } from '../hooks/usePlaylist';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { Playlist } from '../types/playlist';
import { PlaylistModal, DeletePlaylistModal } from '../components/playlists';

const PlaylistCard: React.FC<{
  playlist: Playlist;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
}> = ({ playlist, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { playPlaylist } = useAudioPlayer();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Gradient placeholder based on name
  const colors = ['#00e5ff','#bf5af2','#ff9f0a','#30d158','#ff453a','#0a84ff'];
  const color = colors[playlist.name.charCodeAt(0) % colors.length];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/playlists/${playlist.id}`)}
    >
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '100%',
        borderRadius: 10, overflow: 'hidden', marginBottom: 10,
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `1px solid ${color}22`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiMusic size={40} style={{ color, opacity: 0.5 }} />
        </div>
        {/* Play overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div
            onClick={e => { e.stopPropagation(); if (playlist.tracks.length > 0) playPlaylist(playlist, 0); }}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-glow)' }}
          >
            <FiPlay size={18} style={{ color: '#000', marginLeft: 2 }} />
          </div>
          <div
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            <FiMoreHorizontal size={16} style={{ color: '#fff' }} />
            {menuOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '4px 0', minWidth: 160, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(playlist); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14 }}
                >
                  <FiEdit size={13} /> Edit
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(playlist); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', fontSize: 14 }}
                >
                  <FiTrash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playlist.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{playlist.tracks.length} tracks</div>
    </div>
  );
};

const Playlists: React.FC = () => {
  const { playlists, isLoading, error, refetch } = usePlaylistData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
      const p = new URLSearchParams(searchParams);
      p.delete('create');
      setSearchParams(p, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div style={{ padding: '32px 32px 0' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Playlists</h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={refetch} disabled={isLoading} title="Refresh">
            <FiRefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button className="sz-btn sz-btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus size={14} /> New playlist
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ff3b30', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ paddingBottom: '100%', borderRadius: 10 }} />)}
        </div>
      )}

      {!isLoading && playlists.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: 16 }}>
          <FiMusic size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No playlists yet</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 300 }}>Create playlists to organize your music collection.</p>
          <button className="sz-btn sz-btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus size={14} /> Create your first playlist
          </button>
        </div>
      )}

      {!isLoading && playlists.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
          {playlists.map(pl => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              onEdit={setEditingPlaylist}
              onDelete={setDeletingPlaylist}
            />
          ))}
        </div>
      )}

      <PlaylistModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => {}} />
      <PlaylistModal isOpen={!!editingPlaylist} onClose={() => setEditingPlaylist(null)} playlist={editingPlaylist || undefined} onSuccess={() => setEditingPlaylist(null)} />
      <DeletePlaylistModal isOpen={!!deletingPlaylist} onClose={() => setDeletingPlaylist(null)} playlist={deletingPlaylist} onSuccess={() => setDeletingPlaylist(null)} />
    </div>
  );
};

export default Playlists;
