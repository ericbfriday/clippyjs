import { type AgentName } from '@clippyjs/react';

interface AgentSelectorProps {
  agents: readonly AgentName[];
  selectedAgent: AgentName;
  setSelectedAgent: (agent: AgentName) => void;
  loading: boolean;
}

export function AgentSelector({ agents, selectedAgent, setSelectedAgent, loading }: AgentSelectorProps) {
  return (
    <div className="card">
      <h2>Select an Agent</h2>
      <div className="agent-selector">
        {agents.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedAgent(name)}
            className={selectedAgent === name ? 'active' : ''}
            disabled={loading}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
