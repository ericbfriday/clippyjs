/**
 * Validation middleware for AI requests and responses
 *
 * Validates request structure, enforces input limits, and validates responses
 * to ensure data integrity and prevent malformed operations.
 */

import type { Message, ChatOptions, ContentBlock } from '../providers/AIProvider';

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field path that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Actual value that failed */
  value?: unknown;
  /** Expected format or constraint */
  constraint?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** Sanitized/normalized value (if applicable) */
  sanitized?: unknown;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Rule name */
  name: string;
  /** Validation function */
  validate: (value: unknown, context?: unknown) => boolean | Promise<boolean>;
  /** Error message template */
  message: string | ((value: unknown) => string);
}

/**
 * Validation middleware configuration
 */
export interface ValidationMiddlewareConfig {
  /** Enable validation */
  enabled?: boolean;
  /** Maximum input length (characters) */
  maxInputLength?: number;
  /** Maximum message count per request */
  maxMessages?: number;
  /** Maximum total tokens per request */
  maxTokens?: number;
  /** Validate message structure */
  validateMessages?: boolean;
  /** Validate response structure */
  validateResponses?: boolean;
  /** Validate content blocks */
  validateContentBlocks?: boolean;
  /** Validate tool usage */
  validateTools?: boolean;
  /** Custom validation rules */
  customRules?: ValidationRule[];
  /** Callback on validation failure */
  onValidationError?: (errors: ValidationError[], context?: unknown) => void;
  /** Strict mode (fail on any validation error) */
  strictMode?: boolean;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: Required<Omit<ValidationMiddlewareConfig, 'onValidationError' | 'customRules'>> = {
  enabled: true,
  maxInputLength: 10000,
  maxMessages: 100,
  maxTokens: 100000,
  validateMessages: true,
  validateResponses: true,
  validateContentBlocks: true,
  validateTools: true,
  strictMode: false,
};

/**
 * Validation middleware
 *
 * Validates AI requests and responses to ensure data integrity and prevent malformed operations.
 *
 * Features:
 * - Request structure validation
 * - Input length enforcement
 * - Message format validation
 * - Response structure validation
 * - Content block validation
 * - Tool usage validation
 * - Custom validation rules
 * - Strict and lenient modes
 *
 * Usage:
 * ```ts
 * const validator = new ValidationMiddleware({
 *   maxInputLength: 10000,
 *   maxMessages: 100,
 *   validateMessages: true,
 *   onValidationError: (errors) => {
 *     console.error('Validation failed:', errors);
 *   }
 * });
 *
 * // Validate request
 * const requestValidation = validator.validateRequest(messages, options);
 * if (!requestValidation.isValid) {
 *   throw new Error('Invalid request');
 * }
 *
 * // Validate response
 * const responseValidation = validator.validateResponse(message);
 * if (!responseValidation.isValid) {
 *   console.warn('Invalid response:', responseValidation.errors);
 * }
 * ```
 */
export class ValidationMiddleware {
  private config: Required<Omit<ValidationMiddlewareConfig, 'onValidationError' | 'customRules'>>;
  private onValidationError?: (errors: ValidationError[], context?: unknown) => void;
  private customRules: ValidationRule[];

  constructor(config: ValidationMiddlewareConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_VALIDATION_CONFIG.enabled,
      maxInputLength: config.maxInputLength ?? DEFAULT_VALIDATION_CONFIG.maxInputLength,
      maxMessages: config.maxMessages ?? DEFAULT_VALIDATION_CONFIG.maxMessages,
      maxTokens: config.maxTokens ?? DEFAULT_VALIDATION_CONFIG.maxTokens,
      validateMessages: config.validateMessages ?? DEFAULT_VALIDATION_CONFIG.validateMessages,
      validateResponses: config.validateResponses ?? DEFAULT_VALIDATION_CONFIG.validateResponses,
      validateContentBlocks: config.validateContentBlocks ?? DEFAULT_VALIDATION_CONFIG.validateContentBlocks,
      validateTools: config.validateTools ?? DEFAULT_VALIDATION_CONFIG.validateTools,
      strictMode: config.strictMode ?? DEFAULT_VALIDATION_CONFIG.strictMode,
    };
    this.onValidationError = config.onValidationError;
    this.customRules = config.customRules || [];
  }

