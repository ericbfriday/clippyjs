# Context Providers

## Overview

Context providers are the foundation of ClippyJS's intelligent assistance system. They gather information about the user's current environment, actions, and state, enabling the AI to provide relevant, context-aware responses.

A context provider is a modular component that:
- **Gathers** specific types of environmental information
- **Formats** data in a consistent structure
- **Respects** privacy and performance constraints
- **Integrates** seamlessly with the Context Manager

## Built-in Providers

ClippyJS includes six built-in context providers that cover the most common use cases:

### ViewportContextProvider

Gathers information about the user's viewport and viewing context.

**Features**:
- Screen dimensions (width, height)
- Device pixel ratio
- Orientation (portrait/landscape)
- Scroll position (x, y, percentage)
- Visible area bounds
- Touch capability detection

**Usage**:
```typescript
import { ViewportContextProvider } from '@clippyjs/ai';

const provider = new ViewportContextProvider();
const context = await provider.gather();

console.log(context);
// {
//   type: 'viewport',
//   timestamp: 1699123456789,
//   data: {
//     viewport: {
//       width: 1920,
//       height: 1080,
//       devicePixelRatio: 2,
//       orientation: 'landscape'
//     },
//     scroll: {
//       x: 0,
//       y: 500,
//       maxX: 0,
//       maxY: 2000,
//       percentX: 0,
//       percentY: 25
//     },
//     touch: false
//   }
// }
```

**When to Use**:
- Layout and responsive design questions
- Scroll-based interactions
- Device-specific optimizations
- Viewport-relative positioning

---

### PerformanceContextProvider

Gathers web performance metrics to help diagnose and optimize page performance.

**Features**:
- Page load metrics (DOMContentLoaded, load time)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Memory usage (if available)
- Network information (connection type, speed)

**Usage**:
```typescript
import { PerformanceContextProvider } from '@clippyjs/ai';

const provider = new PerformanceContextProvider();
const context = await provider.gather();

console.log(context);
// {
//   type: 'performance',
//   timestamp: 1699123456789,
//   data: {
//     navigation: {
//       domContentLoaded: 245,
//       loadComplete: 1250,
//       redirectCount: 0
//     },
//     paint: {
//       fcp: 450,
//       lcp: 890
//     },
//     vitals: {
//       cls: 0.05,
//       fid: 12
//     },
//     memory: {
//       used: 45.2,
//       total: 128
//     },
//     network: {
//       type: '4g',
//       effectiveType: '4g',
//       downlink: 10
//     }
//   }
// }
```

**When to Use**:
- Performance troubleshooting
- Slow page load issues
- Core Web Vitals optimization
- Network-related problems

---

### FormStateContextProvider

Gathers information about forms on the page, including validation state and completion status.

**Features**:
- Form field values (sanitized for privacy)
- Validation state (valid, invalid, errors)
- Focused field information
- Form completion percentage
- Required field status
- Error messages (generic, not values)

**Privacy Protection**:
- Automatically redacts sensitive fields (passwords, SSN, credit cards)
- Sanitizes user input before including in context
- Never includes raw values for sensitive field types

**Usage**:
```typescript
import { FormStateContextProvider } from '@clippyjs/ai';

const provider = new FormStateContextProvider();
const context = await provider.gather();

console.log(context);
// {
//   type: 'form',
//   timestamp: 1699123456789,
//   data: {
//     forms: [
//       {
//         id: 'contact-form',
//         fields: [
//           {
//             name: 'email',
//             type: 'email',
//             value: 'user@example.com',
//             valid: true,
//             required: true,
//             filled: true
//           },
//           {
//             name: 'password',
//             type: 'password',
//             value: '[REDACTED]',
//             valid: true,
//             required: true,
//             filled: true
//           }
//         ],
//         validation: {
//           valid: false,
//           errors: ['Email format is invalid']
//         },
//         completion: 0.67,
//         focused: true
//       }
//     ]
//   }
// }
```

