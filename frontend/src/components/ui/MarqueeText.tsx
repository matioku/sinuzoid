import React, { useState, useEffect, useRef } from 'react';

let _marqueeCounter = 0;

interface MarqueeTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Scroll speed in pixels/second. Default: 40 */
  speed?: number;
}

/**
 * Scrolls text horizontally when it overflows its container.
 * Pauses at the start, slides to the end, pauses, then loops.
 * Falls back to plain clipped text when no overflow is detected.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  children,
  className,
  style,
  speed = 40,
}) => {
  const [uid] = useState(() => `mq${++_marqueeCounter}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const measure = () => {
      const diff = text.scrollWidth - container.clientWidth;
      setShift(diff > 4 ? diff + 16 : 0);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children]);

  const containerStyle: React.CSSProperties = {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    ...style,
  };

  if (shift === 0) {
    return (
      <div ref={containerRef} className={className} style={containerStyle}>
        <span ref={textRef} style={{ display: 'inline-block' }}>{children}</span>
      </div>
    );
  }

  const slideDuration = shift / speed;
  const total = 2 + slideDuration + 1.5 + 0.5;
  const pSlideStart = ((2 / total) * 100).toFixed(2);
  const pSlideEnd = (((2 + slideDuration) / total) * 100).toFixed(2);
  const pPauseEnd = (((2 + slideDuration + 1.5) / total) * 100).toFixed(2);
  // Include shift in animation name so keyframe updates when overflow changes
  const name = `${uid}-${shift}`;

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      <style>{`
        @keyframes ${name} {
          0%, ${pSlideStart}% { transform: translateX(0); }
          ${pSlideEnd}%, ${pPauseEnd}% { transform: translateX(-${shift}px); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          animation: `${name} ${total.toFixed(2)}s linear infinite`,
        }}
      >
        {children}
      </span>
    </div>
  );
};
