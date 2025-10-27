/**
 * Realistic mock scenarios for comprehensive AI testing
 *
 * Provides sophisticated mock providers with edge cases, stateful behavior,
 * and realistic patterns for thorough integration testing.
 */

import type { AIProvider, Message, ChatOptions, StreamChunk, Tool } from '../providers/AIProvider';

/**
 * Scenario complexity level
 */
export type ScenarioComplexity = 'simple' | 'moderate' | 'complex' | 'extreme';

/**
 * Latency profile for realistic timing simulation
 */
export interface LatencyProfile {
  /** Minimum latency in ms */
  min: number;
  /** Maximum latency in ms */
  max: number;
  /** Standard deviation for gaussian distribution */
  stdDev?: number;
  /** Probability of spike latency (0-1) */
  spikeProbability?: number;
  /** Spike latency multiplier */
  spikeMultiplier?: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Realistic mock scenario configuration
 */
export interface MockScenarioConfig {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description?: string;
  /** Complexity level */
  complexity?: ScenarioComplexity;
  /** Latency profile */
  latency?: LatencyProfile;
  /** Failure rate (0-1) */
  failureRate?: number;
  /** Enable stateful conversation tracking */
  stateful?: boolean;
  /** Enable token usage tracking */
  trackTokens?: boolean;
  /** Custom response patterns */
  responsePatterns?: string[];
  /** Tool use probability (0-1) */
  toolUseProbability?: number;
  /** Maximum conversation turns before reset */
  maxTurns?: number;
}

/**
 * Conversation state for stateful scenarios
 */
interface ConversationState {
  messages: Message[];
  turnCount: number;
  tokenUsage: TokenUsage;
  context: Record<string, any>;
}

/**
 * Default latency profiles
 */
export const LATENCY_PROFILES: Record<string, LatencyProfile> = {
  instant: { min: 0, max: 10 },
  fast: { min: 50, max: 200, stdDev: 30 },
  normal: { min: 200, max: 800, stdDev: 100 },
  slow: { min: 1000, max: 3000, stdDev: 500 },
  unreliable: { min: 100, max: 5000, stdDev: 1000, spikeProbability: 0.2, spikeMultiplier: 3 },
};

/**
 * Pre-configured realistic scenarios
 */
export const REALISTIC_SCENARIOS: Record<string, MockScenarioConfig> = {
  // Standard scenarios
  'production-stable': {
    name: 'Production Stable',
    description: 'Stable production-like behavior',
    complexity: 'moderate',
    latency: LATENCY_PROFILES.normal,
    failureRate: 0.001,
    stateful: true,
    trackTokens: true,
  },

  'production-degraded': {
    name: 'Production Degraded',
    description: 'Degraded performance under load',
    complexity: 'complex',
    latency: LATENCY_PROFILES.unreliable,
    failureRate: 0.05,
    stateful: true,
    trackTokens: true,
  },

  // Development scenarios
  'dev-fast': {
    name: 'Development Fast',
    description: 'Fast responses for development',
    complexity: 'simple',
    latency: LATENCY_PROFILES.fast,
    failureRate: 0,
    stateful: false,
    trackTokens: false,
  },

  'dev-realistic': {
    name: 'Development Realistic',
    description: 'Realistic behavior for development testing',
    complexity: 'moderate',
    latency: LATENCY_PROFILES.normal,
    failureRate: 0.01,
    stateful: true,
    trackTokens: true,
    toolUseProbability: 0.3,
  },

  // Edge case scenarios
  'edge-intermittent-failures': {
    name: 'Intermittent Failures',
    description: 'Random failures for resilience testing',
    complexity: 'complex',
    latency: LATENCY_PROFILES.normal,
    failureRate: 0.15,
    stateful: true,
    trackTokens: true,
  },

  'edge-slow-streaming': {
    name: 'Slow Streaming',
    description: 'Slow token-by-token streaming',
    complexity: 'moderate',
    latency: LATENCY_PROFILES.slow,
    failureRate: 0,
    stateful: false,
    trackTokens: true,
  },

  'edge-large-context': {
    name: 'Large Context',
    description: 'Large context window handling',
    complexity: 'extreme',
    latency: { min: 2000, max: 5000, stdDev: 800 },
    failureRate: 0.02,
    stateful: true,
    trackTokens: true,
    maxTurns: 50,
  },

  'edge-tool-heavy': {
    name: 'Tool Heavy',
    description: 'Frequent tool use scenarios',
    complexity: 'complex',
    latency: LATENCY_PROFILES.normal,
    failureRate: 0.01,
    stateful: true,
    trackTokens: true,
    toolUseProbability: 0.8,
  },
};

/**
 * Generate realistic latency based on profile
 */
function generateLatency(profile: LatencyProfile): number {
  // Check for spike
  if (profile.spikeProbability && Math.random() < profile.spikeProbability) {
    return profile.max * (profile.spikeMultiplier || 2);
  }

  // Generate gaussian distributed latency
  if (profile.stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const mean = (profile.min + profile.max) / 2;
    const value = z0 * profile.stdDev + mean;
    return Math.max(profile.min, Math.min(profile.max, value));
  }

  // Uniform distribution
  return profile.min + Math.random() * (profile.max - profile.min);
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Get total token count from messages
 */
function getTotalTokens(messages: Message[]): number {
  let total = 0;
  for (const message of messages) {
    if (typeof message.content === 'string') {
      total += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'text' && 'text' in block) {
          total += estimateTokens(block.text);
        }
      }
    }
  }
  return total;
}

