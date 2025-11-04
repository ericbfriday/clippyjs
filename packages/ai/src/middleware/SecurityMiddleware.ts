/**
 * Security middleware for AI operations
 *
 * Provides input sanitization, XSS prevention, and security hardening
 * to protect against malicious inputs and injection attacks.
 */

import type { Message, ContentBlock } from '../providers/AIProvider';

/**
 * Security threat type
 */
export type SecurityThreatType =
  | 'xss'
  | 'sql-injection'
  | 'command-injection'
  | 'path-traversal'
  | 'excessive-length'
  | 'malicious-content'
  | 'unsafe-html'
  | 'suspicious-pattern';

/**
 * Security violation details
 */
export interface SecurityViolation {
  /** Threat type detected */
  type: SecurityThreatType;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description of the threat */
  description: string;
  /** Field path where threat was detected */
  field: string;
  /** Original value (sanitized for logging) */
  sanitizedValue?: string;
  /** Mitigation action taken */
  action: 'sanitized' | 'blocked' | 'flagged';
}

/**
 * Security check result
 */
export interface SecurityResult {
  /** Whether input is safe */
  isSafe: boolean;
  /** List of security violations */
  violations: SecurityViolation[];
  /** Sanitized content (if applicable) */
  sanitized?: unknown;
}

/**
 * Security middleware configuration
 */
