import React, { useRef, useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import type { AudioMotionSettings } from './useVisualizerSettings';

interface Props {
  analyserNode: AnalyserNode;
  audioContext: AudioContext;
  settings: AudioMotionSettings;
}

const AudioMotionVisualizer: React.FC<Props> = ({ analyserNode, audioContext, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  // Initialize
  useEffect(() => {
    let destroyed = false;

    (async () => {
      const { default: AudioMotionAnalyzer } = await import('audiomotion-analyzer');
      if (destroyed || !containerRef.current) return;

      const analyzer = new AudioMotionAnalyzer(containerRef.current, {
        audioCtx: audioContext as unknown as globalThis.AudioContext,
        connectSpeakers: false,
        overlay: true,
        showScaleX: false,
        showScaleY: false,
        mode: settings.mode,
        barSpace: settings.barSpace,
        ledBars: settings.ledBars,
        lumiBars: settings.lumiBars,
        reflexRatio: settings.reflexRatio,
        reflexAlpha: settings.reflexAlpha,
        showPeaks: settings.showPeaks,
        smoothing: settings.smoothing,
      } as any);

      analyzer.registerGradient('sinuzoid', {
        colorStops: ['#004d66', '#00b8d4', '#00e5ff', '#80f2ff'],
      });
      analyzer.registerGradient('stealth', {
        colorStops: ['#1a1a2e', '#4a4a6a', '#8a8aaa'],
      });

      analyzer.setOptions({ gradient: settings.gradient });

      analyzer.connectInput(analyserNode);

      analyzerRef.current = analyzer;
      setLoading(false);
    })();

    return () => {
      destroyed = true;
      if (analyzerRef.current) {
        analyzerRef.current.destroy();
        analyzerRef.current = null;
      }
    };
  }, []);

  // Update settings reactively
  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    analyzer.setOptions({
      mode: settings.mode,
      barSpace: settings.barSpace,
      ledBars: settings.ledBars,
      lumiBars: settings.lumiBars,
      gradient: settings.gradient,
      reflexRatio: settings.reflexRatio,
      reflexAlpha: settings.reflexAlpha,
      showPeaks: settings.showPeaks,
      smoothing: settings.smoothing,
    });
  }, [settings]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
        }}>
          <FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </div>
  );
};

export default AudioMotionVisualizer;
