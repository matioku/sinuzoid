import React, { useState, useEffect } from 'react';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import LogoIcon from '../../assets/logos/logo_sinuzoid-cyan.svg?react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PlayerInfoProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ 
  variant = 'full',
  className = '' 
}) => {
  const { currentTrack } = useAudioPlayerStore();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Charger la pochette
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const loadCover = async () => {
      // Nettoyer l'ancienne URL blob si elle existe
      if (coverUrl && coverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverUrl);
      }

      if (!currentTrack?.cover_thumbnail_path) {
        setCoverUrl(null);
        return;
      }

      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;

        // Le chemin contient déjà le nom complet du fichier thumbnail
        // Format: user_id_uuid_cover_thumb_small.webp
        const filename = currentTrack.cover_thumbnail_path.split('/').pop();
        if (!filename) return;

        // Construire l'URL pour accéder directement au fichier thumbnail
        const thumbnailUrl = `${API_BASE_URL}/files/cover/${encodeURIComponent(filename)}`;
        
        // Charger l'image avec authentification via fetch
        const response = await fetch(thumbnailUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Créer un blob URL pour l'image
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setCoverUrl(blobUrl);
          
          // Retourner la fonction de nettoyage
          cleanup = () => {
            if (blobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(blobUrl);
            }
          };
        } else {
          console.warn('Failed to load cover:', response.status, response.statusText);
          setCoverUrl(null);
        }
      } catch (error) {
        console.warn('Error loading cover:', error);
        setCoverUrl(null);
      }
    };

    loadCover();

    // Nettoyer à la fin
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [currentTrack?.cover_thumbnail_path]);

  if (!currentTrack) {
    return variant === 'compact' ? (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
          <LogoIcon className="w-4 h-4 fill-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune piste en cours
          </p>
        </div>
      </div>
    ) : null;
  }

  const title = currentTrack.metadata?.title || currentTrack.original_filename.replace(/\.[^/.]+$/, '');
  const artist = currentTrack.metadata?.artist || 'Artiste inconnu';
  const album = currentTrack.metadata?.album;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 min-w-0 ${className}`}>
        {/* Pochette */}
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Pochette de ${title}`}
              className="w-full h-full object-cover rounded"
              onError={() => setCoverUrl(null)}
            />
          ) : (
            <LogoIcon className="w-4 h-4 fill-gray-400 dark:fill-gray-500" />
          )}
        </div>

        {/* Informations */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {artist}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Pochette */}
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Pochette de ${title}`}
            className="w-full h-full object-cover rounded-lg"
            onError={() => setCoverUrl(null)}
          />
        ) : (
          <LogoIcon className="w-8 h-8 fill-gray-400 dark:fill-gray-500" />
        )}
      </div>

      {/* Informations */}
      <div className="min-w-0 max-w-xs">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {artist}
          {album && ` • ${album}`}
        </p>
      </div>
    </div>
  );
};
