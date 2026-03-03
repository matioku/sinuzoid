import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Playlist, PlaylistCreate, PlaylistUpdate } from '../types/playlist';
import { playlistApi } from '../services/playlistApi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PlaylistState {
  // Data
  playlists: Playlist[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Current playlist (for detail view)
  currentPlaylist: Playlist | null;
  isLoadingCurrent: boolean;

  // Cache duration (5 minutes)
  cacheDuration: number;

  // Actions
  setPlaylists: (playlists: Playlist[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  setLoadingCurrent: (loading: boolean) => void;

  // CRUD Operations
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (playlistData: PlaylistCreate) => Promise<Playlist>;
  updatePlaylist: (playlistId: string, updateData: PlaylistUpdate) => Promise<Playlist>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  fetchPlaylistById: (playlistId: string) => Promise<Playlist>;

  // Track Operations
  addTrackToPlaylist: (playlistId: string, trackId: string, position?: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;

  // Utility
  shouldRefetch: () => boolean;
  clearCache: () => void;
  reset: () => void;
  getPlaylistById: (playlistId: string) => Playlist | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      // Initial state
      playlists: [],
      isLoading: false,
      error: null,
      lastFetch: null,
      currentPlaylist: null,
      isLoadingCurrent: false,
      cacheDuration: CACHE_DURATION,

      // Basic setters
      setPlaylists: (playlists) => set({ 
        playlists, 
        lastFetch: Date.now(),
        error: null 
      }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setCurrentPlaylist: (currentPlaylist) => set({ currentPlaylist }),
      setLoadingCurrent: (isLoadingCurrent) => set({ isLoadingCurrent }),

      // Check if we should refetch data
      shouldRefetch: () => {
        const { lastFetch, playlists } = get();
        return !lastFetch || 
               Date.now() - lastFetch > CACHE_DURATION || 
               playlists.length === 0;
      },

      // CRUD Operations
      fetchPlaylists: async () => {
        const state = get();
        
        // Don't fetch if we have fresh data
        if (!state.shouldRefetch() && !state.error) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const playlists = await playlistApi.getUserPlaylists();
          set({
            playlists,
            isLoading: false,
            error: null,
            lastFetch: Date.now()
          });
        } catch (error) {
          console.error('Error fetching playlists:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch playlists'
          });
        }
      },

      createPlaylist: async (playlistData: PlaylistCreate): Promise<Playlist> => {
        set({ error: null });

        try {
          const newPlaylist = await playlistApi.createPlaylist(playlistData);
          
          // Add to existing playlists
          const currentPlaylists = get().playlists;
          set({
            playlists: [newPlaylist, ...currentPlaylists],
            lastFetch: Date.now()
          });

          return newPlaylist;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create playlist';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      updatePlaylist: async (playlistId: string, updateData: PlaylistUpdate): Promise<Playlist> => {
        set({ error: null });

        try {
          const updatedPlaylist = await playlistApi.updatePlaylist(playlistId, updateData);
          
          // Update in playlists array
          const currentPlaylists = get().playlists;
          const updatedPlaylists = currentPlaylists.map(playlist =>
            playlist.id === playlistId ? updatedPlaylist : playlist
          );
          
          set({
            playlists: updatedPlaylists,
            currentPlaylist: get().currentPlaylist?.id === playlistId ? updatedPlaylist : get().currentPlaylist,
            lastFetch: Date.now()
          });

          return updatedPlaylist;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update playlist';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      deletePlaylist: async (playlistId: string): Promise<void> => {
        set({ error: null });

        try {
          await playlistApi.deletePlaylist(playlistId);
          
          // Remove from playlists array
          const currentPlaylists = get().playlists;
          const filteredPlaylists = currentPlaylists.filter(playlist => playlist.id !== playlistId);
          
          set({
            playlists: filteredPlaylists,
            currentPlaylist: get().currentPlaylist?.id === playlistId ? null : get().currentPlaylist,
            lastFetch: Date.now()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete playlist';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      fetchPlaylistById: async (playlistId: string): Promise<Playlist> => {
        set({ isLoadingCurrent: true, error: null });

        try {
          const playlist = await playlistApi.getPlaylistById(playlistId);
          
          // Enrich playlist tracks with metadata.
          // Prefer tracks already loaded in musicStore (they have full metadata),
          // and only fall back to individual API calls for tracks not in the store.
          let playlistWithMetadata = playlist;
          if (playlist.tracks && playlist.tracks.length > 0) {
            // Dynamically import to avoid circular dependency
            const { useMusicStore } = await import('./musicStore');
            const musicState = useMusicStore.getState();

            // If music store hasn't loaded tracks yet, trigger a fetch first
            if (musicState.tracks.length === 0 && musicState.shouldRefetch()) {
              await musicState.fetchTracks();
            }

            const storeTracks = useMusicStore.getState().tracks;
            const storeMap = new Map(storeTracks.map(t => [t.id, t]));

            const tracksWithMetadata = await Promise.all(
              playlist.tracks.map(async (track) => {
                // Use music store track if available (already has metadata)
                const storeTrack = storeMap.get(track.id);
                if (storeTrack?.metadata) {
                  return { ...track, metadata: storeTrack.metadata };
                }

                // Fall back to individual metadata fetch
                try {
                  const token = sessionStorage.getItem('access_token');
                  const metadataResponse = await fetch(
                    `${API_BASE_URL}/files/tracks/${track.id}/metadata`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  );

                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    return { ...track, metadata };
                  }
                  return track;
                } catch (error) {
                  console.warn(`Error loading metadata for track ${track.id}:`, error);
                  return track;
                }
              })
            );
            
            playlistWithMetadata = {
              ...playlist,
              tracks: tracksWithMetadata
            };
          }
          
          // Update currentPlaylist
          set({
            currentPlaylist: playlistWithMetadata,
            isLoadingCurrent: false
          });
          
          // Also update the playlist in the playlists array if it exists
          const currentPlaylists = get().playlists;
          const playlistIndex = currentPlaylists.findIndex(p => p.id === playlistId);
          if (playlistIndex !== -1) {
            const updatedPlaylists = [...currentPlaylists];
            updatedPlaylists[playlistIndex] = playlistWithMetadata;
            set({ playlists: updatedPlaylists });
          }
          
          return playlistWithMetadata;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch playlist';
          set({
            isLoadingCurrent: false,
            error: errorMessage
          });
          throw new Error(errorMessage);
        }
      },

      // Track Operations
      addTrackToPlaylist: async (playlistId: string, trackId: string, position?: number): Promise<void> => {
        try {
          await playlistApi.addTrackToPlaylist({ playlist_id: playlistId, track_id: trackId, position });
          
          // Always refresh the specific playlist to get updated tracks
          await get().fetchPlaylistById(playlistId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add track to playlist';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      removeTrackFromPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
        try {
          await playlistApi.removeTrackFromPlaylist(playlistId, trackId);
          
          // Always refresh the specific playlist to get updated tracks
          await get().fetchPlaylistById(playlistId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove track from playlist';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      // Utility functions
      getPlaylistById: (playlistId: string) => {
        return get().playlists.find(playlist => playlist.id === playlistId) || null;
      },

      clearCache: () => {
        set({
          playlists: [],
          lastFetch: null,
          currentPlaylist: null,
          error: null
        });
      },

      reset: () => {
        set({
          playlists: [],
          isLoading: false,
          error: null,
          lastFetch: null,
          currentPlaylist: null,
          isLoadingCurrent: false
        });
      }
    }),
    {
      name: 'playlist-store',
      partialize: (state) => ({
        playlists: state.playlists,
        lastFetch: state.lastFetch
      })
    }
  )
);