export interface SecurityMiddlewareConfig {
  /** Enable security checks */
  enabled?: boolean;
  /** Sanitize HTML content */
  sanitizeHtml?: boolean;
  /** Prevent XSS attacks */
  preventXss?: boolean;
  /** Detect SQL injection attempts */
  detectSqlInjection?: boolean;
  /** Detect command injection attempts */
  detectCommandInjection?: boolean;
  /** Detect path traversal attempts */
  detectPathTraversal?: boolean;
  /** Maximum input length per message */
  maxInputLength?: number;
  /** Block requests with violations */
  blockOnViolation?: boolean;
  /** Callback when security violation is detected */
  onSecurityViolation?: (violations: SecurityViolation[], context?: unknown) => void;
  /** Custom security patterns to detect */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: Required<Omit<SecurityMiddlewareConfig, 'onSecurityViolation' | 'customPatterns'>> = {
  enabled: true,
  sanitizeHtml: true,
  preventXss: true,
  detectSqlInjection: true,
  detectCommandInjection: true,
  detectPathTraversal: true,
  maxInputLength: 10000,
  blockOnViolation: false,
};

/**
 * Security patterns for threat detection
 */
const SECURITY_PATTERNS = {
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /<iframe\b/gi,
    /<embed\b/gi,
    /<object\b/gi,
  ],
  sqlInjection: [
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/gi,
    /(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/gi,
    /(\bDELETE\b.*\bFROM\b.*\bWHERE\b)/gi,
    /(\bDROP\b.*\bTABLE\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi,
    /(--|#|\/\*|\*\/)/g,
  ],
  commandInjection: [
    /[;&|`$()]/g,
    /\b(eval|exec|system|shell_exec|passthru|proc_open|popen)\b/gi,
  ],
  pathTraversal: [
    /\.\.[\/\\]/g,
    /\/(etc|proc|sys|dev|bin|usr|var|tmp)\//gi,
  ],
};

/**
 * Security middleware
 *
 * Protects AI operations from security threats including XSS, injection attacks,
 * and malicious content.
 *
 * Features:
 * - HTML sanitization
 * - XSS prevention
 * - SQL injection detection
 * - Command injection detection
 * - Path traversal detection
 * - Input length enforcement
 * - Custom threat pattern detection
 *
 * Usage:
 * ```ts
 * const security = new SecurityMiddleware({
 *   sanitizeHtml: true,
 *   preventXss: true,
 *   maxInputLength: 10000,
 *   blockOnViolation: true,
 *   onSecurityViolation: (violations) => {
 *     console.error('Security threat detected:', violations);
 *   }
 * });
 *
 * // Check message security
 * const result = security.checkMessages(messages);
 * if (!result.isSafe && security.shouldBlock()) {
 *   throw new Error('Security violation detected');
 * }
 *
 * // Use sanitized content
 * const sanitized = security.sanitizeMessages(messages);
 * ```
 */
export class SecurityMiddleware {
  private config: Required<Omit<SecurityMiddlewareConfig, 'onSecurityViolation' | 'customPatterns'>>;
  private onSecurityViolation?: (violations: SecurityViolation[], context?: unknown) => void;
  private customPatterns: Array<{
    name: string;
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;

  constructor(config: SecurityMiddlewareConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_SECURITY_CONFIG.enabled,
      sanitizeHtml: config.sanitizeHtml ?? DEFAULT_SECURITY_CONFIG.sanitizeHtml,
      preventXss: config.preventXss ?? DEFAULT_SECURITY_CONFIG.preventXss,
      detectSqlInjection: config.detectSqlInjection ?? DEFAULT_SECURITY_CONFIG.detectSqlInjection,
      detectCommandInjection: config.detectCommandInjection ?? DEFAULT_SECURITY_CONFIG.detectCommandInjection,
      detectPathTraversal: config.detectPathTraversal ?? DEFAULT_SECURITY_CONFIG.detectPathTraversal,
      maxInputLength: config.maxInputLength ?? DEFAULT_SECURITY_CONFIG.maxInputLength,
      blockOnViolation: config.blockOnViolation ?? DEFAULT_SECURITY_CONFIG.blockOnViolation,
    };
    this.onSecurityViolation = config.onSecurityViolation;
    this.customPatterns = config.customPatterns || [];
  }

  /**
   * Check messages for security threats
   */
  checkMessages(messages: Message[]): SecurityResult {
    if (!this.config.enabled) {
      return { isSafe: true, violations: [] };
    }

    const violations: SecurityViolation[] = [];

    for (const [index, message] of messages.entries()) {
      const messageViolations = this.checkMessage(message, `messages[${index}]`);
      violations.push(...messageViolations);
    }

    const isSafe = violations.length === 0 || !violations.some((v) => v.severity === 'critical' || v.severity === 'high');

    if (!isSafe && this.onSecurityViolation) {
      this.onSecurityViolation(violations, { messages });
    }

    return { isSafe, violations };
  }

  /**
   * Sanitize messages (remove threats and clean content)
   */
  sanitizeMessages(messages: Message[]): Message[] {
    if (!this.config.enabled) {
      return messages;
    }

    return messages.map((message) => this.sanitizeMessage(message));
  }

  /**
   * Check if middleware should block based on violations
   */
  shouldBlock(): boolean {
    return this.config.blockOnViolation;
  }

  /**
   * Check individual message for threats
   */
  private checkMessage(message: Message, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check content
    if (typeof message.content === 'string') {
      violations.push(...this.checkTextContent(message.content, `${fieldPath}.content`));
    } else if (Array.isArray(message.content)) {
      message.content.forEach((block, index) => {
        violations.push(...this.checkContentBlock(block, `${fieldPath}.content[${index}]`));
      });
    }

    return violations;
  }

  /**
   * Check content block for threats
   */
  private checkContentBlock(block: ContentBlock, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    if (block.type === 'text' && 'text' in block) {
      violations.push(...this.checkTextContent(block.text, `${fieldPath}.text`));
    }

    return violations;
  }

  /**
   * Check text content for security threats
   */
  private checkTextContent(text: string, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check length
    if (text.length > this.config.maxInputLength) {
      violations.push({
        type: 'excessive-length',
        severity: 'medium',
        description: `Input length ${text.length} exceeds maximum of ${this.config.maxInputLength}`,
        field: fieldPath,
        action: 'flagged',
      });
    }

    // Check XSS
    if (this.config.preventXss) {
      for (const pattern of SECURITY_PATTERNS.xss) {
        if (pattern.test(text)) {
          violations.push({
            type: 'xss',
            severity: 'critical',
            description: 'XSS attack pattern detected',
            field: fieldPath,
            sanitizedValue: this.sanitizeValue(text),
            action: this.config.sanitizeHtml ? 'sanitized' : 'blocked',
          });
          break;
        }
      }
    }

    // Check SQL injection
    if (this.config.detectSqlInjection) {
      for (const pattern of SECURITY_PATTERNS.sqlInjection) {
        if (pattern.test(text)) {
          violations.push({
            type: 'sql-injection',
            severity: 'high',
            description: 'SQL injection pattern detected',
            field: fieldPath,
            sanitizedValue: this.sanitizeValue(text),
            action: 'flagged',
          });
          break;
        }
      }
    }

    // Check command injection
    if (this.config.detectCommandInjection) {
      for (const pattern of SECURITY_PATTERNS.commandInjection) {
        if (pattern.test(text)) {
          violations.push({
            type: 'command-injection',
            severity: 'high',
            description: 'Command injection pattern detected',
            field: fieldPath,
            sanitizedValue: this.sanitizeValue(text),
            action: 'flagged',
          });
          break;
        }
      }
    }

    // Check path traversal
    if (this.config.detectPathTraversal) {
      for (const pattern of SECURITY_PATTERNS.pathTraversal) {
        if (pattern.test(text)) {
          violations.push({
            type: 'path-traversal',
            severity: 'high',
            description: 'Path traversal pattern detected',
            field: fieldPath,
            sanitizedValue: this.sanitizeValue(text),
            action: 'flagged',
          });
          break;
        }
      }
    }

    // Check custom patterns
    for (const customPattern of this.customPatterns) {
      if (customPattern.pattern.test(text)) {
        violations.push({
          type: 'suspicious-pattern',
          severity: customPattern.severity,
          description: customPattern.description,
          field: fieldPath,
          sanitizedValue: this.sanitizeValue(text),
          action: 'flagged',
        });
      }
    }

    return violations;
  }

  /**
   * Sanitize individual message
   */
  private sanitizeMessage(message: Message): Message {
    const sanitized = { ...message };

    if (typeof sanitized.content === 'string') {
      sanitized.content = this.sanitizeText(sanitized.content);
    } else if (Array.isArray(sanitized.content)) {
      sanitized.content = sanitized.content.map((block) => this.sanitizeContentBlock(block));
    }

    return sanitized;
  }

  /**
   * Sanitize content block
   */
  private sanitizeContentBlock(block: ContentBlock): ContentBlock {
    if (block.type === 'text' && 'text' in block) {
      return {
        ...block,
        text: this.sanitizeText(block.text),
      };
    }

    return block;
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    let sanitized = text;

    // Enforce length limit
    if (sanitized.length > this.config.maxInputLength) {
      sanitized = sanitized.substring(0, this.config.maxInputLength);
    }

    // Remove XSS patterns
    if (this.config.preventXss && this.config.sanitizeHtml) {
      for (const pattern of SECURITY_PATTERNS.xss) {
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return sanitized;
  }

  /**
   * Sanitize value for safe logging
   */
  private sanitizeValue(value: string): string {
    const maxLength = 100;
    const sanitized = value.substring(0, maxLength);
    return sanitized.replace(/[<>'"]/g, '');
  }

  /**
   * Add custom security pattern
   */
  addPattern(pattern: {
    name: string;
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Remove custom security pattern
   */
  removePattern(name: string): void {
    this.customPatterns = this.customPatterns.filter((p) => p.name !== name);
  }

  /**
   * Get all custom patterns
   */
  getPatterns(): Array<{
    name: string;
    pattern: RegExp;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> {
    return [...this.customPatterns];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SecurityMiddlewareConfig>): void {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.sanitizeHtml !== undefined) this.config.sanitizeHtml = config.sanitizeHtml;
    if (config.preventXss !== undefined) this.config.preventXss = config.preventXss;
    if (config.detectSqlInjection !== undefined) this.config.detectSqlInjection = config.detectSqlInjection;
    if (config.detectCommandInjection !== undefined) this.config.detectCommandInjection = config.detectCommandInjection;
    if (config.detectPathTraversal !== undefined) this.config.detectPathTraversal = config.detectPathTraversal;
    if (config.maxInputLength !== undefined) this.config.maxInputLength = config.maxInputLength;
    if (config.blockOnViolation !== undefined) this.config.blockOnViolation = config.blockOnViolation;
    if (config.onSecurityViolation) this.onSecurityViolation = config.onSecurityViolation;
    if (config.customPatterns) this.customPatterns = config.customPatterns;
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityMiddlewareConfig {
    return {
      enabled: this.config.enabled,
      sanitizeHtml: this.config.sanitizeHtml,
      preventXss: this.config.preventXss,
      detectSqlInjection: this.config.detectSqlInjection,
      detectCommandInjection: this.config.detectCommandInjection,
      detectPathTraversal: this.config.detectPathTraversal,
      maxInputLength: this.config.maxInputLength,
      blockOnViolation: this.config.blockOnViolation,
      customPatterns: this.customPatterns,
      onSecurityViolation: this.onSecurityViolation,
    };
  }

  /**
   * Check if blocking is enabled
   */
  isBlockingEnabled(): boolean {
    return this.config.blockOnViolation;
  }
}
