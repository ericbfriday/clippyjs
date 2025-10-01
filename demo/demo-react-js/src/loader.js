/**
 * Modern Promise-based loader for Clippy agents
 */
import { Agent } from './Agent';
// Global registry for loaded data
const loadedMaps = new Map();
const loadedSounds = new Map();
const loadedData = new Map();
// Callbacks for JSONP-style loading
const dataCallbacks = new Map();
const soundCallbacks = new Map();
/**
 * Load a Clippy agent
 */
export async function load(name, options) {
    const basePath = options?.basePath ||
        window.CLIPPY_CDN ||
        'https://gitcdn.xyz/repo/pi0/clippyjs/master/assets/agents/';
    const path = `${basePath}${name}`;
    // Load all resources in parallel
    const [, agentData, sounds] = await Promise.all([
        loadMap(path),
        loadAgentData(name, path),
        loadSounds(name, path)
    ]);
    return new Agent(path, agentData, sounds);
}
/**
 * Load the sprite map image
 */
async function loadMap(path) {
    // Check if already loading/loaded
    const existing = loadedMaps.get(path);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
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
async function loadAgentData(name, path) {
    // Check if already loading/loaded
    const existing = loadedData.get(name);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
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
async function loadSounds(name, path) {
    // Check if already loading/loaded
    const existing = loadedSounds.get(name);
    if (existing)
        return existing;
    const promise = new Promise((resolve, reject) => {
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
export function ready(name, data) {
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
export function soundsReady(name, sounds) {
    const callback = soundCallbacks.get(name);
    if (callback) {
        callback(sounds);
        soundCallbacks.delete(name);
    }
}
// Expose ready functions globally for backward compatibility
if (typeof window !== 'undefined') {
    window.clippy = {
        ...(window.clippy || {}),
        ready,
        soundsReady
    };
}
