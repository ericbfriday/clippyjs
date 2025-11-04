# Error Recovery and Resilience System

**Version:** 0.7.0
**Sprint:** Sprint 5 - Production Readiness

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Advanced Retry Policy](#advanced-retry-policy)
5. [Enhanced Circuit Breaker](#enhanced-circuit-breaker)
6. [Degradation Manager](#degradation-manager)
7. [Fallback Strategies](#fallback-strategies)
8. [Recovery Coordinator](#recovery-coordinator)
9. [React Error Boundary](#react-error-boundary)
10. [Integration Patterns](#integration-patterns)
11. [Best Practices](#best-practices)
12. [Performance Characteristics](#performance-characteristics)
13. [Monitoring and Telemetry](#monitoring-and-telemetry)

## Overview

The Error Recovery and Resilience System provides production-grade fault tolerance through coordinated error handling, graceful degradation, and intelligent recovery strategies. Built on Sprint 4's error handling foundation, this system extends capabilities with adaptive behavior, dependency management, and comprehensive telemetry.

### Key Features

- **Adaptive Retry Policies**: Intelligent backoff with retry budgets and circuit breaker integration
- **Enhanced Circuit Breakers**: Health-scored circuit management with adaptive thresholds
- **Graceful Degradation**: Automatic feature fallback with dependency awareness
- **Recovery Coordination**: Centralized recovery orchestration across services
- **Comprehensive Telemetry**: Detailed metrics and event tracking for monitoring

### Design Principles

1. **Fail Fast, Recover Gracefully**: Detect failures quickly, recover intelligently
2. **Dependency Awareness**: Understand and respect service dependencies
3. **Adaptive Behavior**: Learn from patterns and adjust strategies
4. **Observable Systems**: Comprehensive metrics for monitoring and debugging
5. **Non-Breaking Integration**: Extends existing systems without breaking changes

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
├─────────────────────────────────────────────────────────────┤
│  React Error Boundary  │  Service Clients  │  UI Components │
├─────────────────────────────────────────────────────────────┤
│                   Recovery Coordinator                       │
│  ┌─────────────┬──────────────────┬────────────────────┐   │
│  │ Dependency  │  Priority        │  Strategy          │   │
│  │ Management  │  Orchestration   │  Selection         │   │
│  └─────────────┴──────────────────┴────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│               Degradation Manager                            │
│  ┌─────────────┬──────────────────┬────────────────────┐   │
│  │ Feature     │  Fallback        │  Auto              │   │
│  │ Registry    │  Strategies      │  Recovery          │   │
│  └─────────────┴──────────────────┴────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Advanced Retry Policy  │  Enhanced Circuit Breaker         │
│  ┌──────────────────┐   │  ┌──────────────────────────┐   │
│  │ Retry Budget     │   │  │ Health Metrics           │   │
│  │ Adaptive Backoff │   │  │ Adaptive Thresholds      │   │
│  │ CB Integration   │   │  │ Gradual Recovery         │   │
│  └──────────────────┘   │  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Request → Retry Policy → Circuit Breaker → Service
                ↓              ↓              ↓
              Metrics      Health Score    Success/Fail
                ↓              ↓              ↓
         Budget Check    Threshold Check   Record Result
                ↓              ↓              ↓
          Telemetry ← Recovery Coordinator → Degradation Manager
```

## Components

### Advanced Retry Policy

Extends Sprint 4's `RetryPolicy` with production-grade features:

**Key Features:**
- Retry budgets to prevent retry storms
- Circuit breaker coordination
- Adaptive backoff based on success rates
- Per-operation configuration
- Comprehensive metrics tracking

**Location:** `packages/ai/src/resilience/AdvancedRetryPolicy.ts`

### Enhanced Circuit Breaker

Extends Sprint 4's `CircuitBreaker` with adaptive behavior:

**Key Features:**
- Health score tracking (0-100)
- Adaptive failure thresholds
- Adaptive timeout adjustment
- Half-open gradual recovery
- Response time tracking

**Location:** `packages/ai/src/resilience/EnhancedCircuitBreaker.ts`

### Degradation Manager

Coordinates graceful degradation across features:

**Key Features:**
- Feature registry with fallbacks
- Dependency-aware degradation
- Multiple degradation levels
- Automatic recovery coordination
- Event history tracking

**Location:** `packages/ai/src/resilience/DegradationManager.ts`

### Fallback Strategies

Reusable fallback patterns:

**Key Features:**
- Cache-based fallbacks
- Static response fallbacks
- Chained fallback strategies
- Rate-limited fallbacks
- Manual override support

**Location:** `packages/ai/src/resilience/FallbackStrategies.ts`

### Recovery Coordinator

Centralized recovery orchestration:

**Key Features:**
- Dependency-aware recovery
- Multiple recovery strategies
- Priority-based ordering
- Concurrent recovery limits
- Comprehensive status reporting

**Location:** `packages/ai/src/resilience/RecoveryCoordinator.ts`

### React Error Boundary

Production-ready error boundary component:

**Key Features:**
- Customizable fallback UI
- Error recovery with retry
- Error loop detection
- Telemetry integration
- Isolation key support

**Location:** `packages/ai/src/react/ErrorBoundary.tsx`

## Advanced Retry Policy

### Basic Usage

```typescript
import { AdvancedRetryPolicy } from '@clippyjs/ai/resilience';

const policy = new AdvancedRetryPolicy({
  name: 'api-client',
  maxRetries: 3,
  initialDelay: 1000,
  retryBudget: 50,
  budgetWindow: 30000,
  adaptiveBackoff: true,
});

// Execute with retry
const result = await policy.executeAdvanced(
  async (attempt) => {
    console.log(`Attempt ${attempt.attempt}`);
    return await apiCall();
  }
);
```

### With Circuit Breaker

```typescript
import { EnhancedCircuitBreaker } from '@clippyjs/ai/resilience';

const circuitBreaker = new EnhancedCircuitBreaker({
  name: 'api-circuit',
});

const result = await policy.executeAdvanced(
  async () => await apiCall(),
  errorType,
  circuitBreaker
);
```

### Configuration Options

```typescript
interface AdvancedRetryConfig extends RetryPolicyConfig {
  // Retry budget
  retryBudget?: number;           // Max retries per window
  budgetWindow?: number;          // Window duration (ms)

  // Circuit breaker integration
  circuitBreakerIntegration?: boolean;

  // Adaptive backoff
  adaptiveBackoff?: boolean;
  adaptiveThreshold?: number;     // Success rate threshold (0-1)

  // Identification
  name?: string;
  telemetryEnabled?: boolean;
}
```

### Metrics

```typescript
const metrics = policy.getMetrics();
console.log({
  totalAttempts: metrics.totalAttempts,
  successfulRetries: metrics.successfulRetries,
  failedRetries: metrics.failedRetries,
  budgetExhausted: metrics.budgetExhausted,
  circuitBreakerTrips: metrics.circuitBreakerTrips,
  averageDelay: metrics.averageDelay,
  successRate: metrics.successRate,
});
```

### Adaptive State

```typescript
const adaptiveState = policy.getAdaptiveState();
console.log({
  backoffMultiplier: adaptiveState.backoffMultiplier, // 0.5-2.0
  successCount: adaptiveState.successCount,
  failureCount: adaptiveState.failureCount,
});
```

## Enhanced Circuit Breaker

### Basic Usage

```typescript
import { EnhancedCircuitBreaker } from '@clippyjs/ai/resilience';

const circuit = new EnhancedCircuitBreaker({
  name: 'api-circuit',
  failureThreshold: 0.5,
  requestThreshold: 10,
  adaptiveThresholds: true,
  healthScoreEnabled: true,
});

// Execute through circuit
const result = await circuit.executeEnhanced(async () => {
  return await apiCall();
});
```

### Health Monitoring

```typescript
const health = circuit.getHealthMetrics();
console.log({
  healthScore: health.healthScore,        // 0-100
  state: health.state,                    // closed/open/half-open
  failureRate: health.failureRate,
  consecutiveFailures: health.consecutiveFailures,
  avgResponseTime: health.avgResponseTime,
  tripCount: health.tripCount,
});
```

### Adaptive Configuration

```typescript
const thresholds = circuit.getAdaptiveThresholds();
console.log({
  currentFailureThreshold: thresholds.currentFailureThreshold,
  currentResetTimeout: thresholds.currentResetTimeout,
  minFailureThreshold: thresholds.minFailureThreshold,
  maxFailureThreshold: thresholds.maxFailureThreshold,
});
```

### State Transitions

```
CLOSED → [Failure threshold exceeded] → OPEN
OPEN → [Reset timeout expired] → HALF-OPEN
HALF-OPEN → [Success rate > 80%] → CLOSED
HALF-OPEN → [Any failure] → OPEN
```

## Degradation Manager

### Basic Usage

```typescript
import { DegradationManager, DegradationLevel } from '@clippyjs/ai/resilience';

const manager = new DegradationManager({
  autoDegrade: true,
  autoRecover: true,
});

// Register features
manager.registerFeature({
  name: 'ai-suggestions',
  dependencies: ['openai-api'],
  fallback: new CachedResponseFallback(getCacheKey),
  priority: 8,
  autoRecover: true,
});

manager.registerFeature({
  name: 'openai-api',
  priority: 10,
});
```

### Manual Degradation

```typescript
// Degrade a feature
await manager.degrade(
  'openai-api',
  DegradationLevel.UNAVAILABLE,
  'API rate limit exceeded'
);

// Recover a feature
await manager.recover('openai-api');
```

### Automatic Fallback

```typescript
// Execute with automatic fallback
const result = await manager.executeWithFallback(
  'ai-suggestions',
  async () => {
    return await openaiClient.complete(prompt);
  }
);
```

### Degradation Levels

```typescript
enum DegradationLevel {
  FULL = 'full',           // Full functionality
  PARTIAL = 'partial',     // Minor features disabled
  MINIMAL = 'minimal',     // Core features only
  UNAVAILABLE = 'unavailable', // Service unavailable
}
```

### Status Monitoring

```typescript
const status = manager.getStatus();
console.log({
  globalLevel: status.globalLevel,
  degradedCount: status.degradedCount,
  unavailableCount: status.unavailableCount,
  healthScore: status.healthScore,    // Weighted by priority
  features: status.features,
});
```

### Event History

```typescript
const history = manager.getHistory(10);
history.forEach(event => {
  console.log({
    type: event.type,              // degraded | recovered
    feature: event.feature,
    level: event.level,
    reason: event.reason,
    timestamp: event.timestamp,
  });
});
```

## Fallback Strategies

### Cached Response Fallback

```typescript
import { CachedResponseFallback } from '@clippyjs/ai/resilience';

const fallback = new CachedResponseFallback(
  () => `user-${userId}`,    // Cache key generator
  100,                        // Max cache size
  3600000,                   // TTL (1 hour)
  0.8                        // Quality score
);

// Store responses in cache
fallback.store(response);

// Use in degradation manager
manager.registerFeature({
  name: 'api-feature',
  fallback,
});
```

### Static Response Fallback

```typescript
import { StaticResponseFallback } from '@clippyjs/ai/resilience';

const fallback = new StaticResponseFallback(
  { message: 'Service temporarily unavailable' },
  0.5  // Quality score
);
```

### Degraded Service Fallback

```typescript
import { DegradedServiceFallback } from '@clippyjs/ai/resilience';

const fallback = new DegradedServiceFallback(
  async () => {
    // Use faster, less accurate model
    return await fastModel.complete(prompt);
  },
  async () => await fastModel.checkHealth(),
  0.6  // Quality score
);
```

### Chained Fallback

```typescript
import { ChainedFallback } from '@clippyjs/ai/resilience';

const fallback = new ChainedFallback([
  cachedFallback,           // Try cache first
  degradedServiceFallback,  // Then degraded service
  staticFallback,           // Finally static response
]);
```

### Rate-Limited Fallback

```typescript
import { RateLimitedFallback } from '@clippyjs/ai/resilience';

const fallback = new RateLimitedFallback(
  baseFallback,
  10,    // Max 10 tokens
  1      // Refill 1 token per second
);
```

### Manual Override Fallback

```typescript
import { ManualOverrideFallback } from '@clippyjs/ai/resilience';

const fallback = new ManualOverrideFallback(baseFallback);

// Activate override
fallback.activateOverride({ message: 'Manual override active' });

// Deactivate override
fallback.deactivateOverride();
```

## Recovery Coordinator

### Basic Usage

```typescript
import { RecoveryCoordinator, RecoveryStrategy } from '@clippyjs/ai/resilience';

const coordinator = new RecoveryCoordinator({
  autoRecover: true,
  checkInterval: 30000,
  maxConcurrentRecoveries: 3,
});

// Register services
coordinator.registerService({
  name: 'database',
  circuitBreaker: dbCircuit,
  retryPolicy: dbRetry,
  healthCheck: async () => await db.ping(),
  priority: 10,
  strategy: RecoveryStrategy.GRADUAL,
});

coordinator.registerService({
  name: 'api-service',
  dependencies: ['database'],
  circuitBreaker: apiCircuit,
  healthCheck: async () => await api.health(),
  priority: 8,
  strategy: RecoveryStrategy.COORDINATED,
});
```

### Manual Recovery

```typescript
// Attempt recovery
const success = await coordinator.recoverService('api-service');

if (success) {
  console.log('Service recovered successfully');
} else {
  console.log('Recovery failed');
}
```

### Recovery Strategies

```typescript
enum RecoveryStrategy {
  IMMEDIATE = 'immediate',    // Reset and validate immediately
  GRADUAL = 'gradual',        // Test before full recovery
  COORDINATED = 'coordinated', // Wait for dependencies
  MANUAL = 'manual',          // Manual recovery only
}
```

### Status Monitoring

```typescript
// Single service status
const status = coordinator.getStatus('api-service');
console.log({
  state: status.state,              // healthy | recovering | failed | degraded
  attemptCount: status.attemptCount,
  lastSuccess: status.lastSuccess,
  lastFailure: status.lastFailure,
  dependenciesHealthy: status.dependenciesHealthy,
  circuitState: status.circuitState,
  healthScore: status.healthScore,
});

// All services status
const allStatus = coordinator.getAllStatus();
```

### Event History

```typescript
const history = coordinator.getHistory(20);
history.forEach(event => {
  console.log({
    type: event.type,          // started | succeeded | failed
    service: event.service,
    timestamp: event.timestamp,
    details: event.details,
    metrics: event.metrics,
  });
});
```

## React Error Boundary

### Basic Usage

```tsx
import { ErrorBoundary } from '@clippyjs/ai/react';

function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Error caught:', error);
        reportError(error, errorInfo);
      }}
      showReset={true}
    >
      <MyApplication />
    </ErrorBoundary>
  );
}
```

### Custom Fallback

```tsx
<ErrorBoundary
  fallback={(error, errorInfo) => (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )}
>
  <MyComponent />
</ErrorBoundary>
```

### With Isolation Key

```tsx
function UserProfile({ userId }: { userId: string }) {
  return (
    <ErrorBoundary
      isolationKey={userId}  // Reset when userId changes
      onReset={() => refetchUserData()}
    >
      <UserDetails userId={userId} />
    </ErrorBoundary>
  );
}
```

### Higher-Order Component

```tsx
import { withErrorBoundary } from '@clippyjs/ai/react';

const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <ErrorFallback />,
  onError: (error) => reportError(error),
});
```

### Error Handler Hook

```tsx
import { useErrorHandler } from '@clippyjs/ai/react';

function MyComponent() {
  const handleError = useErrorHandler();

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      // Throw to nearest error boundary
      handleError(error as Error);
    }
  };

  return <button onClick={handleClick}>Do Something</button>;
}
```

## Integration Patterns

### Full Stack Integration

```typescript
// Initialize all resilience components
const retryPolicy = new AdvancedRetryPolicy({
  name: 'openai-retry',
  retryBudget: 50,
  adaptiveBackoff: true,
});

const circuitBreaker = new EnhancedCircuitBreaker({
  name: 'openai-circuit',
  adaptiveThresholds: true,
  healthScoreEnabled: true,
});

const degradationManager = new DegradationManager({
  autoDegrade: true,
  autoRecover: true,
});

const coordinator = new RecoveryCoordinator(
  {
    autoRecover: true,
    checkInterval: 30000,
  },
  degradationManager
);

// Register features and services
degradationManager.registerFeature({
  name: 'openai-api',
  fallback: new CachedResponseFallback(() => 'cache-key'),
  priority: 10,
});

coordinator.registerService({
  name: 'openai-api',
  circuitBreaker,
  retryPolicy,
  healthCheck: async () => await openai.checkHealth(),
  strategy: RecoveryStrategy.GRADUAL,
});

// Use in application
async function makeAIRequest(prompt: string) {
  return await degradationManager.executeWithFallback(
    'openai-api',
    async () => {
      return await retryPolicy.executeAdvanced(
        async () => {
          return await circuitBreaker.executeEnhanced(async () => {
            return await openai.complete(prompt);
          });
        },
        undefined,
        circuitBreaker
      );
    }
  );
}
```

### React Integration

```tsx
import { ErrorBoundary } from '@clippyjs/ai/react';
import { DegradationManager } from '@clippyjs/ai/resilience';

function App() {
  const degradationManager = useMemo(() => new DegradationManager({
    autoDegrade: true,
    onDegradationEvent: (event) => {
      console.log('Degradation event:', event);
    },
  }), []);

  return (
    <ErrorBoundary
      fallback={<AppErrorFallback />}
      onError={(error) => {
        // Automatically degrade on component errors
        degradationManager.degrade(
          'ui-components',
          DegradationLevel.PARTIAL,
          error.message
        );
      }}
    >
      <DegradationContext.Provider value={degradationManager}>
        <Application />
      </DegradationContext.Provider>
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Retry Policy Configuration

**Do:**
- Set appropriate retry budgets to prevent storms
- Use adaptive backoff for variable load
- Configure per-error-type policies
- Integrate with circuit breakers

**Don't:**
- Set unlimited retries
- Use fixed delays for all scenarios
- Ignore retry budget exhaustion
- Skip timeout configuration

### 2. Circuit Breaker Usage

**Do:**
- Enable health score tracking
- Use adaptive thresholds for variable traffic
- Monitor trip count and reset patterns
- Configure appropriate reset timeouts

**Don't:**
- Set failure thresholds too low (< 0.3)
- Ignore half-open state behavior
- Skip health check implementation
- Forget to clean up on destroy

### 3. Degradation Strategy

**Do:**
- Define clear degradation levels
- Implement quality-aware fallbacks
- Use priority-based health scoring
- Track degradation history

**Don't:**
- Degrade without fallbacks
- Ignore dependency cascades
- Skip auto-recovery configuration
- Forget to register features

### 4. Recovery Coordination

**Do:**
- Respect service dependencies
- Use priority-based recovery
- Implement health checks
- Monitor recovery attempts

**Don't:**
- Exceed max recovery attempts
- Skip dependency validation
- Use immediate recovery for critical services
- Ignore concurrent recovery limits

### 5. Error Boundary Placement

**Do:**
- Place at component tree boundaries
- Use isolation keys for dynamic content
- Implement custom fallback UI
- Report errors to telemetry

**Don't:**
- Wrap every small component
- Ignore error loop detection
- Skip onReset callbacks
- Forget cleanup in unmount

## Performance Characteristics

### Advanced Retry Policy

- **Retry budget check**: < 1ms
- **Adaptive backoff calculation**: < 1ms
- **Circuit breaker coordination**: < 1ms
- **Metrics update**: < 0.5ms

### Enhanced Circuit Breaker

- **State check**: < 0.5ms
- **Health score calculation**: < 1ms
- **Threshold adjustment**: < 1ms
- **Metrics aggregation**: < 2ms

### Degradation Manager

- **Degradation detection**: < 100ms
- **Fallback execution**: Variable (depends on fallback)
- **Dependency check**: < 5ms per dependency
- **Status calculation**: < 10ms

### Recovery Coordinator

- **Recovery initiation**: < 200ms
- **Dependency validation**: < 10ms per dependency
- **Health check**: Variable (depends on service)
- **Status aggregation**: < 20ms

## Monitoring and Telemetry

### Key Metrics to Track

**Retry Policy:**
```typescript
{
  totalAttempts: number,
  successfulRetries: number,
  failedRetries: number,
  budgetExhausted: number,
  circuitBreakerTrips: number,
  averageDelay: number,
  successRate: number,
}
```

**Circuit Breaker:**
```typescript
{
  healthScore: number,      // 0-100
  state: CircuitState,
  failureRate: number,
  tripCount: number,
  avgResponseTime: number,
  consecutiveFailures: number,
}
```

**Degradation Manager:**
```typescript
{
  globalLevel: DegradationLevel,
  degradedCount: number,
  unavailableCount: number,
  healthScore: number,      // Weighted by priority
}
```

**Recovery Coordinator:**
```typescript
{
  state: RecoveryState,
  attemptCount: number,
  lastSuccess: number,
  lastFailure: number,
  dependenciesHealthy: boolean,
}
```

### Dashboard Integration

```typescript
// Collect all metrics
const metrics = {
  retry: retryPolicy.getMetrics(),
  circuit: circuitBreaker.getHealthMetrics(),
  degradation: degradationManager.getStatus(),
  recovery: coordinator.getAllStatus(),
};

// Send to monitoring system
await telemetry.report('resilience-metrics', metrics);
```

### Alerting Thresholds

**Critical:**
- Circuit breaker health score < 30
- Retry budget exhaustion rate > 50%
- Multiple services in UNAVAILABLE state
- Recovery failure rate > 80%

**Warning:**
- Circuit breaker health score < 70
- Degradation level = MINIMAL
- Recovery attempts > 3
- Retry success rate < 50%

## Troubleshooting

### High Retry Budget Exhaustion

**Symptoms:** Frequent "Retry budget exhausted" errors

**Solutions:**
1. Increase `retryBudget` or `budgetWindow`
2. Investigate root cause of failures
3. Enable circuit breaker integration
4. Implement fallback strategies

### Circuit Breaker Constantly Open

**Symptoms:** Circuit remains in open state

**Solutions:**
1. Check health check implementation
2. Verify reset timeout configuration
3. Review failure threshold settings
4. Enable adaptive thresholds

### Degradation Cascade

**Symptoms:** Many features degrade simultaneously

**Solutions:**
1. Review dependency graph
2. Implement priority-based degradation
3. Add isolation between features
4. Configure independent fallbacks

### Recovery Loop

**Symptoms:** Service repeatedly fails recovery

**Solutions:**
1. Increase `maxRecoveryAttempts`
2. Use GRADUAL or COORDINATED strategy
3. Verify health check accuracy
4. Check dependency health

## Conclusion

The Error Recovery and Resilience System provides comprehensive fault tolerance for production environments. By combining adaptive retry policies, intelligent circuit breakers, graceful degradation, and coordinated recovery, applications can maintain availability and user experience even during partial failures.

Key takeaways:
1. Use retry budgets to prevent storms
2. Enable adaptive behavior for variable load
3. Implement quality-aware fallbacks
4. Monitor health metrics continuously
5. Coordinate recovery across dependencies

For additional support and examples, see:
- Test files in `tests/unit/resilience/`
- Integration examples in application code
- Performance benchmarks in test results
