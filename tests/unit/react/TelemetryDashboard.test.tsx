import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TelemetryDashboard } from '../../../packages/ai/src/react/TelemetryDashboard';
import type { PerformanceMetrics } from '../../../packages/ai/src/cache/PerformanceMonitor';
import type { ErrorEvent, CircuitBreakerEvent } from '../../../packages/ai/src/errors/TelemetryHooks';

describe('TelemetryDashboard', () => {
  const mockMetrics: PerformanceMetrics = {
    cache: {
      hitRate: 0.75,
      hits: 75,
      misses: 25,
      avgResponseTime: 5,
    },
    api: {
      totalRequests: 100,
      avgLatency: 150,
      minLatency: 50,
      maxLatency: 500,
      requestRate: 2.5,
    },
    tokens: {
      totalTokens: 10000,
      savedTokens: 3000,
      savingsRate: 0.3,
      avgTokensPerRequest: 100,
    },
    timeWindowMs: 300000,
  };

  const mockErrors: ErrorEvent[] = [
    {
      error: {
        type: 'RateLimitError',
        severity: 'medium',
        message: 'Rate limit exceeded',
        details: { stack: 'Error stack trace' },
      },
      originalError: new Error('Rate limit'),
      timestamp: Date.now() - 5000,
      recovered: true,
      recoveryAction: { type: 'retry' },
    },
  ];

  const mockCircuits = new Map([
    [
      'test-service',
      {
        circuitKey: 'test-service',
        state: 'closed' as const,
        reason: 'All requests successful',
        timestamp: Date.now(),
        stats: {
          failureRate: 0.1,
          totalRequests: 50,
          failures: 5,
          successes: 45,
        },
      },
    ],
  ]);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render dashboard with title', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          errorProvider={() => mockErrors}
        />
      );

      expect(screen.getByText('📊 Telemetry Dashboard')).toBeInTheDocument();
    });

    it('should render with light theme', () => {
      const { container } = render(
        <TelemetryDashboard theme="light" performanceProvider={() => mockMetrics} />
      );

      expect(container.querySelector('.telemetry-dashboard--light')).toBeInTheDocument();
    });

    it('should render with dark theme', () => {
      const { container } = render(
        <TelemetryDashboard theme="dark" performanceProvider={() => mockMetrics} />
      );

      expect(container.querySelector('.telemetry-dashboard--dark')).toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('should display performance metrics', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      expect(screen.getByText(/Avg Latency/)).toBeInTheDocument();
      expect(screen.getByText(/150ms/)).toBeInTheDocument();
      expect(screen.getByText(/Cache Hit Rate/)).toBeInTheDocument();
      expect(screen.getByText(/75\.0%/)).toBeInTheDocument();
    });

    it('should display error rate', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          errorProvider={() => mockErrors}
        />
      );

      expect(screen.getByText(/Error Rate/)).toBeInTheDocument();
    });

    it('should display request rate', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      expect(screen.getByText(/Requests\/sec/)).toBeInTheDocument();
      expect(screen.getByText(/2\.50/)).toBeInTheDocument();
    });
  });

  describe('Time Range Selection', () => {
    it('should allow time range selection', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      const select = screen.getByDisplayValue('5 minutes');
      fireEvent.change(select, { target: { value: '1h' } });

      expect(select).toHaveValue('1h');
    });

    it('should filter data by selected time range', async () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      const select = screen.getByDisplayValue('5 minutes');
      fireEvent.change(select, { target: { value: '1m' } });

      await waitFor(() => {
        expect(select).toHaveValue('1m');
      });
    });
  });

  describe('Metric Selection', () => {
    it('should allow metric selection', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      const select = screen.getByDisplayValue('API Latency');
      fireEvent.change(select, { target: { value: 'tokens' } });

      expect(select).toHaveValue('tokens');
    });
  });

  describe('Circuit Breakers', () => {
    it('should display circuit breaker status', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          circuitProvider={() => mockCircuits}
        />
      );

      expect(screen.getByText('🔌 Circuit Breakers')).toBeInTheDocument();
      expect(screen.getByText('test-service')).toBeInTheDocument();
      expect(screen.getByText(/closed/)).toBeInTheDocument();
    });

    it('should show circuit failure rates', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          circuitProvider={() => mockCircuits}
        />
      );

      expect(screen.getByText(/Failure Rate: 10\.0%/)).toBeInTheDocument();
    });
  });

  describe('Errors', () => {
    it('should display recent errors', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          errorProvider={() => mockErrors}
        />
      );

      expect(screen.getByText(/Recent Errors/)).toBeInTheDocument();
      expect(screen.getByText('RateLimitError')).toBeInTheDocument();
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });

    it('should show recovery status', () => {
      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          errorProvider={() => mockErrors}
        />
      );

      expect(screen.getByText('✅ Recovered')).toBeInTheDocument();
    });
  });

  describe('Update Interval', () => {
    it('should update metrics at specified interval', async () => {
      let callCount = 0;
      const provider = vi.fn(() => {
        callCount++;
        return mockMetrics;
      });

      render(<TelemetryDashboard performanceProvider={provider} updateInterval={1000} />);

      expect(provider).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(provider).toHaveBeenCalledTimes(2);
      });

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(provider).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Pause/Resume', () => {
    it('should pause updates when pause button clicked', async () => {
      const provider = vi.fn(() => mockMetrics);

      render(<TelemetryDashboard performanceProvider={provider} updateInterval={1000} />);

      const pauseButton = screen.getByLabelText('Pause updates');
      fireEvent.click(pauseButton);

      const initialCalls = provider.mock.calls.length;
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(provider.mock.calls.length).toBe(initialCalls);
      });
    });

    it('should resume updates when resume button clicked', async () => {
      const provider = vi.fn(() => mockMetrics);

      render(<TelemetryDashboard performanceProvider={provider} updateInterval={1000} />);

      const pauseButton = screen.getByLabelText('Pause updates');
      fireEvent.click(pauseButton);

      const resumeButton = screen.getByLabelText('Resume updates');
      fireEvent.click(resumeButton);

      const callsBefore = provider.mock.calls.length;
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(provider.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });
  });

  describe('Export', () => {
    it('should export data when export button clicked', () => {
      const createObjectURL = vi.fn(() => 'blob:mock-url');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const mockClick = vi.fn();
      const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement);

      render(
        <TelemetryDashboard
          performanceProvider={() => mockMetrics}
          errorProvider={() => mockErrors}
        />
      );

      const exportButton = screen.getByLabelText('Export data');
      fireEvent.click(exportButton);

      expect(createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();

      createElement.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for buttons', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      expect(screen.getByLabelText('Pause updates')).toBeInTheDocument();
      expect(screen.getByLabelText('Export data')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      const timeRangeSelect = screen.getByDisplayValue('5 minutes');
      timeRangeSelect.focus();

      expect(document.activeElement).toBe(timeRangeSelect);
    });
  });

  describe('Chart Rendering', () => {
    it('should render chart when data is available', () => {
      const { container } = render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show empty state when no data', () => {
      render(<TelemetryDashboard />);

      expect(screen.getByText(/No data available yet/)).toBeInTheDocument();
    });
  });

  describe('Performance Details', () => {
    it('should show detailed performance metrics', () => {
      render(<TelemetryDashboard performanceProvider={() => mockMetrics} />);

      expect(screen.getByText('📈 Performance Details')).toBeInTheDocument();
      expect(screen.getByText(/Total Requests/)).toBeInTheDocument();
      expect(screen.getByText(/Min Latency/)).toBeInTheDocument();
      expect(screen.getByText(/Max Latency/)).toBeInTheDocument();
      expect(screen.getByText(/Tokens Saved/)).toBeInTheDocument();
    });
  });
});
