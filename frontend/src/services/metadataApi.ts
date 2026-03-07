const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface MetadataUpdate {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  albumartist?: string | null;
  date?: string | null;
  genre?: string | null;
  track?: string | null;
  disc?: string | null;
  comment?: string | null;
  lyrics?: string | null;
  bpm?: number | null;
  key?: string | null;
  remixer?: string | null;
  producer?: string | null;
  label?: string | null;
  catalog_number?: string | null;
  isrc?: string | null;
  barcode?: string | null;
}

export interface FullMetadata extends MetadataUpdate {
  // Technical fields (read-only, extracted on upload)
  duration?: number;
  bitrate?: number;
  sample_rate?: number;
  channels?: number;
  bits_per_sample?: number;
  encoder?: string;
  format?: string;
  file_size?: number;
  // Extended fields (not editable via MetadataUpdate but may exist)
  tempo?: number;
  initial_key?: string;
  energy?: number;
  mood?: string;
  rating?: number;
  description?: string;
  replay_gain_track?: number;
  replay_gain_album?: number;
  loudness_lufs?: number;
  dynamic_range?: number;
  // Nested
  discogs?: Record<string, unknown>;
  custom_tags?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TrackDetail {
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
}

export interface UpdateMetadataResult {
  message: string;
  track_id: string;
  updated_metadata: FullMetadata;
}

export interface UpdateCoverResult {
  message: string;
  cover_path: string;
  cover_thumbnail_path: string;
  thumbnails: Record<string, { path: string; filename: string }>;
}

class MetadataApiService {
  private getHeaders(): HeadersInit {
    const token = sessionStorage.getItem('access_token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeader(): HeadersInit {
    const token = sessionStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  async getTrackById(trackId: string): Promise<TrackDetail> {
    const res = await fetch(`${API_BASE}/files/tracks/${trackId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Track not found (${res.status})`);
    return res.json();
  }

  async getTrackMetadata(trackId: string): Promise<FullMetadata> {
    const res = await fetch(`${API_BASE}/files/tracks/${trackId}/metadata`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Metadata not found (${res.status})`);
    return res.json();
  }

  async updateTrackMetadata(trackId: string, data: MetadataUpdate): Promise<UpdateMetadataResult> {
    const res = await fetch(`${API_BASE}/files/tracks/${trackId}/metadata`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: 'Unknown error' }));
      const detail = body?.detail;
      if (detail?.validation_errors) {
        throw new Error(
          Object.entries(detail.validation_errors as Record<string, string>)
            .map(([f, m]) => `${f}: ${m}`)
            .join('; ')
        );
      }
      throw new Error(typeof detail === 'string' ? detail : 'Update failed');
    }
    return res.json();
  }

  async updateTrackCover(trackId: string, file: File): Promise<UpdateCoverResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/files/tracks/${trackId}/cover`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: 'Cover update failed' }));
      throw new Error(body?.detail ?? 'Cover update failed');
    }
    return res.json();
  }

  async getCoverBlobUrl(coverPath: string): Promise<string | null> {
    const filename = coverPath.split('/').pop();
    if (!filename) return null;
    try {
      const res = await fetch(`${API_BASE}/files/cover/${filename}`, {
        headers: this.getAuthHeader(),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }
}

export const metadataApi = new MetadataApiService();
