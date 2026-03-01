import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { FiSearch, FiMenu, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 'var(--sidebar-width)',
        right: 0,
        height: 'var(--header-height)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: scrolled ? 'rgba(8,8,16,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.2s ease',
      }} className="sz-header">
        {/* Mobile menu button */}
        <button
          className="sz-btn sz-btn-icon"
          onClick={onMenuClick}
          style={{ display: 'none', marginRight: 12 }}
          aria-label="Open menu"
          id="mobile-menu-btn"
        >
          <FiMenu size={20} />
        </button>

        {/* Spacer — left side reserved for page title injected via context if needed */}
        <div style={{ flex: 1 }} />

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="sz-btn sz-btn-icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            style={{ width: 36, height: 36, borderRadius: 10 }}
          >
            <FiSearch size={17} />
          </button>

          {isAuthenticated ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px 5px 6px',
                  background: userMenuOpen ? 'var(--bg-overlay)' : 'transparent',
                  border: '1px solid transparent',
                  borderColor: userMenuOpen ? 'var(--border)' : 'transparent',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                  fontFamily: 'Manrope, sans-serif',
                }}
                className="sz-user-btn"
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FiUser size={13} style={{ color: 'var(--accent)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.username}
                </span>
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 200,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  animation: 'scaleIn 0.15s ease',
                  transformOrigin: 'top right',
                  zIndex: 200,
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.username}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{user?.email}</div>
                  </div>
                  <div style={{ padding: 4 }}>
                    <button
                      onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                        padding: '9px 10px', borderRadius: 8, background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'Manrope, sans-serif',
                      }}
                      className="menu-item"
                    >
                      <FiSettings size={15} />
                      Profile & Settings
                    </button>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                        padding: '9px 10px', borderRadius: 8, background: 'none', border: 'none',
                        cursor: 'pointer', color: '#ff453a', fontSize: 13, fontFamily: 'Manrope, sans-serif',
                      }}
                      className="menu-item"
                    >
                      <FiLogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => navigate('/login')}>Sign in</button>
              <button className="sz-btn sz-btn-primary sz-btn-sm" onClick={() => navigate('/register')}>Get started</button>
            </div>
          )}
        </div>
      </header>

      {searchOpen && <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}

      <style>{`
        .sz-user-btn:hover {
          background: var(--bg-hover) !important;
          border-color: var(--border) !important;
        }
        .menu-item:hover {
          background: var(--bg-hover) !important;
        }
        @media (max-width: 768px) {
          .sz-header {
            left: 0 !important;
          }
          #mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default Header;