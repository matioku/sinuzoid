import md5 from 'md5';

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

type Params = Record<string, string>;

function buildApiSig(params: Params, sharedSecret: string): string {
  const sorted = Object.keys(params).filter(k => k !== 'format').sort();
  const str = sorted.map(k => `${k}${params[k]}`).join('') + sharedSecret;
  return md5(str);
}

function buildSignedParams(params: Params, sharedSecret: string): Params {
  const sig = buildApiSig(params, sharedSecret);
  return { ...params, api_sig: sig, format: 'json' };
}

export function buildAuthUrl(apiKey: string, callbackUrl: string): string {
  return `https://www.last.fm/api/auth/?api_key=${apiKey}&cb=${encodeURIComponent(callbackUrl)}`;
}

export interface LastFmSession {
  key: string;
  name: string;
}

export async function getSession(
  token: string,
  apiKey: string,
  sharedSecret: string
): Promise<LastFmSession> {
  const params: Params = { method: 'auth.getSession', api_key: apiKey, token };
  const signed = buildSignedParams(params, sharedSecret);
  const url = new URL(LASTFM_BASE);
  Object.entries(signed).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Last.fm auth failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Last.fm error ${data.error}: ${data.message}`);
  return { key: data.session.key, name: data.session.name };
}

export interface NowPlayingParams {
  artist: string;
  track: string;
  album?: string;
  duration?: number;
  apiKey: string;
  sessionKey: string;
  sharedSecret: string;
}

export async function updateNowPlaying(p: NowPlayingParams): Promise<void> {
  const params: Params = {
    method: 'track.updateNowPlaying',
    artist: p.artist,
    track: p.track,
    api_key: p.apiKey,
    sk: p.sessionKey,
  };
  if (p.album) params.album = p.album;
  if (p.duration != null) params.duration = String(Math.round(p.duration));

  const body = new URLSearchParams(buildSignedParams(params, p.sharedSecret));
  try {
    await fetch(LASTFM_BASE, { method: 'POST', body });
  } catch {
    // Now Playing is best-effort
  }
}

export interface ScrobbleParams {
  artist: string;
  track: string;
  timestamp: number;
  album?: string;
  duration?: number;
  apiKey: string;
  sessionKey: string;
  sharedSecret: string;
}

export async function scrobble(p: ScrobbleParams): Promise<void> {
  const params: Params = {
    method: 'track.scrobble',
    artist: p.artist,
    track: p.track,
    timestamp: String(p.timestamp),
    api_key: p.apiKey,
    sk: p.sessionKey,
  };
  if (p.album) params.album = p.album;
  if (p.duration != null) params.duration = String(Math.round(p.duration));

  const body = new URLSearchParams(buildSignedParams(params, p.sharedSecret));
  try {
    await fetch(LASTFM_BASE, { method: 'POST', body });
  } catch {
    // Scrobble is best-effort
  }
}
