import { useEffect, useCallback } from 'react';
import { useMusicStore } from '../store/musicStore';
import { useMusicImages } from './useMusicStore';

/**
 * Hook pour précharger les images de manière intelligente
 */
export const useImagePreloader = () => {
  const { tracks, albums } = useMusicStore();
  const { getThumbnailUrl } = useMusicImages();

  // Recent albums thumbnails preloading
  const preloadAlbumThumbnails = useCallback(async (albumsToPreload = albums.slice(0, 20)) => {
    const preloadPromises = albumsToPreload
      .filter(album => album.cover_thumbnail_path)
      .map(async (album) => {
        const url = await getThumbnailUrl(album.cover_thumbnail_path!);
        return url;
      });
    
    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Erreur lors du préchargement des thumbnails:', error);
    }
  }, [albums, getThumbnailUrl]);

  // Recent tracks thumbnails preloading
  const preloadRecentTrackThumbnails = useCallback(async () => {
    const recentTracks = tracks
      .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
      .slice(0, 50)
      .filter(track => track.cover_thumbnail_path);

    const preloadPromises = recentTracks.map(async (track) => {
      const url = await getThumbnailUrl(track.cover_thumbnail_path!);
      return url;
    });
    
    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Erreur lors du préchargement des thumbnails de tracks:', error);
    }
  }, [tracks, getThumbnailUrl]);

  useEffect(() => {
    if (albums.length > 0) {
      setTimeout(() => {
        preloadAlbumThumbnails();
      }, 500);
    }
  }, [albums, preloadAlbumThumbnails]);

  useEffect(() => {
    if (tracks.length > 0) {
      setTimeout(() => {
        preloadRecentTrackThumbnails();
      }, 2000);
    }
  }, [tracks, preloadRecentTrackThumbnails]);

  return {
    preloadAlbumThumbnails,
    preloadRecentTrackThumbnails
  };
};

/**
 * Hook for automatic cleanup of blob cache
 */
export const useImageCleanup = () => {
  const { thumbnailCache, coverCache, clearCache } = useMusicStore();

  useEffect(() => {
    // Cleanup des blobs expirés toutes les 10 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

      let shouldClear = false;

      // Vérifier les thumbnails expirés
      Object.entries(thumbnailCache).forEach(([, cache]) => {
        if (now - cache.timestamp > CACHE_DURATION) {
          shouldClear = true;
        }
      });

      // Vérifier les covers expirés
      Object.entries(coverCache).forEach(([, cache]) => {
        if (now - cache.timestamp > CACHE_DURATION) {
          shouldClear = true;
        }
      });

      if (shouldClear) {
        clearCache();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(interval);
    };
  }, [thumbnailCache, coverCache, clearCache]);
};
