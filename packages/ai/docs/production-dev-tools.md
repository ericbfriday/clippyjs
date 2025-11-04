# Production Developer Tools

Comprehensive developer tools for production debugging, monitoring, and performance analysis.

## Overview

The Production DevTools suite provides a unified interface for monitoring and debugging ClippyJS applications in production environments. All tools are tree-shakeable and can be excluded from production builds when not needed.

## Components

### ProductionDevTools (Unified Panel)

The main component that provides a tabbed interface for all developer tools.

```tsx
import { ProductionDevTools } from '@clippyjs/ai/react';

function App() {
  return (
    <div>
      {/* Your app content */}
      <ProductionDevTools
        position="bottom"
        theme="light"
        defaultOpen={false}
        enableKeyboardShortcuts={true}
      />
    </div>
  );
}
```

**Props:**
- `initialTab?: 'telemetry' | 'storage' | 'errors' | 'performance' | 'health'` - Initial tab to display
- `position?: 'bottom' | 'right' | 'floating'` - Panel position
- `theme?: 'light' | 'dark'` - Visual theme
- `defaultOpen?: boolean` - Whether panel is initially open
- `productionMode?: boolean` - Requires explicit enable in production
- `enableKeyboardShortcuts?: boolean` - Enable keyboard navigation

**Keyboard Shortcuts:**
- `Ctrl+D` / `Cmd+D` - Toggle panel
- `Ctrl+1-5` - Switch tabs (when panel is open)
- `Escape` - Close panel
- `Ctrl+M` - Minimize/maximize

### TelemetryDashboard

Real-time telemetry visualization with performance metrics, error rates, and usage statistics.

```tsx
import { TelemetryDashboard } from '@clippyjs/ai/react';
import { performanceMonitor } from './monitoring';

function MyApp() {
  return (
    <TelemetryDashboard
      performanceProvider={() => performanceMonitor.getMetrics()}
      errorProvider={() => errorTracker.getRecentErrors()}
      circuitProvider={() => circuitRegistry.getAllStats()}
      theme="light"
      updateInterval={5000}
    />
  );
}
```

**Features:**
- Real-time performance metrics display
- Error rate tracking and visualization
- Circuit breaker status monitoring
- Token usage statistics
- Exportable telemetry data
- Time range selection (1m, 5m, 15m, 1h)
- Metric filtering (latency, tokens, errors)
- SVG charts with no external dependencies

**Props:**
- `performanceProvider?: () => PerformanceMetrics` - Performance metrics provider
- `errorProvider?: () => ErrorEvent[]` - Error events provider
- `circuitProvider?: () => Map<string, CircuitBreakerEvent>` - Circuit breaker provider
- `retryProvider?: () => RetryEvent[]` - Retry events provider
- `theme?: 'light' | 'dark'` - Visual theme
- `updateInterval?: number` - Update interval in milliseconds (default: 5000)
- `maxDataPoints?: number` - Maximum data points to track (default: 60)

### StorageInspector

IndexedDB and Cache storage viewer with management capabilities.

```tsx
import { StorageInspector } from '@clippyjs/ai/react';

function MyApp() {
  return (
    <StorageInspector
      dbName="clippyjs"
      theme="light"
      updateInterval={5000}
    />
  );
}
```

**Features:**
- IndexedDB content viewing
- Storage quota display with visual progress bar
- Cache statistics
- Data import/export (JSON format)
- Cleanup utilities
- Size breakdown by store
- Search and filter items
- Pretty-printed JSON viewer

**Props:**
- `dbName?: string` - Database name to inspect (default: 'clippyjs')
- `theme?: 'light' | 'dark'` - Visual theme
- `updateInterval?: number` - Update interval in milliseconds (default: 5000)

**Operations:**
- View all stores in a database
- Browse items with pagination
- Export individual stores as JSON
- Clear individual stores
- Delete specific items
- View storage quota usage
- Manage cache storage

### ErrorLogViewer

Error list with filtering, grouping, and detailed stack trace viewing.

```tsx
import { ErrorLogViewer } from '@clippyjs/ai/react';
import { errorLogger } from './logging';

function MyApp() {
  return (
    <ErrorLogViewer
      errors={errorLogger.getAllErrors()}
      theme="light"
      maxErrors={100}
      onResolve={(index) => errorLogger.markResolved(index)}
    />
  );
}
```

