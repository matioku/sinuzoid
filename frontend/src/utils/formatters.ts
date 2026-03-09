/**
 * Formate une durée vers MM:SS ou HH:MM:SS.
 * Accepte un nombre (secondes), une chaîne ISO 8601 ("PT3M45S") ou "MM:SS".
 */
export const formatDuration = (input: number | string): string => {
  if (typeof input === 'string') {
    if (input.startsWith('PT')) {
      const match = input.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
      if (!match) return '0:00';
      const h = parseFloat(match[1] || '0');
      const m = parseFloat(match[2] || '0');
      const s = parseFloat(match[3] || '0');
      return formatDuration(h * 3600 + m * 60 + s);
    }
    return input; // already "MM:SS"
  }

  const seconds = input;
  if (!seconds || isNaN(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formate une taille de fichier en octets vers une unité lisible
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Formate une date ISO en format local
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Date inconnue';
  }
};

/**
 * Formate une durée totale pour un album ou playlist
 */
export const formatTotalDuration = (totalSeconds: number): string => {
  if (!totalSeconds || isNaN(totalSeconds)) return '0 min';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  
  return `${minutes} min`;
};
