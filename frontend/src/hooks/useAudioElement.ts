import { useRef, useEffect, useState } from 'react';
import { useAudioPlayerStore } from '../store/audioPlayerStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Hook to handle HTML5 audio and store sync
 */
export const useAudioElement = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const {
    currentTrack,
    isPlaying,
    isPaused,
    currentTime,
    volume,
    isMuted,
    repeatMode,
    setCurrentTime,
    setDuration,
    setIsLoading,
    next
  } = useAudioPlayerStore();

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';
      
      audio.addEventListener('loadstart', () => {
        setIsLoading(true);
        setIsReady(false);
      });
      audio.addEventListener('canplaythrough', () => {
        setIsLoading(false);
        setIsReady(true);
      });
      audio.addEventListener('canplay', () => {
        setIsLoading(false);
        setIsReady(true);
      });
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration || 0);
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime || 0);
      });
      audio.addEventListener('ended', () => {
        if (repeatMode === 'track') {
          audio.currentTime = 0;
          audio.play();
        } else {
          next();
        }
      });
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsLoading(false);
        setIsReady(false);
      });
      
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const token = sessionStorage.getItem('access_token');
    if (!token) {
      console.error('No auth token available');
      return;
    }

    const filename = currentTrack.file_path.split('/').pop();
    if (!filename) {
      console.error('Invalid file path:', currentTrack.file_path);
      return;
    }

    const audioUrl = `${API_BASE_URL}/files/audio/${encodeURIComponent(filename)}`;
    
    setIsLoading(true);
    setIsReady(false);
    
    audio.pause();
    audio.currentTime = 0;
    
    fetch(audioUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      audio.src = blobUrl;
      audio.load();
      
      audio.addEventListener('loadstart', () => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      }, { once: true });
    })
    .catch(error => {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    });
  }, [currentTrack]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && !isPaused && currentTrack) {
      const tryPlay = () => {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise
            .then(() => {
              setIsLoading(false);
            })
            .catch(error => {
              console.error('Error playing audio:', error);
              setIsLoading(false);
            });
        }
      };

      if (isReady || audio.readyState >= 3) { // HAVE_FUTURE_DATA
        tryPlay();
      } else {
        const handleCanPlay = () => {
          if (isPlaying && !isPaused && currentTrack) {
            tryPlay();
          }
          audio.removeEventListener('canplaythrough', handleCanPlay);
        };
        audio.addEventListener('canplaythrough', handleCanPlay);
        
        return () => {
          audio.removeEventListener('canplaythrough', handleCanPlay);
        };
      }
    } else if (!isPlaying || isPaused) {
      audio.pause();
    }
  }, [isPlaying, isPaused, isReady, currentTrack, setIsLoading]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, isReady]);

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (audio && isReady) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  return {
    audioRef,
    isReady,
    seekTo
  };
};