**When to Use**:
- Form validation assistance
- Field-level help
- Completion guidance
- Error resolution

---

### NavigationContextProvider

Tracks navigation state and routing information.

**Features**:
- Current URL and route parameters
- Navigation history (last 5 pages)
- Referrer information
- Route pattern matching
- Query parameters
- Hash/anchor information

**Usage**:
```typescript
import { NavigationContextProvider } from '@clippyjs/ai';

const provider = new NavigationContextProvider();
const context = await provider.gather();

console.log(context);
// {
//   type: 'navigation',
//   timestamp: 1699123456789,
//   data: {
//     current: {
//       url: 'https://example.com/products/123',
//       pathname: '/products/123',
//       search: '?sort=price&order=asc',
//       hash: '#reviews',
//       params: {
//         sort: 'price',
//         order: 'asc'
//       }
//     },
//     history: [
//       'https://example.com/',
//       'https://example.com/products',
//       'https://example.com/products/123'
//     ],
//     referrer: 'https://google.com/search?q=...'
//   }
// }
```

**When to Use**:
- Route-specific assistance
- Navigation help
- Parameter-based guidance
- Multi-page workflows

---

### DOMContextProvider

Captures DOM structure and element information (existing provider).

**Features**:
- Element hierarchy
- Interactive elements
- ARIA attributes
- Visible content
- Element relationships

**Usage**:
```typescript
import { DOMContextProvider } from '@clippyjs/ai';

const provider = new DOMContextProvider();
const context = await provider.gather();
```

**When to Use**:
- Element-specific help
- Accessibility guidance
- DOM manipulation assistance
- Structure-based queries

---

### UserActionContextProvider

Tracks user interactions and actions (existing provider).

**Features**:
- Recent user actions
- Click targets
- Input events
- Interaction patterns
- Focus changes

**Usage**:
```typescript
import { UserActionContextProvider } from '@clippyjs/ai';

const provider = new UserActionContextProvider();
const context = await provider.gather();
```

**When to Use**:
- Action-based assistance
- Workflow guidance
- Interaction troubleshooting
- User intent detection

---

## Creating Custom Providers

Building a custom context provider is straightforward. Follow these steps to create your own provider.

### Step 1: Implement the ContextProvider Interface

```typescript
import type { ContextProvider, ContextData } from '@clippyjs/ai';

export class CustomContextProvider implements ContextProvider {
  readonly name = 'custom';

  async gather(): Promise<ContextData> {
    // Your implementation here
    return {
      type: 'custom',
      timestamp: Date.now(),
      data: {
        // Your context data
      },
    };
  }

  shouldRefresh?(cached: ContextData): boolean {
    // Optional: Determine if cached context should be refreshed
    const age = Date.now() - cached.timestamp;
    return age > 60000; // Refresh after 1 minute
  }

  destroy?(): void {
    // Optional: Clean up resources
  }
}
```

### Step 2: Gather Context Data

Your `gather()` method should collect relevant information efficiently:

```typescript
export class ThemeContextProvider implements ContextProvider {
  readonly name = 'theme';

  async gather(): Promise<ContextData> {
    // Gather theme information
    const isDark = document.documentElement.classList.contains('dark');
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color');

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches ? 'dark' : 'light';

    return {
      type: 'theme',
      timestamp: Date.now(),
      data: {
        mode: isDark ? 'dark' : 'light',
        systemPreference: colorScheme,
        colors: {
          primary: primaryColor,
        },
        // Add more theme data as needed
      },
    };
  }

  shouldRefresh(cached: ContextData): boolean {
    // Theme changes are relatively infrequent
    const age = Date.now() - cached.timestamp;
    return age > 300000; // Refresh after 5 minutes
  }
}
```

### Step 3: Register with ContextManager

