/**
 * UsageAnalytics - Feature adoption and user interaction tracking
 *
 * Features:
 * - Feature adoption tracking
 * - User interaction pattern analysis
 * - Conversation metrics (length, completion rate)
 * - Provider usage statistics
 * - Proactive behavior effectiveness
 *
 * @module telemetry
 */

import type { TelemetryCollector } from './TelemetryCollector';

/**
 * Feature usage event
 */
export interface FeatureUsageEvent {
  /** Feature identifier */
  featureId: string;
  /** Action performed */
  action: string;
  /** Timestamp */
  timestamp: number;
  /** Event data */
  data?: Record<string, any>;
}

/**
 * Conversation metrics
 */
export interface ConversationMetrics {
  /** Conversation ID */
  conversationId: string;
  /** Number of messages */
  messageCount: number;
  /** Conversation duration (ms) */
  durationMs: number;
  /** Completion status */
  completed: boolean;
  /** Average message length (characters) */
  avgMessageLength: number;
  /** Provider used */
  provider?: string;
}

/**
 * Provider usage stats
 */
export interface ProviderUsageStats {
  /** Provider name */
  provider: string;
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time (ms) */
  avgResponseTime: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * Proactive behavior metrics
 */
export interface ProactiveBehaviorMetrics {
  /** Total suggestions shown */
  totalSuggestions: number;
  /** Suggestions accepted */
  acceptedSuggestions: number;
  /** Suggestions ignored */
  ignoredSuggestions: number;
  /** Acceptance rate */
  acceptanceRate: number;
  /** Average time to interact (ms) */
  avgTimeToInteract: number;
}

/**
 * Feature adoption stats
 */
export interface FeatureAdoptionStats {
  /** Feature ID */
  featureId: string;
  /** Total users */
  totalUsers: number;
  /** Active users */
  activeUsers: number;
  /** Adoption rate */
  adoptionRate: number;
  /** Total usage count */
  usageCount: number;
  /** First used timestamp */
  firstUsed?: number;
  /** Last used timestamp */
  lastUsed?: number;
}

/**
 * Usage analytics configuration
 */
export interface UsageAnalyticsConfig {
  /** Track feature adoption */
  trackFeatures?: boolean;
  /** Track conversations */
  trackConversations?: boolean;
  /** Track provider usage */
  trackProviders?: boolean;
  /** Track proactive behavior */
  trackProactive?: boolean;
  /** Maximum events to keep in memory */
  maxEvents?: number;
  /** Time window for aggregations (ms) */
  timeWindowMs?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<UsageAnalyticsConfig> = {
  trackFeatures: true,
  trackConversations: true,
  trackProviders: true,
  trackProactive: true,
  maxEvents: 1000,
  timeWindowMs: 3600000, // 1 hour
};

/**
 * UsageAnalytics - Usage and interaction tracking
 */
export class UsageAnalytics {
  private config: Required<UsageAnalyticsConfig>;
  private collector: TelemetryCollector;
  private featureUsage: Map<string, FeatureUsageEvent[]> = new Map();
  private conversations: Map<string, ConversationMetrics> = new Map();
  private providerStats: Map<string, ProviderUsageStats> = new Map();
  private proactiveMetrics: ProactiveBehaviorMetrics = {
    totalSuggestions: 0,
    acceptedSuggestions: 0,
    ignoredSuggestions: 0,
    acceptanceRate: 0,
    avgTimeToInteract: 0,
  };
  private userSessions: Set<string> = new Set();

  constructor(collector: TelemetryCollector, config: UsageAnalyticsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = collector;
  }

  /**
   * Track feature usage
   */
  trackFeature(featureId: string, action: string, data?: Record<string, any>): void {
    if (!this.config.trackFeatures) return;

    const event: FeatureUsageEvent = {
      featureId,
      action,
      timestamp: Date.now(),
      data,
    };

    // Store event
    const events = this.featureUsage.get(featureId) || [];
    events.push(event);
    this.featureUsage.set(featureId, events);

    // Report to telemetry
    this.collector.trackUsage(featureId, { action, ...data });

    // Cleanup old events
    this.cleanupOldEvents();
  }

