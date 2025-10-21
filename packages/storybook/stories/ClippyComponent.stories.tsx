import type { Meta, StoryObj } from '@storybook/react';
import { Clippy } from '@clippyjs/react';
import { useState } from 'react';

/**
 * Declarative Clippy component examples
 */
const meta = {
  title: 'Components/Clippy',
  component: Clippy,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Clippy>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic Usage
 *
 * The simplest way to add Clippy to your app.
 */
export const Basic: Story = {
  args: {
    name: 'Clippy',
  },
  render: (args) => (
    <div style={{ padding: '20px' }}>
      <h3>Basic Clippy Component</h3>
      <p>Clippy loads automatically!</p>
      <Clippy {...args} />
    </div>
  ),
};

/**
 * With Message
 *
 * Show Clippy with an initial message.
 */
export const WithMessage: Story = {
  args: {
    name: 'Clippy',
    speak: 'Hello! I\'m here to help!',
  },
  render: (args) => (
    <div style={{ padding: '20px' }}>
      <h3>Clippy with Message</h3>
      <Clippy {...args} />
    </div>
  ),
};

/**
 * With Position
 *
 * Position Clippy at specific coordinates.
 */
export const WithPosition: Story = {
  args: {
    name: 'Clippy',
    position: { x: 200, y: 100 },
    speak: 'I\'m positioned at 200, 100!',
  },
  render: (args) => (
    <div style={{ padding: '20px' }}>
      <h3>Clippy with Position</h3>
      <Clippy {...args} />
    </div>
  ),
};

/**
 * Held Speech
 *
 * Keep the speech balloon open until manually closed.
 */
export const HeldSpeech: Story = {
  args: {
    name: 'Clippy',
    speak: 'This message stays until you close it!',
    holdSpeech: true,
  },
  render: (args) => (
    <div style={{ padding: '20px' }}>
      <h3>Held Speech</h3>
      <p>The speech balloon will stay open until you close it.</p>
      <Clippy {...args} />
    </div>
  ),
};

/**
 * Different Agents
 *
 * Use different agent characters.
 */
export const DifferentAgents: Story = {
  render: () => {
    const [selectedAgent, setSelectedAgent] = useState<'Clippy' | 'Merlin' | 'Rover' | 'Genie'>('Clippy');

    const messages: Record<typeof selectedAgent, string> = {
      Clippy: 'Hi! I\'m Clippy, the classic assistant!',
      Merlin: 'Greetings! I am Merlin the wizard!',
      Rover: 'Woof! I\'m Rover, the friendly dog!',
      Genie: 'I am the genie! Your wish is my command!',
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Different Agents</h3>

        <div style={{ marginBottom: '20px' }}>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as typeof selectedAgent)}
          >
            <option value="Clippy">Clippy</option>
            <option value="Merlin">Merlin</option>
            <option value="Rover">Rover</option>
            <option value="Genie">Genie</option>
          </select>
        </div>

        <Clippy
          key={selectedAgent}
          name={selectedAgent}
          speak={messages[selectedAgent]}
        />
      </div>
    );
  },
};

/**
 * With Callbacks
 *
 * Handle load success and errors.
 */
export const WithCallbacks: Story = {
  render: () => {
    const [status, setStatus] = useState('');

    return (
      <div style={{ padding: '20px' }}>
        <h3>With Callbacks</h3>

        {status && (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
            {status}
          </div>
        )}

        <Clippy
          name="Clippy"
          speak="Hello! I loaded successfully!"
          onLoad={(agent) => {
            setStatus(`✅ Agent loaded: ${agent.constructor.name}`);
            console.log('Agent loaded:', agent);
          }}
          onError={(error) => {
            setStatus(`❌ Error: ${error.message}`);
            console.error('Load error:', error);
          }}
        />
      </div>
    );
  },
};

/**
 * Conditional Rendering
 *
 * Show/hide Clippy based on state.
 */
export const ConditionalRendering: Story = {
  render: () => {
    const [showClippy, setShowClippy] = useState(true);

    return (
      <div style={{ padding: '20px' }}>
        <h3>Conditional Rendering</h3>

        <button onClick={() => setShowClippy(!showClippy)}>
          {showClippy ? 'Hide' : 'Show'} Clippy
        </button>

        {showClippy && (
          <Clippy
            name="Clippy"
            speak={showClippy ? 'I\'m back!' : ''}
          />
        )}
      </div>
    );
  },
};

/**
 * Multiple Components
 *
 * Render multiple Clippy components with different agents.
 */
export const MultipleComponents: Story = {
  render: () => (
    <div style={{ padding: '20px' }}>
      <h3>Multiple Components</h3>
      <p>Multiple agents can coexist!</p>

      <Clippy
        name="Clippy"
        position={{ x: 100, y: 100 }}
        speak="I'm Clippy!"
      />

      <Clippy
        name="Rover"
        position={{ x: 300, y: 100 }}
        speak="I'm Rover!"
      />

      <Clippy
        name="Merlin"
        position={{ x: 500, y: 100 }}
        speak="I'm Merlin!"
      />
    </div>
  ),
};

/**
 * Don't Show On Load
 *
 * Load agent but don't show it immediately.
 */
export const DontShowOnLoad: Story = {
  render: () => {
    const [message, setMessage] = useState('Agent will load but stay hidden...');

    return (
      <div style={{ padding: '20px' }}>
        <h3>Don't Show On Load</h3>
        <p>{message}</p>

        <Clippy
          name="Clippy"
          showOnLoad={false}
          onLoad={(agent) => {
            setMessage('Agent loaded but hidden! It will appear in 3 seconds...');
            setTimeout(() => {
              agent.show().then(() => {
                agent.speak('Surprise!');
                setMessage('Agent appeared!');
              });
            }, 3000);
          }}
        />
      </div>
    );
  },
};
