import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FiSearch, FiX, FiMusic, FiDisc, FiList } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { useMusicData, useMusicImages } from '../../hooks/useMusicStore';
import { usePlaylistData } from '../../hooks/usePlaylist';
import { Track, Album } from '../../hooks/useTracks';
import { Playlist } from '../../types/playlist';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';

// Sub-component: loads a thumbnail URL async and shows img or falls back to icon
const ResultArt: React.FC<{
  thumbnailPath?: string;
  fallbackIcon: React.ReactNode;
  bg: string;
}> = ({ thumbnailPath, fallbackIcon, bg }) => {
  const { getThumbnailUrl } = useMusicImages();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (thumbnailPath) {
      getThumbnailUrl(thumbnailPath).then(u => {
        if (!cancelled) setUrl(u);
      });
    } else {
      setUrl(null);
    }
    return () => { cancelled = true; };
  }, [thumbnailPath]);

  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
      background: bg, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : fallbackIcon
      }
    </div>
  );
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'track' | 'album' | 'playlist';
  item: Track | Album | Playlist;
  matchType: 'title' | 'artist' | 'album' | 'genre' | 'name' | 'description';
}

const TYPE_META = {
  track:    { label: 'Track',    color: '#00e5ff', bg: 'rgba(0,229,255,0.12)',   Icon: FiMusic },
  album:    { label: 'Album',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', Icon: FiDisc  },
  playlist: { label: 'Playlist', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  Icon: FiList  },
} as const;

const MATCH_LABEL: Record<SearchResult['matchType'], string> = {
  title: 'Title', artist: 'Artist', album: 'Album',
  genre: 'Genre', name: 'Name', description: 'Desc',
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { tracks, albums } = useMusicData();
  const { playlists } = usePlaylistData();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { setPlaylist } = useAudioPlayerStore();

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const getDisplayText = (result: SearchResult): string => {
    if (result.type === 'track') {
      const t = result.item as Track;
      return t.metadata?.title || t.original_filename;
    } else if (result.type === 'album') {
      return (result.item as Album).name;
    }
    return (result.item as Playlist).name;
  };

  const getSecondaryText = (result: SearchResult): string => {
    if (result.type === 'track') {
      const t = result.item as Track;
      return t.metadata?.artist || 'Unknown artist';
    } else if (result.type === 'album') {
      const a = result.item as Album;
      return a.artist || 'Unknown artist';
    }
    const p = result.item as Playlist;
    return p.description || `${p.tracks?.length || 0} track${(p.tracks?.length || 0) !== 1 ? 's' : ''}`;
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'track') {
      setPlaylist([result.item as Track], 0);
    } else if (result.type === 'album') {
      navigate('/library', { state: { searchQuery, viewMode: 'albums' } });
    } else {
      navigate(`/playlists/${encodeURIComponent((result.item as Playlist).id)}`);
    }
    onClose();
    setSearchQuery('');
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    tracks.forEach(track => {
      const matches: Array<{ type: SearchResult['matchType']; score: number }> = [];
      if (track.metadata?.title?.toLowerCase().includes(query))
        matches.push({ type: 'title', score: track.metadata.title.toLowerCase().indexOf(query) === 0 ? 10 : 5 });
      if (track.original_filename.toLowerCase().includes(query))
        matches.push({ type: 'title', score: track.original_filename.toLowerCase().indexOf(query) === 0 ? 8 : 3 });
      if (track.metadata?.artist?.toLowerCase().includes(query))
        matches.push({ type: 'artist', score: track.metadata.artist.toLowerCase().indexOf(query) === 0 ? 9 : 4 });
      if (track.metadata?.album?.toLowerCase().includes(query))
        matches.push({ type: 'album', score: track.metadata.album.toLowerCase().indexOf(query) === 0 ? 7 : 3 });
      if (track.metadata?.genre?.toLowerCase().includes(query))
        matches.push({ type: 'genre', score: 2 });
      if (matches.length > 0)
        results.push({ type: 'track', item: track, matchType: matches.sort((a, b) => b.score - a.score)[0].type });
    });

    albums.forEach(album => {
      const matches: Array<{ type: SearchResult['matchType']; score: number }> = [];
      if (album.name.toLowerCase().includes(query))
        matches.push({ type: 'album', score: album.name.toLowerCase().indexOf(query) === 0 ? 10 : 5 });
      if (album.artist?.toLowerCase().includes(query))
        matches.push({ type: 'artist', score: album.artist.toLowerCase().indexOf(query) === 0 ? 9 : 4 });
      if (matches.length > 0)
        results.push({ type: 'album', item: album, matchType: matches.sort((a, b) => b.score - a.score)[0].type });
    });

    playlists.forEach(playlist => {
      const matches: Array<{ type: SearchResult['matchType']; score: number }> = [];
      if (playlist.name.toLowerCase().includes(query))
        matches.push({ type: 'name', score: playlist.name.toLowerCase().indexOf(query) === 0 ? 10 : 5 });
      if (playlist.description?.toLowerCase().includes(query))
        matches.push({ type: 'description', score: playlist.description.toLowerCase().indexOf(query) === 0 ? 8 : 3 });
      if (matches.length > 0)
        results.push({ type: 'playlist', item: playlist, matchType: matches.sort((a, b) => b.score - a.score)[0].type });
    });

    return results
      .sort((a, b) => {
        const aStarts = getDisplayText(a).toLowerCase().startsWith(query);
        const bStarts = getDisplayText(b).toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        const typeOrder = { playlist: 0, album: 1, track: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      })
      .slice(0, 10);
  }, [searchQuery, tracks, albums, playlists]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, searchResults.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); if (searchResults[selectedIndex]) handleResultClick(searchResults[selectedIndex]); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults]);

  useEffect(() => { setSelectedIndex(0); }, [searchResults]);

  if (!isOpen) return null;

  const hasResults = searchResults.length > 0;
  const hasQuery = searchQuery.trim().length > 0;

  // Group results by type for section headers
  const grouped = useMemo(() => {
    const groups: { type: SearchResult['type']; results: SearchResult[] }[] = [];
    const order: SearchResult['type'][] = ['playlist', 'album', 'track'];
    order.forEach(type => {
      const group = searchResults.filter(r => r.type === type);
      if (group.length) groups.push({ type, results: group });
    });
    return groups;
  }, [searchResults]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(4,4,10,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '10vh',
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderRadius: hasQuery && hasResults ? '14px 14px 0 0' : 14,
          padding: '0 16px',
          height: 52,
          boxShadow: '0 0 0 1px var(--accent-dim), 0 20px 60px rgba(0,0,0,0.6)',
          transition: 'border-radius 0.15s ease',
        }}>
          <FiSearch size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher des titres, albums, artistes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 15,
              fontFamily: 'Manrope, sans-serif', fontWeight: 500,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 5px', cursor: 'pointer',
                color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <FiX size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', fontSize: 11,
              fontFamily: 'Space Grotesk, monospace',
              padding: '2px 6px',
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
              borderRadius: 6, flexShrink: 0,
            }}
          >
            Esc
          </button>
        </div>

        {/* Results panel */}
        {hasQuery && (
          <div style={{
            background: 'var(--bg-elevated)',
            borderLeft: '1px solid var(--border-light)',
            borderRight: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
            borderRadius: '0 0 14px 14px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {hasResults ? (
              <>
                {/* Flat list with section labels */}
                {(() => {
                  let globalIdx = 0;
                  return grouped.map(group => {
                    const meta = TYPE_META[group.type];
                    return (
                      <div key={group.type}>
                        {/* Section header */}
                        <div style={{
                          padding: '8px 16px 4px',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          color: meta.color, textTransform: 'uppercase',
                          borderTop: '1px solid var(--border)',
                          marginTop: group.type === grouped[0].type ? 0 : 0,
                        }}>
                          {group.type === 'track' ? 'Tracks' : group.type === 'album' ? 'Albums' : 'Playlists'}
                        </div>
                        {group.results.map(result => {
                          const idx = globalIdx++;
                          const isSelected = idx === selectedIndex;
                          const Icon = meta.Icon;
                          return (
                            <button
                              key={`${result.type}-${
                                result.type === 'track'
                                  ? (result.item as Track).id
                                  : result.type === 'album'
                                  ? `${(result.item as Album).name}-${(result.item as Album).artist}`
                                  : (result.item as Playlist).id
                              }`}
                              onClick={() => handleResultClick(result)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                padding: '9px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
                                background: isSelected ? 'rgba(0,229,255,0.07)' : 'transparent',
                                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                                fontFamily: 'Manrope, sans-serif',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={e => { setSelectedIndex(idx); }}
                            >
                              {/* Art / Icon */}
                              <ResultArt
                                thumbnailPath={
                                  result.type === 'track'
                                    ? (result.item as Track).cover_thumbnail_path
                                    : result.type === 'album'
                                    ? (result.item as Album).cover_thumbnail_path
                                    : undefined
                                }
                                fallbackIcon={<Icon size={15} style={{ color: meta.color }} />}
                                bg={meta.bg}
                              />

                              {/* Text */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 600,
                                  color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {getDisplayText(result)}
                                </div>
                                <div style={{
                                  fontSize: 11, color: 'var(--text-tertiary)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  marginTop: 1,
                                }}>
                                  {getSecondaryText(result)}
                                </div>
                              </div>

                              {/* Match type pill */}
                              <span style={{
                                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                                color: meta.color, background: meta.bg,
                                padding: '2px 7px', borderRadius: 20,
                                flexShrink: 0, textTransform: 'uppercase',
                              }}>
                                {MATCH_LABEL[result.matchType]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()}

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 16,
                  padding: '8px 16px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
                    <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>↑↓</kbd>
                    naviguer
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
                    <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>↵</kbd>
                    ouvrir
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Space Grotesk, monospace' }}>
                    <kbd style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>Esc</kbd>
                    fermer
                  </span>
                </div>
              </>
            ) : (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
                  background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FiSearch size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                  Aucun résultat pour « {searchQuery} »
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Essayez d'autres termes de recherche
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
