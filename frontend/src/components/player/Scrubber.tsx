import React, { useRef, useState } from 'react';

interface ScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

/**
 * Draggable progress scrubber. Grows on hover/drag and shows a thumb.
 */
export function Scrubber({ currentTime, duration, onSeek }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [localTime, setLocalTime] = useState<number | null>(null);

  const displayTime = localTime ?? currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const timeFromX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    setLocalTime(timeFromX(e.clientX));

    const onMove = (ev: MouseEvent) => {
      if (dragging.current) setLocalTime(timeFromX(ev.clientX));
    };
    const onUp = (ev: MouseEvent) => {
      if (dragging.current) {
        onSeek(timeFromX(ev.clientX));
        dragging.current = false;
        setLocalTime(null);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const active = hovered || dragging.current;

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: active ? 6 : 4,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.18)',
        cursor: 'pointer',
        transition: 'height 0.15s ease',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'var(--accent)',
          borderRadius: 3,
          pointerEvents: 'none',
        }}
      />
      {active && (
        <div
          style={{
            position: 'absolute', top: '50%',
            left: `${progress}%`,
            transform: 'translate(-50%, -50%)',
            width: 14, height: 14, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 8px rgba(0,229,255,0.5)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
