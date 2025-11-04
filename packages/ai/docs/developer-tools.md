# Developer Tools Guide

## Overview

ClippyJS provides powerful developer tools for debugging, inspecting, and optimizing context gathering and AI interactions. These tools help you understand how the context system works, identify performance bottlenecks, and troubleshoot issues.

**Available Tools**:
- **ContextInspector**: Real-time context visualization
- **RequestInspector**: AI request/response debugging
- **DebugCollector**: Comprehensive debug information
- **Performance Profiler**: Context gathering performance metrics

---

## ContextInspector

The `ContextInspector` is a React component that provides real-time visualization of context gathering, caching, and prioritization.

### Quick Start

```typescript
import { ContextInspector } from '@clippyjs/ai';
import { useAIClippy } from '@clippyjs/ai';

function App() {
  const { contextManager } = useAIClippy();

  return (
    <div>
      <YourApp />

      {/* Add ContextInspector in development */}
      {process.env.NODE_ENV === 'development' && (
        <ContextInspector
          contextManager={contextManager}
          theme="dark"
          position="bottom-right"
        />
      )}
    </div>
  );
}
```

### Features

**Real-Time Context Visualization**:
- View all gathered contexts as they're collected
- See relevance scores for each context
- Inspect context data in detail
- Copy context JSON to clipboard

**Cache Statistics**:
- Cache hit/miss rates
- Memory usage
- Number of cached entries
- Average gather time

**Provider Management**:
- See which providers are registered
- View enabled/disabled status
- Monitor provider errors

**Search and Filter**:
- Search contexts by type or content
- Filter by relevance score
- Find specific data quickly

### Configuration

```typescript
<ContextInspector
  // Required: Context manager instance
  contextManager={contextManager}

  // Theme: 'light' or 'dark' (default: 'light')
  theme="dark"

  // Position on screen
  position="bottom-right" // or 'top-left', 'top-right', 'bottom-left'

  // Initially collapsed (default: false)
  collapsed={false}

  // Callback when collapsed state changes
  onToggle={(collapsed) => console.log('Inspector collapsed:', collapsed)}
/>
```

### Usage Examples

**Development Only**:
```typescript
function App() {
  const { contextManager } = useAIClippy();

  return (
    <>
      <YourApp />

      {process.env.NODE_ENV === 'development' && (
        <ContextInspector
          contextManager={contextManager}
          theme="dark"
        />
      )}
    </>
  );
}
```

**Toggle with Keyboard Shortcut**:
```typescript
function App() {
  const { contextManager } = useAIClippy();
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+C to toggle inspector
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        setShowInspector((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      <YourApp />

      {showInspector && (
        <ContextInspector
          contextManager={contextManager}
          theme="dark"
          position="bottom-right"
        />
      )}
    </>
  );
}
```

**With Custom Styling**:
```typescript
<ContextInspector
  contextManager={contextManager}
  theme="dark"
  position="bottom-right"
  style={{
    // Custom styles
    maxHeight: '500px',
    width: '400px',
    zIndex: 9999,
  }}
/>
```

---

## RequestInspector

The `RequestInspector` helps debug AI requests and responses.

### Setup

```typescript
import { RequestInspector } from '@clippyjs/ai';

// Create inspector
const requestInspector = new RequestInspector({
  // Enable logging
  logRequests: true,

  // Maximum requests to store
  maxRequests: 100,

  // Include request bodies
  includeRequestBodies: true,

  // Include response bodies
  includeResponseBodies: true,
});

// Attach to AI provider
const provider = new AnthropicProvider();
provider.setRequestInspector(requestInspector);
```

### Inspecting Requests

```typescript
// Get all requests
const requests = requestInspector.getRequests();

requests.forEach((req) => {
  console.log('Request:', {
    id: req.id,
    timestamp: req.timestamp,
    model: req.model,
    messages: req.messages.length,
    tokens: req.usage?.totalTokens,
    duration: req.duration,
    error: req.error,
  });
});

// Get latest request
const latest = requestInspector.getLatestRequest();
console.log('Latest request:', latest);

// Get request by ID
const specific = requestInspector.getRequest('request-id-123');
console.log('Specific request:', specific);

// Clear all requests
requestInspector.clear();
```

