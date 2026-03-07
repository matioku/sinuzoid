import { useState, useEffect, useCallback } from 'react';
import { metadataApi, type TrackDetail, type FullMetadata, type MetadataUpdate } from '../services/metadataApi';
import { useMusicStore } from '../store/musicStore';

interface UseTrackMetadataReturn {
  track: TrackDetail | null;
  metadata: FullMetadata;
  isLoading: boolean;
  isSaving: boolean;
  isUpdatingCover: boolean;
  error: string | null;
  success: string | null;
  updateMetadata: (data: MetadataUpdate) => Promise<void>;
  updateCover: (file: File) => Promise<void>;
  refetch: () => Promise<void>;
  clearMessages: () => void;
}

export const useTrackMetadata = (trackId: string | undefined): UseTrackMetadataReturn => {
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [metadata, setMetadata] = useState<FullMetadata>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const forceFetch = useMusicStore(state => state.forceFetch);

  const fetchData = useCallback(async () => {
    if (!trackId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [trackData, metadataData] = await Promise.all([
        metadataApi.getTrackById(trackId),
        metadataApi.getTrackMetadata(trackId),
      ]);
      setTrack(trackData);
      setMetadata(metadataData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load track');
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const updateMetadata = useCallback(async (data: MetadataUpdate) => {
    if (!trackId) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await metadataApi.updateTrackMetadata(trackId, data);
      setMetadata(result.updated_metadata);
      showSuccess('Metadata saved successfully');
      forceFetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  }, [trackId, forceFetch]);

  const updateCover = useCallback(async (file: File) => {
    if (!trackId) return;
    setIsUpdatingCover(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await metadataApi.updateTrackCover(trackId, file);
      setTrack(prev =>
        prev
          ? { ...prev, cover_path: result.cover_path, cover_thumbnail_path: result.cover_thumbnail_path }
          : prev
      );
      showSuccess('Cover updated successfully');
      forceFetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update cover');
    } finally {
      setIsUpdatingCover(false);
    }
  }, [trackId, forceFetch]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    track,
    metadata,
    isLoading,
    isSaving,
    isUpdatingCover,
    error,
    success,
    updateMetadata,
    updateCover,
    refetch: fetchData,
    clearMessages,
  };
};
