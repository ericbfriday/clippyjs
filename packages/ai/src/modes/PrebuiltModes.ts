import type { ContextProvider } from '../context/ContextProvider';
import type { ProactiveTriggerReason } from '../proactive/ProactiveBehaviorEngine';

/**
 * Quick action that can be triggered by the user
 */
export interface QuickAction {
  /** Display label for the action */
  label: string;
  /** Action prompt to send to AI */
  prompt: string;
  /** Optional icon or emoji */
  icon?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
}

/**
 * Trigger strategy for proactive behavior
 * Defines when and how the AI should proactively offer assistance
 */
export interface TriggerStrategy {
  /** Name of the strategy */
  name: string;
  /** Description of when this strategy triggers */
  description: string;
  /** Evaluation function to determine if trigger should fire */
  shouldTrigger: (context: Record<string, unknown>) => boolean;
  /** Trigger reason to report when fired */
  reason: ProactiveTriggerReason;
  /** Priority level (higher = more important) */
  priority?: number;
}

/**
 * Pre-built AI assistant mode configuration
 *
 * Modes define specialized behaviors for different use cases like help,
 * code review, shopping assistance, form completion, and accessibility.
 */
export interface Mode {
  /** Unique mode identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** System prompt extension (appended to personality prompt) */
  systemPromptExtension: string;
  /** Context providers specific to this mode */
  contextProviders: ContextProvider[];
  /** Quick actions available in this mode */
  quickActions: QuickAction[];
  /** Proactive behavior trigger strategy */
  proactiveStrategy: TriggerStrategy;
}

/**
 * Default trigger strategy - standard time-based proactive suggestions
 */
export const defaultTriggerStrategy: TriggerStrategy = {
  name: 'default',
  description: 'Standard time-based proactive suggestions',
  shouldTrigger: () => true, // Let ProactiveBehaviorEngine handle timing
  reason: 'idle',
  priority: 1,
};

/**
 * Help Assistant Mode
 *
 * General website help and navigation assistance.
 * Focuses on answering user questions and explaining page functionality.
 */
export const helpAssistantMode: Mode = {
  name: 'help-assistant',
  description: 'General website help and navigation assistance',
  systemPromptExtension: `
You are a helpful website assistant. Your role is to:
- Answer questions about the current page and website
- Explain how to use features and functionality
- Guide users through navigation and tasks
- Provide clear, friendly explanations
- Offer suggestions when users seem stuck

Focus on being proactive but non-intrusive. Only offer help when it's genuinely useful.
Use the page context to provide specific, accurate guidance.
`,
  contextProviders: [],
  quickActions: [
    {
      label: 'What can I do here?',
      prompt: 'What can I do on this page? What are the main features and actions available?',
      icon: '❓',
    },
    {
      label: 'How do I...?',
      prompt: 'I need help with something on this page. Can you guide me?',
      icon: '🧭',
    },
    {
      label: 'Explain this',
      prompt: 'Can you explain what this page or section does?',
      icon: '💡',
    },
  ],
  proactiveStrategy: defaultTriggerStrategy,
};

/**
 * Code Reviewer Mode
 *
 * Technical code analysis and review assistance.
 * Helps developers understand and improve code quality.
 */
export const codeReviewerMode: Mode = {
  name: 'code-reviewer',
  description: 'Technical code analysis and review assistance',
  systemPromptExtension: `
You are an expert code reviewer and technical assistant. Your role is to:
- Analyze code structure and patterns
- Identify potential bugs and issues
- Suggest improvements and best practices
- Explain technical concepts clearly
- Review code for readability and maintainability

Focus on constructive feedback and educational explanations.
Consider performance, security, and code quality in your reviews.
Use examples to illustrate better approaches when suggesting improvements.
`,
  contextProviders: [],
  quickActions: [
    {
      label: 'Review code',
      prompt: 'Can you review this code and suggest improvements?',
      icon: '🔍',
    },
    {
      label: 'Explain function',
      prompt: 'Can you explain what this function or code section does?',
      icon: '📖',
    },
    {
      label: 'Best practices',
      prompt: 'What are the best practices for this code? How can it be improved?',
      icon: '⭐',
    },
  ],
  proactiveStrategy: defaultTriggerStrategy,
};

/**
 * Shopping Assistant Mode
 *
 * E-commerce guidance and product comparison assistance.
 * Helps users make informed purchasing decisions.
 */
