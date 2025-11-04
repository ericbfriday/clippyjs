# Production Telemetry Infrastructure

Comprehensive telemetry system for production monitoring, performance tracking, and user analytics with privacy-safe data collection.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Integration Guide](#integration-guide)
- [Privacy & GDPR Compliance](#privacy--gdpr-compliance)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The telemetry infrastructure provides production-grade monitoring capabilities:

- **Event Collection**: Buffered event tracking with automatic batching
- **Performance Metrics**: Core Web Vitals and custom performance tracking
- **Usage Analytics**: Feature adoption and user interaction patterns
- **Error Tracking**: Automatic error capture with context preservation
- **Health Checks**: Service monitoring and dependency health

### Key Features

- **Privacy-First**: PII redaction and GDPR-compliant data handling
- **Low Overhead**: <5% performance impact, <2MB memory footprint
- **Flexible Transport**: HTTP, localStorage, console, or custom backends
- **Sampling Strategies**: Always, probabilistic, or throttled sampling
- **Automatic Batching**: Configurable batch size and flush intervals

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Application Layer                    │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              TelemetryCollector                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Event Buffering & Batching                  │  │
│  │  PII Redaction & Privacy Filtering           │  │
│  │  Sampling Strategy & Throttling              │  │
│  └──────────────────────────────────────────────┘  │
└───┬───────────┬────────────┬────────────┬──────────┘
    │           │            │            │
    ▼           ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│Perf    │ │Usage     │ │Error    │ │Health    │
│Metrics │ │Analytics │ │Tracking │ │Check     │
└───┬────┘ └────┬─────┘ └────┬────┘ └────┬─────┘
    │           │            │            │
    └───────────┴────────────┴────────────┘
                │
                ▼
    ┌───────────────────────┐
    │   Transport Backend   │
    │  HTTP | localStorage  │
    │  Console | Custom     │
    └───────────────────────┘
```

## Components

### 1. TelemetryCollector

Central event collection engine with buffering and transport.

**Key Features:**
- Event buffering with automatic flushing
- Multiple transport backends
- PII redaction
- Sampling strategies
- Session tracking

**Basic Usage:**

```typescript
import { TelemetryCollector } from '@clippyjs/ai/telemetry/TelemetryCollector';

const collector = new TelemetryCollector({
  enabled: true,
  transport: 'http',
  endpoint: 'https://analytics.example.com/events',
  maxBufferSize: 50,
  flushIntervalMs: 30000,
  sampling: 'always',
  redactPII: true,
});

// Track events
collector.track({
  type: 'feature.used',
  timestamp: Date.now(),
  data: { featureId: 'proactive-suggestions' },
});

// Track performance
collector.trackPerformance({
  name: 'api.latency',
  value: 150,
  unit: 'ms',
});

// Track errors
collector.trackError(error, { context: 'api-call' });

// Manual flush
await collector.flush();

// Cleanup
collector.destroy();
```

### 2. PerformanceMetrics

Core Web Vitals and custom performance tracking.

**Key Features:**
- Core Web Vitals (LCP, FID, CLS, TTFB)
- AI operation timing
- Custom marks and measures
- Resource usage monitoring
- Percentile calculations

**Basic Usage:**

```typescript
import { PerformanceMetrics } from '@clippyjs/ai/telemetry/PerformanceMetrics';

const metrics = new PerformanceMetrics(collector, {
  trackCoreWebVitals: true,
  trackResources: true,
  maxTimings: 1000,
});

// Track AI operations
metrics.trackAIOperation({
  contextGatheringMs: 50,
  contextCompressionMs: 30,
  apiCallMs: 200,
  totalMs: 280,
  tokens: 500,
  contextSizeBytes: 1024,
});

// Create performance marks
metrics.mark('operation-start');
// ... do work
metrics.mark('operation-end');
const duration = metrics.measure('operation', 'operation-start', 'operation-end');

// Get Core Web Vitals
const cwv = metrics.getCoreWebVitals();
console.log('LCP:', cwv.lcp, 'FID:', cwv.fid, 'CLS:', cwv.cls);

// Get AI operation summary
const summary = metrics.getAIOperationsSummary();
console.log('P95 latency:', summary.p95, 'ms');
```

### 3. UsageAnalytics

Feature adoption and user interaction tracking.

**Key Features:**
- Feature usage tracking
- Conversation metrics
- Provider usage statistics
- Proactive behavior effectiveness
- User session management

**Basic Usage:**

```typescript
import { UsageAnalytics } from '@clippyjs/ai/telemetry/UsageAnalytics';

const analytics = new UsageAnalytics(collector, {
  trackFeatures: true,
  trackConversations: true,
  trackProviders: true,
  trackProactive: true,
});

// Track feature usage
analytics.trackFeature('proactive-suggestions', 'enabled', {
  userId: 'user-123',
});

// Track conversations
analytics.startConversation('conv-1', 'openai');
analytics.trackMessage('conv-1', 50, 'user');
analytics.trackMessage('conv-1', 200, 'assistant');
analytics.endConversation('conv-1', true);

// Track provider usage
analytics.trackProviderRequest('openai', 150, true, 500);

// Track proactive behavior
analytics.trackProactiveSuggestion('sugg-1', { intrusionLevel: 'low' });
analytics.trackProactiveAcceptance('sugg-1', 5000);

// Get statistics
const featureStats = analytics.getFeatureAdoptionStats();
const conversationStats = analytics.getConversationStats();
const proactiveMetrics = analytics.getProactiveMetrics();
```

### 4. ErrorTracking

Automatic error capture with context preservation.

**Key Features:**
- Automatic error capture
- Error grouping and deduplication
- Breadcrumb trails
- Severity classification
- Recovery tracking

**Basic Usage:**

```typescript
import { ErrorTracking, ErrorSeverity } from '@clippyjs/ai/telemetry/ErrorTracking';

const errorTracking = new ErrorTracking(collector, {
  enabled: true,
  captureUnhandled: true,
  captureUnhandledRejections: true,
  maxBreadcrumbs: 50,
  deduplicate: true,
});

// Add breadcrumbs for context
errorTracking.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to settings',
  level: 'info',
});

