import { useEffect, useState, useMemo } from 'react';
import type { ContextManager, ContextManagerStats, ContextEvent } from '../context/ContextManager';
import type { ScoredContext } from '../context/ContextPrioritizer';
import type { ContextData } from '../context/ContextProvider';

/**
 * ContextInspector component props
 */
export interface ContextInspectorProps {
  /** Context manager instance to inspect */
  contextManager: ContextManager;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Initial collapsed state */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onToggle?: (collapsed: boolean) => void;
}

/**
 * ContextInspector - Real-time context visualization and inspection
 *
 * Developer tool for viewing:
 * - Current gathered contexts
 * - Relevance scores
 * - Cache statistics
 * - Provider status
 * - Real-time updates
 *
 * Features:
 * - Collapsible/expandable UI
 * - Light/dark themes
 * - Context detail view
 * - Copy context JSON
 * - Search/filter contexts
 * - Positioning options
 */
export function ContextInspector({
  contextManager,
  theme = 'light',
  position = 'bottom-right',
  collapsed: initialCollapsed = false,
  onToggle,
}: ContextInspectorProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [contexts, setContexts] = useState<ScoredContext[]>([]);
  const [stats, setStats] = useState<ContextManagerStats | null>(null);
  const [selectedContext, setSelectedContext] = useState<ScoredContext | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Subscribe to context manager events
  useEffect(() => {
    const unsubscribe = contextManager.subscribe((event: ContextEvent, data) => {
      if (event === 'context-gathered' && Array.isArray(data)) {
        setContexts(data);
      }
    });

    // Update stats every second
    const interval = setInterval(() => {
      setStats(contextManager.getStats());
    }, 1000);

    // Initial stats load
    setStats(contextManager.getStats());

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [contextManager]);

  // Filter contexts by search term
  const filteredContexts = useMemo(() => {
    if (!searchTerm) return contexts;
    const term = searchTerm.toLowerCase();
    return contexts.filter((sc) => {
      const provider = sc.context.provider.toLowerCase();
      const dataStr = JSON.stringify(sc.context.data).toLowerCase();
      return provider.includes(term) || dataStr.includes(term);
    });
  }, [contexts, searchTerm]);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onToggle?.(newState);
  };

  const handleCopyContext = (context: ScoredContext) => {
    const json = JSON.stringify(context, null, 2);
    navigator.clipboard.writeText(json).then(
      () => alert('Context copied to clipboard!'),
      () => alert('Failed to copy context')
    );
  };

  return (
    <div
      className={`context-inspector context-inspector--${theme} context-inspector--${position}`}
      style={styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>🔍 Context Inspector</h3>
        <button onClick={handleToggle} style={styles.toggleButton}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* Body (only shown when not collapsed) */}
      {!collapsed && (
        <div style={styles.body}>
          {/* Statistics Section */}
          {stats && (
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <strong>Providers:</strong> {stats.enabledProviders}/{stats.providers}
              </div>
              <div style={styles.statItem}>
                <strong>Cache Hit Rate:</strong> {(stats.cacheStats.hitRate * 100).toFixed(1)}%
              </div>
              <div style={styles.statItem}>
                <strong>Avg Gather Time:</strong> {stats.avgGatherTimeMs.toFixed(1)}ms
              </div>
              <div style={styles.statItem}>
                <strong>Memory:</strong> {stats.cacheStats.memoryUsageMB.toFixed(2)}MB
              </div>
            </div>
          )}

          {/* Search Box */}
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search contexts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Context List */}
          <div style={styles.contextList}>
            {filteredContexts.length === 0 ? (
              <div style={styles.emptyState}>No contexts gathered yet</div>
            ) : (
              filteredContexts.map((scoredContext, i) => (
                <ContextItem
                  key={i}
                  scoredContext={scoredContext}
                  selected={selectedContext === scoredContext}
                  onClick={() =>
                    setSelectedContext(selectedContext === scoredContext ? null : scoredContext)
                  }
                  onCopy={() => handleCopyContext(scoredContext)}
                  theme={theme}
                />
              ))
            )}
          </div>

          {/* Context Detail View */}
          {selectedContext && (
            <div style={styles.detailPanel}>
              <ContextDetail context={selectedContext} theme={theme} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual context item in list
 */
interface ContextItemProps {
  scoredContext: ScoredContext;
  selected: boolean;
  onClick: () => void;
  onCopy: () => void;
  theme: 'light' | 'dark';
}

function ContextItem({ scoredContext, selected, onClick, onCopy, theme }: ContextItemProps) {
  const { context, score, source } = scoredContext;
  const age = Date.now() - context.timestamp.getTime();
  const ageStr = age < 1000 ? `${age}ms` : `${(age / 1000).toFixed(1)}s`;

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.contextItem,
        ...(selected ? styles.contextItemSelected : {}),
        cursor: 'pointer',
      }}
    >
      <div style={styles.contextItemHeader}>
        <span style={styles.contextProvider}>{context.provider}</span>
        <span style={styles.contextScore}>Score: {score.toFixed(2)}</span>
      </div>
      <div style={styles.contextItemMeta}>
        <span>Source: {source}</span>
        <span>Age: {ageStr}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          style={styles.copyButton}
        >
          📋 Copy
        </button>
      </div>
    </div>
  );
}

/**
 * Context detail view
 */
interface ContextDetailProps {
  context: ScoredContext;
  theme: 'light' | 'dark';
}

function ContextDetail({ context, theme }: ContextDetailProps) {
  const jsonStr = JSON.stringify(context.context.data, null, 2);

  return (
    <div style={styles.detailContainer}>
      <h4 style={styles.detailTitle}>Context Details: {context.context.provider}</h4>
      <div style={styles.detailInfo}>
        <div>
          <strong>Score:</strong> {context.score.toFixed(3)}
        </div>
        <div>
          <strong>Source:</strong> {context.source}
        </div>
        <div>
          <strong>Timestamp:</strong> {context.context.timestamp.toISOString()}
        </div>
      </div>
      <div style={styles.jsonContainer}>
        <pre style={styles.jsonPre}>{jsonStr}</pre>
      </div>
    </div>
  );
}

/**
 * Inline styles (basic developer-tool aesthetic)
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxWidth: '450px',
    maxHeight: '700px',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f5f5f5',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  toggleButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    padding: '12px 16px',
    background: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '12px',
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  searchBox: {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
  },
  searchInput: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
  },
  contextList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  contextItem: {
    padding: '10px 12px',
    marginBottom: '6px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    background: '#fafafa',
    transition: 'all 0.2s',
  },
  contextItemSelected: {
    background: '#e3f2fd',
    borderColor: '#2196f3',
  },
  contextItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  contextProvider: {
    fontWeight: 600,
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '12px',
  },
  contextScore: {
    fontSize: '11px',
    color: '#666',
  },
  contextItemMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#666',
  },
  copyButton: {
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  detailPanel: {
    borderTop: '2px solid #2196f3',
    maxHeight: '300px',
    overflowY: 'auto',
    background: '#f9f9f9',
  },
  detailContainer: {
    padding: '12px 16px',
  },
  detailTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: 600,
  },
  detailInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
    fontSize: '12px',
  },
  jsonContainer: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  jsonPre: {
    margin: 0,
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '11px',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