```typescript
import { ContextManager } from '@clippyjs/ai';
import { ThemeContextProvider } from './ThemeContextProvider';

const manager = new ContextManager();

// Register your custom provider
manager.registerProvider('theme', new ThemeContextProvider());

// Use it
const context = await manager.gatherContext({
  providerIds: ['theme', 'viewport'], // Include your provider
});
```

---

## Advanced Example: LocalStorage Context Provider

Here's a complete example of a custom provider that gathers relevant localStorage data:

```typescript
import type { ContextProvider, ContextData } from '@clippyjs/ai';

export interface LocalStorageData {
  keys: string[];
  relevantData: Record<string, any>;
  storageSize: number;
  availableSpace: number;
}

export class LocalStorageContextProvider implements ContextProvider {
  readonly name = 'localstorage';

  // Keys to include in context (customize based on your app)
  private readonly relevantKeys = [
    'user-preferences',
    'theme',
    'language',
    'recent-searches',
  ];

  async gather(): Promise<ContextData> {
    try {
      const data: LocalStorageData = {
        keys: [],
        relevantData: {},
        storageSize: 0,
        availableSpace: 0,
      };

      // Gather all keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data.keys.push(key);
        }
      }

      // Gather relevant data
      for (const key of this.relevantKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data.relevantData[key] = JSON.parse(value);
          } catch {
            data.relevantData[key] = value;
          }
        }
      }

      // Calculate storage usage
      const allData = JSON.stringify(localStorage);
      data.storageSize = new Blob([allData]).size;
      data.availableSpace = 5 * 1024 * 1024 - data.storageSize; // ~5MB limit

      return {
        type: 'localstorage',
        timestamp: Date.now(),
        data,
      };
    } catch (error) {
      // Handle errors gracefully
      console.error('LocalStorage context gathering failed:', error);

      return {
        type: 'localstorage',
        timestamp: Date.now(),
        data: {
          keys: [],
          relevantData: {},
          storageSize: 0,
          availableSpace: 0,
        },
      };
    }
  }

  shouldRefresh(cached: ContextData): boolean {
    // LocalStorage changes are relatively infrequent
    const age = Date.now() - cached.timestamp;
    return age > 120000; // Refresh after 2 minutes
  }

  destroy(): void {
    // No cleanup needed for localStorage provider
  }
}
```

**Usage**:
```typescript
const manager = new ContextManager();
manager.registerProvider('localstorage', new LocalStorageContextProvider());

const context = await manager.gatherContext({
  providerIds: ['localstorage'],
});
```

---

## Best Practices

### Performance

**Keep gathering time under 20ms per provider**:
```typescript
async gather(): Promise<ContextData> {
  const startTime = performance.now();

  // Your gathering logic
  const data = await this.gatherData();

  const duration = performance.now() - startTime;
  if (duration > 20) {
    console.warn(`Provider ${this.name} took ${duration}ms`);
  }

  return {
    type: this.name,
    timestamp: Date.now(),
    data,
  };
}
```

**Cache expensive operations**:
```typescript
export class ExpensiveContextProvider implements ContextProvider {
  private cache: any = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  async gather(): Promise<ContextData> {
    const now = Date.now();

    // Use cache if fresh
    if (this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
      return {
        type: this.name,
        timestamp: this.cacheTime,
        data: this.cache,
      };
    }

    // Expensive operation
    const data = await this.expensiveGathering();

    // Update cache
    this.cache = data;
    this.cacheTime = now;

    return {
      type: this.name,
      timestamp: now,
      data,
    };
  }
}
```

**Use efficient DOM queries**:
```typescript
// ❌ Bad: Slow, scans entire DOM
const buttons = document.querySelectorAll('button');

// ✅ Good: Faster, scoped query
const form = document.getElementById('target-form');
const buttons = form?.querySelectorAll('button') ?? [];

// ✅ Better: Cached reference
private formElement: HTMLElement | null = null;

async gather(): Promise<ContextData> {
  if (!this.formElement) {
    this.formElement = document.getElementById('target-form');
  }

  const buttons = this.formElement?.querySelectorAll('button') ?? [];
  // ...
}
```