/**
 * Generate realistic response based on conversation context
 */
function generateContextualResponse(
  messages: Message[],
  state: ConversationState,
  config: MockScenarioConfig
): string {
  const lastMessage = messages[messages.length - 1];
  const userInput = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : 'complex query';

  // Use custom patterns if provided
  if (config.responsePatterns && config.responsePatterns.length > 0) {
    const pattern = config.responsePatterns[state.turnCount % config.responsePatterns.length];
    return pattern.replace('{input}', userInput);
  }

  // Generate contextual response based on turn count
  if (state.turnCount === 0) {
    return `Hello! I understand you're asking about "${userInput}". How can I help you with that?`;
  } else if (state.turnCount < 3) {
    return `Based on our conversation, regarding "${userInput}", I can provide more details. What specific aspect interests you most?`;
  } else {
    return `Continuing from our previous discussion, let me address "${userInput}" with additional context from what we've covered.`;
  }
}

/**
 * Create a realistic mock AI provider with sophisticated behavior
 */
export function createRealisticMockProvider(
  scenarioNameOrConfig: string | MockScenarioConfig
): AIProvider {
  // Get configuration
  const config: MockScenarioConfig =
    typeof scenarioNameOrConfig === 'string'
      ? { ...REALISTIC_SCENARIOS[scenarioNameOrConfig] }
      : { ...scenarioNameOrConfig };

  // Set defaults
  const {
    name = 'mock-realistic',
    complexity = 'moderate',
    latency = LATENCY_PROFILES.normal,
    failureRate = 0,
    stateful = false,
    trackTokens = false,
    toolUseProbability = 0,
    maxTurns = 100,
  } = config;

  // Conversation state
  const state: ConversationState = {
    messages: [],
    turnCount: 0,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    context: {},
  };

  return {
    name,

    async chat(messages: Message[], options?: ChatOptions): Promise<Message> {
      // Simulate latency
      const delay = Math.floor(generateLatency(latency));
      await new Promise(resolve => setTimeout(resolve, delay));

      // Check for failure
      if (Math.random() < failureRate) {
        throw new Error(`Mock provider failure in ${name} scenario`);
      }

      // Update state
      if (stateful) {
        state.messages.push(...messages);
        state.turnCount++;

        // Reset if max turns reached
        if (state.turnCount >= maxTurns) {
          state.messages = [];
          state.turnCount = 0;
          state.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        }
      }

      // Track tokens
      if (trackTokens) {
        const inputTokens = getTotalTokens(messages);
        state.tokenUsage.inputTokens += inputTokens;
      }

      // Generate response
      const responseText = generateContextualResponse(messages, state, config);

      // Track output tokens
      if (trackTokens) {
        const outputTokens = estimateTokens(responseText);
        state.tokenUsage.outputTokens += outputTokens;
        state.tokenUsage.totalTokens = state.tokenUsage.inputTokens + state.tokenUsage.outputTokens;
      }

      // Decide on tool use
      const useTools = options?.tools &&
                       options.tools.length > 0 &&
                       Math.random() < toolUseProbability;

      if (useTools) {
        const tool = options!.tools![0];
        return {
          role: 'assistant',
          content: [
            { type: 'text', text: responseText },
            {
              type: 'tool_use',
              id: `tool-${Date.now()}`,
              name: tool.name,
              input: { query: 'test' },
            },
          ],
        };
      }

      return {
        role: 'assistant',
        content: responseText,
      };
    },

    async *stream(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
      // Simulate initial latency
      const initialDelay = Math.floor(generateLatency(latency) * 0.3);
      await new Promise(resolve => setTimeout(resolve, initialDelay));

      // Check for failure
      if (Math.random() < failureRate) {
        yield {
          type: 'error',
          error: `Mock streaming failure in ${name} scenario`,
        };
        return;
      }

      // Update state
      if (stateful) {
        state.messages.push(...messages);
        state.turnCount++;
      }

      // Track tokens
      if (trackTokens) {
        const inputTokens = getTotalTokens(messages);
        state.tokenUsage.inputTokens += inputTokens;
      }

      // Generate response
      const responseText = generateContextualResponse(messages, state, config);

      // Stream response with realistic chunking
      const words = responseText.split(' ');
      const chunkSize = complexity === 'simple' ? 5 : complexity === 'moderate' ? 3 : 1;
      const chunkDelayBase = complexity === 'extreme' ? 200 : 50;

      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        const chunkText = i + chunkSize < words.length ? chunk + ' ' : chunk;

        yield {
          type: 'content_delta',
          delta: chunkText,
        };

        // Variable chunk delay based on complexity
        const chunkDelay = chunkDelayBase + Math.random() * chunkDelayBase;
        await new Promise(resolve => setTimeout(resolve, chunkDelay));

        // Random mid-stream failure
        if (Math.random() < failureRate * 0.5) {
          yield {
            type: 'error',
            error: 'Mid-stream failure',
          };
          return;
        }
      }

      // Track output tokens
      if (trackTokens) {
        const outputTokens = estimateTokens(responseText);
        state.tokenUsage.outputTokens += outputTokens;
        state.tokenUsage.totalTokens = state.tokenUsage.inputTokens + state.tokenUsage.outputTokens;
      }

      // Tool use in streaming
      if (options?.tools && options.tools.length > 0 && Math.random() < toolUseProbability) {
        const tool = options.tools[0];
        yield {
          type: 'tool_use_start',
          toolUse: {
            id: `tool-${Date.now()}`,
            name: tool.name,
            input: { query: 'test' },
          },
        };
      }

      yield {
        type: 'complete',
      };
    },

    supportsStreaming(): boolean {
      return true;
    },
  };
}

