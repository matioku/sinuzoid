import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Track {
  id: string;
  user_id: number;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  duration: string;
  upload_date: string;
  last_accessed?: string;
  cover_path?: string;
  cover_thumbnail_path?: string;
  updated_at: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: number;
    track_number?: number;
    duration?: number;
    [key: string]: any;
  };
}

export interface Album {
  name: string;
  artist?: string;
  year?: number;
  cover_thumbnail_path?: string;
  tracks: Track[];
}

export interface TracksState {
  tracks: Track[];
  albums: Album[];
  isLoading: boolean;
  error: string | null;
  totalTracks: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useTracks = () => {
  const [state, setState] = useState<TracksState>({
    tracks: [],
    albums: [],
    isLoading: true,
    error: null,
    totalTracks: 0
  });

  const { user } = useAuth();

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  //   const token = sessionStorage.getItem('access_token');
    
  //   const response = await fetch(url, {
  //     ...options,
  //     headers: {
  //       'Authorization': `Bearer ${token}`,
  //       'Content-Type': 'application/json',
  //       ...options.headers
  //     }
  //   });

  //   // If token is expired, let the auth context handle it
  //   if (response.status === 401) {
  //     // This will trigger the auth context to refresh the token
  //     throw new Error('Token expired or invalid');
  //   }

  //   return response;
  // };

  const fetchTracks = async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const tracksResponse = await fetch(`${API_BASE_URL}/files/tracks?limit=1000`, {
        headers: getAuthHeaders()
      });

      if (!tracksResponse.ok) {
        throw new Error('Error fetching tracks');
      }

      const tracks: Track[] = await tracksResponse.json();

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
            console.warn(`Error fetching metadata for ${track.id}:`, error);
            return track;
          }
        })
      );

      // Organize tracks by album
      const albumsMap = new Map<string, Album>();
      const orphanTracks: Track[] = [];

      tracksWithMetadata.forEach(track => {
        const albumName = track.metadata?.album || 'Singles and miscellaneous tracks';
        const artist = track.metadata?.artist || 'Unknown artist';
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

      albumsMap.forEach(album => {
        album.tracks.sort((a, b) => {
          const trackA = a.metadata?.track_number || 999;
          const trackB = b.metadata?.track_number || 999;
          return trackA - trackB;
        });
      });

      const albums = Array.from(albumsMap.values());
      if (orphanTracks.length > 0) {
        albums.push({
          name: 'Singles and miscellaneous tracks',
          tracks: orphanTracks.sort((a, b) => 
            new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
          )
        });
      }

      setState({
        tracks: tracksWithMetadata,
        albums: albums.sort((a, b) => {
          // Put "Singles and miscellaneous tracks" at the end
          if (a.name === 'Singles and miscellaneous tracks') return 1;
          if (b.name === 'Singles and miscellaneous tracks') return -1;
          
          // Sort by year descending then by album name
          if (a.year && b.year) {
            return b.year - a.year;
          }
          return a.name.localeCompare(b.name);
        }),
        isLoading: false,
        error: null,
        totalTracks: tracksWithMetadata.length
      });

    } catch (error) {
      console.error('Error fetching tracks:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  };

  const getThumbnailUrl = async (thumbnailPath?: string): Promise<string | null> => {
    if (!thumbnailPath) return null;
    
    // Extract filename from path
    const filename = thumbnailPath.split('/').pop();
    if (!filename) return null;
    
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found');
      return null;
    }
    
    try {
      // The cover_thumbnail_path already points to the generated thumbnail.
      // Use /files/cover/{filename} for direct access
      const url = `${API_BASE_URL}/files/cover/${filename}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
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
    
    // Extract filename from path
    const filename = coverPath.split('/').pop();
    if (!filename) return null;
    
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found');
      return null;
    }
    
    try {
      // Use the original cover path for better quality
      const url = `${API_BASE_URL}/files/cover/${filename}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
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

  useEffect(() => {
    // Only fetch on initial load when user is authenticated
    // and we don't have data yet
    if (user && state.tracks.length === 0 && !state.error) {
      fetchTracks();
    }
  }, [user]);

  return {
    ...state,
    refetch: fetchTracks,
    getThumbnailUrl,
    getCoverUrl,
    formatDuration,
    formatFileSize
  };
};
