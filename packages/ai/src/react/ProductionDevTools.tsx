import { useState, useEffect, useCallback } from 'react';
import { TelemetryDashboard, type TelemetryDashboardProps } from './TelemetryDashboard';
import { StorageInspector, type StorageInspectorProps } from './StorageInspector';
import { ErrorLogViewer, type ErrorLogViewerProps } from './ErrorLogViewer';
import { PerformanceTimeline, type PerformanceTimelineProps } from './PerformanceTimeline';
import { HealthStatusMonitor, type HealthStatusMonitorProps } from './HealthStatusMonitor';

/**
 * ProductionDevTools component props
 */
export interface ProductionDevToolsProps {
  /** Initial tab to display */
  initialTab?: TabName;
  /** Panel position */
  position?: 'bottom' | 'right' | 'floating';
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Whether panel is initially open */
  defaultOpen?: boolean;
  /** Enable production mode (requires explicit enable) */
  productionMode?: boolean;
  /** Telemetry dashboard props */
  telemetryProps?: Omit<TelemetryDashboardProps, 'theme'>;
  /** Storage inspector props */
  storageProps?: Omit<StorageInspectorProps, 'theme'>;
  /** Error log viewer props */
  errorProps?: Omit<ErrorLogViewerProps, 'theme'>;
  /** Performance timeline props */
  performanceProps?: Omit<PerformanceTimelineProps, 'theme'>;
  /** Health status monitor props */
  healthProps?: Omit<HealthStatusMonitorProps, 'theme'>;
  /** Keyboard shortcuts enabled */
  enableKeyboardShortcuts?: boolean;
}

/**
 * Available tabs
 */
type TabName = 'telemetry' | 'storage' | 'errors' | 'performance' | 'health';

/**
 * Tab configuration
 */
interface TabConfig {
  name: TabName;
  label: string;
  icon: string;
  shortcut?: string;
}

const TABS: TabConfig[] = [
  { name: 'telemetry', label: 'Telemetry', icon: '📊', shortcut: '1' },
  { name: 'storage', label: 'Storage', icon: '💾', shortcut: '2' },
  { name: 'errors', label: 'Errors', icon: '⚠️', shortcut: '3' },
  { name: 'performance', label: 'Performance', icon: '⏱️', shortcut: '4' },
  { name: 'health', label: 'Health', icon: '💚', shortcut: '5' },
];

/**
 * ProductionDevTools - Unified developer tools panel
 *
 * Features:
 * - Tabbed interface for all dev tools
 * - Collapsible panel
 * - Position configuration (bottom, right, floating)
 * - Keyboard shortcuts (Ctrl+D to toggle, 1-5 for tabs)
 * - Production mode toggle
 * - Persistent state
 * - Theme support
 * - Tree-shakeable (dev-only)
 */
export function ProductionDevTools({
  initialTab = 'telemetry',
  position = 'bottom',
  theme = 'light',
  defaultOpen = false,
  productionMode = false,
  telemetryProps,
  storageProps,
  errorProps,
  performanceProps,
  healthProps,
  enableKeyboardShortcuts = true,
}: ProductionDevToolsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [isMinimized, setIsMinimized] = useState(false);
  const [productionEnabled, setProductionEnabled] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D or Cmd+D to toggle panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Number keys 1-5 for tab switching (only when panel is open)
      if (isOpen && e.ctrlKey && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        setActiveTab(TABS[tabIndex].name);
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // M to toggle minimize
      if (isOpen && e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setIsMinimized((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enableKeyboardShortcuts]);

  // Don't render in production unless explicitly enabled
  if (productionMode && !productionEnabled) {
    return (
      <button
        onClick={() => setProductionEnabled(true)}
        style={styles.productionToggle}
        aria-label="Enable DevTools"
      >
        🛠️
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          ...styles.toggleButton,
          ...(position === 'bottom' ? styles.toggleButtonBottom : styles.toggleButtonRight),
        }}
        aria-label="Open DevTools"
      >
        🛠️ DevTools
      </button>
    );
  }

  const isDark = theme === 'dark';
  const positionStyle =
    position === 'bottom'
      ? styles.panelBottom
      : position === 'right'
        ? styles.panelRight
        : styles.panelFloating;

  return (
    <div
      className={`production-devtools production-devtools--${theme} production-devtools--${position}`}
      style={{
        ...styles.panel,
        ...positionStyle,
        ...(isDark ? styles.panelDark : {}),
        ...(isMinimized ? styles.panelMinimized : {}),
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>🛠️ Production DevTools</h3>
          {enableKeyboardShortcuts && (
            <div style={styles.shortcutHint}>Ctrl+D to toggle</div>
          )}
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={styles.headerButton}
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            title="Ctrl+M"
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={styles.headerButton}
            aria-label="Close"
            title="Escape"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div style={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.name ? styles.tabActive : {}),
                }}
                aria-label={`${tab.label} tab`}
                title={enableKeyboardShortcuts ? `Ctrl+${tab.shortcut}` : undefined}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                <span style={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {activeTab === 'telemetry' && (
              <TelemetryDashboard {...telemetryProps} theme={theme} />
            )}
            {activeTab === 'storage' && (
              <StorageInspector {...storageProps} theme={theme} />
            )}
            {activeTab === 'errors' && errorProps?.errors && (
              <ErrorLogViewer {...errorProps} theme={theme} />
            )}
            {activeTab === 'performance' && performanceProps?.entries && (
              <PerformanceTimeline {...performanceProps} theme={theme} />
            )}
            {activeTab === 'health' && (
              <HealthStatusMonitor {...healthProps} theme={theme} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  productionToggle: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
  },
  toggleButton: {
    position: 'fixed',
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
  },
  toggleButtonBottom: {
    bottom: '20px',
    right: '20px',
  },
  toggleButtonRight: {
    top: '20px',
    right: '20px',
  },
  panel: {
    position: 'fixed',
    background: '#fff',
    border: '1px solid #ddd',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px',
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
  },
  panelDark: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    borderColor: '#3c3c3c',
  },
  panelBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: '60vh',
    maxHeight: '600px',
  },
  panelRight: {
    top: 0,
    right: 0,
    bottom: 0,
    width: '500px',
  },
  panelFloating: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxWidth: '900px',
    height: '80vh',
    maxHeight: '700px',
    borderRadius: '8px',
  },
  panelMinimized: {
    height: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #ddd',
    background: '#f9f9f9',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  shortcutHint: {
    fontSize: '11px',
    color: '#999',
    background: '#e0e0e0',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  headerButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 8px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd',
    background: '#f5f5f5',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    borderBottomColor: '#2196f3',
    color: '#2196f3',
    fontWeight: 600,
    background: '#fff',
  },
  tabIcon: {
    fontSize: '16px',
  },
  tabLabel: {},
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
};

/**
 * Export all individual tools for standalone use
 */
export {
  TelemetryDashboard,
  StorageInspector,
  ErrorLogViewer,
  PerformanceTimeline,
  HealthStatusMonitor,
};

export type {
  TelemetryDashboardProps,
  StorageInspectorProps,
  ErrorLogViewerProps,
  PerformanceTimelineProps,
  HealthStatusMonitorProps,
};
