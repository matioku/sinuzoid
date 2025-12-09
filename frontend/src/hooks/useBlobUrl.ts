import { useEffect, useState } from 'react';

/**
 * Hook to automatically manage creation and revokation of aa blob URL
 */
export const useBlobUrl = (blob: Blob | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    // Create blob URL
    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);

    // Cleanup: revoke URL when component unmounts or blob changes
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blob]);

  return url;
};