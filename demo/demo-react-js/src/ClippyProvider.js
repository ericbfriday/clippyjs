import { jsx as _jsx } from "react/jsx-runtime";
/**
 * React Context Provider for Clippy agents
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { load } from './loader';
const ClippyContext = createContext(undefined);
/**
 * Provider component for managing Clippy agents
 */
export const ClippyProvider = ({ children, defaultBasePath }) => {
    const [agents, setAgents] = useState(new Map());
    const loadAgent = async (name, options) => {
        // Check if already loaded
        const existing = agents.get(name);
        if (existing)
            return existing;
        try {
            // Load the agent
            const agent = await load(name, {
                basePath: options?.basePath || defaultBasePath
            });
            // Add to state
            setAgents(prev => new Map(prev).set(name, agent));
            // Show if requested
            if (options?.show !== false) {
                await agent.show();
            }
            return agent;
        }
        catch (error) {
            console.error(`Failed to load agent ${name}:`, error);
            throw error;
        }
    };
    const unloadAgent = (name) => {
        const agent = agents.get(name);
        if (agent) {
            agent.destroy();
            setAgents(prev => {
                const next = new Map(prev);
                next.delete(name);
                return next;
            });
        }
    };
    const getAgent = (name) => {
        return agents.get(name);
    };
    // Clean up on unmount
    useEffect(() => {
        return () => {
            agents.forEach(agent => agent.destroy());
        };
    }, []);
    const value = {
        agents,
        loadAgent,
        unloadAgent,
        getAgent
    };
    return (_jsx(ClippyContext.Provider, { value: value, children: children }));
};
/**
 * Hook to access Clippy context
 */
export const useClippy = () => {
    const context = useContext(ClippyContext);
    if (!context) {
        throw new Error('useClippy must be used within a ClippyProvider');
    }
    return context;
};
