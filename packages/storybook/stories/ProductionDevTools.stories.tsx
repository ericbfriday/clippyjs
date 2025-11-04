import type { Meta, StoryObj } from '@storybook/react';
import { ProductionDevTools, TelemetryDashboard, StorageInspector, ErrorLogViewer, PerformanceTimeline, HealthStatusMonitor } from '../../ai/src/react/ProductionDevTools';
import type { PerformanceMetrics } from '../../ai/src/cache/PerformanceMonitor';
import type { ErrorEvent } from '../../ai/src/errors/TelemetryHooks';
import type { PerformanceEntry, HealthStatus } from '../../ai/src/react/ProductionDevTools';

const meta: Meta<typeof ProductionDevTools> = {
  title: 'Production/DevTools',
  component: ProductionDevTools,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProductionDevTools>;

// Mock data generators
const generateMetrics = (): PerformanceMetrics => ({
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
});

const generateErrors = (): ErrorEvent[] => [
  {
    error: {
      type: 'NetworkError',
      severity: 'high',
      message: 'Request failed with status 503',
      details: { stack: 'Error: Request failed\n  at fetch (api.ts:45)\n  at handler (app.ts:12)' },
    },
    originalError: new Error('Network error'),
    timestamp: Date.now() - 5000,
    recovered: true,
    recoveryAction: { type: 'retry' },
  },
  {
    error: {
      type: 'ValidationError',
      severity: 'medium',
      message: 'Invalid user input',
      details: {},
    },
    originalError: new Error('Validation failed'),
    timestamp: Date.now() - 60000,
    recovered: false,
  },
];

const generatePerformanceEntries = (): PerformanceEntry[] => [
  { name: 'API: Get Users', startTime: 0, duration: 150, type: 'api' },
  { name: 'Cache: Read', startTime: 50, duration: 5, type: 'cache' },
  { name: 'Render: UserList', startTime: 100, duration: 30, type: 'render' },
  { name: 'API: Get Posts', startTime: 200, duration: 200, type: 'api' },
  { name: 'Cache: Write', startTime: 250, duration: 10, type: 'cache' },
];

const generateHealthStatus = (): HealthStatus => ({
  state: 'healthy',
  uptime: Date.now() - (Date.now() - 3600000),
  lastCheck: Date.now(),
  services: [
    {
      name: 'API Gateway',
      state: 'healthy',
      responseTime: 25,
      errorRate: 0.01,
      lastCheck: Date.now(),
    },
    {
      name: 'Database',
      state: 'healthy',
      responseTime: 15,
      errorRate: 0,
      lastCheck: Date.now(),
    },
    {
      name: 'Cache',
      state: 'degraded',
      responseTime: 50,
      errorRate: 0.05,
      lastCheck: Date.now(),
      message: 'High memory usage',
    },
  ],
});

// Unified Panel Stories
export const Default: Story = {
  args: {
    defaultOpen: true,
    position: 'bottom',
    theme: 'light',
    telemetryProps: {
      performanceProvider: generateMetrics,
      errorProvider: generateErrors,
    },
    errorProps: {
      errors: generateErrors(),
    },
    performanceProps: {
      entries: generatePerformanceEntries(),
    },
    healthProps: {
      healthProvider: generateHealthStatus,
    },
  },
};

export const DarkTheme: Story = {
  args: {
    ...Default.args,
    theme: 'dark',
  },
};

export const RightPosition: Story = {
  args: {
    ...Default.args,
    position: 'right',
  },
};

export const FloatingPosition: Story = {
  args: {
    ...Default.args,
    position: 'floating',
  },
};

export const ProductionMode: Story = {
  args: {
    ...Default.args,
    productionMode: true,
  },
};

export const InitiallyMinimized: Story = {
  args: {
    ...Default.args,
    defaultOpen: false,
  },
};

// Individual Component Stories
const TelemetryMeta: Meta<typeof TelemetryDashboard> = {
  title: 'Production/DevTools/TelemetryDashboard',
  component: TelemetryDashboard,
  tags: ['autodocs'],
};

export const TelemetryLight: StoryObj<typeof TelemetryDashboard> = {
  render: () => (
    <TelemetryDashboard
      performanceProvider={generateMetrics}
      errorProvider={generateErrors}
      theme="light"
    />
  ),
};

export const TelemetryDark: StoryObj<typeof TelemetryDashboard> = {
  render: () => (
    <TelemetryDashboard
      performanceProvider={generateMetrics}
      errorProvider={generateErrors}
      theme="dark"
    />
  ),
};

const StorageMeta: Meta<typeof StorageInspector> = {
  title: 'Production/DevTools/StorageInspector',
  component: StorageInspector,
  tags: ['autodocs'],
};

export const StorageLight: StoryObj<typeof StorageInspector> = {
  render: () => <StorageInspector theme="light" dbName="clippyjs" />,
};

export const StorageDark: StoryObj<typeof StorageInspector> = {
  render: () => <StorageInspector theme="dark" dbName="clippyjs" />,
};

const ErrorMeta: Meta<typeof ErrorLogViewer> = {
  title: 'Production/DevTools/ErrorLogViewer',
  component: ErrorLogViewer,
  tags: ['autodocs'],
};

export const ErrorsLight: StoryObj<typeof ErrorLogViewer> = {
  render: () => <ErrorLogViewer errors={generateErrors()} theme="light" />,
};

export const ErrorsDark: StoryObj<typeof ErrorLogViewer> = {
  render: () => <ErrorLogViewer errors={generateErrors()} theme="dark" />,
};

export const ErrorsEmpty: StoryObj<typeof ErrorLogViewer> = {
  render: () => <ErrorLogViewer errors={[]} theme="light" />,
};

const TimelineMeta: Meta<typeof PerformanceTimeline> = {
  title: 'Production/DevTools/PerformanceTimeline',
  component: PerformanceTimeline,
  tags: ['autodocs'],
};

export const TimelineLight: StoryObj<typeof PerformanceTimeline> = {
  render: () => <PerformanceTimeline entries={generatePerformanceEntries()} theme="light" />,
};

export const TimelineDark: StoryObj<typeof PerformanceTimeline> = {
  render: () => <PerformanceTimeline entries={generatePerformanceEntries()} theme="dark" />,
};

export const TimelineWithBottleneck: StoryObj<typeof PerformanceTimeline> = {
  render: () => (
    <PerformanceTimeline
      entries={[
        { name: 'Slow API Call', startTime: 0, duration: 2000, type: 'api' },
        { name: 'Fast Cache', startTime: 2000, duration: 5, type: 'cache' },
      ]}
      theme="light"
    />
  ),
};

const HealthMeta: Meta<typeof HealthStatusMonitor> = {
  title: 'Production/DevTools/HealthStatusMonitor',
  component: HealthStatusMonitor,
  tags: ['autodocs'],
};

export const HealthLight: StoryObj<typeof HealthStatusMonitor> = {
  render: () => <HealthStatusMonitor healthProvider={generateHealthStatus} theme="light" />,
};

export const HealthDark: StoryObj<typeof HealthStatusMonitor> = {
  render: () => <HealthStatusMonitor healthProvider={generateHealthStatus} theme="dark" />,
};

export const HealthDegraded: StoryObj<typeof HealthStatusMonitor> = {
  render: () => (
    <HealthStatusMonitor
      healthProvider={() => ({
        ...generateHealthStatus(),
        state: 'degraded',
      })}
      degradationProvider={() => ({
        level: 0.5,
        degradations: ['High memory usage', 'Slow database queries'],
        recoveryProgress: 0.3,
      })}
      theme="light"
    />
  ),
};

export const HealthCritical: StoryObj<typeof HealthStatusMonitor> = {
  render: () => (
    <HealthStatusMonitor
      healthProvider={() => ({
        ...generateHealthStatus(),
        state: 'critical',
        services: [
          {
            name: 'API Gateway',
            state: 'down',
            lastCheck: Date.now(),
            message: 'Connection refused',
          },
        ],
      })}
      theme="light"
    />
  ),
};