// Capture errors
const errorId = errorTracking.captureError(error, {
  severity: ErrorSeverity.ERROR,
  context: { endpoint: '/api/chat', method: 'POST' },
  user: { id: 'user-123', sessionId: 'session-456' },
});

// Track recovery
errorTracking.trackRecovery(errorId, true, {
  strategy: 'retry',
  attempts: 2,
});

// Get error groups
const groups = errorTracking.getErrorGroups();
console.log('Top error:', groups[0].count, 'occurrences');

// Get statistics
const stats = errorTracking.getStats();
console.log('Total errors:', stats.totalErrors);
console.log('Unique groups:', stats.uniqueGroups);
```

### 5. HealthCheck

Service status monitoring and dependency health.

**Key Features:**
- Service registration and monitoring
- Automatic periodic health checks
- Dependency health tracking
- Degraded state detection
- Health status reporting

**Basic Usage:**

```typescript
import { HealthCheck, HealthStatus } from '@clippyjs/ai/telemetry/HealthCheck';

const healthCheck = new HealthCheck(collector, {
  enabled: true,
  checkIntervalMs: 60000,
  failureThreshold: 3,
});

// Register services
healthCheck.registerService('api', async () => {
  try {
    const response = await fetch('/api/health');
    return {
      service: 'api',
      status: response.ok ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
      timestamp: Date.now(),
      responseTime: 100,
    };
  } catch (error) {
    return {
      service: 'api',
      status: HealthStatus.UNHEALTHY,
      timestamp: Date.now(),
      message: error.message,
    };
  }
});

// Get health report
const report = await healthCheck.getHealthReport();
console.log('System status:', report.status);
console.log('Uptime:', report.uptime, 'ms');