---

### Privacy

**Never expose sensitive data**:
```typescript
const SENSITIVE_TYPES = [
  'password',
  'ssn',
  'credit-card',
  'cvv',
  'pin',
];

function sanitizeValue(value: string, type: string): string {
  if (SENSITIVE_TYPES.includes(type.toLowerCase())) {
    return value ? '[REDACTED]' : '';
  }
  return value;
}
```

**Sanitize user inputs**:
```typescript
function sanitizeText(text: string): string {
  // Remove potential PII patterns
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{16}\b/g, '[CARD]')
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]');
}
```

**Provide opt-out mechanisms**:
```typescript
export class PrivacyAwareProvider implements ContextProvider {
  constructor(
    private options: {
      includeSensitive?: boolean;
      allowedFields?: string[];
    } = {}
  ) {}

  async gather(): Promise<ContextData> {
    const data = await this.gatherRawData();

    if (!this.options.includeSensitive) {
      return this.sanitizeData(data);
    }

    return data;
  }

  private sanitizeData(data: any): any {
    // Sanitization logic
  }
}
```

---

### Error Handling

**Return partial context on errors**:
```typescript
async gather(): Promise<ContextData> {
  const data: any = {
    basic: null,
    advanced: null,
  };

  try {
    // Safe operation
    data.basic = this.gatherBasic();
  } catch (error) {
    console.error('Basic gathering failed:', error);
    data.basic = this.getDefaultBasic();
  }

  try {
    // Potentially failing operation
    data.advanced = await this.gatherAdvanced();
  } catch (error) {
    console.error('Advanced gathering failed:', error);
    // Continue with partial data
  }

  return {
    type: this.name,
    timestamp: Date.now(),
    data,
  };
}
```

**Never throw exceptions**:
```typescript
// ❌ Bad: Throws on error
async gather(): Promise<ContextData> {
  const element = document.getElementById('required');
  if (!element) {
    throw new Error('Element not found');
  }
  // ...
}

// ✅ Good: Returns default on error
async gather(): Promise<ContextData> {
  const element = document.getElementById('required');
  if (!element) {
    console.warn('Element not found, using defaults');
    return this.getDefaultContext();
  }
  // ...
}
```

**Provide sensible defaults**:
```typescript
private getDefaultContext(): ContextData {
  return {
    type: this.name,
    timestamp: Date.now(),
    data: {
      available: false,
      reason: 'Required element not found',
    },
  };
}
```

---

## Testing Custom Providers

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeContextProvider } from './ThemeContextProvider';

describe('ThemeContextProvider', () => {
  let provider: ThemeContextProvider;

  beforeEach(() => {
    provider = new ThemeContextProvider();

    // Mock DOM environment
    document.documentElement.className = 'dark';
    document.documentElement.style.setProperty('--primary-color', '#007bff');
  });

  afterEach(() => {
    provider.destroy?.();
  });

  it('should gather theme context', async () => {
    const context = await provider.gather();

    expect(context.type).toBe('theme');
    expect(context.timestamp).toBeGreaterThan(0);
    expect(context.data.mode).toBe('dark');
    expect(context.data.colors.primary).toBe('#007bff');
  });

  it('should detect system preference', async () => {
    const context = await provider.gather();

    expect(context.data.systemPreference).toMatch(/^(light|dark)$/);
  });

  it('should refresh after TTL', async () => {
    const context1 = await provider.gather();

    // Mock old timestamp
    const oldContext = {
      ...context1,
      timestamp: Date.now() - 400000, // 6+ minutes old
    };

    expect(provider.shouldRefresh?.(oldContext)).toBe(true);
  });

  it('should not refresh within TTL', async () => {
    const context = await provider.gather();

    expect(provider.shouldRefresh?.(context)).toBe(false);
  });

  it('should handle missing elements gracefully', async () => {
    // Remove theme classes
    document.documentElement.className = '';

    const context = await provider.gather();

    expect(context).toBeDefined();
    expect(context.data.mode).toBe('light'); // Default
  });
});
```

---

## Integration with Context Manager

### Registration

```typescript
import { ContextManager } from '@clippyjs/ai';
import { CustomProvider } from './CustomProvider';

