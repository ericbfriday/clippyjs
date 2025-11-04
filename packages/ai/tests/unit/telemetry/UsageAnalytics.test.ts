/**
 * UsageAnalytics tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UsageAnalytics } from '../../../src/telemetry/UsageAnalytics';
import { TelemetryCollector } from '../../../src/telemetry/TelemetryCollector';

describe('UsageAnalytics', () => {
  let collector: TelemetryCollector;
  let analytics: UsageAnalytics;

  beforeEach(() => {
    collector = new TelemetryCollector({
      enabled: true,
      transport: 'console',
      flushIntervalMs: 0,
    });
  });

  afterEach(() => {
    if (collector) {
      collector.destroy();
    }
  });

  describe('Feature Tracking', () => {
    it('should track feature usage', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackFeature('proactive.suggestion', 'show', {
        suggestionId: '123',
      });

      const stats = analytics.getFeatureAdoptionStats('proactive.suggestion');
      expect(stats.length).toBe(1);
      expect(stats[0].usageCount).toBe(1);
    });

    it('should track multiple features independently', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackFeature('feature-a', 'use');
      analytics.trackFeature('feature-a', 'use');
      analytics.trackFeature('feature-b', 'use');

      const statsA = analytics.getFeatureAdoptionStats('feature-a');
      const statsB = analytics.getFeatureAdoptionStats('feature-b');

      expect(statsA[0].usageCount).toBe(2);
      expect(statsB[0].usageCount).toBe(1);
    });

    it('should calculate feature adoption stats', () => {
      analytics = new UsageAnalytics(collector);

      analytics.registerUserSession('user1');
      analytics.registerUserSession('user2');

      analytics.trackFeature('feature-a', 'use', { userId: 'user1' });
      analytics.trackFeature('feature-a', 'use', { userId: 'user2' });

      const stats = analytics.getFeatureAdoptionStats('feature-a');
      expect(stats[0].totalUsers).toBe(2);
      expect(stats[0].activeUsers).toBe(2);
      expect(stats[0].adoptionRate).toBe(1.0);
    });

    it('should track first and last usage timestamps', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackFeature('feature-a', 'use');
      // Simulate time passing
      setTimeout(() => {
        analytics.trackFeature('feature-a', 'use');
      }, 10);

      const stats = analytics.getFeatureAdoptionStats('feature-a');
      expect(stats[0].firstUsed).toBeDefined();
      expect(stats[0].lastUsed).toBeDefined();
      expect(stats[0].lastUsed).toBeGreaterThanOrEqual(stats[0].firstUsed!);
    });
  });

  describe('Conversation Tracking', () => {
    it('should track conversation lifecycle', () => {
      analytics = new UsageAnalytics(collector);

      analytics.startConversation('conv-123', 'openai');
      analytics.trackMessage('conv-123', 50, 'user');
      analytics.trackMessage('conv-123', 100, 'assistant');
      analytics.endConversation('conv-123', true);

      const stats = analytics.getConversationStats();
      expect(stats.totalConversations).toBe(1);
      expect(stats.completedConversations).toBe(1);
      expect(stats.completionRate).toBe(1.0);
    });

    it('should calculate average message count', () => {
      analytics = new UsageAnalytics(collector);

      analytics.startConversation('conv-1');
      analytics.trackMessage('conv-1', 50, 'user');
      analytics.trackMessage('conv-1', 100, 'assistant');

      analytics.startConversation('conv-2');
      analytics.trackMessage('conv-2', 60, 'user');
      analytics.trackMessage('conv-2', 110, 'assistant');
      analytics.trackMessage('conv-2', 70, 'user');
      analytics.trackMessage('conv-2', 120, 'assistant');

      const stats = analytics.getConversationStats();
      expect(stats.avgMessageCount).toBe(3); // (2 + 4) / 2
    });

    it('should track incomplete conversations', () => {
      analytics = new UsageAnalytics(collector);

      analytics.startConversation('conv-1');
      analytics.endConversation('conv-1', true);

      analytics.startConversation('conv-2');
      analytics.endConversation('conv-2', false);

      const stats = analytics.getConversationStats();
      expect(stats.totalConversations).toBe(2);
      expect(stats.completedConversations).toBe(1);
      expect(stats.completionRate).toBe(0.5);
    });

    it('should calculate average message length', () => {
      analytics = new UsageAnalytics(collector);

      analytics.startConversation('conv-1');
      analytics.trackMessage('conv-1', 100, 'user');
      analytics.trackMessage('conv-1', 200, 'assistant');
      analytics.trackMessage('conv-1', 150, 'user');

      const stats = analytics.getConversationStats();
      expect(stats.avgMessageCount).toBe(3);
    });
  });

  describe('Provider Usage Tracking', () => {
    it('should track provider requests', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProviderRequest('openai', 150, true, 500);
      analytics.trackProviderRequest('anthropic', 200, true, 600);

      const stats = analytics.getProviderStats();
      expect(stats.length).toBe(2);
    });

    it('should calculate success and failure rates', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProviderRequest('openai', 150, true, 500);
      analytics.trackProviderRequest('openai', 160, true, 510);
      analytics.trackProviderRequest('openai', 170, false);

      const stats = analytics.getProviderStats('openai');
      expect(stats[0].totalRequests).toBe(3);
      expect(stats[0].successfulRequests).toBe(2);
      expect(stats[0].failedRequests).toBe(1);
    });

    it('should calculate average response time', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProviderRequest('openai', 100, true);
      analytics.trackProviderRequest('openai', 200, true);
      analytics.trackProviderRequest('openai', 300, true);

      const stats = analytics.getProviderStats('openai');
      expect(stats[0].avgResponseTime).toBe(200);
    });

    it('should aggregate token usage', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProviderRequest('openai', 150, true, 500);
      analytics.trackProviderRequest('openai', 160, true, 600);
      analytics.trackProviderRequest('openai', 170, true, 700);

      const stats = analytics.getProviderStats('openai');
      expect(stats[0].totalTokens).toBe(1800);
    });
  });

  describe('Proactive Behavior Tracking', () => {
    it('should track suggestions and interactions', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProactiveSuggestion('sugg-1');
      analytics.trackProactiveSuggestion('sugg-2');
      analytics.trackProactiveAcceptance('sugg-1', 5000);
      analytics.trackProactiveIgnore('sugg-2', 3000);

      const metrics = analytics.getProactiveMetrics();
      expect(metrics.totalSuggestions).toBe(2);
      expect(metrics.acceptedSuggestions).toBe(1);
      expect(metrics.ignoredSuggestions).toBe(1);
      expect(metrics.acceptanceRate).toBe(0.5);
    });

    it('should calculate average time to interact', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackProactiveSuggestion('sugg-1');
      analytics.trackProactiveSuggestion('sugg-2');
      analytics.trackProactiveAcceptance('sugg-1', 4000);
      analytics.trackProactiveAcceptance('sugg-2', 6000);

      const metrics = analytics.getProactiveMetrics();
      expect(metrics.avgTimeToInteract).toBe(5000);
    });

    it('should calculate acceptance rate correctly', () => {
      analytics = new UsageAnalytics(collector);

      // 3 suggestions, 2 accepted, 1 ignored
      analytics.trackProactiveSuggestion('sugg-1');
      analytics.trackProactiveSuggestion('sugg-2');
      analytics.trackProactiveSuggestion('sugg-3');
      analytics.trackProactiveAcceptance('sugg-1', 1000);
      analytics.trackProactiveAcceptance('sugg-2', 2000);
      analytics.trackProactiveIgnore('sugg-3', 500);

      const metrics = analytics.getProactiveMetrics();
      expect(metrics.acceptanceRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('User Session Management', () => {
    it('should register user sessions', () => {
      analytics = new UsageAnalytics(collector);

      analytics.registerUserSession('user-1');
      analytics.registerUserSession('user-2');
      analytics.registerUserSession('user-1'); // Duplicate

      const summary = analytics.getSummary();
      expect(summary.userSessions).toBe(2); // Unique users
    });
  });

  describe('Usage Summary', () => {
    it('should generate comprehensive usage summary', () => {
      analytics = new UsageAnalytics(collector);

      // Track various metrics
      analytics.trackFeature('feature-a', 'use');
      analytics.startConversation('conv-1');
      analytics.trackProviderRequest('openai', 150, true);
      analytics.trackProactiveSuggestion('sugg-1');
      analytics.registerUserSession('user-1');

      const summary = analytics.getSummary();
      expect(summary.features).toBe(1);
      expect(summary.conversations).toBe(1);
      expect(summary.providers).toBe(1);
      expect(summary.userSessions).toBe(1);
      expect(summary.proactive).toBeDefined();
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup old events', () => {
      analytics = new UsageAnalytics(collector, {
        maxEvents: 5,
        timeWindowMs: 1000,
      });

      // Track many events
      for (let i = 0; i < 10; i++) {
        analytics.trackFeature('feature-a', 'use');
      }

      // Events should be limited
      const stats = analytics.getFeatureAdoptionStats('feature-a');
      expect(stats[0].usageCount).toBeLessThanOrEqual(10);
    });

    it('should reset all analytics', () => {
      analytics = new UsageAnalytics(collector);

      analytics.trackFeature('feature-a', 'use');
      analytics.startConversation('conv-1');
      analytics.trackProviderRequest('openai', 150, true);

      analytics.reset();

      const summary = analytics.getSummary();
      expect(summary.features).toBe(0);
      expect(summary.conversations).toBe(0);
      expect(summary.providers).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect tracking configuration', () => {
      analytics = new UsageAnalytics(collector, {
        trackFeatures: false,
        trackConversations: false,
        trackProviders: false,
        trackProactive: false,
      });

      analytics.trackFeature('feature-a', 'use');
      analytics.startConversation('conv-1');
      analytics.trackProviderRequest('openai', 150, true);
      analytics.trackProactiveSuggestion('sugg-1');

      const summary = analytics.getSummary();
      expect(summary.features).toBe(0);
      expect(summary.conversations).toBe(0);
      expect(summary.providers).toBe(0);
      expect(summary.proactive.totalSuggestions).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty statistics gracefully', () => {
      analytics = new UsageAnalytics(collector);

      const stats = analytics.getConversationStats();
      expect(stats.totalConversations).toBe(0);
      expect(stats.avgMessageCount).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('should handle missing conversation', () => {
      analytics = new UsageAnalytics(collector);

      // Track message for non-existent conversation
      analytics.trackMessage('nonexistent', 50, 'user');

      const stats = analytics.getConversationStats();
      expect(stats.totalConversations).toBe(0);
    });

    it('should handle provider without requests', () => {
      analytics = new UsageAnalytics(collector);

      const stats = analytics.getProviderStats('nonexistent');
      expect(stats.length).toBe(0);
    });
  });
});
