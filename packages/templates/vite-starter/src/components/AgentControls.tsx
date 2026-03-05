import { type Agent } from '@clippyjs/react';

interface AgentControlsProps {
  handleGreeting: () => Promise<void>;
  handleRandomAnimation: () => Promise<void>;
  handleMove: () => Promise<void>;
  agent: Agent | null;
  loading: boolean;
}

export function AgentControls({ handleGreeting, handleRandomAnimation, handleMove, agent, loading }: AgentControlsProps) {
  return (
    <div className="card">
      <h2>Agent Controls</h2>
      <div className="controls">
        <button onClick={handleGreeting} disabled={loading}>
          {loading ? 'Loading...' : 'Say Hello'}
        </button>
        <button onClick={handleRandomAnimation} disabled={!agent}>
          Random Animation
        </button>
        <button onClick={handleMove} disabled={!agent}>
          Move Around
        </button>
      </div>
    </div>
  );
}
