import { useMusicStore } from '../store/musicStore';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Hook principal pour gérer les morceaux et albums
 */
export const useMusicData = () => {
  const { user } = useAuth();
  const {
    tracks,
    albums,
    isLoading,
    error,
    totalTracks,
    fetchTracks,
    forceFetch,
    shouldRefetch,
    reset
  } = useMusicStore();

  useEffect(() => {
    if (user && shouldRefetch()) {
      fetchTracks();
    }
  }, [user, fetchTracks, shouldRefetch]);

  // Reset store when user logs out
  useEffect(() => {
    if (!user) {
      reset();
    }
  }, [user, reset]);

  const refetch = () => {
    if (user) {
      forceFetch(); // Use forceFetch instead of fetchTracks to ignore cache
    }
  };

  return {
    tracks,
    albums,
    isLoading,
    error,
    totalTracks,
    refetch
  };
};

/**
 * Hook pour gérer les images (thumbnails et covers)
 */
export const useMusicImages = () => {
  const {
    addThumbnailToCache,
    getThumbnailFromCache,
    addCoverToCache,
    getCoverFromCache,
    clearCache
  } = useMusicStore();

  const getThumbnailUrl = async (thumbnailPath?: string): Promise<string | null> => {
    if (!thumbnailPath) return null;
    
    // Check cache first
    const cachedUrl = getThumbnailFromCache(thumbnailPath);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // Extract filename from path
    const filename = thumbnailPath.split('/').pop();
    if (!filename) return null;
    
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found');
      return null;
    }
    
    try {
      const url = `${API_BASE_URL}/files/cover/${filename}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Add to cache
        addThumbnailToCache(thumbnailPath, blobUrl);
        
        return blobUrl;
      } else {
        console.warn(`Error ${response.status} loading ${filename}:`, response.statusText);
      }
      
      return null;
    } catch (error) {
      console.warn(`Error loading thumbnail ${filename}:`, error);
      return null;
    }
  };

  const getCoverUrl = async (coverPath?: string): Promise<string | null> => {
    if (!coverPath) return null;
    
    // Check cache first
    const cachedUrl = getCoverFromCache(coverPath);
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // Extract filename from path
    const filename = coverPath.split('/').pop();
    if (!filename) return null;
    
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found');
      return null;
    }
    
    try {
      const url = `${API_BASE_URL}/files/cover/${filename}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Add to cache
        addCoverToCache(coverPath, blobUrl);
        
        return blobUrl;
      } else {
        console.warn(`Error ${response.status} loading ${filename}:`, response.statusText);
      }
      
      return null;
    } catch (error) {
      console.warn(`Error loading cover ${filename}:`, error);
      return null;
    }
  };

  return {
    getThumbnailUrl,
    getCoverUrl,
    clearImageCache: clearCache
  };
};

/**
 * Hook pour les fonctions utilitaires de formatage
 */
export const useMusicUtils = () => {
  const formatDuration = (duration: string) => {
    try {
      // Handle ISO 8601 duration format (PT3M45S) from timedelta
      if (duration.startsWith('PT') || duration.startsWith('P')) {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/;
        const match = duration.match(regex);
        
        if (match) {
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = Math.floor(parseFloat(match[3] || '0'));
          
          if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
        }
      }
      
      // Handle regular "HH:MM:SS" or "MM:SS" format
      const parts = duration.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      } else if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      return duration;
    } catch {
      return duration;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    formatDuration,
    formatFileSize
  };
};

/**
 * Hook pour les opérations de suppression de tracks
 */
export const useMusicDeletion = () => {
  const { deleteTrack, deleteAllTracks, deleteAlbum, forceFetch } = useMusicStore();

  const handleTrackDeleted = (trackId: string) => {
    deleteTrack(trackId);
  };

  const handleAllTracksDeleted = () => {
    deleteAllTracks();
  };

  const handleAlbumDeleted = (albumName: string) => {
    deleteAlbum(albumName);
  };

  const refreshAfterDeletion = () => {
    forceFetch();
  };

  return {
    handleTrackDeleted,
    handleAllTracksDeleted,
    handleAlbumDeleted,
    refreshAfterDeletion
  };
};