export const shoppingAssistantMode: Mode = {
  name: 'shopping-assistant',
  description: 'E-commerce guidance and product comparison',
  systemPromptExtension: `
You are a helpful shopping assistant. Your role is to:
- Help users find and compare products
- Explain product features and specifications
- Suggest alternatives and complementary items
- Guide users through the checkout process
- Answer questions about shipping, returns, and policies

Be objective and helpful without being pushy.
Focus on understanding user needs and preferences.
Provide relevant comparisons when users are deciding between options.
`,
  contextProviders: [],
  quickActions: [
    {
      label: 'Help me choose',
      prompt: 'Can you help me choose between these products?',
      icon: '🛒',
    },
    {
      label: 'Compare products',
      prompt: 'Can you compare these products and their features?',
      icon: '⚖️',
    },
    {
      label: 'Explain features',
      prompt: 'Can you explain the features and benefits of this product?',
      icon: '📦',
    },
  ],
  proactiveStrategy: defaultTriggerStrategy,
};

/**
 * Form Helper Mode
 *
 * Form completion and validation assistance.
 * Guides users through filling out forms correctly.
 */
export const formHelperMode: Mode = {
  name: 'form-helper',
  description: 'Form completion and validation assistance',
  systemPromptExtension: `
You are a form completion assistant. Your role is to:
- Help users understand form fields and requirements
- Explain what information is needed and why
- Assist with validation errors and corrections
- Guide users through multi-step forms
- Provide context about privacy and data usage

Be clear and concise in your explanations.
Help users feel confident about providing information.
Explain technical terms in plain language.
`,
  contextProviders: [],
  quickActions: [
    {
      label: 'Help with form',
      prompt: 'Can you help me fill out this form?',
      icon: '📝',
    },
    {
      label: 'Explain field',
      prompt: 'What does this form field mean? What should I enter here?',
      icon: '❔',
    },
    {
      label: 'Validate input',
      prompt: 'Why is this field showing an error? How do I fix it?',
      icon: '✅',
    },
  ],
  proactiveStrategy: defaultTriggerStrategy,
};

/**
 * Accessibility Guide Mode
 *
 * Accessibility support and navigation assistance.
 * Helps users with accessibility needs navigate and use the site.
 */
export const accessibilityGuideMode: Mode = {
  name: 'accessibility-guide',
  description: 'Accessibility support and navigation assistance',
  systemPromptExtension: `
You are an accessibility assistant. Your role is to:
- Explain how to navigate the site using keyboard or screen readers
- Describe visual elements for users who can't see them
- Provide alternative ways to access content and features
- Explain accessibility features and shortcuts
- Help users customize their experience for better accessibility

Be descriptive and specific in your explanations.
Anticipate accessibility challenges and offer solutions.
Respect user preferences and needs.
`,
  contextProviders: [],
  quickActions: [
    {
      label: 'Check accessibility',
      prompt: 'How can I access this feature using keyboard or screen reader?',
      icon: '♿',
    },
    {
      label: 'Explain controls',
      prompt: 'Can you explain how to use this interface element?',
      icon: '🎯',
    },
    {
      label: 'Keyboard shortcuts',
      prompt: 'What keyboard shortcuts are available on this page?',
      icon: '⌨️',
    },
  ],
  proactiveStrategy: defaultTriggerStrategy,
};

/**
 * Pre-built modes registry
 */
export const PREBUILT_MODES: Record<string, Mode> = {
  'help-assistant': helpAssistantMode,
  'code-reviewer': codeReviewerMode,
  'shopping-assistant': shoppingAssistantMode,
  'form-helper': formHelperMode,
  'accessibility-guide': accessibilityGuideMode,
};

/**
 * Get a pre-built mode by name
 * @param name Mode name
 * @returns Mode configuration or undefined if not found
 */
export function getMode(name: string): Mode | undefined {
  return PREBUILT_MODES[name];
}

/**
 * Get all available pre-built modes
 * @returns Array of all mode configurations
 */
export function getAllModes(): Mode[] {
  return Object.values(PREBUILT_MODES);
}

/**
 * Check if a mode exists
 * @param name Mode name
 * @returns True if mode exists
 */
export function hasMode(name: string): boolean {
  return name in PREBUILT_MODES;
}