  /**
   * Validate request (messages and options)
   */
  validateRequest(messages: Message[], options?: ChatOptions): ValidationResult {
    if (!this.config.enabled) {
      return { isValid: true, errors: [] };
    }

    const errors: ValidationError[] = [];

    // Validate message count
    if (messages.length > this.config.maxMessages) {
      errors.push({
        field: 'messages',
        message: `Too many messages: ${messages.length} exceeds maximum of ${this.config.maxMessages}`,
        value: messages.length,
        constraint: `maxMessages: ${this.config.maxMessages}`,
      });
    }

    // Validate messages structure
    if (this.config.validateMessages) {
      messages.forEach((message, index) => {
        const messageErrors = this.validateMessage(message, `messages[${index}]`);
        errors.push(...messageErrors);
      });
    }

    // Validate total input length
    const totalLength = this.calculateTotalInputLength(messages);
    if (totalLength > this.config.maxInputLength) {
      errors.push({
        field: 'messages',
        message: `Total input length ${totalLength} exceeds maximum of ${this.config.maxInputLength}`,
        value: totalLength,
        constraint: `maxInputLength: ${this.config.maxInputLength}`,
      });
    }

    // Validate options
    if (options) {
      const optionErrors = this.validateOptions(options);
      errors.push(...optionErrors);
    }

    // Apply custom rules
    for (const rule of this.customRules) {
      const isValid = rule.validate({ messages, options });
      if (isValid instanceof Promise) {
        // Skip async rules in sync validation
        continue;
      }
      if (!isValid) {
        const message = typeof rule.message === 'function' ? rule.message({ messages, options }) : rule.message;
        errors.push({
          field: rule.name,
          message,
          value: { messages, options },
        });
      }
    }

    const isValid = errors.length === 0;

    if (!isValid && this.onValidationError) {
      this.onValidationError(errors, { messages, options });
    }

    return { isValid, errors };
  }

  /**
   * Validate response message
   */
  validateResponse(message: Message): ValidationResult {
    if (!this.config.enabled || !this.config.validateResponses) {
      return { isValid: true, errors: [] };
    }

    const errors = this.validateMessage(message, 'response');

    const isValid = errors.length === 0;

    if (!isValid && this.onValidationError) {
      this.onValidationError(errors, { message });
    }

    return { isValid, errors };
  }

  /**
   * Validate individual message
   */
  private validateMessage(message: Message, fieldPath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate role
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      errors.push({
        field: `${fieldPath}.role`,
        message: `Invalid role: must be 'user', 'assistant', or 'system'`,
        value: message.role,
        constraint: "role: 'user' | 'assistant' | 'system'",
      });
    }

    // Validate content
    if (!message.content || (Array.isArray(message.content) && message.content.length === 0)) {
      errors.push({
        field: `${fieldPath}.content`,
        message: 'Message content is required',
        value: message.content,
      });
    }

    // Validate content blocks
    if (this.config.validateContentBlocks && Array.isArray(message.content)) {
      message.content.forEach((block, index) => {
        const blockErrors = this.validateContentBlock(block, `${fieldPath}.content[${index}]`);
        errors.push(...blockErrors);
      });
    }

