# Specification: Create xAI and OpenRouter AI Providers

## Overview

This task creates two new AI provider packages for ClippyJS: `@clippyjs/ai-xai` for xAI's Grok models and `@clippyjs/ai-openrouter` for OpenRouter's multi-model gateway. Both providers leverage OpenAI-compatible APIs, allowing reuse of the existing `openai` npm package with minimal new code. The implementation follows the established `OpenAIProvider` pattern, requiring only provider-specific configuration (baseURL, default models, vision detection logic).

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds two new provider integrations to the existing AI provider system. The work involves creating new packages, implementing the AIProvider interface, and following established patterns from existing providers.

## Task Scope

### Services Involved
- **ai-xai** (new) - xAI/Grok provider package
- **ai-openrouter** (new) - OpenRouter provider package
- **ai** (reference) - Core AI package with AIProvider base class
- **ai-openai** (reference) - Reference implementation to clone

### This Task Will:
- [ ] Create `@clippyjs/ai-xai` package with XAIProvider class
- [ ] Create `@clippyjs/ai-openrouter` package with OpenRouterProvider class
- [ ] Implement AIProvider interface for both providers
- [ ] Support dual-mode operation (direct SDK and proxy mode)
- [ ] Add streaming, tool use, and vision support where applicable
- [ ] Include comprehensive unit tests for both providers
- [ ] Add rollup build configuration for both packages

### Out of Scope:
- Backend proxy server implementation
- UI integration or configuration screens
- Model selection/routing UI
- Documentation website updates
- OpenRouter model-specific optimizations (fallbacks, cost routing)

## Service Context

### ai-xai (New Package)

**Tech Stack:**
- Language: TypeScript
- Framework: None (standalone provider)
- Build: Rollup
- Test: Vitest
- Key directories: `src/`, `tests/`

**Entry Point:** `src/index.ts`

**How to Run:**
```bash
cd packages/ai-xai
npm run build
npm test
```

**API Endpoint:** `https://api.x.ai/v1`

**Default Model:** `grok-4`

**Vision Models:** `grok-4`, `grok-2-vision-1212`

### ai-openrouter (New Package)

**Tech Stack:**
- Language: TypeScript
- Framework: None (standalone provider)
- Build: Rollup
- Test: Vitest
- Key directories: `src/`, `tests/`

**Entry Point:** `src/index.ts`

**How to Run:**
```bash
cd packages/ai-openrouter
npm run build
npm test
```

**API Endpoint:** `https://openrouter.ai/api/v1`

**Default Model:** `openai/gpt-4o`

**Model Format:** `provider/model-name` (e.g., `anthropic/claude-3-opus`, `meta-llama/llama-3.1-405b`)

### ai (Reference Package)

**Tech Stack:**
- Language: TypeScript
- Framework: React (for hooks)
- Test: Vitest + Playwright

**Entry Point:** `packages/ai/src/index.ts`

**Key Files:**
- `packages/ai/src/providers/AIProvider.ts` - Abstract base class

### ai-openai (Reference Package)

**Tech Stack:**
- Language: TypeScript
- Dependencies: `openai` npm package

**Entry Point:** `packages/ai-openai/src/index.ts`

**Key Files:**
- `packages/ai-openai/src/OpenAIProvider.ts` - Reference implementation

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `packages/ai-xai/package.json` | ai-xai | Create new package.json following ai-openai pattern |
| `packages/ai-xai/tsconfig.json` | ai-xai | Create TypeScript config |
| `packages/ai-xai/rollup.config.js` | ai-xai | Create rollup build config |
| `packages/ai-xai/vitest.config.ts` | ai-xai | Create vitest test config |
| `packages/ai-xai/src/index.ts` | ai-xai | Export XAIProvider |
| `packages/ai-xai/src/XAIProvider.ts` | ai-xai | Main provider implementation |
| `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | ai-xai | Unit tests |
| `packages/ai-openrouter/package.json` | ai-openrouter | Create new package.json |
| `packages/ai-openrouter/tsconfig.json` | ai-openrouter | Create TypeScript config |
| `packages/ai-openrouter/rollup.config.js` | ai-openrouter | Create rollup build config |
| `packages/ai-openrouter/vitest.config.ts` | ai-openrouter | Create vitest test config |
| `packages/ai-openrouter/src/index.ts` | ai-openrouter | Export OpenRouterProvider |
| `packages/ai-openrouter/src/OpenRouterProvider.ts` | ai-openrouter | Main provider implementation |
| `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | ai-openrouter | Unit tests |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `packages/ai/src/providers/AIProvider.ts` | AIProvider interface with required methods |
| `packages/ai-openai/src/OpenAIProvider.ts` | Complete provider implementation with dual-mode |
| `packages/ai-openai/src/index.ts` | Export structure |
| `packages/ai-openai/package.json` | Package configuration and dependencies |
| `packages/ai-openai/rollup.config.js` | Rollup build configuration |
| `packages/ai-openai/src/__tests__/OpenAIProvider.test.ts` | Test patterns and mocking strategy |

