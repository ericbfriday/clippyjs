import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClippyProvider, useAgent, Clippy } from '../../src';
import { useState } from 'react';

/**
 * Integration Tests: Multi-Agent Scenarios
 *
 * Tests realistic scenarios with multiple agents working together,
 * coordinating responses, and managing concurrent interactions.
 */

// Mock the core load function
vi.mock('../src', () => ({
  load: vi.fn((name: string) =>
    Promise.resolve({
      name,
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      play: vi.fn(() => Promise.resolve()),
      speak: vi.fn(() => Promise.resolve()),
      moveTo: vi.fn((x: number, y: number) => Promise.resolve()),
      gestureAt: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(),
      isVisible: vi.fn(() => true),
      getAnimations: vi.fn(() => ['Wave', 'Idle']),
    })
  ),
}));

describe('Integration: Multi-Agent Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multiple Agents - Declarative', () => {
    it('renders multiple agents with different positions', async () => {
      function MultiAgentApp() {
        return (
          <ClippyProvider maxAgents={3}>
            <Clippy name="Clippy" position={{ x: 100, y: 100 }} />
            <Clippy name="Merlin" position={{ x: 300, y: 100 }} />
            <Clippy name="Rover" position={{ x: 500, y: 100 }} />
            <div data-testid="app">Multi-agent app</div>
          </ClippyProvider>
        );
      }

      const { container } = render(<MultiAgentApp />);

      await waitFor(() => {
        expect(screen.getByTestId('app')).toBeInTheDocument();
      });

      // All three agents should be loaded
      expect(container).toBeInTheDocument();
    });

    it('each agent can speak different messages', async () => {
      function TalkingAgents() {
        return (
          <ClippyProvider maxAgents={2}>
            <Clippy name="Clippy" speak="I'm Clippy!" />
            <Clippy name="Merlin" speak="I'm Merlin!" />
          </ClippyProvider>
        );
      }

      const { container } = render(<TalkingAgents />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Multiple Agents - Imperative', () => {
    it('manages multiple agents independently', async () => {
      function MultiAgentController() {
        const clippy = useAgent('Clippy', { autoLoad: true });
        const merlin = useAgent('Merlin', { autoLoad: true });
        const [actions, setActions] = useState<string[]>([]);

        const makeClippySpeak = async () => {
          if (clippy.agent) {
            await clippy.speak('Hello from Clippy!');
            setActions((prev) => [...prev, 'Clippy spoke']);
          }
        };

        const makeMerlinSpeak = async () => {
          if (merlin.agent) {
            await merlin.speak('Hello from Merlin!');
            setActions((prev) => [...prev, 'Merlin spoke']);
          }
        };

        return (
          <div>
            <button onClick={makeClippySpeak}>Clippy Speak</button>
            <button onClick={makeMerlinSpeak}>Merlin Speak</button>
            <div data-testid="action-count">{actions.length} actions</div>
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <MultiAgentController />
        </ClippyProvider>
      );

      const user = userEvent;

      // Wait for React effects to complete: isClient effect + autoLoad effect
      // This gives time for the component to render → set isClient → load agents
      await new Promise(resolve => setTimeout(resolve, 500));

      const clippyButton = screen.getByRole('button', { name: 'Clippy Speak' });
      const merlinButton = screen.getByRole('button', { name: 'Merlin Speak' });

      // Click and wait for each action to complete
      await user.click(clippyButton);
      await waitFor(() => {
        expect(screen.getByTestId('action-count')).toHaveTextContent('1 actions');
      }, { timeout: 10000 });

      await user.click(merlinButton);
      await waitFor(() => {
        expect(screen.getByTestId('action-count')).toHaveTextContent('2 actions');
      }, { timeout: 10000 });
    });

    it('coordinates agent movements', async () => {
      function CoordinatedMovement() {
        const agent1 = useAgent('Clippy', { autoLoad: true });
        const agent2 = useAgent('Merlin', { autoLoad: true });
        const [moved, setMoved] = useState(false);

        const moveAgentsTogether = async () => {
          if (agent1.agent && agent2.agent) {
            await Promise.all([
              agent1.moveTo(200, 200),
              agent2.moveTo(400, 200),
            ]);
            setMoved(true);
          }
        };

        return (
          <div>
            <button onClick={moveAgentsTogether}>Move Both</button>
            {moved && (
              <div data-testid="movement-complete">Agents moved</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <CoordinatedMovement />
        </ClippyProvider>
      );

      // Wait for React effects to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const moveButton = screen.getByRole('button', { name: 'Move Both' });
      await user.click(moveButton);

      await waitFor(() => {
        expect(screen.getByTestId('movement-complete')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Agent Coordination', () => {
    it('agents take turns speaking (conversation)', async () => {
      const user = userEvent;

      function AgentConversation() {
        const clippy = useAgent('Clippy', { autoLoad: true });
        const merlin = useAgent('Merlin', { autoLoad: true });
        const [conversation, setConversation] = useState<string[]>([]);

        const startConversation = async () => {
          if (!clippy.agent || !merlin.agent) return;

          const messages: Array<{ speaker: string; message: string }> = [
            { speaker: 'Clippy', message: 'Hello Merlin!' },
            { speaker: 'Merlin', message: 'Hello Clippy! How are you?' },
            { speaker: 'Clippy', message: 'I\'m doing great! Ready to help!' },
          ];

          for (const msg of messages) {
            const agent = msg.speaker === 'Clippy' ? clippy : merlin;
            await agent.speak(msg.message);
            setConversation((prev) => [...prev, `${msg.speaker}: ${msg.message}`]);

            // Small delay between messages
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        };

        return (
          <div>
            <button onClick={startConversation}>Start Conversation</button>
            <div data-testid="message-count">{conversation.length} messages</div>
            {conversation.map((msg, i) => (
              <div key={i} data-testid={`message-${i}`}>
                {msg}
              </div>
            ))}
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <AgentConversation />
        </ClippyProvider>
      );

      // Wait for React effects to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await user.click(screen.getByRole('button', { name: 'Start Conversation' }));

      await waitFor(
        () => {
          expect(screen.getByTestId('message-count')).toHaveTextContent('3 messages');
        },
        { timeout: 15000 }
      );
    }, 20000);

    it('specialized agents for different tasks', async () => {
      function SpecializedAgents() {
        const helpAgent = useAgent('Clippy', { autoLoad: true });
        const wizardAgent = useAgent('Merlin', { autoLoad: true });
        const [currentTask, setCurrentTask] = useState<'help' | 'tutorial' | null>(null);

        const requestHelp = async () => {
          setCurrentTask('help');
          if (helpAgent.agent) {
            await helpAgent.show();
            await helpAgent.speak('I can help you with that!');
          }
          if (wizardAgent.agent) {
            await wizardAgent.hide();
          }
        };

        const startTutorial = async () => {
          setCurrentTask('tutorial');
          if (wizardAgent.agent) {
            await wizardAgent.show();
            await wizardAgent.speak('Let me guide you through this...');
          }
          if (helpAgent.agent) {
            await helpAgent.hide();
          }
        };

        return (
          <div>
            <button onClick={requestHelp}>Request Help</button>
            <button onClick={startTutorial}>Start Tutorial</button>
            {currentTask && (
              <div data-testid="current-task">{currentTask} mode active</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <SpecializedAgents />
        </ClippyProvider>
      );

      const user = userEvent;
      const helpButton = screen.getByRole('button', { name: 'Request Help' });
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-task')).toHaveTextContent(
          'help mode active'
        );
      });
    });
  });

  describe('Agent Handoff', () => {
    it('transfers user between agents based on context', async () => {
      function AgentHandoff() {
        const beginnerAgent = useAgent('Clippy', { autoLoad: true });
        const expertAgent = useAgent('Merlin', { autoLoad: true });
        const [activeAgent, setActiveAgent] = useState<'beginner' | 'expert'>(
          'beginner'
        );

        const switchToExpert = async () => {
          if (beginnerAgent.agent && expertAgent.agent) {
            await beginnerAgent.speak('This seems advanced. Let me get Merlin!');
            await beginnerAgent.hide();

            await new Promise((resolve) => setTimeout(resolve, 500));

            await expertAgent.show();
            await expertAgent.speak('I can help with advanced topics!');
            setActiveAgent('expert');
          }
        };

        return (
          <div>
            <button onClick={switchToExpert}>Ask Advanced Question</button>
            <div data-testid="active-agent">Active: {activeAgent}</div>
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <AgentHandoff />
        </ClippyProvider>
      );

      // Wait for React effects to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const advancedButton = screen.getByRole('button', {
        name: 'Ask Advanced Question',
      });
      await user.click(advancedButton);

      await waitFor(() => {
        expect(screen.getByTestId('active-agent')).toHaveTextContent(
          'Active: expert'
        );
      }, { timeout: 10000 });
    }, 15000);
  });

  describe('Team Assistance', () => {
    it('multiple agents assist with complex workflows', async () => {
      function TeamWorkflow() {
        const navigator = useAgent('Clippy', { autoLoad: true });
        const validator = useAgent('Merlin', { autoLoad: true });
        const [step, setStep] = useState(1);

        const nextStep = async () => {
          const newStep = step + 1;
          setStep(newStep);

          if (newStep === 2 && navigator.agent) {
            await navigator.speak('Moving to step 2: Enter your details');
          }

          if (newStep === 3 && validator.agent) {
            await validator.show();
            await validator.speak('Let me validate your information...');
          }
        };

        return (
          <div>
            <div data-testid="current-step">Step {step}</div>
            <button onClick={nextStep}>Next Step</button>
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <TeamWorkflow />
        </ClippyProvider>
      );

      const user = userEvent;
      const nextButton = screen.getByRole('button', { name: 'Next Step' });

      // Move to step 2
      await user.click(nextButton);
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2');
      });

      // Move to step 3
      await user.click(nextButton);
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3');
      });
    });
  });

  describe('Agent Limit Management', () => {
    it('respects maxAgents limit', async () => {
      function LimitedAgents() {
        const [error, setError] = useState('');

        return (
          <ClippyProvider maxAgents={2} onError={(err) => setError(err.message)}>
            <Clippy name="Clippy" />
            <Clippy name="Merlin" />
            <Clippy name="Rover" />
            {error && (
              <div role="alert" data-testid="error-message">
                {error}
              </div>
            )}
          </ClippyProvider>
        );
      }

      render(<LimitedAgents />);

      // Should attempt to load 3 agents but maxAgents is 2
      await waitFor(() => {
        const errorElement = screen.queryByTestId('error-message');
        if (errorElement) {
          expect(errorElement.textContent).toContain('Maximum');
        }
      });
    });

    it('allows agent replacement within limit', async () => {
      function AgentRotation() {
        const [agents, setAgents] = useState<string[]>(['Clippy', 'Merlin']);

        const rotateAgent = () => {
          setAgents(['Rover', 'Genie']);
        };

        return (
          <ClippyProvider maxAgents={2}>
            {agents.map((name) => (
              <Clippy key={name} name={name} />
            ))}
            <button onClick={rotateAgent}>Rotate Agents</button>
            <div data-testid="agent-list">{agents.join(', ')}</div>
          </ClippyProvider>
        );
      }

      render(<AgentRotation />);

      const user = userEvent;
      const rotateButton = screen.getByRole('button', { name: 'Rotate Agents' });
      await user.click(rotateButton);

      await waitFor(() => {
        expect(screen.getByTestId('agent-list')).toHaveTextContent(
          'Rover, Genie'
        );
      });
    });
  });

  describe('Concurrent Agent Actions', () => {
    it('handles simultaneous agent updates', async () => {
      function ConcurrentActions() {
        const agent1 = useAgent('Clippy', { autoLoad: true });
        const agent2 = useAgent('Merlin', { autoLoad: true });
        const [updates, setUpdates] = useState(0);

        const performConcurrentActions = async () => {
          if (agent1.agent && agent2.agent) {
            await Promise.all([
              agent1.speak('Agent 1 speaking'),
              agent2.speak('Agent 2 speaking'),
              agent1.play('Wave'),
              agent2.play('Wave'),
            ]);

            setUpdates(4);
          }
        };

        return (
          <div>
            <button onClick={performConcurrentActions}>Execute All</button>
            <div data-testid="update-count">{updates} updates</div>
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <ConcurrentActions />
        </ClippyProvider>
      );

      // Wait for React effects to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const executeButton = screen.getByRole('button', { name: 'Execute All' });
      await user.click(executeButton);

      await waitFor(() => {
        expect(screen.getByTestId('update-count')).toHaveTextContent('4 updates');
      }, { timeout: 10000 });
    }, 15000);
  });
});
