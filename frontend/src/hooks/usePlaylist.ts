import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlaylistStore } from '../store/playlistStore';
import { playlistApi } from '../services/playlistApi';
import { PlaylistSearchParams, PlaylistStats } from '../types/playlist';

/**
 * Hook principal pour gérer les playlists
 */
export const usePlaylistData = () => {
  const { user } = useAuth();
  const {
    playlists,
    isLoading,
    error,
    fetchPlaylists,
    shouldRefetch,
    reset
  } = usePlaylistStore();

  useEffect(() => {
    if (user && shouldRefetch()) {
      fetchPlaylists();
    }
  }, [user, fetchPlaylists, shouldRefetch]);

  // Reset store when user logs out
  useEffect(() => {
    if (!user) {
      reset();
    }
  }, [user, reset]);

  const refetch = () => {
    if (user) {
      fetchPlaylists();
    }
  };

  return {
    playlists,
    isLoading,
    error,
    refetch,
    totalPlaylists: playlists.length
  };
};

/**
 * Hook pour les opérations CRUD sur les playlists
 */
export const usePlaylistOperations = () => {
  const {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    fetchPlaylists
  } = usePlaylistStore();

  return {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    refreshPlaylists: fetchPlaylists
  };
};

/**
 * Hook pour une playlist spécifique
 */
export const usePlaylist = (playlistId?: string) => {
  const {
    currentPlaylist,
    isLoadingCurrent,
    fetchPlaylistById,
    getPlaylistById
  } = usePlaylistStore();

  useEffect(() => {
    if (playlistId) {
      // Always fetch the full playlist with metadata when opening detail.
      // The persisted store has tracks without metadata, so we cannot rely on cache.
      const cachedPlaylist = getPlaylistById(playlistId);
      const hasMetadata = cachedPlaylist?.tracks?.some(t => (t as any).metadata);
      if (!cachedPlaylist || !hasMetadata) {
        fetchPlaylistById(playlistId);
      }
    }
  }, [playlistId, fetchPlaylistById, getPlaylistById]);

  const playlist = playlistId ? getPlaylistById(playlistId) || currentPlaylist : null;

  return {
    playlist,
    isLoading: isLoadingCurrent,
    refetch: playlistId ? () => fetchPlaylistById(playlistId) : undefined
  };
};

/**
 * Hook pour la recherche de playlists
 */
export const usePlaylistSearch = () => {
  const searchPlaylists = async (params: PlaylistSearchParams) => {
    try {
      return await playlistApi.searchPlaylists(params);
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  };

  const getPlaylistSuggestions = async (query: string, limit = 5) => {
    try {
      return await playlistApi.getPlaylistSuggestions(query, limit);
    } catch (error) {
      console.error('Error getting playlist suggestions:', error);
      throw error;
    }
  };

  const getRecentPlaylists = async (limit = 10) => {
    try {
      return await playlistApi.getRecentPlaylists(limit);
    } catch (error) {
      console.error('Error getting recent playlists:', error);
      throw error;
    }
  };

  const getPopularPlaylists = async (limit = 10) => {
    try {
      return await playlistApi.getPopularPlaylists(limit);
    } catch (error) {
      console.error('Error getting popular playlists:', error);
      throw error;
    }
  };

  return {
    searchPlaylists,
    getPlaylistSuggestions,
    getRecentPlaylists,
    getPopularPlaylists
  };
};

/**
 * Hook pour les statistiques et utilitaires des playlists
 */
export const usePlaylistUtils = () => {
  const calculatePlaylistStats = (playlist: any): PlaylistStats => {
    const totalTracks = playlist.tracks?.length || 0;
    
    // Calculate total duration
    let totalSeconds = 0;
    if (playlist.tracks) {
      playlist.tracks.forEach((track: any) => {
        if (track.duration) {
          // Handle both ISO 8601 (PT3M45S) and standard (MM:SS) formats
          if (track.duration.startsWith('PT') || track.duration.startsWith('P')) {
            const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/;
            const match = track.duration.match(regex);
            
            if (match) {
              const hours = parseInt(match[1] || '0');
              const minutes = parseInt(match[2] || '0');
              const seconds = Math.floor(parseFloat(match[3] || '0'));
              totalSeconds += (hours * 3600) + (minutes * 60) + seconds;
            }
          } else {
            const parts = track.duration.split(':');
            if (parts.length === 3) {
              // HH:MM:SS format
              totalSeconds += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
            } else if (parts.length === 2) {
              // MM:SS format
              totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
          }
        }
      });
    }

    const formatDuration = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    };

    return {
      totalTracks,
      totalDuration: formatDuration(totalSeconds),
      lastUpdated: playlist.updated_at || playlist.created_at || ''
    };
  };

  const formatPlaylistDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const getPlaylistCoverUrl = (playlist: any) => {
    // Return the cover of the first track with a cover, or null
    if (playlist.tracks && playlist.tracks.length > 0) {
      for (const track of playlist.tracks) {
        if (track.cover_thumbnail_path) {
          return track.cover_thumbnail_path;
        }
      }
    }
    return null;
  };

  return {
    calculatePlaylistStats,
    formatPlaylistDate,
    getPlaylistCoverUrl
  };
};
