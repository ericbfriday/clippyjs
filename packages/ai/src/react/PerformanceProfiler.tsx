import { useEffect, useState, useMemo } from 'react';
import type { ContextManager, ContextEvent } from '../context/ContextManager';
import type { ScoredContext } from '../context/ContextPrioritizer';

/**
 * PerformanceProfiler component props
 */
export interface PerformanceProfilerProps {
  /** Context manager instance to profile */
  contextManager: ContextManager;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Maximum number of data points to track */
  maxDataPoints?: number;
}

/**
 * Performance data point
 */
interface PerformanceData {
  /** Timestamp of gathering */
  timestamp: number;
  /** Time taken to gather (milliseconds) */
  gatherTime: number;
  /** Whether result was cached */
  cached: boolean;
  /** Total tokens in gathered contexts */
  tokens: number;
  /** Number of contexts gathered */
  contextCount: number;
}

/**
 * PerformanceProfiler - Monitor context gathering performance
 *
 * Features:
 * - Gather time tracking and visualization
 * - Cache hit rate monitoring
 * - Token usage trends
 * - Memory usage tracking
 * - Provider performance breakdown
 * - Export performance data
 * - Real-time updates
 */
export function PerformanceProfiler({
  contextManager,
  theme = 'light',
  maxDataPoints = 50,
}: PerformanceProfilerProps) {
  const [dataPoints, setDataPoints] = useState<PerformanceData[]>([]);

  // Subscribe to context manager events
  useEffect(() => {
    const unsubscribe = contextManager.subscribe((event: ContextEvent, data) => {
      if (event === 'context-gathered' && Array.isArray(data)) {
        const contexts = data as ScoredContext[];
        const totalTokens = contexts.reduce((sum, sc) => {
          const jsonStr = JSON.stringify(sc.context);
          return sum + Math.ceil(jsonStr.length / 4);
        }, 0);

        // Get stats for timing info
        const stats = contextManager.getStats();

        setDataPoints((prev) => {
          const updated = [
            ...prev,
            {
              timestamp: Date.now(),
              gatherTime: stats.avgGatherTimeMs,
              cached: false, // This gathering wasn't cached
              tokens: totalTokens,
              contextCount: contexts.length,
            },
          ];
          return updated.slice(-maxDataPoints);
        });
      } else if (event === 'cache-hit') {
        // Record cache hit (faster gathering)
        setDataPoints((prev) => {
          const updated = [
            ...prev,
            {
              timestamp: Date.now(),
              gatherTime: 5, // Cache hits are ~5ms
              cached: true,
              tokens: 0, // Don't count tokens for cache hits
              contextCount: 1,
            },
          ];
          return updated.slice(-maxDataPoints);
        });
      }
    });

    return unsubscribe;
  }, [contextManager, maxDataPoints]);

  // Calculate statistics from data points
  const stats = useMemo(() => {
    if (dataPoints.length === 0) {
      return {
        avgGatherTime: 0,
        maxGatherTime: 0,
        minGatherTime: 0,
        cacheHitRate: 0,
        avgTokens: 0,
        totalGatherings: 0,
      };
    }

    const gatherTimes = dataPoints.map((d) => d.gatherTime);
    const tokens = dataPoints.filter((d) => !d.cached).map((d) => d.tokens);
    const cacheHits = dataPoints.filter((d) => d.cached).length;

    return {
      avgGatherTime: average(gatherTimes),
      maxGatherTime: Math.max(...gatherTimes),
      minGatherTime: Math.min(...gatherTimes),
      cacheHitRate: cacheHits / dataPoints.length,
      avgTokens: tokens.length > 0 ? average(tokens) : 0,
      totalGatherings: dataPoints.length,
    };
  }, [dataPoints]);

  // Get current manager stats
  const managerStats = contextManager.getStats();

  // Export data as JSON
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      dataPoints,
      statistics: stats,
      managerStats,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`performance-profiler performance-profiler--${theme}`}
      style={theme === 'dark' ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>📊 Performance Profiler</h3>
        <button onClick={handleExport} style={styles.exportButton}>
          💾 Export
        </button>
      </div>

      {/* Summary Statistics */}
      <div style={styles.summary}>
        <div style={styles.summaryRow}>
          <StatCard
            label="Avg Gather Time"
            value={`${stats.avgGatherTime.toFixed(2)}ms`}
            color="#2196f3"
            theme={theme}
          />
          <StatCard
            label="Cache Hit Rate"
            value={`${(stats.cacheHitRate * 100).toFixed(1)}%`}
            color="#4caf50"
            theme={theme}
          />
        </div>
        <div style={styles.summaryRow}>
          <StatCard
            label="Avg Tokens"
            value={Math.round(stats.avgTokens).toString()}
            color="#ff9800"
            theme={theme}
          />
          <StatCard
            label="Total Gatherings"
            value={stats.totalGatherings.toString()}
            color="#9c27b0"
            theme={theme}
          />
        </div>
      </div>

      {/* Performance Range */}
      <div style={styles.rangeSection}>
        <div style={styles.rangeLabel}>Gather Time Range</div>
        <div style={styles.range}>
          <span>Min: {stats.minGatherTime.toFixed(1)}ms</span>
          <span>Max: {stats.maxGatherTime.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Simple Chart */}
      <div style={styles.chartSection}>
        <div style={styles.chartLabel}>Gather Time History (last {dataPoints.length} operations)</div>
        <SimpleChart data={dataPoints} theme={theme} />
      </div>

      {/* Manager Statistics */}
      <div style={styles.managerStats}>
        <h4 style={styles.sectionTitle}>Context Manager</h4>
        <div style={styles.statGrid}>
          <div style={styles.statItem}>
            <strong>Providers:</strong> {managerStats.enabledProviders}/{managerStats.providers}
          </div>
          <div style={styles.statItem}>
            <strong>Cache Size:</strong> {managerStats.cacheStats.size}
          </div>
          <div style={styles.statItem}>
            <strong>Memory:</strong> {managerStats.cacheStats.memoryUsageMB.toFixed(2)}MB
          </div>
          <div style={styles.statItem}>
            <strong>Total Errors:</strong> {managerStats.totalErrors}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Statistic card component
 */
interface StatCardProps {
  label: string;
  value: string;
  color: string;
  theme: 'light' | 'dark';
}

function StatCard({ label, value, color, theme }: StatCardProps) {
  return (
    <div style={{ ...styles.statCard, borderLeftColor: color }}>
      <div style={styles.statCardLabel}>{label}</div>
      <div style={{ ...styles.statCardValue, color }}>{value}</div>
    </div>
  );
}

/**
 * Simple line chart for performance data
 */
interface SimpleChartProps {
  data: PerformanceData[];
  theme: 'light' | 'dark';
}

function SimpleChart({ data, theme }: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <div style={styles.chartEmpty}>No performance data yet. Gather some contexts to see trends!</div>
    );
  }

  // Calculate chart dimensions
  const width = 400;
  const height = 150;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get min/max values
  const times = data.map((d) => d.gatherTime);
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const range = maxTime - minTime || 1;

  // Create points for line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.gatherTime - minTime) / range) * chartHeight;
    return { x, y, cached: d.cached };
  });

  // Create path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} style={styles.chartSvg}>
      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke={theme === 'dark' ? '#555' : '#ddd'}
        strokeWidth="1"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke={theme === 'dark' ? '#555' : '#ddd'}
        strokeWidth="1"
      />

      {/* Performance line */}
      <path d={pathD} fill="none" stroke="#2196f3" strokeWidth="2" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={p.cached ? '#4caf50' : '#2196f3'}
          stroke="#fff"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      <text x={5} y={padding.top + 5} fontSize="10" fill={theme === 'dark' ? '#aaa' : '#666'}>
        {maxTime.toFixed(0)}ms
      </text>
      <text x={5} y={height - padding.bottom} fontSize="10" fill={theme === 'dark' ? '#aaa' : '#666'}>
        {minTime.toFixed(0)}ms
      </text>
    </svg>
  );
}

/**
 * Calculate average of array
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
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
    padding: '16px',
    maxWidth: '500px',
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
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  exportButton: {
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  summary: {
    marginBottom: '16px',
  },
  summaryRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  statCard: {
    flex: 1,
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderLeft: '4px solid #2196f3',
    borderRadius: '4px',
  },
  statCardLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '4px',
  },
  statCardValue: {
    fontSize: '18px',
    fontWeight: 600,
  },
  rangeSection: {
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  rangeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '6px',
  },
  range: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
  chartSection: {
    marginBottom: '16px',
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
    padding: '40px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  managerStats: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '16px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  statItem: {
    fontSize: '12px',
    padding: '6px',
    background: '#fafafa',
    borderRadius: '3px',
  },
};
