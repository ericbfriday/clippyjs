/**
 * Strict Mode TypeScript Example
 *
 * Demonstrates strict TypeScript usage with @clippyjs/react
 * Compiled with: strict: true, noImplicitAny: true, strictNullChecks: true
 */

import { useAgent, UseAgentReturn, AgentName, Agent } from '@clippyjs/react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Strict type for agent configuration
 */
interface AgentConfig {
  readonly name: AgentName;
  readonly greeting: string;
  readonly position: Readonly<{ x: number; y: number }>;
}

/**
 * Configurations for available agents
 */
const AGENT_CONFIGS: readonly AgentConfig[] = [
  {
    name: 'Clippy',
    greeting: 'Hi! I'm Clippy, your office assistant!',
    position: { x: 100, y: 100 },
  },
  {
    name: 'Merlin',
    greeting: 'Greetings! I am Merlin the wizard!',
    position: { x: 200, y: 100 },
  },
  {
    name: 'Rover',
    greeting: 'Woof! I'm Rover, the helpful dog!',
    position: { x: 300, y: 100 },
  },
] as const;

/**
 * Type guard to check if agent is loaded
 */
function isAgentLoaded(agent: Agent | null): agent is Agent {
  return agent !== null;
}

/**
 * Props type for the strict component
 */
interface StrictModeExampleProps {
  readonly defaultAgent?: AgentName;
  readonly onAgentLoad?: (agent: Agent) => void;
  readonly onError?: (error: Error) => void;
}

/**
 * Strict mode component with comprehensive type safety
 */
export function StrictModeExample({
  defaultAgent = 'Clippy',
  onAgentLoad,
  onError,
}: StrictModeExampleProps): JSX.Element {
  const [config, setConfig] = useState<AgentConfig>(
    AGENT_CONFIGS.find((c) => c.name === defaultAgent) ?? AGENT_CONFIGS[0]
  );

  // Fully typed hook return
  const agentAPI: UseAgentReturn = useAgent(config.name, {
    autoLoad: true,
    initialPosition: config.position,
  });

  const { agent, loading, error, speak, moveTo, play } = agentAPI;

  // Type-safe callback with useCallback
  const handleGreet = useCallback(async (): Promise<void> => {
    if (!isAgentLoaded(agent)) {
      console.warn('Cannot greet: Agent not loaded');
      return;
    }

    try {
      await speak(config.greeting);
    } catch (err) {
      // Proper error type narrowing
      if (err instanceof Error) {
        console.error('Greeting failed:', err.message);
        onError?.(err);
      }
    }
  }, [agent, config.greeting, speak, onError]);

  // Type-safe animation with validation
  const handlePlayAnimation = useCallback(
    async (animationName: string): Promise<void> => {
      if (!isAgentLoaded(agent)) {
        console.warn('Cannot play animation: Agent not loaded');
        return;
      }

      // Check if animation exists
      if (!agent.hasAnimation(animationName)) {
        console.warn(`Animation "${animationName}" not available`);
        return;
      }

      try {
        await play(animationName);
      } catch (err) {
        if (err instanceof Error) {
          console.error('Animation failed:', err.message);
        }
      }
    },
    [agent, play]
  );

  // Type-safe position update
  const handleMoveTo = useCallback(
    async (x: number, y: number, duration: number = 1000): Promise<void> => {
      if (!isAgentLoaded(agent)) return;

      // Validate coordinates
      if (x < 0 || y < 0) {
        throw new Error('Coordinates must be positive');
      }

      await moveTo(x, y, duration);
    },
    [agent, moveTo]
  );

  // Effect with proper dependencies
  useEffect(() => {
    if (isAgentLoaded(agent)) {
      onAgentLoad?.(agent);
    }
  }, [agent, onAgentLoad]);

  // Effect for error handling
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Type-safe config change handler
  const handleConfigChange = (newConfig: AgentConfig): void => {
    setConfig(newConfig);
  };

  // Render loading state
  if (loading) {
    return <div>Loading {config.name}...</div>;
  }

  // Render error state
  if (error) {
    return (
      <div className="error">
        Failed to load {config.name}: {error.message}
      </div>
    );
  }

  return (
    <div>
      <h2>Strict Mode TypeScript Example</h2>

      {/* Config selector */}
      <div>
        {AGENT_CONFIGS.map((cfg) => (
          <button
            key={cfg.name}
            onClick={() => handleConfigChange(cfg)}
            disabled={cfg.name === config.name}
          >
            {cfg.name}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div>
        <button onClick={handleGreet} disabled={!isAgentLoaded(agent)}>
          Greet
        </button>

        <button
          onClick={() => handlePlayAnimation('Wave')}
          disabled={!isAgentLoaded(agent)}
        >
          Wave
        </button>

        <button
          onClick={() => handleMoveTo(400, 300)}
          disabled={!isAgentLoaded(agent)}
        >
          Move
        </button>
      </div>

      {/* Status */}
      <div>
        <p>
          Agent: {config.name} ({isAgentLoaded(agent) ? 'Loaded' : 'Not Loaded'}
          )
        </p>
        {isAgentLoaded(agent) && (
          <p>Visible: {agent.isVisible() ? 'Yes' : 'No'}</p>
        )}
      </div>
    </div>
  );
}

export default StrictModeExample;