### Request Filtering

```typescript
// Get only failed requests
const failed = requestInspector.getRequests().filter((r) => r.error);

// Get slow requests (>1 second)
const slow = requestInspector.getRequests().filter((r) => r.duration > 1000);

// Get by model
const claudeRequests = requestInspector
  .getRequests()
  .filter((r) => r.model.includes('claude'));

// Get by time range
const recent = requestInspector
  .getRequests()
  .filter((r) => r.timestamp > Date.now() - 60000); // Last minute
```

### Analytics

```typescript
// Calculate statistics
const stats = requestInspector.getStatistics();

console.log('Request Statistics:', {
  total: stats.total,
  successful: stats.successful,
  failed: stats.failed,
  avgDuration: stats.avgDuration,
  totalTokens: stats.totalTokens,
  avgTokensPerRequest: stats.avgTokensPerRequest,
  p95Duration: stats.p95Duration,
});
```

---

## DebugCollector

The `DebugCollector` gathers comprehensive debug information for troubleshooting.

### Setup

```typescript
import { DebugCollector } from '@clippyjs/ai';

const debugCollector = new DebugCollector({
  // Capture context gathering
  captureContextGathering: true,

  // Capture cache operations
  captureCacheOperations: true,

  // Capture provider errors
  captureProviderErrors: true,

  // Capture performance metrics
  capturePerformance: true,

  // Maximum events to store
  maxEvents: 1000,
});

// Attach to context manager
contextManager.setDebugCollector(debugCollector);
```

### Collecting Debug Info

```typescript
// Get all debug events
const events = debugCollector.getEvents();

events.forEach((event) => {
  console.log('Event:', {
    type: event.type,
    timestamp: event.timestamp,
    data: event.data,
  });
});

// Get events by type
const contextEvents = debugCollector.getEventsByType('context-gathering');
const cacheEvents = debugCollector.getEventsByType('cache-operation');
const errorEvents = debugCollector.getEventsByType('provider-error');

// Get events in time range
const recentEvents = debugCollector.getEventsInRange(
  Date.now() - 60000, // From 1 minute ago
  Date.now() // To now
);
```

### Generating Debug Report

```typescript
// Generate comprehensive debug report
const report = debugCollector.generateReport();

console.log('Debug Report:');
console.log(`Events: ${report.totalEvents}`);
console.log(`Errors: ${report.totalErrors}`);
console.log(`Avg Gather Time: ${report.avgGatherTime}ms`);
console.log(`Cache Hit Rate: ${report.cacheHitRate * 100}%`);

// Export report as JSON
const json = JSON.stringify(report, null, 2);
navigator.clipboard.writeText(json);

// Save report to file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `debug-report-${Date.now()}.json`;
a.click();
```

---

## Performance Profiler

Profile context gathering performance to identify bottlenecks.

### Basic Profiling

```typescript
import { PerformanceProfiler } from '@clippyjs/ai';

const profiler = new PerformanceProfiler();

// Start profiling
profiler.start('context-gathering');

// Perform context gathering
const context = await manager.gatherContext();

// End profiling
profiler.end('context-gathering');

// Get results
const result = profiler.getResult('context-gathering');
console.log(`Context gathering took ${result.duration}ms`);
```

### Provider Profiling

```typescript
// Profile individual providers
profiler.start('viewport-provider');
const viewportContext = await viewportProvider.gather();
profiler.end('viewport-provider');

profiler.start('performance-provider');
const performanceContext = await performanceProvider.gather();
profiler.end('performance-provider');

// Compare provider performance
const results = profiler.getAllResults();
results.forEach((result) => {
  console.log(`${result.name}: ${result.duration}ms`);
});

// Identify slow providers
const slowProviders = results.filter((r) => r.duration > 20);
if (slowProviders.length > 0) {
  console.warn('Slow providers detected:', slowProviders);
}
```

### Cache Profiling

```typescript
// Profile cache operations
profiler.start('cache-lookup');
const cached = await cache.get('key');
profiler.end('cache-lookup');

profiler.start('cache-set');
await cache.set('key', data);
profiler.end('cache-set');

// Verify cache performance targets
const lookupResult = profiler.getResult('cache-lookup');
if (lookupResult.duration > 10) {
  console.warn('Cache lookup is slow:', lookupResult.duration + 'ms');
}
```

