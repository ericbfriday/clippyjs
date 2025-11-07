import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { ClippyProvider, useAgent, Clippy } from '../../src';
import type { ReactNode } from 'react';

/**
 * Usage Example Tests
 *
 * These tests serve as both validation and documentation,
 * demonstrating the recommended ways to use ClippyJS React.
 *
 * Each test is a working example that developers can reference.
 */

// Mock the core load function
vi.mock('../src', () => ({
  load: vi.fn((name: string) =>
    Promise.resolve({
      name,
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      play: vi.fn(() => Promise.resolve()),
      animate: vi.fn(() => Promise.resolve()),
      speak: vi.fn(() => Promise.resolve()),
      moveTo: vi.fn(() => Promise.resolve()),
      gestureAt: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      stopCurrent: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      delay: vi.fn(() => Promise.resolve()),
      closeBalloon: vi.fn(),
      getAnimations: vi.fn(() => ['Wave', 'Idle', 'GetAttention', 'Congratulate']),
      hasAnimation: vi.fn(() => true),
      isVisible: vi.fn(() => true),
      destroy: vi.fn(),
    })
  ),
}));

describe('Usage Examples', () => {
  describe('Example 1: Basic Setup with Provider', () => {
    /**
     * USAGE EXAMPLE:
     * Wrap your app with ClippyProvider to enable Clippy functionality
     */
    it('demonstrates basic provider setup', () => {
      function App() {
        return (
          <ClippyProvider>
            <div>My Application</div>
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Example 2: Simple Declarative Agent', () => {
    /**
     * USAGE EXAMPLE:
     * Use the <Clippy> component for declarative agent management
     */
    it('demonstrates declarative Clippy component', () => {
      function App() {
        return (
          <ClippyProvider>
            <Clippy name="Clippy" showOnLoad={true} />
            <div>Content goes here</div>
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });

    /**
     * USAGE EXAMPLE:
     * Add an initial greeting message
     */
    it('demonstrates agent with initial message', () => {
      function App() {
        return (
          <ClippyProvider>
            <Clippy
              name="Clippy"
              speak="Welcome! How can I help you today?"
              showOnLoad={true}
            />
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });

    /**
     * USAGE EXAMPLE:
     * Position the agent at a specific location
     */
    it('demonstrates agent with custom position', () => {
      function App() {
        return (
          <ClippyProvider>
            <Clippy
              name="Clippy"
              position={{ x: 100, y: 200 }}
              showOnLoad={true}
            />
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Example 3: Imperative Control with useAgent', () => {
    /**
     * USAGE EXAMPLE:
     * Use useAgent hook for programmatic control
     */
    it('demonstrates basic useAgent usage', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Load the agent
      await act(async () => {
        await result.current.load();
      });

      // Verify agent is loaded
      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    /**
     * USAGE EXAMPLE:
     * Auto-load agent on component mount
     */
    it('demonstrates autoLoad option', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(
        () => useAgent('Clippy', { autoLoad: true, autoShow: true }),
        { wrapper }
      );

      // Agent should start loading automatically
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.agent).not.toBeNull();
      });
    });

    /**
     * USAGE EXAMPLE:
     * Control agent visibility
     */
    it('demonstrates show and hide methods', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Show the agent
      await act(async () => {
        await result.current.show();
      });

      expect(result.current.agent?.show).toHaveBeenCalled();

      // Hide the agent
      await act(async () => {
        await result.current.hide();
      });

      expect(result.current.agent?.hide).toHaveBeenCalled();
    });

    /**
     * USAGE EXAMPLE:
     * Make agent speak a message
     */
    it('demonstrates speak method', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Make Clippy speak
      await act(async () => {
        await result.current.speak('Hello! I can help you with that.');
      });

      expect(result.current.agent?.speak).toHaveBeenCalledWith(
        'Hello! I can help you with that.',
        undefined
      );
    });

    /**
     * USAGE EXAMPLE:
     * Play specific animations
     */
    it('demonstrates play animation', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Play a specific animation
      await act(async () => {
        await result.current.play('Wave');
      });

      expect(result.current.agent?.play).toHaveBeenCalledWith('Wave');
    });

    /**
     * USAGE EXAMPLE:
     * Move agent to specific coordinates
     */
    it('demonstrates moveTo method', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Move agent to coordinates
      await act(async () => {
        await result.current.moveTo(300, 400, 1000); // x, y, duration
      });

      expect(result.current.agent?.moveTo).toHaveBeenCalledWith(300, 400, 1000);
    });

    /**
     * USAGE EXAMPLE:
     * Point at UI elements
     */
    it('demonstrates gestureAt method', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Point at a UI element
      await act(async () => {
        await result.current.gestureAt(150, 250);
      });

      expect(result.current.agent?.gestureAt).toHaveBeenCalledWith(150, 250);
    });
  });

  describe('Example 4: Advanced Interactions', () => {
    /**
     * USAGE EXAMPLE:
     * Create a welcome sequence
     */
    it('demonstrates welcome sequence', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Welcome sequence: show, wave, speak
      await act(async () => {
        await result.current.show();
        await result.current.play('Wave');
        await result.current.speak('Welcome to the application!');
      });

      expect(result.current.agent?.show).toHaveBeenCalled();
      expect(result.current.agent?.play).toHaveBeenCalledWith('Wave');
      expect(result.current.agent?.speak).toHaveBeenCalled();
    });

    /**
     * USAGE EXAMPLE:
     * Create a tutorial sequence
     */
    it('demonstrates tutorial sequence', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Tutorial: move, point, speak, delay, next step
      await act(async () => {
        await result.current.moveTo(100, 100);
        await result.current.gestureAt(150, 150);
        await result.current.speak('Click here to get started!');
        await result.current.delay(2000);
        await result.current.moveTo(300, 200);
        await result.current.speak('Then fill out this form.');
      });

      expect(result.current.agent?.moveTo).toHaveBeenCalled();
      expect(result.current.agent?.gestureAt).toHaveBeenCalled();
      expect(result.current.agent?.speak).toHaveBeenCalled();
      expect(result.current.agent?.delay).toHaveBeenCalled();
    });

    /**
     * USAGE EXAMPLE:
     * Check available animations
     */
    it('demonstrates getting available animations', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Get list of available animations
      const animations = result.current.getAnimations();

      expect(animations).toContain('Wave');
      expect(animations).toContain('Idle');
      expect(animations.length).toBeGreaterThan(0);

      // Check if specific animation exists
      const hasWave = result.current.hasAnimation('Wave');
      expect(hasWave).toBe(true);
    });
  });

  describe('Example 5: Multiple Agents', () => {
    /**
     * USAGE EXAMPLE:
     * Load multiple different agents
     */
    it('demonstrates multiple agents', () => {
      function App() {
        return (
          <ClippyProvider maxAgents={3}>
            <Clippy name="Clippy" position={{ x: 50, y: 100 }} />
            <Clippy name="Merlin" position={{ x: 150, y: 100 }} />
            <Clippy name="Rover" position={{ x: 250, y: 100 }} />
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Example 6: Error Handling', () => {
    /**
     * USAGE EXAMPLE:
     * Handle loading errors
     */
    it('demonstrates error handling', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      // Load and check for errors
      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        // Should load successfully
        expect(result.current.error).toBeNull();
        expect(result.current.agent).not.toBeNull();
      });
    });

    /**
     * USAGE EXAMPLE:
     * Use onError callback in Clippy component
     */
    it('demonstrates component error callback', () => {
      const handleError = vi.fn();

      function App() {
        return (
          <ClippyProvider>
            <Clippy
              name="Clippy"
              onError={handleError}
              onLoad={(agent) => {
                console.log('Agent loaded:', agent.name);
              }}
            />
          </ClippyProvider>
        );
      }

      render(<App />);
      // Error callback is ready to handle any loading errors
      expect(handleError).not.toHaveBeenCalled();
    });
  });

  describe('Example 7: Cleanup and Lifecycle', () => {
    /**
     * USAGE EXAMPLE:
     * Manual cleanup with unload
     */
    it('demonstrates manual cleanup', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Manually unload agent
      act(() => {
        result.current.unload();
      });

      expect(result.current.agent).toBeNull();
    });

    /**
     * USAGE EXAMPLE:
     * Auto-cleanup on unmount
     */
    it('demonstrates auto-cleanup', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result, unmount } = renderHook(
        () => useAgent('Clippy', { autoCleanup: true }),
        { wrapper }
      );

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Component unmounts - agent should auto-cleanup
      unmount();
      // Auto-cleanup handled automatically
    });

    /**
     * USAGE EXAMPLE:
     * Reload agent
     */
    it('demonstrates reload', async () => {
      function wrapper({ children }: { children: ReactNode }) {
        return <ClippyProvider>{children}</ClippyProvider>;
      }

      const { result } = renderHook(() => useAgent('Clippy'), { wrapper });

      await act(async () => {
        await result.current.load();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });

      // Reload agent (useful for resetting state)
      await act(async () => {
        await result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.agent).not.toBeNull();
      });
    });
  });

  describe('Example 8: Custom Configuration', () => {
    /**
     * USAGE EXAMPLE:
     * Custom asset path
     */
    it('demonstrates custom basePath', () => {
      function App() {
        return (
          <ClippyProvider defaultBasePath="/my-custom-path/agents/">
            <Clippy name="Clippy" />
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });

    /**
     * USAGE EXAMPLE:
     * Limit concurrent agents
     */
    it('demonstrates maxAgents limit', () => {
      function App() {
        return (
          <ClippyProvider maxAgents={2}>
            <Clippy name="Clippy" />
            <Clippy name="Merlin" />
            {/* Third agent would hit the limit */}
          </ClippyProvider>
        );
      }

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });

    /**
     * USAGE EXAMPLE:
     * Global error handler
     */
    it('demonstrates global error handling', () => {
      const handleGlobalError = vi.fn((error, agentName) => {
        console.error(`Error in ${agentName}:`, error);
      });

      function App() {
        return (
          <ClippyProvider onError={handleGlobalError}>
            <Clippy name="Clippy" />
          </ClippyProvider>
        );
      }

      render(<App />);
      // Global error handler is ready
      expect(handleGlobalError).not.toHaveBeenCalled();
    });
  });
});
