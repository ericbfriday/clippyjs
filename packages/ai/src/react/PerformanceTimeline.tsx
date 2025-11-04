import { useState, useMemo } from 'react';

/**
 * PerformanceTimeline component props
 */
export interface PerformanceTimelineProps {
  /** Performance entries to display */
  entries: PerformanceEntry[];
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Height of timeline in pixels */
  height?: number;
  /** Show detailed information */
  showDetails?: boolean;
}

/**
 * Performance entry with timing information
 */
export interface PerformanceEntry {
  /** Entry name/label */
  name: string;
  /** Start time in milliseconds */
  startTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Entry type */
  type: 'api' | 'cache' | 'render' | 'custom';
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Timeline zoom/pan state
 */
interface ViewState {
  zoom: number;
  panOffset: number;
}

/**
 * PerformanceTimeline - Visual timeline with waterfall chart
 *
 * Features:
 * - Visual timeline of operations
 * - Waterfall chart display
 * - Performance mark visualization
 * - Bottleneck highlighting
 * - Zoom and pan controls
 * - Color-coded operation types
 * - Detailed timing information
 * - Export capability
 */
export function PerformanceTimeline({
  entries,
  theme = 'light',
  height = 400,
  showDetails = true,
}: PerformanceTimelineProps) {
  const [selectedEntry, setSelectedEntry] = useState<PerformanceEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, panOffset: 0 });
  const [filterType, setFilterType] = useState<string>('all');

  // Filter entries by type
  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;
    return entries.filter((e) => e.type === filterType);
  }, [entries, filterType]);

  // Calculate timeline bounds
  const { minTime, maxTime, totalDuration } = useMemo(() => {
    if (filteredEntries.length === 0) {
      return { minTime: 0, maxTime: 100, totalDuration: 100 };
    }

    const min = Math.min(...filteredEntries.map((e) => e.startTime));
    const max = Math.max(...filteredEntries.map((e) => e.startTime + e.duration));

    return {
      minTime: min,
      maxTime: max,
      totalDuration: max - min,
    };
  }, [filteredEntries]);

  // Detect bottlenecks (entries taking >20% of total time)
  const bottlenecks = useMemo(() => {
    if (totalDuration === 0) return new Set<string>();
    const threshold = totalDuration * 0.2;
    return new Set(
      filteredEntries.filter((e) => e.duration >= threshold).map((e) => e.name)
    );
  }, [filteredEntries, totalDuration]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredEntries.length === 0) {
      return {
        totalOps: 0,
        avgDuration: 0,
        slowest: null as PerformanceEntry | null,
        fastest: null as PerformanceEntry | null,
      };
    }

    const durations = filteredEntries.map((e) => e.duration);
    const sorted = [...filteredEntries].sort((a, b) => b.duration - a.duration);

    return {
      totalOps: filteredEntries.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      slowest: sorted[0],
      fastest: sorted[sorted.length - 1],
    };
  }, [filteredEntries]);

  const handleZoomIn = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 10) }));
  };

  const handleZoomOut = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 0.5) }));
  };

  const handleResetView = () => {
    setViewState({ zoom: 1, panOffset: 0 });
  };

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats,
      entries: filteredEntries.map((e) => ({
        ...e,
        isBottleneck: bottlenecks.has(e.name),
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-timeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`performance-timeline performance-timeline--${theme}`}
      style={isDark ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>⏱️ Performance Timeline</h3>
        <div style={styles.headerControls}>
          <button onClick={handleZoomOut} style={styles.button} aria-label="Zoom out">
            🔍−
          </button>
          <button onClick={handleZoomIn} style={styles.button} aria-label="Zoom in">
            🔍+
          </button>
          <button onClick={handleResetView} style={styles.button} aria-label="Reset view">
            ↺
          </button>
          <button onClick={handleExport} style={styles.button} aria-label="Export">
            💾
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={styles.stats}>
        <StatItem label="Total Operations" value={stats.totalOps} />
        <StatItem label="Avg Duration" value={`${stats.avgDuration.toFixed(2)}ms`} />
        {stats.slowest && (
          <StatItem
            label="Slowest"
            value={`${stats.slowest.name} (${stats.slowest.duration.toFixed(2)}ms)`}
          />
        )}
        {stats.fastest && (
          <StatItem
            label="Fastest"
            value={`${stats.fastest.name} (${stats.fastest.duration.toFixed(2)}ms)`}
          />
        )}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <label style={styles.filterLabel}>Filter:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
        >
          <option value="all">All Types</option>
          <option value="api">API Calls</option>
          <option value="cache">Cache Operations</option>
          <option value="render">Renders</option>
          <option value="custom">Custom</option>
        </select>
        {bottlenecks.size > 0 && (
          <div style={styles.bottleneckWarning}>
            ⚠️ {bottlenecks.size} bottleneck{bottlenecks.size > 1 ? 's' : ''} detected
          </div>
        )}
      </div>

      {/* Timeline */}
      {filteredEntries.length === 0 ? (
        <div style={styles.emptyState}>
          No performance data available. Operations will appear here as they occur.
        </div>
      ) : (
        <div style={{ ...styles.timelineContainer, height }}>
          <WaterfallChart
            entries={filteredEntries}
            minTime={minTime}
            maxTime={maxTime}
            viewState={viewState}
            bottlenecks={bottlenecks}
            theme={theme}
            onSelectEntry={setSelectedEntry}
            selectedEntry={selectedEntry}
          />
        </div>
      )}

      {/* Details Panel */}
      {showDetails && selectedEntry && (
        <div style={styles.detailsPanel}>
          <div style={styles.detailsHeader}>
            <h4 style={styles.detailsTitle}>Operation Details</h4>
            <button
              onClick={() => setSelectedEntry(null)}
              style={styles.closeButton}
              aria-label="Close details"
            >
              ×
            </button>
          </div>
          <div style={styles.detailsContent}>
            <DetailRow label="Name" value={selectedEntry.name} />
            <DetailRow label="Type" value={selectedEntry.type} />
            <DetailRow label="Start Time" value={`${selectedEntry.startTime.toFixed(2)}ms`} />
            <DetailRow label="Duration" value={`${selectedEntry.duration.toFixed(2)}ms`} />
            <DetailRow
              label="End Time"
              value={`${(selectedEntry.startTime + selectedEntry.duration).toFixed(2)}ms`}
            />
            {bottlenecks.has(selectedEntry.name) && (
              <div style={styles.bottleneckBadge}>
                ⚠️ Bottleneck: Taking {((selectedEntry.duration / totalDuration) * 100).toFixed(1)}% of total time
              </div>
            )}
            {selectedEntry.details && (
              <div style={styles.detailsExtra}>
                <div style={styles.detailsExtraTitle}>Additional Details</div>
                <pre style={styles.detailsPre}>
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Waterfall chart component
 */
interface WaterfallChartProps {
  entries: PerformanceEntry[];
  minTime: number;
  maxTime: number;
  viewState: ViewState;
  bottlenecks: Set<string>;
  theme: 'light' | 'dark';
  onSelectEntry: (entry: PerformanceEntry) => void;
  selectedEntry: PerformanceEntry | null;
}

function WaterfallChart({
  entries,
  minTime,
  maxTime,
  viewState,
  bottlenecks,
  theme,
  onSelectEntry,
  selectedEntry,
}: WaterfallChartProps) {
  const width = 700;
  const rowHeight = 30;
  const padding = { top: 30, right: 20, bottom: 20, left: 150 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = entries.length * rowHeight;
  const totalHeight = chartHeight + padding.top + padding.bottom;

  const timeRange = (maxTime - minTime) * viewState.zoom;
  const timeStart = minTime + viewState.panOffset;
  const timeEnd = timeStart + timeRange;

  // Time to X position
  const timeToX = (time: number) => {
    const normalized = (time - timeStart) / timeRange;
    return padding.left + normalized * chartWidth;
  };

  // Duration to width
  const durationToWidth = (duration: number) => {
    return (duration / timeRange) * chartWidth;
  };

  return (
    <svg width={width} height={totalHeight} style={styles.chartSvg}>
      {/* Time axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={width - padding.right}
        y2={padding.top}
        stroke={theme === 'dark' ? '#444' : '#ddd'}
        strokeWidth="1"
      />

      {/* Time markers */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const x = padding.left + ratio * chartWidth;
        const time = timeStart + ratio * timeRange;
        return (
          <g key={ratio}>
            <line
              x1={x}
              y1={padding.top}
              x2={x}
              y2={padding.top + chartHeight}
              stroke={theme === 'dark' ? '#333' : '#eee'}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={x}
              y={padding.top - 5}
              fontSize="10"
              fill={theme === 'dark' ? '#aaa' : '#666'}
              textAnchor="middle"
            >
              {time.toFixed(0)}ms
            </text>
          </g>
        );
      })}

      {/* Entry bars */}
      {entries.map((entry, i) => {
        const y = padding.top + i * rowHeight;
        const x = timeToX(entry.startTime);
        const barWidth = durationToWidth(entry.duration);
        const isSelected = selectedEntry?.name === entry.name;
        const isBottleneck = bottlenecks.has(entry.name);
        const color = getTypeColor(entry.type);

        // Skip if out of view
        if (x + barWidth < padding.left || x > width - padding.right) {
          return null;
        }

        return (
          <g
            key={i}
            onClick={() => onSelectEntry(entry)}
            style={{ cursor: 'pointer' }}
          >
            {/* Label */}
            <text
              x={padding.left - 10}
              y={y + rowHeight / 2 + 4}
              fontSize="11"
              fill={theme === 'dark' ? '#d4d4d4' : '#333'}
              textAnchor="end"
            >
              {entry.name.length > 18 ? entry.name.slice(0, 15) + '...' : entry.name}
            </text>

            {/* Bar */}
            <rect
              x={Math.max(x, padding.left)}
              y={y + 5}
              width={Math.min(barWidth, width - padding.right - x)}
              height={rowHeight - 10}
              fill={color}
              opacity={isSelected ? 1 : 0.8}
              stroke={isBottleneck ? '#f44336' : isSelected ? '#2196f3' : 'none'}
              strokeWidth={isBottleneck ? 2 : isSelected ? 2 : 0}
              rx="2"
            />

            {/* Duration label */}
            {barWidth > 40 && (
              <text
                x={x + barWidth / 2}
                y={y + rowHeight / 2 + 4}
                fontSize="10"
                fill="#fff"
                textAnchor="middle"
                fontWeight="600"
              >
                {entry.duration.toFixed(1)}ms
              </text>
            )}

            {/* Bottleneck indicator */}
            {isBottleneck && (
              <text
                x={x - 5}
                y={y + rowHeight / 2 + 4}
                fontSize="14"
                textAnchor="end"
              >
                ⚠️
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Stat item component
 */
interface StatItemProps {
  label: string;
  value: string | number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div style={styles.statItem}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: string;
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
 * Get color for operation type
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'api':
      return '#2196f3';
    case 'cache':
      return '#4caf50';
    case 'render':
      return '#ff9800';
    case 'custom':
      return '#9c27b0';
    default:
      return '#9e9e9e';
  }
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
    maxWidth: '900px',
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
    fontSize: '12px',
    cursor: 'pointer',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  statItem: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 600,
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: 600,
  },
  select: {
    padding: '6px 12px',
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
  bottleneckWarning: {
    fontSize: '12px',
    color: '#f44336',
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  timelineContainer: {
    overflow: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  chartSvg: {
    display: 'block',
  },
  detailsPanel: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '16px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  detailsTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999',
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
  },
  detailLabel: {
    fontWeight: 600,
    minWidth: '100px',
  },
  detailValue: {
    color: '#666',
  },
  bottleneckBadge: {
    padding: '8px 12px',
    background: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    color: '#f44336',
    fontSize: '12px',
    marginTop: '8px',
  },
  detailsExtra: {
    marginTop: '12px',
  },
  detailsExtraTitle: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  detailsPre: {
    margin: 0,
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '200px',
  },
};
