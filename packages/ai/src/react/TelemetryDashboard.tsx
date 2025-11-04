import { useEffect, useState, useMemo } from 'react';
import type { PerformanceMetrics } from '../cache/PerformanceMonitor';
import type { ErrorEvent, CircuitBreakerEvent, RetryEvent } from '../errors/TelemetryHooks';

/**
 * TelemetryDashboard component props
 */
export interface TelemetryDashboardProps {
  /** Performance metrics provider */
  performanceProvider?: () => PerformanceMetrics;
  /** Error events provider */
  errorProvider?: () => ErrorEvent[];
  /** Circuit breaker events provider */
  circuitProvider?: () => Map<string, CircuitBreakerEvent>;
  /** Retry events provider */
  retryProvider?: () => RetryEvent[];
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Maximum data points to track */
  maxDataPoints?: number;
}

/**
 * Time series data point
 */
interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

/**
 * TelemetryDashboard - Real-time telemetry visualization
 *
 * Features:
 * - Real-time performance metrics display
 * - Error rate tracking and visualization
 * - Circuit breaker status monitoring
 * - Token usage statistics
 * - Exportable telemetry data
 * - Time range selection
 * - Metric filtering
 * - SVG charts (no dependencies)
 * - Light/dark theme support
 */
export function TelemetryDashboard({
  performanceProvider,
  errorProvider,
  circuitProvider,
  retryProvider,
  theme = 'light',
  updateInterval = 5000,
  maxDataPoints = 60,
}: TelemetryDashboardProps) {
  const [performanceHistory, setPerformanceHistory] = useState<TimeSeriesPoint[]>([]);
  const [errorHistory, setErrorHistory] = useState<TimeSeriesPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [circuits, setCircuits] = useState<Map<string, CircuitBreakerEvent>>(new Map());
  const [retries, setRetries] = useState<RetryEvent[]>([]);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'tokens' | 'errors'>('latency');
  const [isPaused, setIsPaused] = useState(false);

  // Update telemetry data
  useEffect(() => {
    if (isPaused) return;

    const update = () => {
      const now = Date.now();

      // Update performance metrics
      if (performanceProvider) {
        const metrics = performanceProvider();
        setCurrentMetrics(metrics);

        // Add to history based on selected metric
        const value =
          selectedMetric === 'latency'
            ? metrics.api.avgLatency
            : selectedMetric === 'tokens'
              ? metrics.tokens.totalTokens
              : 0;

        setPerformanceHistory((prev) => {
          const updated = [...prev, { timestamp: now, value }];
          return updated.slice(-maxDataPoints);
        });
      }

      // Update errors
      if (errorProvider) {
        const currentErrors = errorProvider();
        setErrors(currentErrors);

        // Add error rate to history
        const errorRate = currentErrors.filter((e) => now - e.timestamp < 60000).length;
        setErrorHistory((prev) => {
          const updated = [...prev, { timestamp: now, value: errorRate }];
          return updated.slice(-maxDataPoints);
        });
      }

      // Update circuit breakers
      if (circuitProvider) {
        setCircuits(circuitProvider());
      }

      // Update retries
      if (retryProvider) {
        setRetries(retryProvider());
      }
    };

    update();
    const interval = setInterval(update, updateInterval);

    return () => clearInterval(interval);
  }, [
    performanceProvider,
    errorProvider,
    circuitProvider,
    retryProvider,
    updateInterval,
    maxDataPoints,
    selectedMetric,
    isPaused,
  ]);

  // Filter data by time range
  const filteredData = useMemo(() => {
    const rangeMs = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
    }[timeRange];

    const cutoff = Date.now() - rangeMs;

    return {
      performance: performanceHistory.filter((p) => p.timestamp >= cutoff),
      errors: errorHistory.filter((e) => e.timestamp >= cutoff),
    };
  }, [performanceHistory, errorHistory, timeRange]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!currentMetrics) {
      return {
        avgLatency: 0,
        errorRate: 0,
        cacheHitRate: 0,
        totalTokens: 0,
        requestRate: 0,
      };
    }

    const recentErrors = errors.filter((e) => Date.now() - e.timestamp < 60000);

    return {
      avgLatency: currentMetrics.api.avgLatency,
      errorRate: (recentErrors.length / Math.max(1, currentMetrics.api.totalRequests)) * 100,
      cacheHitRate: currentMetrics.cache.hitRate * 100,
      totalTokens: currentMetrics.tokens.totalTokens,
      requestRate: currentMetrics.api.requestRate,
    };
  }, [currentMetrics, errors]);

  // Export data
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      performanceHistory: filteredData.performance,
      errorHistory: filteredData.errors,
      currentMetrics,
      errors: errors.slice(-100),
      circuits: Array.from(circuits.entries()),
      retries: retries.slice(-50),
      stats,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`telemetry-dashboard telemetry-dashboard--${theme}`}
      style={isDark ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>📊 Telemetry Dashboard</h3>
        <div style={styles.headerControls}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{ ...styles.button, ...(isPaused ? styles.buttonPaused : {}) }}
            aria-label={isPaused ? 'Resume updates' : 'Pause updates'}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          <button onClick={handleExport} style={styles.button} aria-label="Export data">
            💾
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <MetricCard
          label="Avg Latency"
          value={`${Math.round(stats.avgLatency)}ms`}
          trend={stats.avgLatency < 100 ? 'good' : stats.avgLatency < 300 ? 'warning' : 'bad'}
          theme={theme}
        />
        <MetricCard
          label="Error Rate"
          value={`${stats.errorRate.toFixed(1)}%`}
          trend={stats.errorRate < 1 ? 'good' : stats.errorRate < 5 ? 'warning' : 'bad'}
          theme={theme}
        />
        <MetricCard
          label="Cache Hit Rate"
          value={`${stats.cacheHitRate.toFixed(1)}%`}
          trend={stats.cacheHitRate > 70 ? 'good' : stats.cacheHitRate > 40 ? 'warning' : 'bad'}
          theme={theme}
        />
        <MetricCard
          label="Requests/sec"
          value={stats.requestRate.toFixed(2)}
          trend={stats.requestRate < 10 ? 'good' : stats.requestRate < 20 ? 'warning' : 'bad'}
          theme={theme}
        />
      </div>

      {/* Time Range & Metric Selector */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
          >
            <option value="1m">1 minute</option>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
          </select>
        </div>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as typeof selectedMetric)}
            style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
          >
            <option value="latency">API Latency</option>
            <option value="tokens">Token Usage</option>
            <option value="errors">Error Rate</option>
          </select>
        </div>
      </div>

      {/* Main Chart */}
      <div style={styles.chartSection}>
        <div style={styles.chartLabel}>
          {selectedMetric === 'latency'
            ? 'API Latency (ms)'
            : selectedMetric === 'tokens'
              ? 'Token Usage'
              : 'Errors per Minute'}
        </div>
        <TimeSeriesChart
          data={selectedMetric === 'errors' ? filteredData.errors : filteredData.performance}
          theme={theme}
          color={
            selectedMetric === 'latency'
              ? '#2196f3'
              : selectedMetric === 'tokens'
                ? '#ff9800'
                : '#f44336'
          }
        />
      </div>

      {/* Circuit Breakers */}
      {circuits.size > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🔌 Circuit Breakers</h4>
          <div style={styles.circuitGrid}>
            {Array.from(circuits.entries()).map(([key, event]) => (
              <CircuitCard key={key} circuitKey={key} event={event} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {errors.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>⚠️ Recent Errors ({errors.slice(-5).length})</h4>
          <div style={styles.errorList}>
            {errors.slice(-5).reverse().map((error, i) => (
              <div
                key={i}
                style={isDark ? { ...styles.errorItem, ...styles.errorItemDark } : styles.errorItem}
              >
                <div style={styles.errorHeader}>
                  <span style={styles.errorType}>{error.error.type}</span>
                  <span style={styles.errorTime}>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={styles.errorMessage}>{error.error.message}</div>
                {error.recovered && (
                  <div style={styles.errorRecovered}>✅ Recovered</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Details */}
      {currentMetrics && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>📈 Performance Details</h4>
          <div style={styles.detailsGrid}>
            <DetailRow label="Total Requests" value={currentMetrics.api.totalRequests} />
            <DetailRow label="Min Latency" value={`${currentMetrics.api.minLatency}ms`} />
            <DetailRow label="Max Latency" value={`${currentMetrics.api.maxLatency}ms`} />
            <DetailRow label="Cache Hits" value={currentMetrics.cache.hits} />
            <DetailRow label="Cache Misses" value={currentMetrics.cache.misses} />
            <DetailRow label="Tokens Saved" value={currentMetrics.tokens.savedTokens} />
            <DetailRow
              label="Token Savings Rate"
              value={`${(currentMetrics.tokens.savingsRate * 100).toFixed(1)}%`}
            />
            <DetailRow
              label="Avg Tokens/Request"
              value={currentMetrics.tokens.avgTokensPerRequest}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Metric card component
 */
interface MetricCardProps {
  label: string;
  value: string;
  trend: 'good' | 'warning' | 'bad';
  theme: 'light' | 'dark';
}

function MetricCard({ label, value, trend, theme }: MetricCardProps) {
  const trendColor = trend === 'good' ? '#4caf50' : trend === 'warning' ? '#ff9800' : '#f44336';

  return (
    <div
      style={{
        ...styles.metricCard,
        ...(theme === 'dark' ? styles.metricCardDark : {}),
        borderLeftColor: trendColor,
      }}
    >
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: trendColor }}>{value}</div>
    </div>
  );
}

/**
 * Time series chart component
 */
interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  theme: 'light' | 'dark';
  color: string;
}

function TimeSeriesChart({ data, theme, color }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div style={styles.chartEmpty}>
        No data available yet. Telemetry will appear as operations occur.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={styles.chartSvg}>
      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke={theme === 'dark' ? '#444' : '#ddd'}
        strokeWidth="1"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={theme === 'dark' ? '#444' : '#ddd'}
        strokeWidth="1"
      />

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((ratio, i) => {
        const y = padding.top + chartHeight * (1 - ratio);
        return (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke={theme === 'dark' ? '#333' : '#eee'}
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        );
      })}

      {/* Data line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2}
          fill={color}
          stroke={theme === 'dark' ? '#1e1e1e' : '#fff'}
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      <text
        x={padding.left - 5}
        y={padding.top + 5}
        fontSize="10"
        fill={theme === 'dark' ? '#aaa' : '#666'}
        textAnchor="end"
      >
        {Math.round(maxValue)}
      </text>
      <text
        x={padding.left - 5}
        y={height - padding.bottom + 5}
        fontSize="10"
        fill={theme === 'dark' ? '#aaa' : '#666'}
        textAnchor="end"
      >
        {Math.round(minValue)}
      </text>

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 5}
        fontSize="10"
        fill={theme === 'dark' ? '#aaa' : '#666'}
        textAnchor="middle"
      >
        Time →
      </text>
    </svg>
  );
}

/**
 * Circuit breaker card component
 */
interface CircuitCardProps {
  circuitKey: string;
  event: CircuitBreakerEvent;
  theme: 'light' | 'dark';
}

function CircuitCard({ circuitKey, event, theme }: CircuitCardProps) {
  const stateColor =
    event.state === 'closed' ? '#4caf50' : event.state === 'half-open' ? '#ff9800' : '#f44336';

  const stateEmoji =
    event.state === 'closed' ? '✅' : event.state === 'half-open' ? '⚠️' : '❌';

  return (
    <div
      style={{
        ...styles.circuitCard,
        ...(theme === 'dark' ? styles.circuitCardDark : {}),
        borderLeftColor: stateColor,
      }}
    >
      <div style={styles.circuitHeader}>
        <span style={styles.circuitKey}>{circuitKey}</span>
        <span style={{ ...styles.circuitState, color: stateColor }}>
          {stateEmoji} {event.state}
        </span>
      </div>
      <div style={styles.circuitStats}>
        <div>Failure Rate: {(event.stats.failureRate * 100).toFixed(1)}%</div>
        <div>
          {event.stats.successes}✅ / {event.stats.failures}❌
        </div>
      </div>
    </div>
  );
}

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: string | number;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}:</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

/**
 * Inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px',
    padding: '20px',
    maxWidth: '800px',
  },
  containerDark: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    borderColor: '#3c3c3c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  headerControls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  buttonPaused: {
    background: '#ff9800',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  metricCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderLeft: '4px solid #2196f3',
    borderRadius: '4px',
  },
  metricCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  metricLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 600,
  },
  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  controlLabel: {
    fontSize: '12px',
    fontWeight: 600,
  },
  select: {
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    background: '#fff',
  },
  selectDark: {
    background: '#2a2a2a',
    borderColor: '#444',
    color: '#d4d4d4',
  },
  chartSection: {
    marginBottom: '20px',
  },
  chartLabel: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  chartSvg: {
    display: 'block',
    margin: '0 auto',
  },
  chartEmpty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  section: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '16px',
    marginTop: '16px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  circuitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  circuitCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderLeft: '4px solid #2196f3',
    borderRadius: '4px',
  },
  circuitCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  circuitHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  circuitKey: {
    fontSize: '12px',
    fontWeight: 600,
  },
  circuitState: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  circuitStats: {
    fontSize: '11px',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  errorItem: {
    padding: '12px',
    background: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
  },
  errorItemDark: {
    background: '#2a1f1f',
    borderColor: '#5c3333',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  errorType: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#f44336',
  },
  errorTime: {
    fontSize: '11px',
    color: '#999',
  },
  errorMessage: {
    fontSize: '12px',
    color: '#666',
  },
  errorRecovered: {
    marginTop: '4px',
    fontSize: '11px',
    color: '#4caf50',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px',
    background: '#fafafa',
    borderRadius: '3px',
    fontSize: '12px',
  },
  detailLabel: {
    fontWeight: 600,
  },
  detailValue: {
    color: '#666',
  },
};