### Continuous Monitoring

```typescript
// Monitor performance over time
setInterval(() => {
  const stats = profiler.getStatistics();

  console.log('Performance Statistics:', {
    operations: stats.totalOperations,
    avgDuration: stats.avgDuration,
    p50: stats.p50Duration,
    p95: stats.p95Duration,
    p99: stats.p99Duration,
    slowOperations: stats.slowOperations,
  });

  // Alert on performance degradation
  if (stats.p95Duration > 100) {
    console.error('Performance degradation detected!');
  }
}, 60000); // Every minute
```

---

## Integration with Your App

### Development Mode Setup

```typescript
// devtools.ts
import {
  ContextInspector,
  RequestInspector,
  DebugCollector,
  PerformanceProfiler,
} from '@clippyjs/ai';

export function setupDevTools(manager: ContextManager, provider: AIProvider) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Setup request inspector
  const requestInspector = new RequestInspector({
    logRequests: true,
    maxRequests: 100,
  });
  provider.setRequestInspector(requestInspector);

  // Setup debug collector
  const debugCollector = new DebugCollector({
    captureContextGathering: true,
    captureCacheOperations: true,
    captureProviderErrors: true,
    capturePerformance: true,
  });
  manager.setDebugCollector(debugCollector);

  // Setup performance profiler
  const profiler = new PerformanceProfiler();

  // Expose to window for console access
  (window as any).__clippyDevTools = {
    requestInspector,
    debugCollector,
    profiler,
    manager,
  };

  return {
    requestInspector,
    debugCollector,
    profiler,
  };
}

// Usage in app
const devTools = setupDevTools(contextManager, provider);
```

### Console Access

Once setup, you can access dev tools from browser console:

```javascript
// In browser console
const devTools = window.__clippyDevTools;

// View requests
devTools.requestInspector.getRequests();

// View debug events
devTools.debugCollector.getEvents();

// Generate report
const report = devTools.debugCollector.generateReport();
console.table(report);

// Profile operation
devTools.profiler.start('test');
// ... do something
devTools.profiler.end('test');
devTools.profiler.getResult('test');

// Gather context
await devTools.manager.gatherContext();
```

### Browser Extension (Future)

A dedicated browser extension is planned for enhanced debugging:

**Planned Features**:
- Dedicated DevTools panel
- Network request visualization
- Context timeline view
- Performance waterfall
- Provider health dashboard
- Cache inspection
- Export/import debug sessions

---

## Troubleshooting Common Issues

### Issue: ContextInspector Not Showing

**Possible Causes**:
1. Context manager not passed correctly
2. Component not rendered
3. CSS styling issues

**Solutions**:
```typescript
// Verify context manager
console.log('Context Manager:', contextManager);

// Check if manager is initialized
const stats = contextManager.getStats();
console.log('Manager Stats:', stats);

// Ensure component is rendered
{process.env.NODE_ENV === 'development' && contextManager && (
  <ContextInspector
    contextManager={contextManager}
    theme="dark"
  />
)}

// Add explicit styling
<ContextInspector
  contextManager={contextManager}
  style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 10000,
  }}
/>
```

### Issue: No Contexts Showing

**Possible Causes**:
1. No providers registered
2. Providers not gathering
3. Event subscription not working

**Solutions**:
```typescript
// Check registered providers
const stats = manager.getStats();
console.log('Registered providers:', stats.providers);
console.log('Enabled providers:', stats.enabledProviders);

// Manually gather context
const result = await manager.gatherContext();
console.log('Gathered contexts:', result.contexts);

// Check provider errors
if (result.errors > 0) {
  console.error('Provider errors detected:', result.errors);
}

// Verify event subscription
manager.subscribe((event, data) => {
  console.log('Context event:', event, data);
});
```

### Issue: Performance Metrics Inaccurate

**Possible Causes**:
1. Profiler not started/ended correctly
2. Async operations not awaited
3. Multiple profiling sessions interfering