**Features:**
- Error list with filtering by type, severity, recovery status
- Stack trace viewer with syntax highlighting
- Error context display (user info, request data, etc.)
- Error grouping by type and message
- Mark errors as resolved
- Export error logs (JSON format)
- Search functionality
- Color-coded severity levels

**Props:**
- `errors: ErrorEvent[]` - Array of error events
- `theme?: 'light' | 'dark'` - Visual theme
- `maxErrors?: number` - Maximum errors to display (default: 100)
- `onResolve?: (errorIndex: number) => void` - Callback when error is resolved

**Error Filters:**
- Type (NetworkError, ValidationError, etc.)
- Severity (critical, high, medium, low)
- Recovery status (recovered/unrecovered)
- Text search (message, type, stack trace)

### PerformanceTimeline

Visual timeline with waterfall chart for performance analysis.

```tsx
import { PerformanceTimeline } from '@clippyjs/ai/react';
import type { PerformanceEntry } from '@clippyjs/ai/react';

const entries: PerformanceEntry[] = [
  {
    name: 'API: Get Users',
    startTime: 0,
    duration: 150,
    type: 'api',
    details: { endpoint: '/api/users' },
  },
  {
    name: 'Cache: Read',
    startTime: 50,
    duration: 5,
    type: 'cache',
  },
];

function MyApp() {
  return (
    <PerformanceTimeline
      entries={entries}
      theme="light"
      height={400}
      showDetails={true}
    />
  );
}
```

**Features:**
- Visual timeline of operations
- Waterfall chart display
- Performance mark visualization
- Bottleneck highlighting (operations >20% of total time)
- Zoom and pan controls
- Color-coded operation types
- Detailed timing information
- Export capability

**Props:**
- `entries: PerformanceEntry[]` - Array of performance entries
- `theme?: 'light' | 'dark'` - Visual theme
- `height?: number` - Timeline height in pixels (default: 400)
- `showDetails?: boolean` - Show detailed information panel (default: true)

**Entry Types:**
- `api` - API/network calls (blue)
- `cache` - Cache operations (green)
- `render` - UI rendering (orange)
- `custom` - Custom operations (purple)

**Controls:**
- Zoom in/out buttons
- Reset view button
- Type filter dropdown
- Click entries to view details

### HealthStatusMonitor

Service health and circuit breaker monitoring with manual controls.

```tsx
import { HealthStatusMonitor } from '@clippyjs/ai/react';
import { healthChecker, circuitRegistry } from './monitoring';

function MyApp() {
  return (
    <HealthStatusMonitor
      healthProvider={() => healthChecker.getStatus()}
      circuitProvider={() => circuitRegistry.getAllStats()}
      degradationProvider={() => degradationManager.getInfo()}
      theme="light"
      updateInterval={5000}
      allowOverrides={true}
      onOverride={(service, action) => {
        console.log(`Override: ${service} - ${action}`);
      }}
    />
  );
}
```

**Features:**
- Service health indicators (healthy, degraded, critical, down)
- Circuit breaker status display
- Degradation level visualization
- Recovery progress tracking
- Manual override controls (enable/disable/reset)
- Historical health tracking
- Uptime display

**Props:**
- `healthProvider?: () => HealthStatus` - Health status provider
- `circuitProvider?: () => Map<string, CircuitInfo>` - Circuit breaker provider
- `degradationProvider?: () => DegradationInfo` - Degradation info provider
- `theme?: 'light' | 'dark'` - Visual theme
- `updateInterval?: number` - Update interval in milliseconds (default: 5000)
- `allowOverrides?: boolean` - Allow manual service control (default: false)
- `onOverride?: (service: string, action: 'enable' | 'disable' | 'reset') => void` - Override callback

**Health States:**
- `healthy` - All systems operational (green ✅)
- `degraded` - Partial functionality (yellow ⚠️)
- `critical` - Severe issues (red 🔴)
- `down` - Service unavailable (gray ❌)

**Circuit States:**
- `closed` - Normal operation (green 🟢)
- `half-open` - Testing recovery (yellow 🟡)
- `open` - Preventing requests (red 🔴)

