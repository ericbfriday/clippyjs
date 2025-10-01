/**
 * React component for Clippy agents
 */
import { useEffect, useRef, useState } from 'react';
import { useClippy } from './ClippyProvider';
/**
 * Clippy React Component
 */
export const Clippy = ({ name, basePath, showOnLoad = true, onLoad, onError, position, speak, holdSpeech = false }) => {
    const { loadAgent, getAgent, unloadAgent } = useClippy();
    const [agent, setAgent] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        let currentAgent;
        const initAgent = async () => {
            try {
                setLoading(true);
                setError(null);
                // Check if already loaded
                currentAgent = getAgent(name);
                if (!currentAgent) {
                    // Load the agent
                    currentAgent = await loadAgent(name, {
                        basePath,
                        show: showOnLoad
                    });
                }
                else if (showOnLoad) {
                    await currentAgent.show();
                }
                if (!mountedRef.current)
                    return;
                setAgent(currentAgent);
                // Set initial position if provided
                if (position && currentAgent) {
                    await currentAgent.moveTo(position.x, position.y, 0);
                }
                // Speak initial message if provided
                if (speak && currentAgent) {
                    await currentAgent.speak(speak, holdSpeech);
                }
                // Call onLoad callback
                if (onLoad && currentAgent) {
                    onLoad(currentAgent);
                }
            }
            catch (err) {
                if (!mountedRef.current)
                    return;
                const error = err;
                setError(error);
                if (onError) {
                    onError(error);
                }
            }
            finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };
        initAgent();
        return () => {
            mountedRef.current = false;
            // Note: We don't unload the agent here as it might be used elsewhere
            // The ClippyProvider handles cleanup on unmount
        };
    }, [name, basePath, showOnLoad]);
    // Handle speak prop changes
    useEffect(() => {
        if (agent && speak) {
            agent.speak(speak, holdSpeech);
        }
    }, [speak, holdSpeech]);
    // This component doesn't render anything - the Agent manages its own DOM
    return null;
};
/**
 * Hook to control a specific agent
 */
export const useAgent = (name) => {
    const { loadAgent, getAgent, unloadAgent } = useClippy();
    const [agent, setAgent] = useState(() => getAgent(name));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const loadedAgent = await loadAgent(name);
            setAgent(loadedAgent);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
        }
    };
    const unload = () => {
        unloadAgent(name);
        setAgent(undefined);
    };
    useEffect(() => {
        // Update agent reference if it changes
        const currentAgent = getAgent(name);
        if (currentAgent !== agent) {
            setAgent(currentAgent);
        }
    }, [name]);
    return {
        agent,
        loading,
        error,
        load,
        unload
    };
};
