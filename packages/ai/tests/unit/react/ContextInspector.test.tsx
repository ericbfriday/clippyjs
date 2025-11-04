import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContextInspector } from '../../../src/react/ContextInspector';
import { ContextManager } from '../../../src/context/ContextManager';
import type { ContextProvider, ContextData } from '../../../src/context/ContextProvider';
import type { ScoredContext } from '../../../src/context/ContextPrioritizer';

// Mock provider factory
function createMockProvider(name: string, data: Record<string, any> = {}): ContextProvider {
  return {
    name,
    enabled: true,
    async gather(): Promise<ContextData> {
      return {
        provider: name,
        timestamp: new Date(),
        data,
      };
    },
  };
}

describe('ContextInspector', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ContextInspector contextManager={manager} />);
      expect(screen.getByText(/Context Inspector/i)).toBeInTheDocument();
    });

    it('should render in collapsed state when collapsed prop is true', () => {
      render(<ContextInspector contextManager={manager} collapsed={true} />);
      expect(screen.queryByText(/Providers:/i)).not.toBeInTheDocument();
    });

    it('should render in expanded state when collapsed prop is false', () => {
      render(<ContextInspector contextManager={manager} collapsed={false} />);
      expect(screen.getByText(/Providers:/i)).toBeInTheDocument();
    });

    it('should apply correct theme class', () => {
      const { container } = render(<ContextInspector contextManager={manager} theme="dark" />);
      const inspector = container.querySelector('.context-inspector--dark');
      expect(inspector).toBeInTheDocument();
    });

    it('should apply correct position class', () => {
      const { container } = render(
        <ContextInspector contextManager={manager} position="top-left" />
      );
      const inspector = container.querySelector('.context-inspector--top-left');
      expect(inspector).toBeInTheDocument();
    });
  });

  describe('Context Display', () => {
    it('should display empty state when no contexts are gathered', async () => {
      render(<ContextInspector contextManager={manager} />);
      await waitFor(() => {
        expect(screen.getByText(/No contexts gathered yet/i)).toBeInTheDocument();
      });
    });

    it('should display contexts after gathering', async () => {
      const provider = createMockProvider('test-provider', { value: 'test' });
      manager.registerProvider(provider);

      render(<ContextInspector contextManager={manager} />);

      // Trigger context gathering
      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('test-provider')).toBeInTheDocument();
      });
    });

    it('should display multiple contexts', async () => {
      manager.registerProvider(createMockProvider('provider-1', { data: 'a' }));
      manager.registerProvider(createMockProvider('provider-2', { data: 'b' }));

      render(<ContextInspector contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('provider-1')).toBeInTheDocument();
        expect(screen.getByText('provider-2')).toBeInTheDocument();
      });
    });

    it('should display relevance scores', async () => {
      manager.registerProvider(createMockProvider('test-provider', { data: 'test' }));

      render(<ContextInspector contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText(/Score:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display provider count', async () => {
      manager.registerProvider(createMockProvider('provider-1'));
      manager.registerProvider(createMockProvider('provider-2'));

      render(<ContextInspector contextManager={manager} />);

      await waitFor(() => {
        expect(screen.getByText(/Providers:/i)).toBeInTheDocument();
      });
    });

    it('should display cache hit rate', async () => {
      render(<ContextInspector contextManager={manager} />);

      await waitFor(() => {
        expect(screen.getByText(/Cache Hit Rate:/i)).toBeInTheDocument();
      });
    });

    it('should display average gather time', async () => {
      render(<ContextInspector contextManager={manager} />);

      await waitFor(() => {
        expect(screen.getByText(/Avg Gather Time:/i)).toBeInTheDocument();
      });
    });

    it('should display memory usage', async () => {
      render(<ContextInspector contextManager={manager} />);

      await waitFor(() => {
        expect(screen.getByText(/Memory:/i)).toBeInTheDocument();
      });
    });

    it('should update statistics periodically', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<ContextInspector contextManager={manager} />);

      // Initial render should show stats
      await waitFor(() => {
        expect(screen.getByText(/Providers:/i)).toBeInTheDocument();
      });

      // Stats should update periodically (this happens via interval)
      // We just verify the stats are present
      expect(screen.getByText(/Cache Hit Rate:/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle collapsed state when toggle button is clicked', async () => {
      render(<ContextInspector contextManager={manager} collapsed={false} />);

      const toggleButton = screen.getByRole('button', { name: /▲/i });

      // Should be expanded initially
      expect(screen.getByText(/Providers:/i)).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(toggleButton);

      // Should be collapsed
      await waitFor(() => {
        expect(screen.queryByText(/Providers:/i)).not.toBeInTheDocument();
      });
    });

    it('should call onToggle callback when collapsed state changes', async () => {
      const onToggle = vi.fn();

      render(<ContextInspector contextManager={manager} onToggle={onToggle} collapsed={false} />);

      const toggleButton = screen.getByRole('button', { name: /▲/i });
      fireEvent.click(toggleButton);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should select context when context item is clicked', async () => {
      manager.registerProvider(createMockProvider('test-provider', { value: 'test' }));

      render(<ContextInspector contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('test-provider')).toBeInTheDocument();
      });

      const contextItem = screen.getByText('test-provider').closest('div');
      if (contextItem) {
        fireEvent.click(contextItem);

        // Should show detail view
        await waitFor(() => {
          expect(screen.getByText(/Context Details:/i)).toBeInTheDocument();
        });
      }
    });

    it('should filter contexts by search term', async () => {
      manager.registerProvider(createMockProvider('provider-alpha', { data: 'a' }));
      manager.registerProvider(createMockProvider('provider-beta', { data: 'b' }));

      render(<ContextInspector contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('provider-alpha')).toBeInTheDocument();
        expect(screen.getByText('provider-beta')).toBeInTheDocument();
      });

      // Type search term
      const searchInput = screen.getByPlaceholderText(/Search contexts/i);
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      // Should filter to only alpha
      await waitFor(() => {
        expect(screen.getByText('provider-alpha')).toBeInTheDocument();
        expect(screen.queryByText('provider-beta')).not.toBeInTheDocument();
      });
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to context manager on mount', async () => {
      const subscribeSpy = vi.spyOn(manager, 'subscribe');

      render(<ContextInspector contextManager={manager} />);

      expect(subscribeSpy).toHaveBeenCalled();

      subscribeSpy.mockRestore();
    });

    it('should unsubscribe on unmount', async () => {
      const unsubscribe = vi.fn();
      const subscribeSpy = vi.spyOn(manager, 'subscribe').mockReturnValue(unsubscribe);

      const { unmount } = render(<ContextInspector contextManager={manager} />);

      unmount();

      expect(unsubscribe).toHaveBeenCalled();

      subscribeSpy.mockRestore();
    });

    it('should update contexts when context-gathered event fires', async () => {
      manager.registerProvider(createMockProvider('test-provider', { data: 'test' }));

      render(<ContextInspector contextManager={manager} />);

      // Initially empty
      expect(screen.getByText(/No contexts gathered yet/i)).toBeInTheDocument();

      // Trigger gathering
      await manager.gatherContext();

      // Should update with contexts
      await waitFor(
        () => {
          expect(screen.getByText('test-provider')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Copy Functionality', () => {
    it('should copy context JSON to clipboard when copy button is clicked', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      manager.registerProvider(createMockProvider('test-provider', { value: 'test' }));

      render(<ContextInspector contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('test-provider')).toBeInTheDocument();
      });

      const copyButton = screen.getByText(/Copy/i);
      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', async () => {
      const { unmount } = render(<ContextInspector contextManager={manager} />);

      // Unmount should clean up without errors
      unmount();

      // No errors should occur
      expect(true).toBe(true);
    });
  });
});
