import { 
  Playlist, 
  PlaylistCreate, 
  PlaylistUpdate, 
  PlaylistSearchParams, 
  PlaylistSearchResult,
  PlaylistTrackOperation 
} from '../types/playlist';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class PlaylistApiService {
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

  // CRUD Operations
  async createPlaylist(playlistData: PlaylistCreate): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(playlistData)
    });
    return this.handleResponse<Playlist>(response);
  }

  async getUserPlaylists(skip = 0, limit = 100): Promise<Playlist[]> {
    const response = await fetch(
      `${API_BASE_URL}/playlists/?skip=${skip}&limit=${limit}`,
      {
        headers: this.getAuthHeaders()
      }
    );
    return this.handleResponse<Playlist[]>(response);
  }

  async getPlaylistById(playlistId: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<Playlist>(response);
  }

  async updatePlaylist(playlistId: string, updateData: PlaylistUpdate): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return this.handleResponse<Playlist>(response);
  }

  async deletePlaylist(playlistId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Track Management
  async addTrackToPlaylist(operation: PlaylistTrackOperation): Promise<{ message: string }> {
    const { playlist_id, track_id, position } = operation;
    const url = `${API_BASE_URL}/playlists/${playlist_id}/tracks/${track_id}`;
    const body = position !== undefined ? { position } : {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/playlists/${playlistId}/tracks/${trackId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );
    return this.handleResponse<{ message: string }>(response);
  }

  async getPlaylistTracks(playlistId: string): Promise<{ tracks: any[], total: number }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/tracks`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ tracks: any[], total: number }>(response);
  }

  async reorderPlaylistTracks(playlistId: string, trackOrders: Array<{ track_id: string, position: number }>): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/tracks/reorder`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(trackOrders)
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Search and Discovery
  async searchPlaylists(params: PlaylistSearchParams): Promise<PlaylistSearchResult> {
    const queryParams = new URLSearchParams({
      query: params.query,
      search_in_tracks: (params.search_in_tracks ?? false).toString(),
      search_in_description: (params.search_in_description ?? true).toString(),
      limit: (params.limit ?? 50).toString(),
      offset: (params.offset ?? 0).toString()
    });

    const response = await fetch(`${API_BASE_URL}/playlists/search?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<PlaylistSearchResult>(response);
  }

  async getPlaylistSuggestions(query: string, limit = 5): Promise<{ suggestions: string[] }> {
    const response = await fetch(
      `${API_BASE_URL}/playlists/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: this.getAuthHeaders()
      }
    );
    return this.handleResponse<{ suggestions: string[] }>(response);
  }

  async getRecentPlaylists(limit = 10): Promise<{ playlists: Playlist[], total: number }> {
    const response = await fetch(`${API_BASE_URL}/playlists/recent?limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ playlists: Playlist[], total: number }>(response);
  }

  async getPopularPlaylists(limit = 10): Promise<{ playlists: Playlist[], total: number }> {
    const response = await fetch(`${API_BASE_URL}/playlists/popular?limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ playlists: Playlist[], total: number }>(response);
  }

  async searchTracksInPlaylist(playlistId: string, query: string, limit = 50, offset = 0): Promise<{
    tracks: any[];
    total_results: number;
    search_query: string;
    playlist_id: string;
  }> {
    const queryParams = new URLSearchParams({
      query,
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await fetch(
      `${API_BASE_URL}/playlists/${playlistId}/tracks/search?${queryParams}`,
      {
        headers: this.getAuthHeaders()
      }
    );
    return this.handleResponse(response);
  }
}

export const playlistApi = new PlaylistApiService();