// Check if system is healthy
const isHealthy = await healthCheck.isHealthy();
```

## Quick Start

### Installation

```bash
# Already included in @clippyjs/ai package
import { TelemetryCollector } from '@clippyjs/ai';
```

### Basic Setup

```typescript
import {
  TelemetryCollector,
  PerformanceMetrics,
  UsageAnalytics,
  ErrorTracking,
  HealthCheck,
} from '@clippyjs/ai/telemetry';

// 1. Initialize collector
const collector = new TelemetryCollector({
  enabled: true,
  transport: 'http',
  endpoint: 'https://analytics.example.com/events',
  redactPII: true,
});

// 2. Initialize subsystems
const performance = new PerformanceMetrics(collector);
const analytics = new UsageAnalytics(collector);
const errors = new ErrorTracking(collector);
const health = new HealthCheck(collector);

// 3. Use throughout application
analytics.trackFeature('chat', 'started');
performance.trackAIOperation({ totalMs: 150, tokens: 500 });

// 4. Cleanup on shutdown
collector.destroy();
performance.destroy();
errors.destroy();
health.destroy();
```

## Configuration

### TelemetryCollector Configuration

```typescript
interface TelemetryConfig {
  enabled?: boolean;              // Enable/disable collection
  sampling?: SamplingStrategy;    // 'always' | 'never' | 'probabilistic' | 'throttled'
  samplingRate?: number;          // 0-1 for probabilistic sampling
  maxBufferSize?: number;         // Max events before flush (default: 50)
  flushIntervalMs?: number;       // Auto-flush interval (default: 30000)
  transport?: TransportBackend;   // 'http' | 'localStorage' | 'console' | 'custom'
  endpoint?: string;              // HTTP endpoint URL
  customTransport?: TransportFunction; // Custom transport function
  redactPII?: boolean;            // Enable PII redaction (default: true)
  redactFields?: string[];        // Additional fields to redact
  debug?: boolean;                // Enable debug logging
  throttleWindowMs?: number;      // Throttle window (default: 60000)
  maxEventsPerWindow?: number;    // Max events per window (default: 100)
}
```

### Performance Targets

- **Telemetry Overhead**: <5% of total execution time
- **Memory Usage**: <2MB for telemetry system
- **Event Buffering**: Max 100 events in memory
- **Flush Interval**: 30 seconds or 50 events
- **Network Payload**: <10KB per flush

### Privacy Configuration

```typescript
const collector = new TelemetryCollector({
  redactPII: true,
  redactFields: [
    'email',
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
  ],
});
```

## Integration Guide

### React Integration

```typescript
import { createContext, useContext, useEffect } from 'react';
import { TelemetryCollector, PerformanceMetrics } from '@clippyjs/ai/telemetry';

const TelemetryContext = createContext<{
  collector: TelemetryCollector;
  performance: PerformanceMetrics;
} | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [telemetry] = useState(() => {
    const collector = new TelemetryCollector({
      enabled: true,
      transport: 'http',
      endpoint: '/api/telemetry',
    });
    const performance = new PerformanceMetrics(collector);
    return { collector, performance };
  });

  useEffect(() => {
    return () => {
      telemetry.collector.destroy();
      telemetry.performance.destroy();
    };
  }, [telemetry]);

  return (
    <TelemetryContext.Provider value={telemetry}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within TelemetryProvider');
  return context;
}
```

### AI System Integration

```typescript
import { AIClippy } from '@clippyjs/ai';
import { TelemetryCollector, PerformanceMetrics } from '@clippyjs/ai/telemetry';

const collector = new TelemetryCollector({ enabled: true });
const performance = new PerformanceMetrics(collector);

const clippy = new AIClippy({
  // ... config
  onRequest: (prompt, context) => {
    performance.mark('ai-request-start');
  },
  onResponse: (response) => {
    performance.mark('ai-request-end');
    const duration = performance.measure(
      'ai-request',
      'ai-request-start',
      'ai-request-end'
    );

    performance.trackAIOperation({
      totalMs: duration,
      tokens: response.usage?.total_tokens,
    });
  },
  onError: (error) => {
    collector.trackError(error, { context: 'ai-request' });
  },
});
```

### Server-Side Integration

```typescript
// Express middleware
import express from 'express';
import { TelemetryCollector } from '@clippyjs/ai/telemetry';

