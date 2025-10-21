/**
 * Modern Promise-based loader for Clippy agents
 */

import { Agent } from './Agent';
import { AgentData, SoundMap, LoadOptions } from './types';

// Global registry for loaded data
const loadedMaps: Map<string, Promise<void>> = new Map();
const loadedSounds: Map<string, Promise<SoundMap>> = new Map();
const loadedData: Map<string, Promise<AgentData>> = new Map();

// Callbacks for JSONP-style loading
const dataCallbacks: Map<string, (data: AgentData) => void> = new Map();
const soundCallbacks: Map<string, (sounds: SoundMap) => void> = new Map();

/**
 * Load a Clippy agent
 */
export async function load(name: string, options?: LoadOptions): Promise<Agent> {
  const basePath = options?.basePath ||
    (window as any).CLIPPY_CDN ||
    '/agents/';

  const path = `${basePath}${name}`;

  // Load all resources in parallel
  const [, agentData, sounds] = await Promise.all([
    loadMap(path),
    loadAgentData(name, path),
    loadSounds(name, path)
  ]);

  return await Agent.create(path, agentData, sounds);
}

/**
 * Load the sprite map image
 */
async function loadMap(path: string): Promise<void> {
  // Check if already loading/loaded
  const existing = loadedMaps.get(path);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load map: ${path}/map.png`));
    img.src = `${path}/map.png`;
  });

  loadedMaps.set(path, promise);
  return promise;
}

/**
 * Load agent animation data
 */
async function loadAgentData(name: string, path: string): Promise<AgentData> {
  // Check if already loading/loaded
  const existing = loadedData.get(name);
  if (existing) return existing;

  const promise = new Promise<AgentData>((resolve, reject) => {
    // Set up callback for JSONP-style loading
    dataCallbacks.set(name, resolve);

    // Create and load script
    const script = document.createElement('script');
    script.src = `${path}/agent.js`;
    script.async = true;
    script.onerror = () => {
      dataCallbacks.delete(name);
      reject(new Error(`Failed to load agent data: ${path}/agent.js`));
    };

    document.head.appendChild(script);
  });

  loadedData.set(name, promise);
  return promise;
}

/**
 * Load agent sounds
 */
async function loadSounds(name: string, path: string): Promise<SoundMap> {
  // Check if already loading/loaded
  const existing = loadedSounds.get(name);
  if (existing) return existing;

  const promise = new Promise<SoundMap>((resolve, reject) => {
    // Check audio support
    const audio = document.createElement('audio');
    const canPlayMp3 = !!audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
    const canPlayOgg = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';

    if (!canPlayMp3 && !canPlayOgg) {
      resolve({});
      return;
    }

    // Set up callback for JSONP-style loading
    soundCallbacks.set(name, resolve);

    // Load appropriate sound format
    const soundFile = canPlayMp3 ? 'sounds-mp3.js' : 'sounds-ogg.js';
    const script = document.createElement('script');
    script.src = `${path}/${soundFile}`;
    script.async = true;
    script.onerror = () => {
      soundCallbacks.delete(name);
      // Don't reject on sound load failure, just return empty
      resolve({});
    };

    document.head.appendChild(script);
  });

  loadedSounds.set(name, promise);
  return promise;
}

/**
 * Called by agent.js files to provide data (JSONP-style)
 * This maintains backward compatibility with existing agent files
 */
export function ready(name: string, data: AgentData): void {
  const callback = dataCallbacks.get(name);
  if (callback) {
    callback(data);
    dataCallbacks.delete(name);
  }
}

/**
 * Called by sounds-*.js files to provide sound data (JSONP-style)
 * This maintains backward compatibility with existing sound files
 */
export function soundsReady(name: string, sounds: SoundMap): void {
  const callback = soundCallbacks.get(name);
  if (callback) {
    callback(sounds);
    soundCallbacks.delete(name);
  }
}

// Expose ready functions globally for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).clippy = {
    ...((window as any).clippy || {}),
    ready,
    soundsReady
  };
}