**Solutions**:
```typescript
// Ensure proper profiler usage
profiler.start('operation');
try {
  await performOperation();
} finally {
  profiler.end('operation');
}

// Clear profiler between tests
profiler.clear();

// Use unique names for nested operations
profiler.start('outer-operation');
profiler.start('inner-operation-1');
await operation1();
profiler.end('inner-operation-1');
profiler.start('inner-operation-2');
await operation2();
profiler.end('inner-operation-2');
profiler.end('outer-operation');
```

---

## Best Practices

### Development vs. Production

**Development**:
```typescript
if (process.env.NODE_ENV === 'development') {
  // Enable all dev tools
  setupDevTools(manager, provider);

  // Show inspector
  <ContextInspector contextManager={manager} />;

  // Verbose logging
  manager.setLogLevel('debug');
}
```

**Production**:
```typescript
if (process.env.NODE_ENV === 'production') {
  // Disable dev tools
  // No inspector
  // Minimal logging
  manager.setLogLevel('error');

  // Optional: Send errors to monitoring service
  manager.onError((error) => {
    sendToMonitoring(error);
  });
}
```

### Security Considerations

**Never expose sensitive data**:
```typescript
// ❌ Bad: Exposes sensitive data
const report = debugCollector.generateReport();
console.log(report); // Might contain API keys, tokens, etc.

// ✅ Good: Sanitize before logging
const sanitizedReport = sanitizeReport(report);
console.log(sanitizedReport);

function sanitizeReport(report: any) {
  // Remove sensitive fields
  return {
    ...report,
    contexts: report.contexts.map((c: any) => ({
      ...c,
      data: sanitizeContextData(c.data),
    })),
  };
}
```

**Restrict dev tool access**:
```typescript
// Only enable for specific users/roles
const isDeveloper = user.role === 'developer';
const isLocalhost = window.location.hostname === 'localhost';

if (isDeveloper || isLocalhost) {
  setupDevTools(manager, provider);
}
```

### Performance Impact

Dev tools have minimal performance impact when used correctly:

**Minimal Impact**:
- ContextInspector: <1ms overhead per render
- RequestInspector: <5ms per request
- DebugCollector: <2ms per event

**Considerations**:
```typescript
// Limit event collection
const debugCollector = new DebugCollector({
  maxEvents: 500, // Reasonable limit
});

// Periodic cleanup
setInterval(() => {
  debugCollector.clearOldEvents(60000); // Clear events older than 1 minute
}, 30000);

// Disable in production
if (process.env.NODE_ENV === 'production') {
  // Don't initialize dev tools at all
}
```

---

## Configuration Reference

### ContextInspector Props

```typescript
interface ContextInspectorProps {
  /** Context manager to inspect (required) */
  contextManager: ContextManager;

  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';

  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /** Initially collapsed */
  collapsed?: boolean;

  /** Callback when collapsed state changes */
  onToggle?: (collapsed: boolean) => void;

  /** Custom styles */
  style?: React.CSSProperties;

  /** Class name */
  className?: string;
}
```

### RequestInspector Options

```typescript
interface RequestInspectorOptions {
  /** Enable request logging */
  logRequests?: boolean;

  /** Maximum requests to store */
  maxRequests?: number;

  /** Include request bodies */
  includeRequestBodies?: boolean;

  /** Include response bodies */
  includeResponseBodies?: boolean;

  /** Log to console */
  logToConsole?: boolean;
}
```

### DebugCollector Options

```typescript
interface DebugCollectorOptions {
  /** Capture context gathering events */
  captureContextGathering?: boolean;

  /** Capture cache operations */
  captureCacheOperations?: boolean;

  /** Capture provider errors */
  captureProviderErrors?: boolean;

  /** Capture performance metrics */
  capturePerformance?: boolean;

  /** Maximum events to store */
  maxEvents?: number;

  /** Auto-cleanup old events */
  autoCleanup?: boolean;

  /** Cleanup interval (milliseconds) */
  cleanupInterval?: number;
}
```

---

## Next Steps

- **Read**: [Context Management Guide](./context-management.md) for context system details
- **Read**: [Context Provider API](./context-providers.md) for creating providers
- **Explore**: Developer tools in your app
- **Contribute**: Help us build better debugging tools!

---

**Need Help?**
- Check browser console for errors
- Enable verbose logging
- Generate debug report
- Review performance metrics
