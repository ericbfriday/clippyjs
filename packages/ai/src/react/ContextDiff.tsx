import { useMemo } from 'react';
import type { ContextData } from '../context/ContextProvider';

/**
 * ContextDiff component props
 */
export interface ContextDiffProps {
  /** Context before changes */
  before: ContextData;
  /** Context after changes */
  after: ContextData;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
}

/**
 * Type of difference detected
 */
type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

/**
 * Difference between two values
 */
interface DiffItem {
  key: string;
  type: DiffType;
  before?: any;
  after?: any;
}

/**
 * ContextDiff - Compare contexts and visualize differences
 *
 * Features:
 * - Side-by-side comparison
 * - Color-coded changes (added/removed/changed)
 * - Timestamp display
 * - JSON diff view
 * - Nested object support
 */
export function ContextDiff({ before, after, theme = 'light' }: ContextDiffProps) {
  // Calculate differences
  const diff = useMemo(() => calculateDiff(before, after), [before, after]);

  // Format timestamps
  const beforeTime = new Date(before.timestamp).toLocaleTimeString();
  const afterTime = new Date(after.timestamp).toLocaleTimeString();

  return (
    <div
      className={`context-diff context-diff--${theme}`}
      style={theme === 'dark' ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header with timestamps */}
      <div style={styles.header}>
        <div style={styles.headerColumn}>
          <strong>Before</strong> ({beforeTime})
        </div>
        <div style={styles.headerColumn}>
          <strong>After</strong> ({afterTime})
        </div>
      </div>

      {/* Provider info */}
      <div style={styles.providerInfo}>
        <div>
          <strong>Provider:</strong> {before.provider}
        </div>
        <div>
          <strong>Changes:</strong> {diff.added} added, {diff.removed} removed, {diff.changed}{' '}
          changed
        </div>
      </div>

      {/* Diff view */}
      <div style={styles.diffContent}>
        {diff.items.length === 0 ? (
          <div style={styles.noDiff}>No differences detected</div>
        ) : (
          diff.items.map((item, i) => <DiffRow key={i} item={item} theme={theme} />)
        )}
      </div>
    </div>
  );
}

/**
 * Individual diff row
 */
interface DiffRowProps {
  item: DiffItem;
  theme: 'light' | 'dark';
}

function DiffRow({ item, theme }: DiffRowProps) {
  const getColor = (type: DiffType): string => {
    switch (type) {
      case 'added':
        return theme === 'dark' ? '#4caf50' : '#c8e6c9';
      case 'removed':
        return theme === 'dark' ? '#f44336' : '#ffcdd2';
      case 'changed':
        return theme === 'dark' ? '#ff9800' : '#ffe0b2';
      default:
        return 'transparent';
    }
  };

  const getIcon = (type: DiffType): string => {
    switch (type) {
      case 'added':
        return '+ ';
      case 'removed':
        return '- ';
      case 'changed':
        return '~ ';
      default:
        return '  ';
    }
  };

  const renderValue = (value: any): string => {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div style={{ ...styles.diffRow, background: getColor(item.type) }}>
      <div style={styles.diffKey}>
        <span style={styles.diffIcon}>{getIcon(item.type)}</span>
        <strong>{item.key}</strong>
      </div>
      <div style={styles.diffValues}>
        {item.type !== 'added' && (
          <div style={styles.diffValue}>
            <code style={styles.code}>{renderValue(item.before)}</code>
          </div>
        )}
        {item.type === 'changed' && <div style={styles.diffArrow}>→</div>}
        {item.type !== 'removed' && (
          <div style={styles.diffValue}>
            <code style={styles.code}>{renderValue(item.after)}</code>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calculate differences between two contexts
 */
function calculateDiff(before: ContextData, after: ContextData) {
  const items: DiffItem[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  // Compare data objects
  const beforeData = before.data || {};
  const afterData = after.data || {};

  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(flattenObject(beforeData)),
    ...Object.keys(flattenObject(afterData)),
  ]);

  const flatBefore = flattenObject(beforeData);
  const flatAfter = flattenObject(afterData);

  // Check each key
  for (const key of Array.from(allKeys).sort()) {
    const beforeValue = flatBefore[key];
    const afterValue = flatAfter[key];

    if (beforeValue === undefined && afterValue !== undefined) {
      // Added
      items.push({ key, type: 'added', after: afterValue });
      added++;
    } else if (beforeValue !== undefined && afterValue === undefined) {
      // Removed
      items.push({ key, type: 'removed', before: beforeValue });
      removed++;
    } else if (!deepEqual(beforeValue, afterValue)) {
      // Changed
      items.push({ key, type: 'changed', before: beforeValue, after: afterValue });
      changed++;
    } else {
      // Unchanged (only include if it's a top-level key for context)
      if (!key.includes('.')) {
        items.push({ key, type: 'unchanged', before: beforeValue, after: afterValue });
      }
    }
  }

  return { items, added, removed, changed };
}

/**
 * Flatten nested object into dot-notation keys
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
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
    overflow: 'hidden',
  },
  containerDark: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    borderColor: '#3c3c3c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px 16px',
    background: '#f5f5f5',
    borderBottom: '1px solid #ddd',
  },
  headerColumn: {
    flex: 1,
    textAlign: 'center',
    fontSize: '14px',
  },
  providerInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#fafafa',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '12px',
  },
  diffContent: {
    maxHeight: '500px',
    overflowY: 'auto',
  },
  noDiff: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  diffRow: {
    padding: '8px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  diffKey: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '12px',
  },
  diffIcon: {
    marginRight: '8px',
    fontWeight: 'bold',
    width: '16px',
  },
  diffValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '24px',
  },
  diffValue: {
    flex: 1,
    padding: '4px 8px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '3px',
  },
  diffArrow: {
    fontSize: '16px',
    color: '#666',
  },
  code: {
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
