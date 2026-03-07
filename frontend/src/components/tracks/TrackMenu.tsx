import React, { useState, useRef, useEffect } from 'react';
import { FiMoreHorizontal, FiTrash2, FiPlus, FiDownload, FiEdit2 } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { Track } from '../../hooks/useTracks';
import { DeleteTrackModal } from '../tracks';
import { AddToPlaylistModal } from '../playlists';
import { useDownload } from '../../hooks/useDownload';
import { useMusicDeletion } from '../../hooks';

interface TrackMenuProps {
  track: Track;
  showAddToPlaylist?: boolean;
  onTrackDeleted?: () => void;
}

// Shared item style with hover tracking
const MenuItem: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}> = ({ onClick, icon, label, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 14px',
        background: hovered
          ? (danger ? 'rgba(255,69,58,0.12)' : 'var(--bg-hover)')
          : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: danger
          ? (hovered ? '#ff6b60' : '#ff453a')
          : (hovered ? 'var(--text-primary)' : 'var(--text-secondary)'),
        fontSize: 13, fontFamily: 'inherit',
        transition: 'background 0.1s ease, color 0.1s ease',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
};

const TrackMenu: React.FC<TrackMenuProps> = ({
  track,
  showAddToPlaylist = true,
  onTrackDeleted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [triggerHovered, setTriggerHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { handleTrackDeleted } = useMusicDeletion();
  const { downloadTrack } = useDownload();
  const navigate = useNavigate();

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setDropdownPosition(rect.bottom + 180 > window.innerHeight ? 'top' : 'bottom');
    }
    setIsOpen(v => !v);
  };

  const handleDeleteSuccess = () => {
    handleTrackDeleted(track.id);
    setShowDeleteModal(false);
    setIsOpen(false);
    onTrackDeleted?.();
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      {/* Trigger */}
      <button
        onClick={toggleMenu}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        title="Track options"
        style={{
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isOpen ? 'var(--bg-hover)' : 'transparent',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          color: 'var(--text-secondary)',
          opacity: triggerHovered || isOpen ? 1 : 0.35,
          transition: 'opacity 0.15s ease, background 0.15s ease',
        }}
      >
        <FiMoreHorizontal size={16} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', right: 0,
          ...(dropdownPosition === 'top' ? { bottom: 34 } : { top: 34 }),
          width: 192,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'scaleIn 0.12s ease forwards',
          transformOrigin: dropdownPosition === 'top' ? 'bottom right' : 'top right',
          paddingTop: 4, paddingBottom: 4,
        }}>
          <MenuItem
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); navigate(`/track/${track.id}`); }}
            icon={<FiEdit2 size={14} />}
            label="Edit Metadata"
          />

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px' }} />

          {showAddToPlaylist && (
            <MenuItem
              onClick={(e) => { e.stopPropagation(); setShowAddToPlaylistModal(true); setIsOpen(false); }}
              icon={<FiPlus size={14} />}
              label="Add to Playlist"
            />
          )}
          <MenuItem
            onClick={async (e) => { e.stopPropagation(); await downloadTrack(track); setIsOpen(false); }}
            icon={<FiDownload size={14} />}
            label="Download"
          />

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px' }} />

          <MenuItem
            onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); setIsOpen(false); }}
            icon={<FiTrash2 size={14} />}
            label="Delete"
            danger
          />
        </div>
      )}

      <DeleteTrackModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        track={track}
        onSuccess={handleDeleteSuccess}
      />
      {showAddToPlaylist && (
        <AddToPlaylistModal
          isOpen={showAddToPlaylistModal}
          onClose={() => setShowAddToPlaylistModal(false)}
          track={track}
        />
      )}
    </div>
  );
};

export default TrackMenu;
