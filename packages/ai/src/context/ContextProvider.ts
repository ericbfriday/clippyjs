/**
 * Context data structure returned by context providers
 */
export interface ContextData {
  /** Provider identifier */
  provider: string;
  /** Timestamp when context was gathered */
  timestamp: Date;
  /** Provider-specific context data */
  data: Record<string, any>;
}

/**
 * Trigger types for context gathering
 */
export type ContextTrigger = 'proactive' | 'user-prompt';

/**
 * Interface for context providers
 *
 * Context providers gather information about the current page,
 * user actions, application state, or other relevant context
 * to enhance AI responses.
 */
export interface ContextProvider {
  /** Unique name for this provider */
  name: string;

  /** Whether this provider is currently enabled */
  enabled: boolean;

  /**
   * Gather context data
   * @returns Promise resolving to context data
   */
  gather(): Promise<ContextData>;

  /**
   * Determine if context should be included for a specific trigger
   * @param trigger The type of trigger (proactive or user-prompt)
   * @returns True if context should be included
   */
  shouldInclude?(trigger: ContextTrigger): boolean;
}