  /**
   * Start conversation tracking
   */
  startConversation(conversationId: string, provider?: string): void {
    if (!this.config.trackConversations) return;

    this.conversations.set(conversationId, {
      conversationId,
      messageCount: 0,
      durationMs: 0,
      completed: false,
      avgMessageLength: 0,
      provider,
    });

    this.collector.track({
      type: 'conversation.start',
      timestamp: Date.now(),
      data: { conversationId, provider },
    });
  }

  /**
   * Track conversation message
   */
  trackMessage(
    conversationId: string,
    messageLength: number,
    role: 'user' | 'assistant'
  ): void {
    if (!this.config.trackConversations) return;

    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.messageCount++;
    conversation.avgMessageLength =
      (conversation.avgMessageLength * (conversation.messageCount - 1) + messageLength) /
      conversation.messageCount;

    this.collector.track({
      type: 'conversation.message',
      timestamp: Date.now(),
      data: {
        conversationId,
        messageLength,
        role,
        messageCount: conversation.messageCount,
      },
    });
  }

  /**
   * End conversation tracking
   */
  endConversation(conversationId: string, completed: boolean = true): void {
    if (!this.config.trackConversations) return;

    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.completed = completed;
    conversation.durationMs = Date.now() - conversation.timestamp;

    this.collector.track({
      type: 'conversation.end',
      timestamp: Date.now(),
      data: {
        conversationId,
        messageCount: conversation.messageCount,
        durationMs: conversation.durationMs,
        completed,
        avgMessageLength: conversation.avgMessageLength,
      },
    });
  }

  /**
   * Track provider usage
   */
  trackProviderRequest(
    provider: string,
    responseTimeMs: number,
    success: boolean,
    tokens?: number
  ): void {
    if (!this.config.trackProviders) return;

    const stats = this.providerStats.get(provider) || {
      provider,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalTokens: 0,
    };

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // Update average response time
    stats.avgResponseTime =
      (stats.avgResponseTime * (stats.totalRequests - 1) + responseTimeMs) /
      stats.totalRequests;

    // Update token count
    if (tokens) {
      stats.totalTokens += tokens;
    }

    this.providerStats.set(provider, stats);

    this.collector.track({
      type: 'provider.request',
      timestamp: Date.now(),
      data: {
        provider,
        responseTimeMs,
        success,
        tokens,
      },
    });
  }

  /**
   * Track proactive suggestion
   */
  trackProactiveSuggestion(suggestionId: string, context?: Record<string, any>): void {
    if (!this.config.trackProactive) return;

    this.proactiveMetrics.totalSuggestions++;

    this.collector.track({
      type: 'proactive.suggestion',
      timestamp: Date.now(),
      data: {
        suggestionId,
        ...context,
      },
    });
  }

  /**
   * Track proactive suggestion acceptance
   */
  trackProactiveAcceptance(suggestionId: string, timeToInteractMs: number): void {
    if (!this.config.trackProactive) return;

    this.proactiveMetrics.acceptedSuggestions++;
    this.updateProactiveMetrics(timeToInteractMs);

    this.collector.track({
      type: 'proactive.accept',
      timestamp: Date.now(),
      data: {
        suggestionId,
        timeToInteractMs,
      },
    });
  }

  /**
   * Track proactive suggestion ignore
   */
  trackProactiveIgnore(suggestionId: string, timeToInteractMs?: number): void {
    if (!this.config.trackProactive) return;

    this.proactiveMetrics.ignoredSuggestions++;
    if (timeToInteractMs) {
      this.updateProactiveMetrics(timeToInteractMs);
    }

    this.collector.track({
      type: 'proactive.ignore',
      timestamp: Date.now(),
      data: {
        suggestionId,
        timeToInteractMs,
      },
    });
  }