const app = express();
const collector = new TelemetryCollector({
  enabled: true,
  transport: 'custom',
  customTransport: async (events) => {
    // Send to analytics service
    await analyticsService.sendBatch(events);
  },
});

// Middleware to track requests
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    collector.track({
      type: 'http.request',
      timestamp: Date.now(),
      data: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
      },
    });
  });

  next();
});

// Endpoint to receive client telemetry
app.post('/api/telemetry', express.json(), (req, res) => {
  const { events } = req.body;
  events.forEach(event => collector.track(event));
  res.sendStatus(204);
});
```

## Privacy & GDPR Compliance

### PII Redaction

Automatic redaction of personally identifiable information:

```typescript
const collector = new TelemetryCollector({
  redactPII: true,
  redactFields: ['email', 'password', 'token', 'apiKey'],
});

collector.track({
  type: 'user.login',
  timestamp: Date.now(),
  data: {
    email: 'user@example.com',  // Automatically redacted to '[REDACTED]'
    password: 'secret123',       // Automatically redacted
    username: 'john_doe',        // Not redacted
  },
});
```

### PII Pattern Detection

Automatically detects and redacts:
- Email addresses
- Social Security Numbers (SSN)
- Credit card numbers
- Phone numbers

### Opt-In/Opt-Out Support

```typescript
class TelemetryManager {
  private collector: TelemetryCollector;

  constructor() {
    const userConsent = this.getUserConsent();
    this.collector = new TelemetryCollector({
      enabled: userConsent === 'granted',
    });
  }

  updateConsent(consent: 'granted' | 'denied') {
    localStorage.setItem('telemetry-consent', consent);
    this.collector.updateConfig({
      enabled: consent === 'granted',
    });
  }

  private getUserConsent(): string {
    return localStorage.getItem('telemetry-consent') || 'denied';
  }
}
```

### Data Retention

```typescript
// Client-side: Automatic cleanup
const collector = new TelemetryCollector({
  maxBufferSize: 50,  // Limit in-memory storage
});

// Server-side: Implement retention policy
const retentionDays = 90;
const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

database.deleteWhere('timestamp', '<', cutoffDate);
```

### GDPR Rights

Implement data subject rights:

```typescript
// Right to access
app.get('/api/telemetry/user/:userId', async (req, res) => {
  const data = await database.find({ userId: req.params.userId });
  res.json(data);
});

// Right to erasure
app.delete('/api/telemetry/user/:userId', async (req, res) => {
  await database.deleteWhere({ userId: req.params.userId });
  res.sendStatus(204);
});

// Right to data portability
app.get('/api/telemetry/user/:userId/export', async (req, res) => {
  const data = await database.find({ userId: req.params.userId });
  res.json({ format: 'json', data });
});
```

## Performance Considerations

### Overhead Measurement

```typescript
const collector = new TelemetryCollector({
  enabled: true,
  debug: true,
});

// Measure telemetry overhead
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  collector.track({
    type: 'test.event',
    timestamp: Date.now(),
    data: { index: i },
  });
}
const duration = performance.now() - start;
console.log('Overhead per event:', duration / 1000, 'ms');
```

### Memory Management

```typescript
// Monitor memory usage
const metrics = new PerformanceMetrics(collector);
const resources = metrics.getResourceMetrics();
console.log('Memory usage:', resources.memoryUsage, 'bytes');

// Limit buffer size
const collector = new TelemetryCollector({
  maxBufferSize: 50,  // Prevents unbounded growth
  flushIntervalMs: 30000,  // Regular flushing
});
```

### Sampling for High-Volume Events

```typescript
// Use probabilistic sampling for high-frequency events
const collector = new TelemetryCollector({
  sampling: 'probabilistic',
  samplingRate: 0.1,  // Sample 10% of events
});

