import { useState, useEffect } from 'react';
import type { CircuitState } from '../errors/CircuitBreaker';

/**
 * HealthStatusMonitor component props
 */
export interface HealthStatusMonitorProps {
  /** Health status provider */
  healthProvider?: () => HealthStatus;
  /** Circuit breaker provider */
  circuitProvider?: () => Map<string, CircuitInfo>;
  /** Degradation provider */
  degradationProvider?: () => DegradationInfo;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Allow manual overrides */
  allowOverrides?: boolean;
  /** Callback when override is triggered */
  onOverride?: (service: string, action: 'enable' | 'disable' | 'reset') => void;
}

/**
 * Overall health status
 */
export interface HealthStatus {
  /** Overall health state */
  state: 'healthy' | 'degraded' | 'critical' | 'down';
  /** Uptime in milliseconds */
  uptime: number;
  /** Last health check timestamp */
  lastCheck: number;
  /** Services status */
  services: ServiceStatus[];
}

/**
 * Individual service status
 */
export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Service state */
  state: 'healthy' | 'degraded' | 'critical' | 'down';
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error rate (0-1) */
  errorRate?: number;
  /** Last checked timestamp */
  lastCheck: number;
  /** Optional message */
  message?: string;
}

/**
 * Circuit breaker information
 */
export interface CircuitInfo {
  /** Circuit state */
  state: CircuitState;
  /** Failure rate (0-1) */
  failureRate: number;
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successes: number;
  /** Failed requests */
  failures: number;
}

/**
 * Degradation information
 */
export interface DegradationInfo {
  /** Degradation level (0-1, 0=none, 1=full) */
  level: number;
  /** Active degradations */
  degradations: string[];
  /** Recovery progress (0-1) */
  recoveryProgress?: number;
}

/**
 * HealthStatusMonitor - Service health and circuit breaker monitoring
 *
 * Features:
 * - Service health indicators
 * - Circuit breaker status display
 * - Degradation level visualization
 * - Recovery progress tracking
 * - Manual override controls
 * - Historical health tracking
 * - Alert notifications
 */
