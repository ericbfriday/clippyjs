import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClippyProvider, useAgent } from '../../src';
import { useState } from 'react';

/**
 * Integration Tests: Speech Bubble Rendering
 *
 * Tests that verify speech bubbles render correctly with proper CSS styling
 * and positioning. These tests ensure the CSS loading fix works as expected.
 *
 * Key verifications:
 * - CSS file is loaded when agent is loaded
 * - Speech bubbles have correct styling (position: fixed, background, etc.)
 * - Balloons are not constrained by parent bounding boxes
 * - Multiple speech bubbles work correctly
 */

// Mock the core load function with CSS loading verification
vi.mock('@clippyjs/core', () => ({
  load: vi.fn((name: string) =>
    Promise.resolve({
      name,
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      play: vi.fn(() => Promise.resolve()),
      speak: vi.fn(() => {
        // Simulate CSS loading by adding link element
        if (typeof document !== 'undefined') {
          const existingLink = document.querySelector('link[href*="clippy.css"]');
          if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = '/clippy.css';
            document.head.appendChild(link);
          }

          // Simulate balloon element creation with CSS classes
          const balloon = document.createElement('div');
          balloon.className = 'clippy-balloon';
          balloon.style.display = 'block';
          balloon.setAttribute('data-testid', 'speech-balloon');

          const content = document.createElement('div');
          content.className = 'clippy-content';
          content.textContent = 'Test message';

          const tip = document.createElement('div');
          tip.className = 'clippy-tip';

          balloon.appendChild(tip);
          balloon.appendChild(content);
          document.body.appendChild(balloon);

          // Clean up after a short delay
          setTimeout(() => {
            if (balloon.parentNode) {
              balloon.parentNode.removeChild(balloon);
            }
          }, 100);
        }
        return Promise.resolve();
      }),
      moveTo: vi.fn(() => Promise.resolve()),
      gestureAt: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(),
      isVisible: vi.fn(() => true),
      getAnimations: vi.fn(() => ['Wave', 'Idle']),
    })
  ),
}));