// Or use throttling
const collector = new TelemetryCollector({
  sampling: 'throttled',
  maxEventsPerWindow: 100,  // Max 100 events per minute
  throttleWindowMs: 60000,
});
```

## Best Practices

### 1. Initialize Early

```typescript
// Initialize telemetry before other systems
const telemetry = initializeTelemetry();
const app = initializeApp(telemetry);
```

### 2. Use Structured Events

```typescript
// Good: Structured event
collector.track({
  type: 'feature.interaction',
  timestamp: Date.now(),
  data: {
    feature: 'proactive-suggestions',
    action: 'accepted',
    suggestionId: 'sugg-123',
  },
});

// Bad: Unstructured event
collector.track({
  type: 'event',
  timestamp: Date.now(),
  data: { message: 'User did something' },
});
```

### 3. Add Context to Errors

```typescript
errors.addBreadcrumb({
  category: 'navigation',
  message: 'Navigated to chat page',
  level: 'info',
});

errors.addBreadcrumb({
  category: 'user-action',
  message: 'Clicked send button',
  level: 'info',
  data: { messageLength: 150 },
});

// Error will include breadcrumb trail
errors.captureError(error);
```

### 4. Monitor Health Proactively

```typescript
// Register critical services
healthCheck.registerService('database', checkDatabase);
healthCheck.registerService('api', checkAPI);
healthCheck.registerService('cache', checkCache);

// Alert on degradation
setInterval(async () => {
  const report = await healthCheck.getHealthReport();
  if (report.status === HealthStatus.DEGRADED) {
    alertOps('System degraded', report);
  }
}, 60000);
```

### 5. Clean Up Resources

```typescript
// Application shutdown
process.on('SIGTERM', async () => {
  await collector.flush();  // Flush remaining events
  collector.destroy();
  performance.destroy();
  errors.destroy();
  health.destroy();
});
```

## Troubleshooting

### Events Not Being Sent

1. Check if telemetry is enabled:
```typescript
const config = collector.getConfig();
console.log('Enabled:', config.enabled);
```

2. Check buffer status:
```typescript
const status = collector.getBufferStatus();
console.log('Buffer size:', status.size, '/', status.maxSize);
```

3. Manually flush:
```typescript
await collector.flush();
```

### High Memory Usage

1. Reduce buffer size:
```typescript
collector.updateConfig({ maxBufferSize: 25 });
```

2. Increase flush frequency:
```typescript
collector.updateConfig({ flushIntervalMs: 15000 });
```

3. Enable sampling:
```typescript
collector.updateConfig({
  sampling: 'probabilistic',
  samplingRate: 0.5,
});
```

### Performance Impact

1. Measure overhead:
```typescript
const start = performance.now();
collector.track(event);
const overhead = performance.now() - start;
console.log('Overhead:', overhead, 'ms');
```

2. Use sampling for high-frequency events
3. Disable debug mode in production

### Transport Failures

1. Check endpoint configuration:
```typescript
const config = collector.getConfig();
console.log('Endpoint:', config.endpoint);
```

2. Implement retry logic:
```typescript
const customTransport = async (events) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      await sendEvents(events);
      return;
    } catch (error) {
      attempts++;
      if (attempts === 3) throw error;
      await sleep(1000 * attempts);
    }
  }
};
```

### Debug Mode

Enable detailed logging:
```typescript
const collector = new TelemetryCollector({
  debug: true,  // Enables console logging
});
```

## API Reference

See individual component documentation:
- [TelemetryCollector API](./api/TelemetryCollector.md)
- [PerformanceMetrics API](./api/PerformanceMetrics.md)
- [UsageAnalytics API](./api/UsageAnalytics.md)
- [ErrorTracking API](./api/ErrorTracking.md)
- [HealthCheck API](./api/HealthCheck.md)

## Examples

See [examples directory](../examples/telemetry/) for complete implementations:
- Basic telemetry setup
- React integration
- Express server integration
- Custom transport implementation
- Privacy-compliant configuration

---

**Version**: 0.7.0
**Last Updated**: 2025-11-04
**Sprint**: 5 - Production Readiness