## Patterns to Follow

### AIProvider Interface

From `packages/ai/src/providers/AIProvider.ts`:

```typescript
export abstract class AIProvider {
  abstract initialize(config: AIProviderConfig): Promise<void>;
  abstract chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncIterableIterator<StreamChunk>;
  abstract supportsTools(): boolean;
  abstract supportsVision(): boolean;
  abstract destroy(): void;
}
```

**Key Points:**
- All providers must extend AIProvider
- `chat()` returns an async iterator for streaming
- Feature detection via `supportsTools()` and `supportsVision()`

### Dual-Mode Architecture

From `packages/ai-openai/src/OpenAIProvider.ts`:

```typescript
async initialize(config: AIProviderConfig): Promise<void> {
  this.config = config;
  this.currentModel = config.model || 'gpt-4o';

  if (config.endpoint) {
    // Proxy mode - use fetch for streaming
    this.isProxyMode = true;
  } else if (config.apiKey) {
    // Client-side mode - use SDK
    this.isProxyMode = false;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: config.baseURL,
    });
  } else {
    throw new Error('Either endpoint or apiKey must be provided');
  }
}
```

**Key Points:**
- Support both direct SDK mode (`apiKey`) and proxy mode (`endpoint`)
- Use `baseURL` config for custom endpoints
- Enable `dangerouslyAllowBrowser: true` for client-side usage

### Package.json Structure

From `packages/ai-openai/package.json`:

```json
{
  "name": "@clippyjs/ai-openai",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@clippyjs/ai": "workspace:*"
  },
  "dependencies": {
    "openai": "^6.8.1"
  }
}
```

**Key Points:**
- Use `@clippyjs/ai-{provider}` naming convention
- `@clippyjs/ai` as peer dependency
- Same dev dependencies for build/test tooling

### Rollup Configuration

From `packages/ai-openai/rollup.config.js`:

```javascript
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: true, exports: 'named' },
    { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
  ],
  external: ['@clippyjs/ai', 'openai'],
  // ... plugins
};
```

**Key Points:**
- Output both CJS and ESM formats
- Mark peer dependencies as external
- Include source maps

## Requirements

### Functional Requirements

1. **XAI Provider Initialization**
   - Description: Initialize provider with xAI API credentials
   - Acceptance: Provider accepts `apiKey` or `endpoint`, uses `https://api.x.ai/v1` as baseURL

2. **XAI Streaming Chat**
   - Description: Stream chat responses from Grok models
   - Acceptance: Async iterator yields content_delta, tool_use, and complete chunks

3. **XAI Vision Support**
   - Description: Detect vision-capable models
   - Acceptance: `supportsVision()` returns true for `grok-4`, `grok-2-vision-1212`

4. **OpenRouter Provider Initialization**
   - Description: Initialize provider with OpenRouter API credentials
   - Acceptance: Provider accepts `apiKey` or `endpoint`, uses `https://openrouter.ai/api/v1` as baseURL

5. **OpenRouter Streaming Chat**
   - Description: Stream chat responses from any OpenRouter model
   - Acceptance: Async iterator yields content_delta, tool_use, and complete chunks

6. **OpenRouter Model Format**
   - Description: Support OpenRouter's `provider/model` naming
   - Acceptance: Model names like `openai/gpt-4o`, `anthropic/claude-3-opus` work correctly

7. **OpenRouter Headers**
   - Description: Support optional HTTP-Referer and X-Title headers
   - Acceptance: Config accepts `httpReferer` and `xTitle` options

### Edge Cases

1. **Invalid API Key Format** - Validate xAI keys start with `xai-`, OpenRouter with `sk-or-` (warning only)
2. **Missing Configuration** - Throw clear error if neither `apiKey` nor `endpoint` provided
3. **Network Errors** - Yield error chunk with descriptive message
4. **Tool Argument Parsing** - Handle malformed JSON in tool arguments gracefully
5. **Stream Interruption** - Handle connection drops during streaming

## Implementation Notes

### DO
- Follow the pattern in `packages/ai-openai/src/OpenAIProvider.ts` exactly
- Reuse the `openai` npm package for both providers (same version ^6.8.1)
- Maintain dual-mode support (direct SDK + proxy)
- Use provider-specific baseURLs in initialization
- Copy the test structure from `packages/ai-openai/src/__tests__/OpenAIProvider.test.ts`
- Export only the provider class from index.ts

