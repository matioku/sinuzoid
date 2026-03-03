import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const colors = ['#00e5ff','#bf5af2','#ff9f0a','#30d158','#ff453a','#0a84ff'];
  const color = colors[playlist.name.charCodeAt(0) % colors.length];

  // Close menu on any document click (outside)
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen(v => !v);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => navigate(`/playlists/${playlist.id}`)}
    >
      {/* Card image */}
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
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            onClick={e => { e.stopPropagation(); if (playlist.tracks.length > 0) playPlaylist(playlist, 0); }}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-glow)' }}
          >
            <FiPlay size={18} style={{ color: '#000', marginLeft: 2 }} />
          </div>
        </div>
      </div>

      {/* Three-dot menu button — uses portal for dropdown to escape stacking contexts */}
      <div
        style={{ position: 'absolute', top: 6, right: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          ref={btnRef}
          onClick={openMenu}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: menuOpen ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered || menuOpen ? 1 : 0,
            transition: 'opacity 0.15s, background 0.15s',
          }}
          title="More options"
        >
          <FiMoreHorizontal size={14} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* Dropdown rendered in document.body via portal — immune to ancestor stacking contexts */}
      {menuOpen && createPortal(
        <div
          style={{
            position: 'fixed', top: menuPos.top, right: menuPos.right,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
            borderRadius: 10, padding: '4px 0', minWidth: 160, zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            animation: 'scaleIn 0.1s ease', transformOrigin: 'top right',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(playlist); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
          >
            <FiEdit size={13} /> Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(playlist); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
          >
            <FiTrash2 size={13} /> Delete
          </button>
        </div>,
        document.body
      )}

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
