import React, { lazy, Suspense } from 'react';
import type { SpectrogramSettings, OscilloscopeSettings, VuMeterSettings } from './useVisualizerSettings';

const SpectrogramVisualizer = lazy(() => import('./SpectrogramVisualizer'));
const OscilloscopeVisualizer = lazy(() => import('./OscilloscopeVisualizer'));
const VuMeterVisualizer = lazy(() => import('./VuMeterVisualizer'));

interface Props {
  analyserNode: AnalyserNode;
  spectrogramSettings: SpectrogramSettings;
  oscilloscopeSettings: OscilloscopeSettings;
  vuMeterSettings: VuMeterSettings;
}

const MonitoringVisualizer: React.FC<Props> = ({
  analyserNode,
  spectrogramSettings,
  oscilloscopeSettings,
  vuMeterSettings,
}) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Spectrogram: top 60% */}
      <div style={{ flex: '0 0 60%', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Suspense fallback={null}>
          <SpectrogramVisualizer analyserNode={analyserNode} settings={spectrogramSettings} />
        </Suspense>
      </div>
      {/* Oscilloscope + VU Meter: bottom 40% */}
      <div style={{ flex: '0 0 40%', display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 3, overflow: 'hidden' }}>
          <Suspense fallback={null}>
            <OscilloscopeVisualizer analyserNode={analyserNode} settings={oscilloscopeSettings} />
          </Suspense>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <Suspense fallback={null}>
            <VuMeterVisualizer analyserNode={analyserNode} settings={vuMeterSettings} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default MonitoringVisualizer;