/**
 * Get current conversation state (for stateful scenarios)
 */
export function getConversationState(provider: AIProvider): ConversationState | null {
  // This is a helper that would need access to the internal state
  // In real usage, you'd track this externally
  return null;
}

/**
 * Reset conversation state (for stateful scenarios)
 */
export function resetConversationState(provider: AIProvider): void {
  // This would reset internal state if accessible
  // In real usage, create a new provider instance
}

/**
 * Batch scenario testing helper
 */
export interface BatchScenarioTest {
  scenario: string;
  provider: AIProvider;
  expectedBehavior: {
    shouldFail?: boolean;
    minLatency?: number;
    maxLatency?: number;
    supportsTools?: boolean;
    supportsStreaming?: boolean;
  };
}

/**
 * Create batch scenario tests for comprehensive testing
 */
export function createBatchScenarioTests(
  scenarioNames: string[]
): BatchScenarioTest[] {
  return scenarioNames.map(name => {
    const config = REALISTIC_SCENARIOS[name];
    const provider = createRealisticMockProvider(name);

    return {
      scenario: name,
      provider,
      expectedBehavior: {
        shouldFail: (config.failureRate || 0) > 0.1,
        minLatency: config.latency?.min,
        maxLatency: config.latency?.max,
        supportsTools: (config.toolUseProbability || 0) > 0,
        supportsStreaming: true,
      },
    };
  });
}

/**
 * Scenario testing utilities
 */
export const ScenarioUtils = {
  /**
   * Test all pre-configured scenarios
   */
  getAllScenarios(): string[] {
    return Object.keys(REALISTIC_SCENARIOS);
  },

  /**
   * Get scenario by complexity
   */
  getScenariosByComplexity(complexity: ScenarioComplexity): string[] {
    return Object.entries(REALISTIC_SCENARIOS)
      .filter(([_, config]) => config.complexity === complexity)
      .map(([name, _]) => name);
  },

  /**
   * Get edge case scenarios
   */
  getEdgeCaseScenarios(): string[] {
    return Object.keys(REALISTIC_SCENARIOS).filter(name => name.startsWith('edge-'));
  },

  /**
   * Create custom latency profile
   */
  createCustomLatency(
    min: number,
    max: number,
    options?: Partial<Omit<LatencyProfile, 'min' | 'max'>>
  ): LatencyProfile {
    return { min, max, ...options };
  },

  /**
   * Combine multiple scenarios for chaos testing
   */
  createChaosScenario(scenarioNames: string[]): MockScenarioConfig {
    const scenarios = scenarioNames.map(name => REALISTIC_SCENARIOS[name]);

    return {
      name: 'chaos-combined',
      description: 'Combined chaos testing scenario',
      complexity: 'extreme',
      latency: {
        min: Math.min(...scenarios.map(s => s.latency?.min || 0)),
        max: Math.max(...scenarios.map(s => s.latency?.max || 1000)),
        spikeProbability: 0.3,
        spikeMultiplier: 5,
      },
      failureRate: Math.max(...scenarios.map(s => s.failureRate || 0)),
      stateful: true,
      trackTokens: true,
      toolUseProbability: 0.5,
    };
  },
};
