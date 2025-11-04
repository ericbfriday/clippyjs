/**
 * Usage tracking and quota enforcement system
 *
 * Tracks token usage, request counts, and enforces quotas for users and sessions.
 * Provides detailed usage analytics and quota management.
 */

/**
 * Usage quota configuration
 */
export interface UsageQuota {
  /** Maximum tokens allowed per period */
  maxTokens?: number;
  /** Maximum requests allowed per period */
  maxRequests?: number;
  /** Quota period in milliseconds */
  periodMs: number;
  /** Whether to enforce quota (vs warning only) */
  enforce?: boolean;
}

/**
 * Usage tracker configuration
 */
export interface UsageTrackerConfig {
  /** Enable usage tracking */
  enabled?: boolean;
  /** Daily quotas */
  dailyQuota?: UsageQuota;
  /** Monthly quotas */
  monthlyQuota?: UsageQuota;
  /** Callback when quota is exceeded */
  onQuotaExceeded?: (userId: string, usage: UsageStats) => void;
  /** Callback when quota warning threshold is reached */
  onQuotaWarning?: (userId: string, usage: UsageStats, percentage: number) => void;
  /** Warning threshold percentage (0-1) */
  warningThreshold?: number;
  /** Custom storage backend */
  storage?: UsageStorage;
}

/**
 * Default usage tracker configuration
 */
export const DEFAULT_USAGE_TRACKER_CONFIG: Required<Omit<UsageTrackerConfig, 'onQuotaExceeded' | 'onQuotaWarning' | 'storage'>> = {
  enabled: true,
  dailyQuota: {
    maxTokens: 100000,
    maxRequests: 1000,
    periodMs: 24 * 60 * 60 * 1000,
    enforce: true,
  },
  monthlyQuota: {
    maxTokens: 3000000,
    maxRequests: 30000,
    periodMs: 30 * 24 * 60 * 60 * 1000,
    enforce: true,
  },
  warningThreshold: 0.8,
};

/**
 * Usage statistics
 */
export interface UsageStats {
  /** User/session identifier */
  userId: string;
  /** Current period start timestamp */
  periodStart: number;
  /** Current period end timestamp */
  periodEnd: number;
  /** Total tokens used in period */
  tokensUsed: number;
  /** Total requests made in period */
  requestsUsed: number;
  /** Token quota for period */
  tokenQuota?: number;
  /** Request quota for period */
  requestQuota?: number;
  /** Token usage percentage (0-1) */
  tokenUsagePercentage: number;
  /** Request usage percentage (0-1) */
  requestUsagePercentage: number;
  /** Whether quota is exceeded */
  isExceeded: boolean;
  /** Whether warning threshold is exceeded */
  isWarning: boolean;
  /** Remaining tokens */
  tokensRemaining?: number;
  /** Remaining requests */
  requestsRemaining?: number;
}

/**
 * Usage record for storage
 */
export interface UsageRecord {
  userId: string;
  periodStart: number;
  periodType: 'daily' | 'monthly';
  tokensUsed: number;
  requestsUsed: number;
  lastUpdated: number;
}

/**
 * Storage interface for usage data
 */
export interface UsageStorage {
  /** Get usage record */
  get(userId: string, periodType: 'daily' | 'monthly'): Promise<UsageRecord | null>;
  /** Set usage record */
  set(record: UsageRecord): Promise<void>;
  /** Delete usage record */
  delete(userId: string, periodType: 'daily' | 'monthly'): Promise<void>;
  /** Get all user IDs */
  getAllUserIds(): Promise<string[]>;
}

/**
 * In-memory storage implementation
 */
export class MemoryUsageStorage implements UsageStorage {
  private records = new Map<string, UsageRecord>();

  async get(userId: string, periodType: 'daily' | 'monthly'): Promise<UsageRecord | null> {
    const key = `${userId}:${periodType}`;
    return this.records.get(key) || null;
  }

