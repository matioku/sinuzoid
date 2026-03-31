/// <reference types="vite/client" />

declare module 'butterchurn' {
  interface ButterchurnVisualizer {
    connectAudio(node: AudioNode): void;
    loadPreset(preset: any, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
  }
  interface ButterchurnStatic {
    createVisualizer(audioContext: AudioContext, canvas: HTMLCanvasElement, options?: { width?: number; height?: number }): ButterchurnVisualizer;
  }
  const butterchurn: ButterchurnStatic;
  export default butterchurn;
}

declare module 'butterchurn-presets' {
  interface ButterchurnPresets {
    getPresets(): Record<string, any>;
  }
  const presets: ButterchurnPresets;
  export default presets;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_LASTFM_SHARED_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
