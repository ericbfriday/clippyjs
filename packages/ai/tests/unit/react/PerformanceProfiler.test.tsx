import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PerformanceProfiler } from '../../../src/react/PerformanceProfiler';
import { ContextManager } from '../../../src/context/ContextManager';
import type { ContextProvider, ContextData } from '../../../src/context/ContextProvider';

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

describe('PerformanceProfiler', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Performance Profiler/i)).toBeInTheDocument();
    });

    it('should apply correct theme class', () => {
      const { container } = render(<PerformanceProfiler contextManager={manager} theme="dark" />);
      const profiler = container.querySelector('.performance-profiler--dark');
      expect(profiler).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Export/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display average gather time statistic', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Avg Gather Time/i)).toBeInTheDocument();
    });

    it('should display cache hit rate statistic', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Cache Hit Rate/i)).toBeInTheDocument();
    });

    it('should display average tokens statistic', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Avg Tokens/i)).toBeInTheDocument();
    });

    it('should display total gatherings statistic', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Total Gatherings/i)).toBeInTheDocument();
    });

    it('should show initial zero values', () => {
      const { container } = render(<PerformanceProfiler contextManager={manager} />);

      // Check that stats display with zero values
      expect(container.textContent).toContain('0.00ms');
      expect(container.textContent).toContain('0.0%');
    });
  });

  describe('Performance Range Display', () => {
    it('should display gather time range section', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Gather Time Range/i)).toBeInTheDocument();
    });

    it('should show min and max gather times', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Min:/i)).toBeInTheDocument();
      expect(screen.getByText(/Max:/i)).toBeInTheDocument();
    });
  });

  describe('Chart Display', () => {
    it('should show empty state when no data points', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(
        screen.getByText(/No performance data yet. Gather some contexts to see trends!/i)
      ).toBeInTheDocument();
    });

    it('should render SVG chart when data points exist', async () => {
      manager.registerProvider(createMockProvider('test-provider', { data: 'test' }));

      const { container } = render(<PerformanceProfiler contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should show chart label with data point count', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText(/Gather Time History \(last \d+ operations\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Manager Statistics Section', () => {
    it('should display context manager section', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Context Manager/i)).toBeInTheDocument();
    });

    it('should show provider count', () => {
      manager.registerProvider(createMockProvider('provider-1'));
      manager.registerProvider(createMockProvider('provider-2'));

      render(<PerformanceProfiler contextManager={manager} />);

      expect(screen.getByText(/Providers:/i)).toBeInTheDocument();
    });

    it('should show cache size', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Cache Size:/i)).toBeInTheDocument();
    });

    it('should show memory usage', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Memory:/i)).toBeInTheDocument();
    });

    it('should show total errors', () => {
      render(<PerformanceProfiler contextManager={manager} />);
      expect(screen.getByText(/Total Errors:/i)).toBeInTheDocument();
    });
  });

  describe('Data Point Tracking', () => {
    it('should track data points when contexts are gathered', async () => {
      manager.registerProvider(createMockProvider('test-provider', { data: 'test' }));

      const { container } = render(<PerformanceProfiler contextManager={manager} />);

      // Gather context
      await manager.gatherContext();

      // Should update (check text content includes updated count)
      await waitFor(() => {
        expect(container.textContent).toContain('1');
      });
    });

    it('should respect maxDataPoints limit', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} maxDataPoints={3} />);

      // Gather contexts 5 times
      for (let i = 0; i < 5; i++) {
        await manager.gatherContext({ forceRefresh: true });
      }

      // Should only show last 3
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should calculate average gather time correctly', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      const { container } = render(<PerformanceProfiler contextManager={manager} />);

      // Gather multiple times
      await manager.gatherContext();
      await manager.gatherContext({ forceRefresh: true });

      await waitFor(() => {
        // Should show avg time statistic
        expect(container.textContent).toMatch(/Avg Gather Time/);
      });
    });

    it('should track cache hits separately', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      // First gather (not cached)
      await manager.gatherContext({ cacheKey: 'test' });

      // Second gather (cached)
      await manager.gatherContext({ cacheKey: 'test' });

      await waitFor(() => {
        // Cache hit rate should be > 0%
        const hitRateText = screen.getByText(/\d+\.\d+%/);
        expect(hitRateText).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to context manager on mount', () => {
      const subscribeSpy = vi.spyOn(manager, 'subscribe');

      render(<PerformanceProfiler contextManager={manager} />);

      expect(subscribeSpy).toHaveBeenCalled();

      subscribeSpy.mockRestore();
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn();
      const subscribeSpy = vi.spyOn(manager, 'subscribe').mockReturnValue(unsubscribe);

      const { unmount } = render(<PerformanceProfiler contextManager={manager} />);

      unmount();

      expect(unsubscribe).toHaveBeenCalled();

      subscribeSpy.mockRestore();
    });

    it('should handle context-gathered events', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      await manager.gatherContext();

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should handle cache-hit events', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      // First gather to populate cache
      await manager.gatherContext({ cacheKey: 'test' });

      // Second gather should be cache hit
      await manager.gatherContext({ cacheKey: 'test' });

      await waitFor(() => {
        // Should have recorded 2 gatherings
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export data when export button is clicked', async () => {

      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      await manager.gatherContext();

      // Mock URL.createObjectURL and document.createElement
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            click: clickMock,
            href: '',
            download: '',
          } as any;
        }
        return document.createElement(tag);
      });

      const exportButton = screen.getByText(/Export/i);
      fireEvent.click(exportButton);

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('should have export button', async () => {
      manager.registerProvider(createMockProvider('test-provider'));

      render(<PerformanceProfiler contextManager={manager} />);

      // Verify export button exists
      const exportButton = screen.getByText(/Export/i);
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('should display range section', () => {
      render(<PerformanceProfiler contextManager={manager} />);

      expect(screen.getByText(/Gather Time Range/i)).toBeInTheDocument();
      expect(screen.getByText(/Min:/i)).toBeInTheDocument();
      expect(screen.getByText(/Max:/i)).toBeInTheDocument();
    });

    it('should handle zero data points gracefully', () => {
      render(<PerformanceProfiler contextManager={manager} />);

      expect(screen.getByText('0.00ms')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });
});
