import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FiArrowLeft, FiPlay, FiPause, FiShuffle, FiMoreHorizontal, FiEdit, FiTrash2, FiPlus, FiMusic } from 'react-icons/fi';
import { usePlaylist, usePlaylistUtils, usePlaylistOperations } from '../hooks/usePlaylist';
import { useMusicUtils } from '../hooks/useMusicStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { PlaylistModal, DeletePlaylistModal, AddTracksToPlaylistModal } from '../components/playlists';

const PlaylistDetail: React.FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { playlist, isLoading, refetch } = usePlaylist(playlistId);
  const { calculatePlaylistStats } = usePlaylistUtils();
  const { formatDuration } = useMusicUtils();
  const { removeTrackFromPlaylist } = usePlaylistOperations();
  const { playTracks, toggleTrack, isCurrentTrack, isTrackPlaying } = useAudioPlayer();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  const stats = playlist ? calculatePlaylistStats(playlist) : null;

  // Gradient color for playlist art
  const colors = ['#00e5ff','#bf5af2','#ff9f0a','#30d158','#ff453a','#0a84ff'];
  const accentColor = playlist ? colors[playlist.name.charCodeAt(0) % colors.length] : 'var(--accent)';

  const handleShuffle = () => {
    if (playlist?.tracks?.length) {
      const idx = Math.floor(Math.random() * playlist.tracks.length);
      playTracks(playlist.tracks, idx);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return;
    try {
      await removeTrackFromPlaylist(playlist.id, trackId);
      refetch?.();
    } catch {}
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    navigate('/playlists');
  };

  if (isLoading && !playlist) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ display: 'flex', gap: 32 }}>
          <div className="skeleton" style={{ width: 220, height: 220, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, paddingTop: 16 }}>
            <div className="skeleton" style={{ width: '50%', height: 36, borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '25%', height: 16, borderRadius: 4, marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ width: 100, height: 40, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 100, height: 40, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <FiMusic size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Playlist not found</h3>
        <button className="sz-btn sz-btn-ghost" onClick={() => navigate('/playlists')} style={{ marginTop: 8 }}>
          <FiArrowLeft size={14} /> Back to Playlists
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Blurred gradient background */}
      <div style={{ position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0, height: 320, background: `linear-gradient(180deg, ${accentColor}22, transparent)`, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Back */}
        <div style={{ padding: '24px 32px 0' }}>
          <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => navigate('/playlists')} style={{ marginBottom: 24 }}>
            <FiArrowLeft size={14} /> Playlists
          </button>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 32, padding: '0 32px 40px', alignItems: 'flex-end' }}>
          {/* Art */}
          <div style={{
            width: 220, height: 220, flexShrink: 0, borderRadius: 12, overflow: 'hidden',
            background: `linear-gradient(135deg, ${accentColor}55, ${accentColor}22)`,
            border: `1px solid ${accentColor}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <FiMusic size={64} style={{ color: accentColor, opacity: 0.6 }} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Playlist</div>
            <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {playlist.name}
            </h1>
            {playlist.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{playlist.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
              {stats && <>
                <span>{stats.totalTracks} tracks</span>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span>{stats.totalDuration}</span>
              </>}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="sz-btn sz-btn-primary" onClick={() => playlist.tracks?.length && playTracks(playlist.tracks, 0)} disabled={!playlist.tracks?.length}>
                <FiPlay size={14} /> Play
              </button>
              <button className="sz-btn sz-btn-secondary" onClick={handleShuffle} disabled={!playlist.tracks?.length}>
                <FiShuffle size={14} /> Shuffle
              </button>
              <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => setShowAddTracksModal(true)}>
                <FiPlus size={14} /> Add tracks
              </button>
              <div style={{ position: 'relative', marginLeft: 4 }}>
                <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => setShowMenu(v => !v)}>
                  <FiMoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '4px 0', minWidth: 160, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    <button onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14 }}>
                      <FiEdit size={13} /> Edit playlist
                    </button>
                    <button onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', fontSize: 14 }}>
                      <FiTrash2 size={13} /> Delete playlist
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Track list */}
        <div style={{ padding: '0 32px 40px' }}>
          {!playlist.tracks?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', border: '1px dashed var(--border-light)', borderRadius: 12, textAlign: 'center' }}>
              <FiMusic size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No tracks yet</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Add tracks to start building this playlist.</p>
              <button className="sz-btn sz-btn-primary" onClick={() => setShowAddTracksModal(true)}><FiPlus size={14} /> Add tracks</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 40px', gap: 12, padding: '0 16px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>#</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Duration</span>
                <span />
              </div>
              {playlist.tracks.map((track, index) => {
                const isCurrent = isCurrentTrack(track.id);
                const isPlaying = isTrackPlaying(track.id);
                const isHovered = hoveredTrack === track.id;
                const title = track.metadata?.title || track.original_filename.replace(/\.[^/.]+$/, '');
                return (
                  <div
                    key={track.id}
                    onMouseEnter={() => setHoveredTrack(track.id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                    onClick={() => toggleTrack(track)}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 40px', gap: 12, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', background: isCurrent ? 'var(--accent-dim)' : isHovered ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.12s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'Space Grotesk, monospace', color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {isHovered || isPlaying
                        ? (isPlaying ? <FiPause size={13} style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }} /> : <FiPlay size={13} style={{ color: 'var(--text-primary)', marginLeft: 2 }} />)
                        : (isCurrent ? <span style={{ color: 'var(--accent)' }}>♪</span> : index + 1)
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{track.metadata?.artist || 'Unknown'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
                      {formatDuration(track.duration)}
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiTrash2 size={13} style={{ color: isHovered ? '#ff453a' : 'transparent', transition: 'color 0.1s' }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <PlaylistModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} playlist={playlist} onSuccess={() => { setShowEditModal(false); refetch?.(); }} />
      <DeletePlaylistModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} playlist={playlist} onSuccess={handleDeleteSuccess} />
      <AddTracksToPlaylistModal isOpen={showAddTracksModal} onClose={() => setShowAddTracksModal(false)} playlistId={playlist.id} existingTrackIds={playlist.tracks?.map(t => t.id) || []} onTracksAdded={() => { setShowAddTracksModal(false); refetch?.(); }} />
      {showMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />}
    </div>
  );
};

export default PlaylistDetail;
