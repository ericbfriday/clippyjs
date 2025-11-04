import { useState, useMemo } from 'react';
import type { ErrorEvent } from '../errors/TelemetryHooks';
import type { ErrorInfo } from '../errors/ErrorClassifier';

/**
 * ErrorLogViewer component props
 */
export interface ErrorLogViewerProps {
  /** Error events to display */
  errors: ErrorEvent[];
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Maximum errors to display */
  maxErrors?: number;
  /** Callback when error is resolved */
  onResolve?: (errorIndex: number) => void;
}

/**
 * Error filter options
 */
interface ErrorFilters {
  type?: string;
  severity?: string;
  recovered?: boolean | 'all';
  searchTerm?: string;
}

/**
 * Grouped error information
 */
interface ErrorGroup {
  key: string;
  type: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  errors: ErrorEvent[];
}

/**
 * ErrorLogViewer - Error list with filtering and grouping
 *
 * Features:
 * - Error list with filtering by type, severity, recovery status
 * - Stack trace viewer with pretty formatting
 * - Error context display
 * - Error grouping by type and message
 * - Mark errors as resolved
 * - Export error logs
 * - Search functionality
 * - Color-coded severity levels
 */
export function ErrorLogViewer({
  errors,
  theme = 'light',
  maxErrors = 100,
  onResolve,
}: ErrorLogViewerProps) {
  const [filters, setFilters] = useState<ErrorFilters>({
    recovered: 'all',
    searchTerm: '',
  });
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [groupByType, setGroupByType] = useState(false);
  const [resolvedErrors, setResolvedErrors] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Apply filters
  const filteredErrors = useMemo(() => {
    return errors.filter((error) => {
      // Filter by type
      if (filters.type && error.error.type !== filters.type) return false;

      // Filter by severity
      if (filters.severity && error.error.severity !== filters.severity) return false;

      // Filter by recovery status
      if (filters.recovered !== 'all') {
        if (filters.recovered === true && !error.recovered) return false;
        if (filters.recovered === false && error.recovered) return false;
      }

      // Filter by search term
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesMessage = error.error.message.toLowerCase().includes(term);
        const matchesType = error.error.type.toLowerCase().includes(term);
        const matchesStack = error.error.details?.stack?.toLowerCase().includes(term);
        if (!matchesMessage && !matchesType && !matchesStack) return false;
      }

      return true;
    });
  }, [errors, filters]);

  // Group errors
  const groupedErrors = useMemo(() => {
    if (!groupByType) return null;

    const groups = new Map<string, ErrorGroup>();

    filteredErrors.forEach((error) => {
      const key = `${error.error.type}:${error.error.message}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type: error.error.type,
          message: error.error.message,
          count: 0,
          firstSeen: error.timestamp,
          lastSeen: error.timestamp,
          errors: [],
        });
      }

      const group = groups.get(key)!;
      group.count++;
      group.firstSeen = Math.min(group.firstSeen, error.timestamp);
      group.lastSeen = Math.max(group.lastSeen, error.timestamp);
      group.errors.push(error);
    });

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [filteredErrors, groupByType]);

  // Get unique types and severities for filters
  const { types, severities } = useMemo(() => {
    const typeSet = new Set<string>();
    const severitySet = new Set<string>();

    errors.forEach((error) => {
      typeSet.add(error.error.type);
      severitySet.add(error.error.severity);
    });

    return {
      types: Array.from(typeSet).sort(),
      severities: Array.from(severitySet).sort(),
    };
  }, [errors]);

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      filters,
      totalErrors: errors.length,
      filteredErrors: filteredErrors.length,
      errors: filteredErrors.slice(-maxErrors).map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResolve = (index: number) => {
    setResolvedErrors((prev) => new Set(prev).add(index));
    onResolve?.(index);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isDark = theme === 'dark';
  const displayErrors = filteredErrors.slice(-maxErrors);

  return (
    <div
      className={`error-log-viewer error-log-viewer--${theme}`}
      style={isDark ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          ⚠️ Error Log ({filteredErrors.length}/{errors.length})
        </h3>
        <div style={styles.headerControls}>
          <button onClick={handleExport} style={styles.button} aria-label="Export errors">
            💾
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterRow}>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
            style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
            style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
          >
            <option value="">All Severities</option>
            {severities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>

          <select
            value={String(filters.recovered)}
            onChange={(e) =>
              setFilters({
                ...filters,
                recovered: e.target.value === 'all' ? 'all' : e.target.value === 'true',
              })
            }
            style={isDark ? { ...styles.select, ...styles.selectDark } : styles.select}
          >
            <option value="all">All Status</option>
            <option value="true">Recovered</option>
            <option value="false">Unrecovered</option>
          </select>
        </div>

        <div style={styles.filterRow}>
          <input
            type="text"
            placeholder="Search errors..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            style={isDark ? { ...styles.searchInput, ...styles.searchInputDark } : styles.searchInput}
          />

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={groupByType}
              onChange={(e) => setGroupByType(e.target.checked)}
            />
            <span style={styles.checkboxLabel}>Group by type</span>
          </label>
        </div>
      </div>

      {/* Error List or Groups */}
      {displayErrors.length === 0 ? (
        <div style={styles.emptyState}>
          {filters.searchTerm || filters.type || filters.severity
            ? 'No errors match the current filters'
            : 'No errors logged yet'}
        </div>
      ) : groupedErrors ? (
        <div style={styles.groupsList}>
          {groupedErrors.map((group) => (
            <div key={group.key} style={styles.group}>
              <div
                style={{
                  ...styles.groupHeader,
                  ...(isDark ? styles.groupHeaderDark : {}),
                }}
                onClick={() => toggleGroup(group.key)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && toggleGroup(group.key)}
              >
                <div style={styles.groupHeaderLeft}>
                  <span style={styles.groupExpand}>
                    {expandedGroups.has(group.key) ? '▼' : '▶'}
                  </span>
                  <span style={{ ...styles.errorType, color: getSeverityColor(group.errors[0].error.severity) }}>
                    {group.type}
                  </span>
                  <span style={styles.groupMessage}>{group.message}</span>
                </div>
                <span style={styles.groupCount}>{group.count}×</span>
              </div>

              {expandedGroups.has(group.key) && (
                <div style={styles.groupErrors}>
                  {group.errors.map((error, i) => (
                    <ErrorItem
                      key={i}
                      error={error}
                      index={i}
                      theme={theme}
                      isResolved={resolvedErrors.has(i)}
                      onSelect={() => setSelectedError(error)}
                      onResolve={() => handleResolve(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.errorsList}>
          {displayErrors.map((error, i) => (
            <ErrorItem
              key={i}
              error={error}
              index={i}
              theme={theme}
              isResolved={resolvedErrors.has(i)}
              onSelect={() => setSelectedError(error)}
              onResolve={() => handleResolve(i)}
            />
          ))}
        </div>
      )}

      {/* Selected Error Details */}
      {selectedError && (
        <div style={styles.detailsModal} onClick={() => setSelectedError(null)}>
          <div
            style={{
              ...styles.detailsPanel,
              ...(isDark ? styles.detailsPanelDark : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.detailsHeader}>
              <h4 style={styles.detailsTitle}>Error Details</h4>
              <button
                onClick={() => setSelectedError(null)}
                style={styles.closeButton}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={styles.detailsContent}>
              <DetailRow label="Type" value={selectedError.error.type} />
              <DetailRow label="Severity" value={selectedError.error.severity} />
              <DetailRow
                label="Time"
                value={new Date(selectedError.timestamp).toLocaleString()}
              />
              <DetailRow label="Message" value={selectedError.error.message} />
              {selectedError.error.details?.userMessage && (
                <DetailRow label="User Message" value={selectedError.error.details.userMessage} />
              )}
              {selectedError.recovered && (
                <DetailRow
                  label="Recovery"
                  value={`✅ ${selectedError.recoveryAction?.type || 'Recovered'}`}
                />
              )}

              {/* Context */}
              {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>Context</div>
                  <pre style={styles.codePre}>
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Stack Trace */}
              {selectedError.error.details?.stack && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>Stack Trace</div>
                  <pre style={styles.codePre}>{selectedError.error.details.stack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Error item component
 */
interface ErrorItemProps {
  error: ErrorEvent;
  index: number;
  theme: 'light' | 'dark';
  isResolved: boolean;
  onSelect: () => void;
  onResolve: () => void;
}

function ErrorItem({ error, index, theme, isResolved, onSelect, onResolve }: ErrorItemProps) {
  const severityColor = getSeverityColor(error.error.severity);

  return (
    <div
      style={{
        ...styles.errorItem,
        ...(theme === 'dark' ? styles.errorItemDark : {}),
        ...(isResolved ? styles.errorItemResolved : {}),
      }}
    >
      <div style={styles.errorItemHeader}>
        <div style={styles.errorItemLeft} onClick={onSelect} role="button" tabIndex={0}>
          <span style={{ ...styles.errorType, color: severityColor }}>{error.error.type}</span>
          <span style={styles.errorTime}>
            {new Date(error.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div style={styles.errorItemRight}>
          {error.recovered && <span style={styles.recoveredBadge}>✅ Recovered</span>}
          {!isResolved && (
            <button onClick={onResolve} style={styles.resolveButton}>
              Mark Resolved
            </button>
          )}
          {isResolved && <span style={styles.resolvedBadge}>✓ Resolved</span>}
        </div>
      </div>
      <div style={styles.errorMessage} onClick={onSelect}>
        {error.error.message}
      </div>
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
 * Get color for severity level
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#f44336';
    case 'high':
      return '#ff5722';
    case 'medium':
      return '#ff9800';
    case 'low':
      return '#ffc107';
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
  filters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
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
  searchInput: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    flex: 1,
    minWidth: '200px',
  },
  searchInputDark: {
    background: '#2a2a2a',
    borderColor: '#444',
    color: '#d4d4d4',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  errorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  group: {
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f9f9f9',
    cursor: 'pointer',
  },
  groupHeaderDark: {
    background: '#2a2a2a',
  },
  groupHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  groupExpand: {
    fontSize: '10px',
  },
  groupMessage: {
    fontSize: '12px',
    color: '#666',
  },
  groupCount: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    background: '#e0e0e0',
    borderRadius: '12px',
  },
  groupErrors: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  errorItem: {
    padding: '12px',
    background: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    transition: 'opacity 0.2s',
  },
  errorItemDark: {
    background: '#2a1f1f',
    borderColor: '#5c3333',
  },
  errorItemResolved: {
    opacity: 0.5,
  },
  errorItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  errorItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flex: 1,
  },
  errorItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorType: {
    fontSize: '12px',
    fontWeight: 600,
  },
  errorTime: {
    fontSize: '11px',
    color: '#999',
  },
  errorMessage: {
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  recoveredBadge: {
    fontSize: '11px',
    color: '#4caf50',
  },
  resolveButton: {
    padding: '4px 8px',
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  resolvedBadge: {
    fontSize: '11px',
    color: '#4caf50',
  },
  detailsModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  detailsPanel: {
    background: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  detailsPanelDark: {
    background: '#1e1e1e',
    color: '#d4d4d4',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
  },
  detailsTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  detailsContent: {
    padding: '20px',
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  detailLabel: {
    fontWeight: 600,
    minWidth: '120px',
  },
  detailValue: {
    color: '#666',
    flex: 1,
  },
  detailSection: {
    marginTop: '20px',
  },
  detailSectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  codePre: {
    margin: 0,
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
  },
};