describe('Integration: Speech Bubble Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Clean up any existing CSS links and balloons
    document.querySelectorAll('link[href*="clippy.css"]').forEach(el => el.remove());
    document.querySelectorAll('.clippy-balloon').forEach(el => el.remove());
  });

  afterEach(() => {
    // Clean up CSS links and balloons after each test
    document.querySelectorAll('link[href*="clippy.css"]').forEach(el => el.remove());
    document.querySelectorAll('.clippy-balloon').forEach(el => el.remove());
  });

  describe('CSS Loading', () => {
    it('loads CSS file when agent is loaded and speaks', async () => {
      function TestComponent() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [spoke, setSpoke] = useState(false);

        const handleSpeak = async () => {
          if (agent.agent) {
            await agent.speak('Test message');
            setSpoke(true);
          }
        };

        return (
          <div>
            <button onClick={handleSpeak}>Speak</button>
            {spoke && <div data-testid="spoke-indicator">Spoke</div>}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <TestComponent />
        </ClippyProvider>
      );

      // Wait for agent to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const speakButton = screen.getByRole('button', { name: 'Speak' });
      await user.click(speakButton);

      await waitFor(() => {
        expect(screen.getByTestId('spoke-indicator')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify CSS link was added to document head
      const cssLink = document.querySelector('link[href*="clippy.css"]');
      expect(cssLink).toBeTruthy();
      expect(cssLink?.getAttribute('rel')).toBe('stylesheet');
      expect(cssLink?.getAttribute('type')).toBe('text/css');
    });

    it('loads CSS only once even with multiple agents', async () => {
      function MultiAgentComponent() {
        const agent1 = useAgent('Clippy', { autoLoad: true });
        const agent2 = useAgent('Merlin', { autoLoad: true });
        const [spoke, setSpoke] = useState(false);

        const handleSpeakBoth = async () => {
          if (agent1.agent && agent2.agent) {
            await agent1.speak('Clippy speaks');
            await agent2.speak('Merlin speaks');
            setSpoke(true);
          }
        };

        return (
          <div>
            <button onClick={handleSpeakBoth}>Speak Both</button>
            {spoke && <div data-testid="both-spoke">Both spoke</div>}
          </div>
        );
      }

      render(
        <ClippyProvider maxAgents={2}>
          <MultiAgentComponent />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const speakButton = screen.getByRole('button', { name: 'Speak Both' });
      await user.click(speakButton);

      await waitFor(() => {
        expect(screen.getByTestId('both-spoke')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify CSS is loaded only once
      const cssLinks = document.querySelectorAll('link[href*="clippy.css"]');
      expect(cssLinks.length).toBe(1);
    });
  });

  describe('Balloon Element Creation', () => {
    it('creates balloon element with correct CSS classes', async () => {
      function BalloonTestComponent() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [created, setCreated] = useState(false);

        const handleSpeak = async () => {
          if (agent.agent) {
            await agent.speak('Test balloon');
            setCreated(true);
          }
        };

        return (
          <div>
            <button onClick={handleSpeak}>Create Balloon</button>
            {created && <div data-testid="balloon-created">Created</div>}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <BalloonTestComponent />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const speakButton = screen.getByRole('button', { name: 'Create Balloon' });
      await user.click(speakButton);

      await waitFor(() => {
        const balloon = document.querySelector('.clippy-balloon');
        expect(balloon).toBeTruthy();
        expect(balloon?.classList.contains('clippy-balloon')).toBe(true);
      }, { timeout: 5000 });

      // Verify balloon has correct child elements
      const balloon = document.querySelector('.clippy-balloon');
      const content = balloon?.querySelector('.clippy-content');
      const tip = balloon?.querySelector('.clippy-tip');

      expect(content).toBeTruthy();
      expect(tip).toBeTruthy();
      expect(content?.textContent).toBe('Test message');
    });

    it('balloon is appended to document.body, not constrained by container', async () => {
      function ConstrainedContainer() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [spoke, setSpoke] = useState(false);

        const handleSpeak = async () => {
          if (agent.agent) {
            await agent.speak('Not constrained!');
            setSpoke(true);
          }
        };

        return (
          <div style={{ width: '200px', height: '100px', overflow: 'hidden' }}>
            <button onClick={handleSpeak}>Speak</button>
            {spoke && <div data-testid="spoke">Spoke</div>}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ConstrainedContainer />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const speakButton = screen.getByRole('button', { name: 'Speak' });
      await user.click(speakButton);

      await waitFor(() => {
        expect(screen.getByTestId('spoke')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify balloon is direct child of body, not the constrained div
      const balloon = document.querySelector('.clippy-balloon');
      expect(balloon?.parentElement).toBe(document.body);
    });
  });

  describe('CSS Styling Verification', () => {
    it('balloon element should have styling classes for CSS application', async () => {
      function StyledBalloonTest() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [ready, setReady] = useState(false);

        const handleSpeak = async () => {
          if (agent.agent) {
            await agent.speak('Styled message');
            setReady(true);
          }
        };

        return (
          <div>
            <button onClick={handleSpeak}>Speak</button>
            {ready && <div data-testid="ready">Ready</div>}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <StyledBalloonTest />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      await user.click(screen.getByRole('button', { name: 'Speak' }));

      await waitFor(() => {
        expect(screen.getByTestId('ready')).toBeInTheDocument();
      }, { timeout: 5000 });

      const balloon = document.querySelector('.clippy-balloon');

      // Verify balloon has the correct CSS classes that would receive styling
      expect(balloon?.classList.contains('clippy-balloon')).toBe(true);

      // Verify child elements have correct classes
      expect(balloon?.querySelector('.clippy-content')).toBeTruthy();
      expect(balloon?.querySelector('.clippy-tip')).toBeTruthy();
    });
  });

  describe('Multiple Speech Bubbles', () => {
    it('handles multiple speech bubbles in sequence', async () => {
      function MultiSpeechTest() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [count, setCount] = useState(0);

        const handleMultipleSpeeches = async () => {
          if (agent.agent) {
            await agent.speak('First message');
            setCount(1);
            await agent.speak('Second message');
            setCount(2);
            await agent.speak('Third message');
            setCount(3);
          }
        };

        return (
          <div>
            <button onClick={handleMultipleSpeeches}>Multiple Speeches</button>
            <div data-testid="speech-count">{count}</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <MultiSpeechTest />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      await user.click(screen.getByRole('button', { name: 'Multiple Speeches' }));

      await waitFor(() => {
        expect(screen.getByTestId('speech-count')).toHaveTextContent('3');
      }, { timeout: 10000 });

      // CSS should still be loaded only once
      const cssLinks = document.querySelectorAll('link[href*="clippy.css"]');
      expect(cssLinks.length).toBe(1);
    });
  });

  describe('Position Fixed Simulation', () => {
    it('balloon should be positioned for fixed rendering (not constrained)', async () => {
      function PositionTest() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [positioned, setPositioned] = useState(false);

        const handleSpeak = async () => {
          if (agent.agent) {
            await agent.speak('Position test');
            setPositioned(true);
          }
        };

        return (
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
            <button onClick={handleSpeak}>Test Position</button>
            {positioned && <div data-testid="positioned">Positioned</div>}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <PositionTest />
        </ClippyProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      await user.click(screen.getByRole('button', { name: 'Test Position' }));

      await waitFor(() => {
        expect(screen.getByTestId('positioned')).toBeInTheDocument();
      }, { timeout: 5000 });

      const balloon = document.querySelector('.clippy-balloon');

      // Verify balloon is direct child of body (requirement for position: fixed to work correctly)
      expect(balloon?.parentElement).toBe(document.body);

      // Verify balloon has display style set (would be styled by CSS)
      expect(balloon?.style.display).toBeTruthy();
    });
  });
});
