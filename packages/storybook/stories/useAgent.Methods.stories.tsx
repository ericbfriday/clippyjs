import type { Meta, StoryObj } from '@storybook/react';
import { useAgent } from '@clippyjs/react';
import { useState } from 'react';

/**
 * Demonstrations of all useAgent methods
 */
const meta = {
  title: 'Hooks/useAgent/All Methods',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Show and Hide
 *
 * Control agent visibility with show() and hide() methods.
 */
export const ShowAndHide: Story = {
  render: () => {
    const { load, show, hide, isVisible, agent } = useAgent('Clippy', {
      autoLoad: true,
    });

    return (
      <div style={{ padding: '20px' }}>
        <h3>Show and Hide</h3>
        <p>Visible: {agent && isVisible() ? 'Yes' : 'No'}</p>

        <button onClick={() => show()} disabled={!agent}>
          Show
        </button>
        <button onClick={() => hide()} disabled={!agent} style={{ marginLeft: '10px' }}>
          Hide
        </button>
      </div>
    );
  },
};

/**
 * Play Animations
 *
 * Play specific animations by name.
 */
export const PlayAnimations: Story = {
  render: () => {
    const { play, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    const animations = ['Wave', 'Congratulate', 'ThinkingLoop', 'Explain', 'GetAttention'];

    return (
      <div style={{ padding: '20px' }}>
        <h3>Play Animations</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {animations.map((anim) => (
            <button
              key={anim}
              onClick={() => play(anim)}
              disabled={!agent}
            >
              {anim}
            </button>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * Speak with Options
 *
 * Make the agent speak with different options.
 */
export const Speak: Story = {
  render: () => {
    const { speak, closeBalloon, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    return (
      <div style={{ padding: '20px' }}>
        <h3>Speak</h3>

        <button
          onClick={() => speak('This is a normal message.')}
          disabled={!agent}
        >
          Normal Message
        </button>

        <button
          onClick={() => speak('This message stays until you close it!', true)}
          disabled={!agent}
          style={{ marginLeft: '10px' }}
        >
          Held Message
        </button>

        <button
          onClick={() => closeBalloon()}
          disabled={!agent}
          style={{ marginLeft: '10px' }}
        >
          Close Balloon
        </button>
      </div>
    );
  },
};

/**
 * Move To Position
 *
 * Move the agent to specific screen coordinates.
 */
export const MoveTo: Story = {
  render: () => {
    const { moveTo, speak, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    const moveToPosition = async (x: number, y: number) => {
      await moveTo(x, y, 1000);
      await speak(`Moved to ${x}, ${y}!`);
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Move To Position</h3>

        <button
          onClick={() => moveToPosition(100, 100)}
          disabled={!agent}
        >
          Top Left
        </button>

        <button
          onClick={() => moveToPosition(window.innerWidth - 200, 100)}
          disabled={!agent}
          style={{ marginLeft: '10px' }}
        >
          Top Right
        </button>

        <button
          onClick={() => moveToPosition(window.innerWidth / 2, window.innerHeight / 2)}
          disabled={!agent}
          style={{ marginLeft: '10px' }}
        >
          Center
        </button>
      </div>
    );
  },
};

/**
 * Gesture At Element
 *
 * Make the agent gesture toward specific coordinates.
 */
export const GestureAt: Story = {
  render: () => {
    const { gestureAt, speak, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    const pointAtButton = async (buttonId: string) => {
      const button = document.getElementById(buttonId);
      if (button) {
        const rect = button.getBoundingClientRect();
        await gestureAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
        await speak('Look at this button!');
      }
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Gesture At Element</h3>

        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <button id="target-1" style={{ background: '#ff6b6b', color: 'white', padding: '20px' }}>
            Target 1
          </button>
          <button id="target-2" style={{ background: '#4ecdc4', color: 'white', padding: '20px' }}>
            Target 2
          </button>
          <button id="target-3" style={{ background: '#45b7d1', color: 'white', padding: '20px' }}>
            Target 3
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button onClick={() => pointAtButton('target-1')} disabled={!agent}>
            Point at Target 1
          </button>
          <button onClick={() => pointAtButton('target-2')} disabled={!agent} style={{ marginLeft: '10px' }}>
            Point at Target 2
          </button>
          <button onClick={() => pointAtButton('target-3')} disabled={!agent} style={{ marginLeft: '10px' }}>
            Point at Target 3
          </button>
        </div>
      </div>
    );
  },
};

/**
 * Animation Control
 *
 * Control the animation queue with stop, pause, and resume.
 */
export const AnimationControl: Story = {
  render: () => {
    const { play, stop, stopCurrent, pause, resume, delay, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    const runLongSequence = async () => {
      await play('Wave');
      await delay(1000);
      await play('Congratulate');
      await delay(1000);
      await play('ThinkingLoop');
      await delay(1000);
      await play('Explain');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h3>Animation Control</h3>

        <button onClick={runLongSequence} disabled={!agent}>
          Start Long Sequence
        </button>

        <div style={{ marginTop: '10px' }}>
          <button onClick={() => pause()} disabled={!agent}>
            Pause
          </button>
          <button onClick={() => resume()} disabled={!agent} style={{ marginLeft: '10px' }}>
            Resume
          </button>
          <button onClick={() => stopCurrent()} disabled={!agent} style={{ marginLeft: '10px' }}>
            Stop Current
          </button>
          <button onClick={() => stop()} disabled={!agent} style={{ marginLeft: '10px' }}>
            Stop All
          </button>
        </div>
      </div>
    );
  },
};

/**
 * Get Animations
 *
 * Query available animations for the agent.
 */
export const GetAnimations: Story = {
  render: () => {
    const { getAnimations, hasAnimation, play, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    const [searchTerm, setSearchTerm] = useState('');

    const animations = agent ? getAnimations() : [];
    const filteredAnimations = animations.filter((anim) =>
      anim.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div style={{ padding: '20px' }}>
        <h3>Available Animations</h3>

        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search animations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '5px', width: '200px' }}
          />
          <span style={{ marginLeft: '10px' }}>
            Found: {filteredAnimations.length} / {animations.length}
          </span>
        </div>

        <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {filteredAnimations.map((anim) => (
            <div key={anim} style={{ marginBottom: '5px' }}>
              <button onClick={() => play(anim)} disabled={!agent}>
                ▶️
              </button>
              <span style={{ marginLeft: '10px' }}>{anim}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * Reload Agent
 *
 * Unload and reload the agent.
 */
export const Reload: Story = {
  render: () => {
    const { reload, speak, loading, agent } = useAgent('Clippy', {
      autoLoad: true,
      autoShow: true,
    });

    return (
      <div style={{ padding: '20px' }}>
        <h3>Reload Agent</h3>
        <p>Status: {agent ? 'Loaded' : 'Not loaded'}</p>

        <button
          onClick={async () => {
            await reload();
            await speak('I was reloaded!');
          }}
          disabled={loading}
        >
          {loading ? 'Reloading...' : 'Reload Agent'}
        </button>
      </div>
    );
  },
};