## Integration Guide

### Basic Setup

```tsx
import { ProductionDevTools } from '@clippyjs/ai/react';

function App() {
  return (
    <div>
      <YourAppContent />

      {/* Add DevTools panel */}
      <ProductionDevTools
        position="bottom"
        theme="light"
        defaultOpen={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}
```

### With Data Providers

```tsx
import { ProductionDevTools } from '@clippyjs/ai/react';
import { performanceMonitor, errorTracker, healthChecker } from './monitoring';

function App() {
  return (
    <ProductionDevTools
      position="bottom"
      telemetryProps={{
        performanceProvider: () => performanceMonitor.getMetrics(),
        errorProvider: () => errorTracker.getErrors(),
      }}
      errorProps={{
        errors: errorTracker.getAllErrors(),
        onResolve: (index) => errorTracker.markResolved(index),
      }}
      performanceProps={{
        entries: performanceTracker.getEntries(),
      }}
      healthProps={{
        healthProvider: () => healthChecker.getStatus(),
      }}
    />
  );
}
```

### Production Mode

```tsx
import { ProductionDevTools } from '@clippyjs/ai/react';

function App() {
  return (
    <ProductionDevTools
      productionMode={true}  // Requires explicit enable
      position="floating"
      theme="dark"
    />
  );
}
```

In production mode, a small toggle button appears in the corner. DevTools only activate when the user explicitly clicks it.

### Tree-Shaking for Production

```tsx
// Use conditional imports to exclude from production builds
const ProductionDevTools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : require('@clippyjs/ai/react').ProductionDevTools;

function App() {
  return (
    <div>
      <YourAppContent />
      {ProductionDevTools && <ProductionDevTools />}
    </div>
  );
}
```

### Standalone Components

Individual tools can be used standalone:

```tsx
import { TelemetryDashboard, ErrorLogViewer } from '@clippyjs/ai/react';

function AdminPanel() {
  return (
    <div className="admin-grid">
      <section>
        <h2>Telemetry</h2>
        <TelemetryDashboard performanceProvider={getMetrics} />
      </section>

      <section>
        <h2>Errors</h2>
        <ErrorLogViewer errors={getErrors()} />
      </section>
    </div>
  );
}
```

## Styling

All components use inline styles and are self-contained. No external CSS required.

### Theme Customization

Both light and dark themes are supported:

```tsx
<ProductionDevTools theme="dark" />
```

Theme colors are automatically applied to all child components.

## Performance Considerations

### Bundle Size

- TelemetryDashboard: ~18KB
- StorageInspector: ~16KB
- ErrorLogViewer: ~14KB
- PerformanceTimeline: ~16KB
- HealthStatusMonitor: ~12KB
- ProductionDevTools (unified): ~22KB
- **Total (all components)**: ~98KB minified

### Optimization Tips

1. **Use Production Mode**: Requires explicit user enable
2. **Tree-Shake**: Conditionally import only in development
3. **Lazy Load**: Use React.lazy() for on-demand loading
4. **Limit Data**: Set maxDataPoints and maxErrors appropriately
5. **Adjust Update Interval**: Increase updateInterval to reduce overhead

## Troubleshooting

### DevTools Not Appearing

Check that:
1. Component is rendered in the DOM
2. No z-index conflicts with other elements
3. Position is appropriate for your layout
4. defaultOpen is set to true for testing

### Data Not Updating

Verify that:
1. Data providers are returning current data
2. updateInterval is set correctly
3. React component is re-rendering
4. No errors in browser console

### Storage Inspector Shows No Data

Ensure that:
1. IndexedDB database name is correct
2. Browser supports IndexedDB
3. No privacy settings blocking IndexedDB
4. Database has been initialized

### Performance Impact

If experiencing performance issues:
1. Increase updateInterval (default: 5000ms)
2. Reduce maxDataPoints (default: 60)
3. Pause updates when not actively viewing
4. Use productionMode to disable by default

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (14+)
- Mobile browsers: Limited (touch interactions)

## Accessibility

All components include:
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management
- Screen reader compatible
- High contrast mode support

## Examples

See `packages/storybook/stories/ProductionDevTools.stories.tsx` for comprehensive examples.

## License

MIT