    return errors;
  }

  /**
   * Validate content block
   */
  private validateContentBlock(block: ContentBlock, fieldPath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!block.type) {
      errors.push({
        field: `${fieldPath}.type`,
        message: 'Content block type is required',
        value: block,
      });
      return errors;
    }

    switch (block.type) {
      case 'text':
        if (!('text' in block) || typeof block.text !== 'string') {
          errors.push({
            field: `${fieldPath}.text`,
            message: 'Text block must have a string text field',
            value: block,
          });
        }
        break;

      case 'image':
        if (!('source' in block) || !block.source) {
          errors.push({
            field: `${fieldPath}.source`,
            message: 'Image block must have a source',
            value: block,
          });
        }
        break;

      case 'tool_use':
        if (this.config.validateTools) {
          if (!('id' in block) || !block.id) {
            errors.push({
              field: `${fieldPath}.id`,
              message: 'Tool use block must have an id',
              value: block,
            });
          }
          if (!('name' in block) || !block.name) {
            errors.push({
              field: `${fieldPath}.name`,
              message: 'Tool use block must have a name',
              value: block,
            });
          }
          if (!('input' in block)) {
            errors.push({
              field: `${fieldPath}.input`,
              message: 'Tool use block must have input',
              value: block,
            });
          }
        }
        break;

      case 'tool_result':
        if (this.config.validateTools) {
          if (!('tool_use_id' in block) || !block.tool_use_id) {
            errors.push({
              field: `${fieldPath}.tool_use_id`,
              message: 'Tool result block must have a tool_use_id',
              value: block,
            });
          }
          if (!('content' in block)) {
            errors.push({
              field: `${fieldPath}.content`,
              message: 'Tool result block must have content',
              value: block,
            });
          }
        }
        break;
    }

    return errors;
  }

  /**
   * Validate chat options
   */
  private validateOptions(options: ChatOptions): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate maxTokens
    if (options.maxTokens !== undefined) {
      if (typeof options.maxTokens !== 'number' || options.maxTokens <= 0) {
        errors.push({
          field: 'options.maxTokens',
          message: 'maxTokens must be a positive number',
          value: options.maxTokens,
          constraint: 'maxTokens > 0',
        });
      } else if (options.maxTokens > this.config.maxTokens) {
        errors.push({
          field: 'options.maxTokens',
          message: `maxTokens ${options.maxTokens} exceeds maximum of ${this.config.maxTokens}`,
          value: options.maxTokens,
          constraint: `maxTokens <= ${this.config.maxTokens}`,
        });
      }
    }

    // Validate temperature
    if (options.temperature !== undefined) {
      if (typeof options.temperature !== 'number' || options.temperature < 0 || options.temperature > 2) {
        errors.push({
          field: 'options.temperature',
          message: 'temperature must be between 0 and 2',
          value: options.temperature,
          constraint: '0 <= temperature <= 2',
        });
      }
    }

    // Validate tools
    if (this.config.validateTools && options.tools) {
      if (!Array.isArray(options.tools)) {
        errors.push({
          field: 'options.tools',
          message: 'tools must be an array',
          value: options.tools,
        });
      } else {
        options.tools.forEach((tool, index) => {
          if (!tool.name || typeof tool.name !== 'string') {
            errors.push({
              field: `options.tools[${index}].name`,
              message: 'Tool must have a name',
              value: tool,
            });
          }
          if (!tool.description || typeof tool.description !== 'string') {
            errors.push({
              field: `options.tools[${index}].description`,
              message: 'Tool must have a description',
              value: tool,
            });
          }
          if (!tool.input_schema || typeof tool.input_schema !== 'object') {
            errors.push({
              field: `options.tools[${index}].input_schema`,
              message: 'Tool must have an input_schema',
              value: tool,
            });
          }
        });
      }
    }

    return errors;
  }

  /**
   * Calculate total input length
   */
  private calculateTotalInputLength(messages: Message[]): number {
    let totalLength = 0;

    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalLength += message.content.length;
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (block.type === 'text' && 'text' in block) {
            totalLength += block.text.length;
          }
        }
      }
    }

    return totalLength;
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.customRules.push(rule);
  }

  /**
   * Remove custom validation rule
   */
  removeRule(ruleName: string): void {
    this.customRules = this.customRules.filter((r) => r.name !== ruleName);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return [...this.customRules];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ValidationMiddlewareConfig>): void {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.maxInputLength !== undefined) this.config.maxInputLength = config.maxInputLength;
    if (config.maxMessages !== undefined) this.config.maxMessages = config.maxMessages;
    if (config.maxTokens !== undefined) this.config.maxTokens = config.maxTokens;
    if (config.validateMessages !== undefined) this.config.validateMessages = config.validateMessages;
    if (config.validateResponses !== undefined) this.config.validateResponses = config.validateResponses;
    if (config.validateContentBlocks !== undefined) this.config.validateContentBlocks = config.validateContentBlocks;
    if (config.validateTools !== undefined) this.config.validateTools = config.validateTools;
    if (config.strictMode !== undefined) this.config.strictMode = config.strictMode;
    if (config.onValidationError) this.onValidationError = config.onValidationError;
    if (config.customRules) this.customRules = config.customRules;
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationMiddlewareConfig {
    return {
      enabled: this.config.enabled,
      maxInputLength: this.config.maxInputLength,
      maxMessages: this.config.maxMessages,
      maxTokens: this.config.maxTokens,
      validateMessages: this.config.validateMessages,
      validateResponses: this.config.validateResponses,
      validateContentBlocks: this.config.validateContentBlocks,
      validateTools: this.config.validateTools,
      strictMode: this.config.strictMode,
      customRules: this.customRules,
      onValidationError: this.onValidationError,
    };
  }

  /**
   * Check if validation is in strict mode
   */
  isStrictMode(): boolean {
    return this.config.strictMode;
  }
}
