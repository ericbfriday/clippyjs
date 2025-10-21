import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useAgent, AgentName } from '@clippyjs/react';

/**
 * Showcase of all 10 available agents
 */
const meta = {
  title: 'Agents/All Agents',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL_AGENTS: readonly AgentName[] = [
  'Clippy',
  'Merlin',
  'Rover',
  'Genie',
  'Bonzi',
  'Peedy',
  'Links',
  'F1',
  'Rocky',
  'Genius',
] as const;

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  Clippy: 'The classic Microsoft Office paperclip assistant',
  Merlin: 'The wise wizard with magical powers',
  Rover: 'The friendly red dog, always eager to help',
  Genie: 'The magical genie who grants your wishes',
  Bonzi: 'The purple gorilla buddy',
  Peedy: 'The green parrot with personality',
  Links: 'The helpful cat assistant',
  F1: 'The speedy Formula 1 racing car',
  Rocky: 'The loyal dog companion',
  Genius: 'The Einstein-like genius character',
};

/**
 * Agent Gallery
 *
 * Browse and load all 10 agents.
 */
export const AgentGallery: Story = {
  render: () => {
    const [selectedAgent, setSelectedAgent] = useState<AgentName>('Clippy');
    const { load, speak, play, loading, agent } = useAgent(selectedAgent);

    const loadAndIntroduce = async (agentName: AgentName) => {
      setSelectedAgent(agentName);
      // Small delay to allow state to update
      setTimeout(async () => {
        await load();
        await speak(`Hello! I'm ${agentName}. ${AGENT_DESCRIPTIONS[agentName]}`);
        await play('Wave');
      }, 100);
    };

    return (
      <div style={{ padding: '20px', maxWidth: '600px' }}>
        <h2>Agent Gallery</h2>
        <p>Click on any agent to load and meet them!</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px',
            marginTop: '20px',
          }}
        >
          {ALL_AGENTS.map((agentName) => (
            <div
              key={agentName}
              style={{
                border: selectedAgent === agentName ? '3px solid #0066cc' : '1px solid #ccc',
                borderRadius: '8px',
                padding: '15px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedAgent === agentName ? '#f0f8ff' : 'white',
                transition: 'all 0.2s',
              }}
              onClick={() => loadAndIntroduce(agentName)}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {agentName === 'Clippy' && '📎'}
                {agentName === 'Merlin' && '🧙'}
                {agentName === 'Rover' && '🐕'}
                {agentName === 'Genie' && '🧞'}
                {agentName === 'Bonzi' && '🦍'}
                {agentName === 'Peedy' && '🦜'}
                {agentName === 'Links' && '🐱'}
                {agentName === 'F1' && '🏎️'}
                {agentName === 'Rocky' && '🐶'}
                {agentName === 'Genius' && '🧠'}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {agentName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {AGENT_DESCRIPTIONS[agentName].split(',')[0]}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <strong>Selected Agent:</strong> {selectedAgent}
          <br />
          <strong>Status:</strong> {loading ? '⏳ Loading...' : agent ? '✅ Loaded' : '⚪ Not loaded'}
        </div>
      </div>
    );
  },
};

/**
 * Agent Comparison
 *
 * Load and compare different agents side by side.
 */
export const AgentComparison: Story = {
  render: () => {
    const [agent1, setAgent1] = useState<AgentName>('Clippy');
    const [agent2, setAgent2] = useState<AgentName>('Merlin');

    const clippy = useAgent(agent1, { autoLoad: true });
    const merlin = useAgent(agent2, { autoLoad: true });

    const makeConversation = async () => {
      await clippy.speak(`Hi ${agent2}!`);
      await clippy.delay(1000);
      await merlin.speak(`Hello ${agent1}!`);
      await clippy.delay(500);
      await clippy.play('Wave');
      await merlin.play('Wave');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Agent Comparison</h3>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label>
              Agent 1:
              <select
                value={agent1}
                onChange={(e) => setAgent1(e.target.value as AgentName)}
                style={{ marginLeft: '10px' }}
              >
                {ALL_AGENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              Agent 2:
              <select
                value={agent2}
                onChange={(e) => setAgent2(e.target.value as AgentName)}
                style={{ marginLeft: '10px' }}
              >
                {ALL_AGENTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button onClick={makeConversation} disabled={!clippy.agent || !merlin.agent}>
          Make Them Talk
        </button>

        <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
            <strong>{agent1}</strong>
            <br />
            Status: {clippy.agent ? '✅ Loaded' : '⚪ Not loaded'}
          </div>
          <div style={{ flex: 1, padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
            <strong>{agent2}</strong>
            <br />
            Status: {merlin.agent ? '✅ Loaded' : '⚪ Not loaded'}
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Random Agent
 *
 * Load a random agent each time.
 */
export const RandomAgent: Story = {
  render: () => {
    const [currentAgent, setCurrentAgent] = useState<AgentName>(
      ALL_AGENTS[Math.floor(Math.random() * ALL_AGENTS.length)]
    );

    const { load, speak, play, loading, agent, unload } = useAgent(currentAgent);

    const loadRandomAgent = async () => {
      unload();
      const randomAgent = ALL_AGENTS[Math.floor(Math.random() * ALL_AGENTS.length)];
      setCurrentAgent(randomAgent);

      setTimeout(async () => {
        await load();
        await speak(`I'm ${randomAgent}! ${AGENT_DESCRIPTIONS[randomAgent]}`);
        await play('Wave');
      }, 100);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Random Agent</h3>

        <button onClick={loadRandomAgent} disabled={loading}>
          {loading ? 'Loading...' : 'Load Random Agent'}
        </button>

        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <strong>Current Agent:</strong> {currentAgent}
          <br />
          <strong>Description:</strong> {AGENT_DESCRIPTIONS[currentAgent]}
          <br />
          <strong>Status:</strong> {agent ? '✅ Loaded' : '⚪ Not loaded'}
        </div>
      </div>
    );
  },
};
