import React, { useState } from 'react';
import { Outlet } from 'react-router';
import Header from '../common/header';
import Sidebar from '../common/sidebar';
import { AudioPlayer } from '../player';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentTrack } = useAudioPlayerStore();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(v => !v)} />

      {/* Main content area */}
      <main style={{
        marginLeft: 'var(--sidebar-width)',
        marginTop: 'var(--header-height)',
        paddingBottom: currentTrack ? 'calc(var(--player-height) + 16px)' : 16,
        minHeight: `calc(100vh - var(--header-height))`,
        flex: 1,
        overflowX: 'hidden',
      }} className="layout-main">
        <Outlet />
      </main>

      {/* Bottom player */}
      {currentTrack && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 100,
          height: 'var(--player-height)',
        }}>
          <AudioPlayer variant="bottom" />
        </div>
      )}

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          .layout-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;