### DON'T
- Create a new OpenAI-compatible SDK wrapper - use the `openai` package directly
- Add provider-specific features beyond what OpenAI SDK supports
- Hardcode API keys or endpoints
- Skip the proxy mode implementation
- Add new dependencies beyond what ai-openai uses

## Development Environment

### Start Services

```bash
# Build all packages
npm run build

# Run tests for specific package
cd packages/ai-xai && npm test
cd packages/ai-openrouter && npm test

# Watch mode for development
npm run test:watch
```

### Service URLs
- xAI API: https://api.x.ai/v1
- OpenRouter API: https://openrouter.ai/api/v1

### Required Environment Variables
- `XAI_API_KEY`: xAI API key (format: `xai-...`)
- `OPENROUTER_API_KEY`: OpenRouter API key (format: `sk-or-...`)

## Success Criteria

The task is complete when:

1. [ ] `@clippyjs/ai-xai` package builds successfully
2. [ ] `@clippyjs/ai-openrouter` package builds successfully
3. [ ] XAIProvider initializes with apiKey or endpoint
4. [ ] OpenRouterProvider initializes with apiKey or endpoint
5. [ ] Both providers stream chat responses correctly
6. [ ] Both providers support tool/function calling
7. [ ] XAIProvider correctly detects vision support for Grok models
8. [ ] OpenRouterProvider accepts provider/model format
9. [ ] All unit tests pass for both providers
10. [ ] No TypeScript errors
11. [ ] No console errors during operation

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| XAI Initialization | `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | Accepts apiKey/endpoint, uses correct baseURL |
| XAI Model Default | `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | Defaults to grok-4 |
| XAI Vision Detection | `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | Returns true for grok-4, grok-2-vision-1212 |
| XAI Streaming | `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | Yields content_delta and complete chunks |
| XAI Tool Use | `packages/ai-xai/src/__tests__/XAIProvider.test.ts` | Handles tool_use streaming correctly |
| OpenRouter Initialization | `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | Accepts apiKey/endpoint, uses correct baseURL |
| OpenRouter Model Format | `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | Accepts provider/model names |
| OpenRouter Headers | `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | Passes HTTP-Referer and X-Title |
| OpenRouter Streaming | `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | Yields content_delta and complete chunks |
| OpenRouter Tool Use | `packages/ai-openrouter/src/__tests__/OpenRouterProvider.test.ts` | Handles tool_use streaming correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| XAI with @clippyjs/ai | ai-xai ↔ ai | Provider extends AIProvider correctly |
| OpenRouter with @clippyjs/ai | ai-openrouter ↔ ai | Provider extends AIProvider correctly |
| Type compatibility | both providers ↔ ai | All types match AIProvider interface |

### Build Verification
| Check | Command | Expected |
|-------|---------|----------|
| XAI TypeScript | `cd packages/ai-xai && npm run typecheck` | No errors |
| XAI Build | `cd packages/ai-xai && npm run build` | Creates dist/ with js, esm.js, d.ts |
| XAI Tests | `cd packages/ai-xai && npm test` | All tests pass |
| OpenRouter TypeScript | `cd packages/ai-openrouter && npm run typecheck` | No errors |
| OpenRouter Build | `cd packages/ai-openrouter && npm run build` | Creates dist/ with js, esm.js, d.ts |
| OpenRouter Tests | `cd packages/ai-openrouter && npm test` | All tests pass |

### Package Structure Verification
| Check | Path | Expected |
|-------|------|----------|
| XAI package.json | `packages/ai-xai/package.json` | Valid JSON, correct name @clippyjs/ai-xai |
| XAI entry point | `packages/ai-xai/src/index.ts` | Exports XAIProvider |
| XAI provider class | `packages/ai-xai/src/XAIProvider.ts` | Extends AIProvider |
| OpenRouter package.json | `packages/ai-openrouter/package.json` | Valid JSON, correct name @clippyjs/ai-openrouter |
| OpenRouter entry point | `packages/ai-openrouter/src/index.ts` | Exports OpenRouterProvider |
| OpenRouter provider class | `packages/ai-openrouter/src/OpenRouterProvider.ts` | Extends AIProvider |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compilation succeeds with no errors
- [ ] Rollup build produces expected output files
- [ ] No regressions in existing ai-openai or ai-anthropic packages
- [ ] Code follows established patterns from OpenAIProvider
- [ ] No security vulnerabilities introduced (API keys not logged/exposed)
- [ ] Both providers correctly use their respective base URLs
