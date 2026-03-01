import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Track, Album } from '../hooks/useTracks';

// Types pour le store
interface ThumbnailCache {
  [path: string]: {
    url: string;
    timestamp: number;
  };
}

interface CoverCache {
  [path: string]: {
    url: string;
    timestamp: number;
  };
}

interface MusicState {
  // Data state
  tracks: Track[];
  albums: Album[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  
  // Cache state
  thumbnailCache: ThumbnailCache;
  coverCache: CoverCache;
  
  // Stats
  totalTracks: number;
  
  // Actions
  setTracks: (tracks: Track[]) => void;
  setAlbums: (albums: Album[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Cache actions
  addThumbnailToCache: (path: string, url: string) => void;
  getThumbnailFromCache: (path: string) => string | null;
  addCoverToCache: (path: string, url: string) => void;
  getCoverFromCache: (path: string) => string | null;
  clearCache: () => void;
  
  // Data fetching
  fetchTracks: () => Promise<void>;
  forceFetch: () => Promise<void>;
  shouldRefetch: () => boolean;
  
  // Track deletion
  deleteTrack: (trackId: string) => void;
  deleteAllTracks: () => void;
  deleteAlbum: (albumName: string) => void;
  
  // Reset state
  reset: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Initial state
      tracks: [],
      albums: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      thumbnailCache: {},
      coverCache: {},
      totalTracks: 0,

      // Basic setters
      setTracks: (tracks) => set({ tracks, totalTracks: tracks.length }),
      setAlbums: (albums) => set({ albums }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Cache management
      addThumbnailToCache: (path, url) => {
        const state = get();
        set({
          thumbnailCache: {
            ...state.thumbnailCache,
            [path]: {
              url,
              timestamp: Date.now()
            }
          }
        });
      },

      getThumbnailFromCache: (path) => {
        const cache = get().thumbnailCache[path];
        if (cache && Date.now() - cache.timestamp < IMAGE_CACHE_DURATION) {
          return cache.url;
        }
        return null;
      },

      addCoverToCache: (path, url) => {
        const state = get();
        set({
          coverCache: {
            ...state.coverCache,
            [path]: {
              url,
              timestamp: Date.now()
            }
          }
        });
      },

      getCoverFromCache: (path) => {
        const cache = get().coverCache[path];
        if (cache && Date.now() - cache.timestamp < IMAGE_CACHE_DURATION) {
          return cache.url;
        }
        return null;
      },

      clearCache: () => {
        set({
          thumbnailCache: {},
          coverCache: {}
        });
      },

      // Check if we should refetch data
      shouldRefetch: () => {
        const { lastFetch, tracks } = get();
        return !lastFetch || 
               Date.now() - lastFetch > CACHE_DURATION || 
               tracks.length === 0;
      },

      // Main data fetching function
      fetchTracks: async () => {
        const state = get();
        
        // Don't fetch if we have fresh data
        if (!state.shouldRefetch() && !state.error) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const tracksResponse = await fetch(`${API_BASE_URL}/files/tracks?limit=1000`, {
            headers: getAuthHeaders()
          });

          if (!tracksResponse.ok) {
            throw new Error('Erreur lors du chargement des morceaux');
          }

          const tracks: Track[] = await tracksResponse.json();

          // Fetch metadata for all tracks
          const tracksWithMetadata = await Promise.all(
            tracks.map(async (track) => {
              try {
                const metadataResponse = await fetch(
                  `${API_BASE_URL}/files/tracks/${track.id}/metadata`,
                  { headers: getAuthHeaders() }
                );

                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  return { ...track, metadata };
                } else {
                  return track;
                }
              } catch (error) {
                console.warn(`Erreur lors du chargement des métadonnées pour ${track.id}:`, error);
                return track;
              }
            })
          );

          // Organize tracks by album
          const albumsMap = new Map<string, Album>();
          const orphanTracks: Track[] = [];

          tracksWithMetadata.forEach(track => {
            const albumName = track.metadata?.album || 'Singles and miscellaneous tracks';
            const artist = track.metadata?.artist || 'Artiste inconnu';
            const year = track.metadata?.year;

            if (albumName === 'Singles and miscellaneous tracks') {
              orphanTracks.push(track);
            } else {
              if (!albumsMap.has(albumName)) {
                albumsMap.set(albumName, {
                  name: albumName,
                  artist,
                  year,
                  cover_thumbnail_path: track.cover_thumbnail_path,
                  tracks: []
                });
              }
              
              const album = albumsMap.get(albumName)!;
              album.tracks.push(track);
              
              if (!album.cover_thumbnail_path && track.cover_thumbnail_path) {
                album.cover_thumbnail_path = track.cover_thumbnail_path;
              }
            }
          });

          // Sort tracks within albums
          albumsMap.forEach(album => {
            album.tracks.sort((a, b) => {
              const trackA = a.metadata?.track_number || 999;
              const trackB = b.metadata?.track_number || 999;
              return trackA - trackB;
            });
          });

          // Create final albums array
          const albums = Array.from(albumsMap.values());
          if (orphanTracks.length > 0) {
            albums.push({
              name: 'Singles and miscellaneous tracks',
              tracks: orphanTracks.sort((a, b) => 
                new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
              )
            });
          }

          // Sort albums
          const sortedAlbums = albums.sort((a, b) => {
            if (a.name === 'Singles and miscellaneous tracks') return 1;
            if (b.name === 'Singles and miscellaneous tracks') return -1;
            
            if (a.year && b.year) {
              return b.year - a.year;
            }
            return a.name.localeCompare(b.name);
          });

          // Update store
          set({
            tracks: tracksWithMetadata,
            albums: sortedAlbums,
            isLoading: false,
            error: null,
            lastFetch: Date.now(),
            totalTracks: tracksWithMetadata.length
          });

        } catch (error) {
          console.error('Erreur lors du chargement des morceaux:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Une erreur est survenue'
          });
        }
      },

      // Force fetch (ignores cache)
      forceFetch: async () => {
        set({ isLoading: true, error: null });

        try {
          const tracksResponse = await fetch(`${API_BASE_URL}/files/tracks?limit=1000`, {
            headers: getAuthHeaders()
          });

          if (!tracksResponse.ok) {
            throw new Error('Erreur lors du chargement des morceaux');
          }

          const tracks: Track[] = await tracksResponse.json();

          // Fetch metadata for all tracks
          const tracksWithMetadata = await Promise.all(
            tracks.map(async (track) => {
              try {
                const metadataResponse = await fetch(
                  `${API_BASE_URL}/files/tracks/${track.id}/metadata`,
                  { headers: getAuthHeaders() }
                );

                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  return { ...track, metadata };
                } else {
                  return track;
                }
              } catch (error) {
                console.warn(`Erreur lors du chargement des métadonnées pour ${track.id}:`, error);
                return track;
              }
            })
          );

          // Organize tracks by album (same logic as fetchTracks)
          const albumsMap = new Map<string, Album>();
          const orphanTracks: Track[] = [];

          tracksWithMetadata.forEach(track => {
            const albumName = track.metadata?.album || 'Singles and miscellaneous tracks';
            const artist = track.metadata?.artist || 'Artiste inconnu';
            const year = track.metadata?.year;

            if (albumName === 'Singles and miscellaneous tracks') {
              orphanTracks.push(track);
            } else {
              if (!albumsMap.has(albumName)) {
                albumsMap.set(albumName, {
                  name: albumName,
                  artist,
                  year,
                  cover_thumbnail_path: track.cover_thumbnail_path,
                  tracks: []
                });
              }
              
              const album = albumsMap.get(albumName)!;
              album.tracks.push(track);
              
              if (!album.cover_thumbnail_path && track.cover_thumbnail_path) {
                album.cover_thumbnail_path = track.cover_thumbnail_path;
              }
            }
          });

          // Sort tracks within albums
          albumsMap.forEach(album => {
            album.tracks.sort((a, b) => {
              const trackA = a.metadata?.track_number || 999;
              const trackB = b.metadata?.track_number || 999;
              return trackA - trackB;
            });
          });

          // Create final albums array
          const albums = Array.from(albumsMap.values());
          if (orphanTracks.length > 0) {
            albums.push({
              name: 'Singles and miscellaneous tracks',
              tracks: orphanTracks.sort((a, b) => 
                new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
              )
            });
          }

          // Sort albums
          const sortedAlbums = albums.sort((a, b) => {
            if (a.name === 'Singles and miscellaneous tracks') return 1;
            if (b.name === 'Singles and miscellaneous tracks') return -1;
            
            if (a.year && b.year) {
              return b.year - a.year;
            }
            return a.name.localeCompare(b.name);
          });

          // Update store
          set({
            tracks: tracksWithMetadata,
            albums: sortedAlbums,
            isLoading: false,
            error: null,
            lastFetch: Date.now(),
            totalTracks: tracksWithMetadata.length
          });

        } catch (error) {
          console.error('Erreur lors du chargement forcé des morceaux:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Une erreur est survenue'
          });
        }
      },

      // Track deletion methods
      deleteTrack: (trackId: string) => {
        const state = get();
        
        // Remove track from tracks array
        const updatedTracks = state.tracks.filter(track => track.id !== trackId);
        
        // Update albums by removing the track and filtering empty albums
        const updatedAlbums = state.albums.map(album => ({
          ...album,
          tracks: album.tracks.filter(track => track.id !== trackId)
        })).filter(album => album.tracks.length > 0);
        
        set({
          tracks: updatedTracks,
          albums: updatedAlbums,
          totalTracks: updatedTracks.length
        });
      },

      deleteAllTracks: () => {
        set({
          tracks: [],
          albums: [],
          totalTracks: 0
        });
      },

      deleteAlbum: (albumName: string) => {
        const state = get();
        
        // Get track IDs from the album
        const albumToDelete = state.albums.find(album => album.name === albumName);
        if (!albumToDelete) return;
        
        const trackIdsToDelete = new Set(albumToDelete.tracks.map(track => track.id));
        
        // Remove tracks from tracks array
        const updatedTracks = state.tracks.filter(track => !trackIdsToDelete.has(track.id));
        
        // Remove album from albums array
        const updatedAlbums = state.albums.filter(album => album.name !== albumName);
        
        set({
          tracks: updatedTracks,
          albums: updatedAlbums,
          totalTracks: updatedTracks.length
        });
      },

      // Reset store
      reset: () => {
        set({
          tracks: [],
          albums: [],
          isLoading: false,
          error: null,
          lastFetch: null,
          thumbnailCache: {},
          coverCache: {},
          totalTracks: 0
        });
      }
    }),
    {
      name: 'music-store',
      storage: createJSONStorage(() => sessionStorage),
      // Don't persist loading state and cache URLs (they expire)
      partialize: (state) => ({
        tracks: state.tracks,
        albums: state.albums,
        lastFetch: state.lastFetch,
        totalTracks: state.totalTracks,
        // Don't persist cache URLs as they contain blob URLs that become invalid
        thumbnailCache: {},
        coverCache: {}
      }),
    }
  )
);