const manager = new ContextManager();

// Register provider
manager.registerProvider('custom', new CustomProvider());

// Verify registration
const stats = manager.getStats();
console.log(`Registered providers: ${stats.providers}`);
```

### Selective Usage

```typescript
// Use only specific providers
const context = await manager.gatherContext({
  providerIds: ['viewport', 'custom'],
});

// Use all except specific providers
manager.disableProvider('performance');
const context = await manager.gatherContext();
```

### Dynamic Management

```typescript
// Enable/disable at runtime
manager.disableProvider('custom');
manager.enableProvider('custom');

// Unregister provider
manager.unregisterProvider('custom');

// Check if provider is registered
if (manager.hasProvider('custom')) {
  // Provider is available
}
```

---

## Troubleshooting

### Provider Not Gathering

**Issue**: Provider returns empty or default data

**Solutions**:
1. Check DOM availability (use `DOMContentLoaded` or `useEffect`)
2. Verify element selectors are correct
3. Check browser console for errors
4. Add debug logging to `gather()` method

```typescript
async gather(): Promise<ContextData> {
  console.log('[CustomProvider] Starting gather...');

  const element = document.getElementById('target');
  if (!element) {
    console.warn('[CustomProvider] Target element not found');
  }

  // ...
}
```

### Performance Issues

**Issue**: Provider is slow, impacting context gathering

**Solutions**:
1. Profile with `performance.now()`
2. Cache expensive operations
3. Reduce DOM queries
4. Use `shouldRefresh()` to avoid unnecessary gathering

```typescript
async gather(): Promise<ContextData> {
  const start = performance.now();

  const data = await this.gatherData();

  const duration = performance.now() - start;
  console.log(`[CustomProvider] Gathered in ${duration}ms`);

  return { type: this.name, timestamp: Date.now(), data };
}
```

### Memory Leaks

**Issue**: Provider causes memory leaks

**Solutions**:
1. Implement `destroy()` method
2. Remove event listeners
3. Clear references
4. Avoid circular references

```typescript
export class EventfulProvider implements ContextProvider {
  private handler = this.handleEvent.bind(this);

  constructor() {
    window.addEventListener('event', this.handler);
  }

  async gather(): Promise<ContextData> {
    // ...
  }

  destroy(): void {
    // Clean up event listeners
    window.removeEventListener('event', this.handler);
  }

  private handleEvent(event: Event): void {
    // Handle event
  }
}
```

---

## API Reference

### ContextProvider Interface

```typescript
interface ContextProvider {
  /** Unique provider name */
  readonly name: string;

  /** Gather context information */
  gather(): Promise<ContextData>;

  /** Optionally determine if cached context should be refreshed */
  shouldRefresh?(cached: ContextData): boolean;

  /** Optionally clean up resources */
  destroy?(): void;
}
```

### ContextData Interface

```typescript
interface ContextData {
  /** Context type identifier */
  type: string;

  /** Timestamp when context was gathered */
  timestamp: number;

  /** Actual context data */
  data: any;

  /** Optional metadata */
  metadata?: {
    version?: string;
    source?: string;
    [key: string]: any;
  };
}
```

---

## Next Steps

- **Read**: [Context Management Guide](./context-management.md) to learn about managing providers
- **Read**: [Developer Tools Guide](./developer-tools.md) for debugging context issues
- **Explore**: Built-in provider implementations in `src/context/`
- **Build**: Create custom providers for your specific use cases

---

**Need Help?**
- Check the [troubleshooting section](#troubleshooting)
- Review [example providers](#advanced-example-localstorage-context-provider)
- Consult the [API reference](#api-reference)