  async set(record: UsageRecord): Promise<void> {
    const key = `${record.userId}:${record.periodType}`;
    this.records.set(key, record);
  }

  async delete(userId: string, periodType: 'daily' | 'monthly'): Promise<void> {
    const key = `${userId}:${periodType}`;
    this.records.delete(key);
  }

  async getAllUserIds(): Promise<string[]> {
    const userIds = new Set<string>();
    for (const key of this.records.keys()) {
      const userId = key.split(':')[0];
      if (userId) userIds.add(userId);
    }
    return Array.from(userIds);
  }
}

/**
 * Usage tracker
 *
 * Tracks and enforces usage quotas for AI operations.
 *
 * Features:
 * - Token and request counting
 * - Daily and monthly quotas
 * - Quota enforcement and warnings
 * - Customizable storage backend
 * - Automatic period rollover
 * - Usage analytics
 *
 * Usage:
 * ```ts
 * const tracker = new UsageTracker({
 *   dailyQuota: { maxTokens: 100000, maxRequests: 1000, periodMs: 86400000 },
 *   onQuotaExceeded: (userId, stats) => {
 *     console.warn(`User ${userId} exceeded quota`);
 *   },
 *   onQuotaWarning: (userId, stats, pct) => {
 *     console.log(`User ${userId} at ${pct}% of quota`);
 *   }
 * });
 *
 * // Check quota before request
 * const check = await tracker.checkQuota('user-123');
 * if (check.isExceeded) {
 *   throw new Error('Quota exceeded');
 * }
 *
 * // Track usage after request
 * await tracker.trackUsage('user-123', { tokens: 500, requests: 1 });
 *
 * // Get usage stats
 * const stats = await tracker.getUsage('user-123', 'daily');
 * ```
 */
export class UsageTracker {
  private config: Required<Omit<UsageTrackerConfig, 'onQuotaExceeded' | 'onQuotaWarning' | 'storage'>>;
  private onQuotaExceeded?: (userId: string, usage: UsageStats) => void;
  private onQuotaWarning?: (userId: string, usage: UsageStats, percentage: number) => void;
  private storage: UsageStorage;
  private warningsSent = new Set<string>();

