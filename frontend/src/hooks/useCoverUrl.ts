import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetches a cover image with Bearer auth and returns an object URL.
 * Automatically revokes the previous URL on path change or unmount.
 */
export function useCoverUrl(path: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    let blobUrl: string | null = null;
    let cancelled = false;

    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const filename = path.split('/').pop();
    if (!filename) return;

    fetch(`${API_BASE_URL}/files/cover/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.blob() : null))
      .then(blob => {
        if (blob && !cancelled) {
          blobUrl = URL.createObjectURL(blob);
          setUrl(blobUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [path]);

  return url;
}