  /**
   * Get feature adoption statistics
   */
  getFeatureAdoptionStats(featureId?: string): FeatureAdoptionStats[] {
    const stats: FeatureAdoptionStats[] = [];

    const features = featureId
      ? [[featureId, this.featureUsage.get(featureId) || []]]
      : Array.from(this.featureUsage.entries());

    for (const [id, events] of features) {
      const timestamps = events.map(e => e.timestamp);
      const uniqueUsers = new Set(events.map(e => e.data?.userId).filter(Boolean));

      stats.push({
        featureId: id,
        totalUsers: this.userSessions.size,
        activeUsers: uniqueUsers.size,
        adoptionRate:
          this.userSessions.size > 0 ? uniqueUsers.size / this.userSessions.size : 0,
        usageCount: events.length,
        firstUsed: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
        lastUsed: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
      });
    }

    return stats;
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(): {
    totalConversations: number;
    completedConversations: number;
    avgMessageCount: number;
    avgDuration: number;
    completionRate: number;
  } {
    const conversations = Array.from(this.conversations.values());

    if (conversations.length === 0) {
      return {
        totalConversations: 0,
        completedConversations: 0,
        avgMessageCount: 0,
        avgDuration: 0,
        completionRate: 0,
      };
    }

    const completed = conversations.filter(c => c.completed);
    const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0);
    const totalDuration = conversations.reduce((sum, c) => sum + c.durationMs, 0);

    return {
      totalConversations: conversations.length,
      completedConversations: completed.length,
      avgMessageCount: totalMessages / conversations.length,
      avgDuration: totalDuration / conversations.length,
      completionRate: completed.length / conversations.length,
    };
  }

  /**
   * Get provider statistics
   */
  getProviderStats(provider?: string): ProviderUsageStats[] {
    if (provider) {
      const stats = this.providerStats.get(provider);
      return stats ? [stats] : [];
    }
    return Array.from(this.providerStats.values());
  }

  /**
   * Get proactive behavior metrics
   */
  getProactiveMetrics(): ProactiveBehaviorMetrics {
    return { ...this.proactiveMetrics };
  }

  /**
   * Register user session
   */
  registerUserSession(userId: string): void {
    this.userSessions.add(userId);

    this.collector.track({
      type: 'session.user',
      timestamp: Date.now(),
      data: { userId },
    });
  }

  /**
   * Get usage summary
   */
  getSummary(): {
    features: number;
    conversations: number;
    providers: number;
    userSessions: number;
    proactive: ProactiveBehaviorMetrics;
  } {
    return {
      features: this.featureUsage.size,
      conversations: this.conversations.size,
      providers: this.providerStats.size,
      userSessions: this.userSessions.size,
      proactive: this.getProactiveMetrics(),
    };
  }

  /**
   * Update proactive metrics with interaction time
   */
  private updateProactiveMetrics(timeToInteractMs: number): void {
    const total = this.proactiveMetrics.acceptedSuggestions + this.proactiveMetrics.ignoredSuggestions;
    this.proactiveMetrics.avgTimeToInteract =
      (this.proactiveMetrics.avgTimeToInteract * (total - 1) + timeToInteractMs) / total;

    // Update acceptance rate
    this.proactiveMetrics.acceptanceRate =
      this.proactiveMetrics.totalSuggestions > 0
        ? this.proactiveMetrics.acceptedSuggestions / this.proactiveMetrics.totalSuggestions
        : 0;
  }

  /**
   * Cleanup old events
   */
  private cleanupOldEvents(): void {
    const now = Date.now();
    const windowStart = now - this.config.timeWindowMs;

    // Cleanup feature usage
    for (const [featureId, events] of this.featureUsage.entries()) {
      const recentEvents = events.filter(e => e.timestamp >= windowStart);
      if (recentEvents.length === 0) {
        this.featureUsage.delete(featureId);
      } else if (recentEvents.length < events.length) {
        this.featureUsage.set(featureId, recentEvents.slice(-this.config.maxEvents));
      }
    }
  }

  /**
   * Reset all analytics
   */
  reset(): void {
    this.featureUsage.clear();
    this.conversations.clear();
    this.providerStats.clear();
    this.proactiveMetrics = {
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      ignoredSuggestions: 0,
      acceptanceRate: 0,
      avgTimeToInteract: 0,
    };
  }
}