  constructor(config: UsageTrackerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_USAGE_TRACKER_CONFIG.enabled,
      dailyQuota: config.dailyQuota ?? DEFAULT_USAGE_TRACKER_CONFIG.dailyQuota,
      monthlyQuota: config.monthlyQuota ?? DEFAULT_USAGE_TRACKER_CONFIG.monthlyQuota,
      warningThreshold: config.warningThreshold ?? DEFAULT_USAGE_TRACKER_CONFIG.warningThreshold,
    };
    this.onQuotaExceeded = config.onQuotaExceeded;
    this.onQuotaWarning = config.onQuotaWarning;
    this.storage = config.storage || new MemoryUsageStorage();
  }

  /**
   * Check if usage is within quota
   */
  async checkQuota(userId: string): Promise<{
    allowed: boolean;
    daily: UsageStats;
    monthly: UsageStats;
    exceededQuota?: 'daily' | 'monthly';
  }> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        daily: this.emptyStats(userId, 'daily'),
        monthly: this.emptyStats(userId, 'monthly'),
      };
    }

    const [daily, monthly] = await Promise.all([
      this.getUsage(userId, 'daily'),
      this.getUsage(userId, 'monthly'),
    ]);

    const dailyExceeded = daily.isExceeded && this.config.dailyQuota.enforce;
    const monthlyExceeded = monthly.isExceeded && this.config.monthlyQuota.enforce;

    if (dailyExceeded && this.onQuotaExceeded) {
      this.onQuotaExceeded(userId, daily);
    }
    if (monthlyExceeded && this.onQuotaExceeded) {
      this.onQuotaExceeded(userId, monthly);
    }

    return {
      allowed: !dailyExceeded && !monthlyExceeded,
      daily,
      monthly,
      exceededQuota: dailyExceeded ? 'daily' : monthlyExceeded ? 'monthly' : undefined,
    };
  }

  /**
   * Track usage for a request
   */
  async trackUsage(
    userId: string,
    usage: { tokens?: number; requests?: number }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const tokens = usage.tokens || 0;
    const requests = usage.requests || 1;

    await Promise.all([
      this.updateUsage(userId, 'daily', tokens, requests),
      this.updateUsage(userId, 'monthly', tokens, requests),
    ]);

    // Check for warnings
    const [daily, monthly] = await Promise.all([
      this.getUsage(userId, 'daily'),
      this.getUsage(userId, 'monthly'),
    ]);

    this.checkWarnings(userId, daily, 'daily');
    this.checkWarnings(userId, monthly, 'monthly');
  }

  /**
   * Get usage statistics
   */
  async getUsage(userId: string, periodType: 'daily' | 'monthly'): Promise<UsageStats> {
    const quota = periodType === 'daily' ? this.config.dailyQuota : this.config.monthlyQuota;
    const now = Date.now();
    const periodStart = this.getPeriodStart(now, quota.periodMs);
    const periodEnd = periodStart + quota.periodMs;

    const record = await this.storage.get(userId, periodType);

    // Check if we need to roll over to new period
    if (!record || record.periodStart < periodStart) {
      return this.emptyStats(userId, periodType);
    }

    const tokenUsagePercentage = quota.maxTokens
      ? record.tokensUsed / quota.maxTokens
      : 0;
    const requestUsagePercentage = quota.maxRequests
      ? record.requestsUsed / quota.maxRequests
      : 0;

    const tokenExceeded = quota.maxTokens !== undefined && record.tokensUsed >= quota.maxTokens;
    const requestExceeded = quota.maxRequests !== undefined && record.requestsUsed >= quota.maxRequests;

    return {
      userId,
      periodStart: record.periodStart,
      periodEnd,
      tokensUsed: record.tokensUsed,
      requestsUsed: record.requestsUsed,
      tokenQuota: quota.maxTokens,
      requestQuota: quota.maxRequests,
      tokenUsagePercentage,
      requestUsagePercentage,
      isExceeded: tokenExceeded || requestExceeded,
      isWarning: tokenUsagePercentage >= this.config.warningThreshold ||
                 requestUsagePercentage >= this.config.warningThreshold,
      tokensRemaining: quota.maxTokens ? Math.max(0, quota.maxTokens - record.tokensUsed) : undefined,
      requestsRemaining: quota.maxRequests ? Math.max(0, quota.maxRequests - record.requestsUsed) : undefined,
    };
  }

  /**
   * Reset usage for user
   */
  async resetUsage(userId: string, periodType?: 'daily' | 'monthly'): Promise<void> {
    if (periodType) {
      await this.storage.delete(userId, periodType);
    } else {
      await Promise.all([
        this.storage.delete(userId, 'daily'),
        this.storage.delete(userId, 'monthly'),
      ]);
    }
    // Clear warnings
    this.warningsSent.delete(`${userId}:daily`);
    this.warningsSent.delete(`${userId}:monthly`);
  }

  /**
   * Get all tracked users
   */
  async getAllUsers(): Promise<string[]> {
    return this.storage.getAllUserIds();
  }

  /**
   * Get usage summary for all users
   */
  async getUsageSummary(): Promise<{
    totalUsers: number;
    dailyStats: { totalTokens: number; totalRequests: number; avgTokensPerUser: number };
    monthlyStats: { totalTokens: number; totalRequests: number; avgTokensPerUser: number };
  }> {
    const userIds = await this.getAllUsers();
    const dailyUsages = await Promise.all(userIds.map((id) => this.getUsage(id, 'daily')));
    const monthlyUsages = await Promise.all(userIds.map((id) => this.getUsage(id, 'monthly')));

    const dailyTotalTokens = dailyUsages.reduce((sum, u) => sum + u.tokensUsed, 0);
    const dailyTotalRequests = dailyUsages.reduce((sum, u) => sum + u.requestsUsed, 0);
    const monthlyTotalTokens = monthlyUsages.reduce((sum, u) => sum + u.tokensUsed, 0);
    const monthlyTotalRequests = monthlyUsages.reduce((sum, u) => sum + u.requestsUsed, 0);

    return {
      totalUsers: userIds.length,
      dailyStats: {
        totalTokens: dailyTotalTokens,
        totalRequests: dailyTotalRequests,
        avgTokensPerUser: userIds.length > 0 ? dailyTotalTokens / userIds.length : 0,
      },
      monthlyStats: {
        totalTokens: monthlyTotalTokens,
        totalRequests: monthlyTotalRequests,
        avgTokensPerUser: userIds.length > 0 ? monthlyTotalTokens / userIds.length : 0,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UsageTrackerConfig>): void {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.dailyQuota) this.config.dailyQuota = config.dailyQuota;
    if (config.monthlyQuota) this.config.monthlyQuota = config.monthlyQuota;
    if (config.warningThreshold !== undefined) this.config.warningThreshold = config.warningThreshold;
    if (config.onQuotaExceeded) this.onQuotaExceeded = config.onQuotaExceeded;
    if (config.onQuotaWarning) this.onQuotaWarning = config.onQuotaWarning;
    if (config.storage) this.storage = config.storage;
  }

  /**
   * Update usage in storage
   */
  private async updateUsage(
    userId: string,
    periodType: 'daily' | 'monthly',
    tokens: number,
    requests: number
  ): Promise<void> {
    const quota = periodType === 'daily' ? this.config.dailyQuota : this.config.monthlyQuota;
    const now = Date.now();
    const periodStart = this.getPeriodStart(now, quota.periodMs);

    const existing = await this.storage.get(userId, periodType);

    // Roll over to new period if needed
    if (!existing || existing.periodStart < periodStart) {
      await this.storage.set({
        userId,
        periodStart,
        periodType,
        tokensUsed: tokens,
        requestsUsed: requests,
        lastUpdated: now,
      });
    } else {
      await this.storage.set({
        ...existing,
        tokensUsed: existing.tokensUsed + tokens,
        requestsUsed: existing.requestsUsed + requests,
        lastUpdated: now,
      });
    }
  }

  /**
   * Get period start timestamp
   */
  private getPeriodStart(now: number, periodMs: number): number {
    return Math.floor(now / periodMs) * periodMs;
  }

  /**
   * Check and send warnings
   */
  private checkWarnings(userId: string, stats: UsageStats, periodType: string): void {
    if (!stats.isWarning || !this.onQuotaWarning) return;

    const warningKey = `${userId}:${periodType}`;
    if (this.warningsSent.has(warningKey)) return;

    const maxPercentage = Math.max(stats.tokenUsagePercentage, stats.requestUsagePercentage);
    this.onQuotaWarning(userId, stats, maxPercentage);
    this.warningsSent.add(warningKey);
  }

  /**
   * Create empty stats
   */
  private emptyStats(userId: string, periodType: 'daily' | 'monthly'): UsageStats {
    const quota = periodType === 'daily' ? this.config.dailyQuota : this.config.monthlyQuota;
    const now = Date.now();
    const periodStart = this.getPeriodStart(now, quota.periodMs);

    return {
      userId,
      periodStart,
      periodEnd: periodStart + quota.periodMs,
      tokensUsed: 0,
      requestsUsed: 0,
      tokenQuota: quota.maxTokens,
      requestQuota: quota.maxRequests,
      tokenUsagePercentage: 0,
      requestUsagePercentage: 0,
      isExceeded: false,
      isWarning: false,
      tokensRemaining: quota.maxTokens,
      requestsRemaining: quota.maxRequests,
    };
  }
}
