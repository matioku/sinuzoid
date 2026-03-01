import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { FiHome, FiBookOpen, FiList, FiPlus, FiClock, FiUpload, FiUser } from 'react-icons/fi';
import SinuzoidLogo from '../../assets/logos/logo_sinuzoid-cyan.svg?react';
import SinuzoidTextLogo from '../../assets/logos/logo_sinuzoid_text-cyan.svg?react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlaylistData } from '../../hooks/usePlaylist';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { playlists } = usePlaylistData();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { name: 'Home',           icon: <FiHome size={18} />,    path: '/' },
    { name: 'Library',        icon: <FiBookOpen size={18} />, path: '/library' },
    { name: 'Recently Added', icon: <FiClock size={18} />,   path: '/recently-added' },
    { name: 'Playlists',      icon: <FiList size={18} />,    path: '/playlists' },
    { name: 'Upload',         icon: <FiUpload size={18} />,  path: '/upload' },
  ];

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    background: 'var(--bg-elevated)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'transform 0.25s ease',
  };

  return (
    <aside style={{
      ...sidebarStyle,
      transform: isOpen || window.innerWidth >= 768 ? 'translateX(0)' : 'translateX(-100%)',
    }} className="sz-sidebar">
      {/* Logo */}
      <div style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        gap: 10,
      }}>
        <SinuzoidLogo style={{ width: 26, height: 26, flexShrink: 0 }} />
        <SinuzoidTextLogo style={{ height: 16, color: 'var(--accent)' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {/* Main Navigation */}
        <nav style={{ marginBottom: 24 }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: isActive(item.path) ? 600 : 500,
                color: isActive(item.path) ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive(item.path) ? 'var(--accent-dim)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.12s ease',
              }}
              className="sidebar-link"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="sz-divider" style={{ marginBottom: 20 }} />

        {/* Playlists */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Playlists
            </span>
            <button
              className="sz-btn sz-btn-icon"
              style={{ padding: 4, borderRadius: 6 }}
              onClick={() => { navigate('/playlists?create=true'); onClose?.(); }}
              title="New playlist"
            >
              <FiPlus size={14} />
            </button>
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {playlists.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '4px 10px' }}>
                No playlists yet
              </p>
            ) : (
              playlists.slice(0, 15).map(pl => {
                const path = `/playlists/${encodeURIComponent(pl.id)}`;
                return (
                  <Link
                    key={pl.id}
                    to={path}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 6, marginBottom: 1,
                      fontSize: 13, fontWeight: 500,
                      color: isActive(path) ? 'var(--accent)' : 'var(--text-secondary)',
                      background: isActive(path) ? 'var(--accent-dim)' : 'transparent',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    className="sidebar-link"
                  >
                    <FiList size={13} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom — profile */}
      {isAuthenticated && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <Link
            to="/profile"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              color: isActive('/profile') ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive('/profile') ? 'var(--accent-dim)' : 'transparent',
              textDecoration: 'none',
            }}
            className="sidebar-link"
          >
            <FiUser size={16} />
            Profile
          </Link>
        </div>
      )}

      <style>{`
        .sidebar-link:hover {
          color: var(--text-primary) !important;
          background: var(--bg-hover) !important;
        }
        .sz-sidebar {
          scrollbar-width: none;
        }
        @media (max-width: 768px) {
          .sz-sidebar {
            transform: translateX(${isOpen ? '0' : '-100%'}) !important;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;