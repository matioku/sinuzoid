import { Track } from '../hooks/useTracks';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class TrackApiService {
  private getAuthHeaders() {
    const token = sessionStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  /**
   * Delete a single track by filename
   */
  async deleteTrack(filename: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/files/audio/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  /**
   * Delete all tracks for the current user
   */
  async deleteAllTracks(): Promise<{ message: string; deleted_count: number }> {
    const response = await fetch(`${API_BASE_URL}/files/tracks/all`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ message: string; deleted_count: number }>(response);
  }

  /**
   * Get track filename from a track object
   * Use the server filename for API calls, not the original filename
   */
  getTrackFilename(track: Track): string {
    return track.file_path.split('/').pop() || track.original_filename || 'unknown_file';
  }



  /**
   * Download a single track by filename
   * Returns blob and original filename from server headers
   */
  async downloadTrack(filename: string): Promise<{ blob: Blob; originalFilename?: string }> {
    const response = await fetch(`${API_BASE_URL}/files/audio/${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // Parse the original filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let originalFilename: string | undefined;
    
    if (contentDisposition) {
      // Handle both standard filename and RFC5987 filename* formats
      let filenameMatch = contentDisposition.match(/filename\*=utf-8''([^;]+)/);
      if (filenameMatch) {
        // Decode URI component for filename*=utf-8'' format
        originalFilename = decodeURIComponent(filenameMatch[1]);
      } else {
        // Fallback to standard filename format
        filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          originalFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    
    const blob = await response.blob();
    return { blob, originalFilename };
  }

  /**
   * Download all tracks for an album as a ZIP file
   * Downloads individual tracks and creates ZIP client-side
   */
  async downloadAlbum(_albumName: string): Promise<Blob> {
    throw new Error('Album download is temporarily disabled. Please download individual tracks instead.');
  }

  /**
   * Download all tracks for a playlist as a ZIP file
   * Downloads individual tracks and creates ZIP client-side
   */
  async downloadPlaylist(playlistId: number | string): Promise<Blob> {
    try {
      // Get playlist details
      const playlistResponse = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!playlistResponse.ok) {
        throw new Error(`Failed to fetch playlist: ${playlistResponse.status}`);
      }
      
      const playlist = await playlistResponse.json();
      
      if (!playlist.tracks || playlist.tracks.length === 0) {
        throw new Error(`No tracks found in playlist: ${playlist.name}`);
      }
      
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Download each track and add to ZIP
      for (let i = 0; i < playlist.tracks.length; i++) {
        const track = playlist.tracks[i];
        const filename = this.getTrackFilename(track);
        
        try {
          const { blob: trackBlob, originalFilename } = await this.downloadTrack(filename);
          const position = i + 1;
          const paddedNumber = position.toString().padStart(2, '0');
          // Use the original filename from server headers if available, otherwise use server filename
          const displayName = originalFilename || filename;
          const zipFilename = `${paddedNumber}. ${displayName}`;
          
          zip.file(zipFilename, trackBlob);
        } catch (error) {
          console.warn(`Failed to download track ${filename}:`, error);
          // Continue with other tracks
        }
      }
      
      // Generate ZIP
      return await zip.generateAsync({ type: 'blob' });
      
    } catch (error) {
      console.error('Playlist download failed:', error);
      throw new Error(`Failed to download playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download all tracks for the current user as a ZIP file
   * Downloads individual tracks and creates ZIP client-side organized by albums
   */
  async downloadAllTracks(): Promise<Blob> {
    try {
      // Get all tracks for the user
      const response = await fetch(`${API_BASE_URL}/files/tracks`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.status}`);
      }
      
      const tracks = await response.json();
      
      if (tracks.length === 0) {
        throw new Error('No tracks found in your library');
      }
      
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Group tracks by album
      const albumGroups: { [key: string]: any[] } = {};
      tracks.forEach((track: any) => {
        const albumName = track.metadata?.album || 'Singles and miscellaneous tracks';
        if (!albumGroups[albumName]) {
          albumGroups[albumName] = [];
        }
        albumGroups[albumName].push(track);
      });
      
      // Download tracks organized by album folders
      for (const [albumName, albumTracks] of Object.entries(albumGroups)) {
        // Sort tracks by track number
        albumTracks.sort((a: any, b: any) => {
          const trackA = a.metadata?.track_number || 999;
          const trackB = b.metadata?.track_number || 999;
          return trackA - trackB;
        });
        
        for (let i = 0; i < albumTracks.length; i++) {
          const track = albumTracks[i];
          const filename = this.getTrackFilename(track);
          
          try {
            const { blob: trackBlob, originalFilename } = await this.downloadTrack(filename);
            const trackNumber = track.metadata?.track_number || (i + 1);
            const paddedNumber = trackNumber.toString().padStart(2, '0');
            
            // Use the original filename from server headers if available, otherwise use server filename
            const displayName = originalFilename || filename;
            const zipFilename = `${albumName}/${paddedNumber}. ${displayName}`;
            
            zip.file(zipFilename, trackBlob);
          } catch (error) {
            console.warn(`Failed to download track ${filename}:`, error);
            // Continue with other tracks
          }
        }
      }
      
      // Generate ZIP
      return await zip.generateAsync({ type: 'blob' });
      
    } catch (error) {
      console.error('All tracks download failed:', error);
      throw new Error(`Failed to download all tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to trigger file download in the browser
   * Always forces download with the specified filename
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // Always set download attribute to force download
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Debug method to list all available albums and tracks
   */
  async debugLibrary(): Promise<void> {
    try {
      console.log('🔍 Debug: Fetching library information...');
      
      const response = await fetch(`${API_BASE_URL}/files/tracks`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch tracks:', response.status, response.statusText);
        return;
      }
      
      const tracks = await response.json();
      console.log(`✅ Found ${tracks.length} tracks in library`);
      
      // Group by albums
      const albumGroups: { [key: string]: any[] } = {};
      tracks.forEach((track: any) => {
        const albumName = track.metadata?.album || 'No Album';
        if (!albumGroups[albumName]) {
          albumGroups[albumName] = [];
        }
        albumGroups[albumName].push(track);
      });
      
      console.log('\n📂 Albums in library:');
      Object.entries(albumGroups).forEach(([albumName, tracks]) => {
        console.log(`  • "${albumName}" (${tracks.length} tracks)`);
        tracks.forEach((track: any) => {
          console.log(`    - ${track.metadata?.title || track.original_filename}`);
        });
      });
      
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  }
}

export const trackApi = new TrackApiService();

// Make debug method available globally for testing
(window as any).trackApiDebug = {
  debugLibrary: () => trackApi.debugLibrary(),
  trackApi: trackApi
};
