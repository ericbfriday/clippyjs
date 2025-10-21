/**
 * Basic TypeScript Usage Example
 *
 * Demonstrates fundamental TypeScript integration with @clippyjs/react
 */

import { useAgent, AgentName } from '@clippyjs/react';
import { useState } from 'react';

// Type-safe agent selector
const AVAILABLE_AGENTS: readonly AgentName[] = [
  'Clippy',
  'Merlin',
  'Rover',
  'Genie',
] as const;

export function BasicTypeScriptExample() {
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('Clippy');

  // Hook with full type safety
  const { agent, loading, error, load, speak, play } = useAgent(
    selectedAgent,
    {
      autoLoad: false,
      autoShow: true,
    }
  );

  // Type-safe event handler
  const handleLoadAgent = async (): Promise<void> => {
    try {
      await load();
      await speak(`Hello! I'm ${selectedAgent}!`);
    } catch (err) {
      // Type narrowing for error
      const error = err as Error;
      console.error('Failed to load agent:', error.message);
    }
  };

  // Type-safe animation handler
  const handlePlayAnimation = async (): Promise<void> => {
    if (!agent) {
      console.warn('Agent not loaded yet');
      return;
    }

    await play('Wave');
  };

  return (
    <div>
      <h2>Basic TypeScript Example</h2>

      {/* Type-safe select */}
      <select
        value={selectedAgent}
        onChange={(e) => setSelectedAgent(e.target.value as AgentName)}
      >
        {AVAILABLE_AGENTS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button onClick={handleLoadAgent} disabled={loading}>
        {loading ? 'Loading...' : 'Load Agent'}
      </button>

      <button onClick={handlePlayAnimation} disabled={!agent}>
        Wave
      </button>

      {/* Type-safe error rendering */}
      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}

export default BasicTypeScriptExample;