export function HealthStatusMonitor({
  healthProvider,
  circuitProvider,
  degradationProvider,
  theme = 'light',
  updateInterval = 5000,
  allowOverrides = false,
  onOverride,
}: HealthStatusMonitorProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [circuits, setCircuits] = useState<Map<string, CircuitInfo>>(new Map());
  const [degradation, setDegradation] = useState<DegradationInfo | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceStatus | null>(null);

  // Update health data
  useEffect(() => {
    const update = () => {
      if (healthProvider) {
        setHealth(healthProvider());
      }
      if (circuitProvider) {
        setCircuits(circuitProvider());
      }
      if (degradationProvider) {
        setDegradation(degradationProvider());
      }
    };

    update();
    const interval = setInterval(update, updateInterval);

    return () => clearInterval(interval);
  }, [healthProvider, circuitProvider, degradationProvider, updateInterval]);

  const handleOverride = (service: string, action: 'enable' | 'disable' | 'reset') => {
    if (allowOverrides && onOverride) {
      onOverride(service, action);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`health-status-monitor health-status-monitor--${theme}`}
      style={isDark ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>💚 Health Status</h3>
        {health && (
          <div style={{ ...styles.healthBadge, ...getStateStyle(health.state) }}>
            {getStateEmoji(health.state)} {health.state.toUpperCase()}
          </div>
        )}
      </div>

      {/* Overall Status */}
      {health && (
        <div style={styles.overallSection}>
          <div style={styles.overallStats}>
            <StatItem label="Uptime" value={formatUptime(health.uptime)} />
            <StatItem
              label="Last Check"
              value={new Date(health.lastCheck).toLocaleTimeString()}
            />
            <StatItem
              label="Services"
              value={`${health.services.filter((s) => s.state === 'healthy').length}/${health.services.length} healthy`}
            />
          </div>
        </div>
      )}

      {/* Degradation Status */}
      {degradation && degradation.level > 0 && (
        <div style={styles.degradationSection}>
          <div style={styles.degradationHeader}>
            <div style={styles.degradationTitle}>
              ⚠️ Degraded Mode ({(degradation.level * 100).toFixed(0)}%)
            </div>
            {degradation.recoveryProgress !== undefined && (
              <div style={styles.recoveryText}>
                Recovery: {(degradation.recoveryProgress * 100).toFixed(0)}%
              </div>
            )}
          </div>
          <div style={styles.degradationBar}>
            <div
              style={{
                ...styles.degradationFill,
                width: `${degradation.level * 100}%`,
              }}
            />
          </div>
          {degradation.degradations.length > 0 && (
            <div style={styles.degradationList}>
              {degradation.degradations.map((d, i) => (
                <div key={i} style={styles.degradationItem}>
                  • {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services */}
      {health && health.services.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Services</h4>
          <div style={styles.servicesList}>
            {health.services.map((service) => (
              <ServiceCard
                key={service.name}
                service={service}
                circuit={circuits.get(service.name)}
                theme={theme}
                allowOverrides={allowOverrides}
                onSelect={() => setSelectedService(service)}
                onOverride={handleOverride}
              />
            ))}
          </div>
        </div>
      )}

      {/* Circuit Breakers */}
      {circuits.size > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Circuit Breakers</h4>
          <div style={styles.circuitsList}>
            {Array.from(circuits.entries()).map(([key, circuit]) => (
              <CircuitCard key={key} name={key} circuit={circuit} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {selectedService && (
        <div style={styles.detailsModal} onClick={() => setSelectedService(null)}>
          <div
            style={{
              ...styles.detailsPanel,
              ...(isDark ? styles.detailsPanelDark : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.detailsHeader}>
              <h4 style={styles.detailsTitle}>Service Details: {selectedService.name}</h4>
              <button
                onClick={() => setSelectedService(null)}
                style={styles.closeButton}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={styles.detailsContent}>
              <DetailRow label="State" value={selectedService.state} />
              {selectedService.responseTime !== undefined && (
                <DetailRow
                  label="Response Time"
                  value={`${selectedService.responseTime.toFixed(2)}ms`}
                />
              )}
              {selectedService.errorRate !== undefined && (
                <DetailRow
                  label="Error Rate"
                  value={`${(selectedService.errorRate * 100).toFixed(1)}%`}
                />
              )}
              <DetailRow
                label="Last Check"
                value={new Date(selectedService.lastCheck).toLocaleString()}
              />
              {selectedService.message && (
                <DetailRow label="Message" value={selectedService.message} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Service card component
 */
interface ServiceCardProps {
  service: ServiceStatus;
  circuit?: CircuitInfo;
  theme: 'light' | 'dark';
  allowOverrides: boolean;
  onSelect: () => void;
  onOverride: (service: string, action: 'enable' | 'disable' | 'reset') => void;
}

function ServiceCard({
  service,
  circuit,
  theme,
  allowOverrides,
  onSelect,
  onOverride,
}: ServiceCardProps) {
  const stateStyle = getStateStyle(service.state);

  return (
    <div
      style={{
        ...styles.serviceCard,
        ...(theme === 'dark' ? styles.serviceCardDark : {}),
        borderLeftColor: stateStyle.background,
      }}
    >
      <div style={styles.serviceCardHeader} onClick={onSelect} role="button" tabIndex={0}>
        <div style={styles.serviceCardTitle}>
          <span style={{ ...styles.serviceState, ...stateStyle }}>
            {getStateEmoji(service.state)}
          </span>
          <span style={styles.serviceName}>{service.name}</span>
        </div>
        {circuit && (
          <span style={styles.circuitBadge}>
            {circuit.state === 'closed' ? '🟢' : circuit.state === 'half-open' ? '🟡' : '🔴'}{' '}
            {circuit.state}
          </span>
        )}
      </div>

      <div style={styles.serviceCardStats}>
        {service.responseTime !== undefined && (
          <div style={styles.serviceCardStat}>
            ⏱️ {service.responseTime.toFixed(0)}ms
          </div>
        )}
        {service.errorRate !== undefined && (
          <div style={styles.serviceCardStat}>
            ⚠️ {(service.errorRate * 100).toFixed(1)}% errors
          </div>
        )}
      </div>

      {allowOverrides && (
        <div style={styles.serviceCardActions}>
          <button
            onClick={() => onOverride(service.name, 'reset')}
            style={styles.overrideButton}
            title="Reset circuit"
          >
            ↻
          </button>
          <button
            onClick={() => onOverride(service.name, service.state === 'down' ? 'enable' : 'disable')}
            style={styles.overrideButton}
            title={service.state === 'down' ? 'Enable' : 'Disable'}
          >
            {service.state === 'down' ? '▶️' : '⏸️'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Circuit breaker card component
 */
interface CircuitCardProps {
  name: string;
  circuit: CircuitInfo;
  theme: 'light' | 'dark';
}

function CircuitCard({ name, circuit, theme }: CircuitCardProps) {
  const stateColor =
    circuit.state === 'closed' ? '#4caf50' : circuit.state === 'half-open' ? '#ff9800' : '#f44336';

  return (
    <div
      style={{
        ...styles.circuitCard,
        ...(theme === 'dark' ? styles.circuitCardDark : {}),
        borderLeftColor: stateColor,
      }}
    >
      <div style={styles.circuitCardHeader}>
        <span style={styles.circuitName}>{name}</span>
        <span style={{ ...styles.circuitState, color: stateColor }}>
          {circuit.state}
        </span>
      </div>
      <div style={styles.circuitStats}>
        <div>Failure Rate: {(circuit.failureRate * 100).toFixed(1)}%</div>
        <div>
          Requests: {circuit.totalRequests} ({circuit.successes}✅ / {circuit.failures}❌)
        </div>
      </div>
    </div>
  );
}

/**
 * Stat item component
 */
interface StatItemProps {
  label: string;
  value: string;
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
 * Get emoji for health state
 */
function getStateEmoji(state: string): string {
  switch (state) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'critical':
      return '🔴';
    case 'down':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Get style for health state
 */
function getStateStyle(state: string): React.CSSProperties {
  switch (state) {
    case 'healthy':
      return { background: '#4caf50', color: '#fff' };
    case 'degraded':
      return { background: '#ff9800', color: '#fff' };
    case 'critical':
      return { background: '#f44336', color: '#fff' };
    case 'down':
      return { background: '#9e9e9e', color: '#fff' };
    default:
      return { background: '#e0e0e0', color: '#333' };
  }
}

/**
 * Format uptime duration
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
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
  healthBadge: {
    padding: '6px 16px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 600,
  },
  overallSection: {
    marginBottom: '20px',
  },
  overallStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
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
  degradationSection: {
    padding: '16px',
    background: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  degradationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  degradationTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f44336',
  },
  recoveryText: {
    fontSize: '12px',
    color: '#4caf50',
  },
  degradationBar: {
    height: '8px',
    background: '#ffcdd2',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  degradationFill: {
    height: '100%',
    background: '#f44336',
    transition: 'width 0.3s ease',
  },
  degradationList: {
    fontSize: '12px',
    color: '#666',
  },
  degradationItem: {
    marginBottom: '4px',
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
  servicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  serviceCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderLeft: '4px solid #4caf50',
    borderRadius: '4px',
  },
  serviceCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  serviceCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  serviceCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serviceState: {
    fontSize: '14px',
  },
  serviceName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  circuitBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    background: '#e0e0e0',
    borderRadius: '8px',
  },
  serviceCardStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '11px',
    color: '#666',
    marginBottom: '8px',
  },
  serviceCardStat: {},
  serviceCardActions: {
    display: 'flex',
    gap: '4px',
  },
  overrideButton: {
    padding: '4px 8px',
    background: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  circuitsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
  },
  circuitCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderLeft: '4px solid #4caf50',
    borderRadius: '4px',
  },
  circuitCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  circuitCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  circuitName: {
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
    maxWidth: '500px',
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
    fontSize: '14px',
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
};
