# Pre-built Modes Guide

Complete guide to using pre-built modes in ClippyJS AI Integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Available Modes](#available-modes)
3. [Basic Usage](#basic-usage)
4. [Configuration](#configuration)
5. [Quick Actions](#quick-actions)
6. [Advanced Usage](#advanced-usage)
7. [Mode Reference](#mode-reference)
8. [Best Practices](#best-practices)

---

## Overview

### What are Pre-built Modes?

Pre-built Modes are specialized configurations for the AIClippyProvider that tailor the assistant's behavior for specific use cases. Each mode includes:

- **System Prompt Extension**: Custom instructions that shape AI responses
- **Quick Actions**: Preset prompts for common tasks
- **Context Providers**: Optional context gathering specific to the mode
- **Proactive Strategy**: Trigger logic for proactive suggestions

### Why Use Modes?

- **Specialized Behavior**: AI assistant adapts to specific domains (help, code review, shopping, etc.)
- **Quick Actions**: Pre-configured prompts save users time
- **Consistency**: Standardized behavior across different use cases
- **Flexibility**: Easy to switch between modes or customize further

---

## Available Modes

ClippyJS includes 5 pre-built modes:

| Mode | Use Case | Description |
|------|----------|-------------|
| **help-assistant** | General Help | Website navigation and feature explanation |
| **code-reviewer** | Development | Code analysis, bug identification, best practices |
| **shopping-assistant** | E-commerce | Product comparison, purchase guidance |
| **form-helper** | Forms | Form completion, validation assistance |
| **accessibility-guide** | Accessibility | Screen reader navigation, keyboard shortcuts |

---

## Basic Usage

### Using Mode by Name (String)

The simplest way to use a mode is by passing its name as a string:

```typescript
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

function App() {
  const provider = new AnthropicProvider();

  return (
    <AIClippyProvider
      config={{
        provider,
        agentName: 'Clippy',
        personalityMode: 'classic',
        mode: 'help-assistant', // ← Mode by name
      }}
    >
      <YourApp />
    </AIClippyProvider>
  );
}
```

### Using Mode Object (Direct Import)

For better type safety, import and use the mode object directly:

```typescript
import { AIClippyProvider, codeReviewerMode } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

function App() {
  const provider = new AnthropicProvider();

  return (
    <AIClippyProvider
      config={{
        provider,
        agentName: 'Clippy',
        personalityMode: 'classic',
        mode: codeReviewerMode, // ← Mode object
      }}
    >
      <YourApp />
    </AIClippyProvider>
  );
}
```

### Accessing Current Mode in Components

Use the `useAIClippy` hook to access the current mode:

```typescript
import { useAIClippy } from '@clippyjs/ai';

function ModeDisplay() {
  const { currentMode } = useAIClippy();

  if (!currentMode) {
    return <div>No mode active</div>;
  }

  return (
    <div>
      <h3>{currentMode.name}</h3>
      <p>{currentMode.description}</p>
    </div>
  );
}
```

---

## Configuration

### Mode Configuration Merging

Modes automatically merge with your AIClippyConfig:

```typescript
{
  provider,
  agentName: 'Clippy',
  personalityMode: 'classic',
  mode: 'help-assistant',

  // These merge with mode's defaults:
  contextProviders: [myCustomProvider], // Added to mode's providers
  customPrompt: 'Extra instructions...', // Appended to mode's system prompt
  proactiveConfig: { intrusionLevel: 'low' }, // Overrides mode's strategy
}
```

### Configuration Priority

When configuration conflicts occur, the priority order is:

1. **User Config** (highest priority)
2. **Mode Defaults**
3. **System Defaults** (lowest priority)

**Example:**

```typescript
// Mode has: contextProviders: []
// Config has: contextProviders: [myProvider]
// Result: [myProvider] (user config wins)

// Mode has: systemPromptExtension: "You are a helpful assistant..."
// Config has: customPrompt: "Always be concise."
// Result: "You are a helpful assistant...\n\nAlways be concise." (both merged)
```

### No Mode Configuration

You can use AIClippyProvider without a mode:

```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'classic',
    // No mode specified - uses default behavior
  }}
>
  <YourApp />
</AIClippyProvider>
```

---

## Quick Actions

### What are Quick Actions?

Quick Actions are preset prompts that users can trigger with a single click. Each mode includes relevant quick actions for its domain.

### Displaying Quick Actions

```typescript
import { useAIClippy } from '@clippyjs/ai';

function QuickActions() {
  const { currentMode } = useAIClippy();

  if (!currentMode?.quickActions) {
    return null;
  }

  return (
    <div>
      <h4>Quick Actions</h4>
      {currentMode.quickActions.map((action, index) => (
        <button key={index} onClick={() => handleAction(action.prompt)}>
          {action.icon} {action.label}
        </button>
      ))}
    </div>
  );
}

function handleAction(prompt: string) {
  // Use the prompt with your chat interface
  console.log('Quick action prompt:', prompt);
}
```

### Quick Action Structure

```typescript
interface QuickAction {
  label: string;        // Display text for the button
  prompt: string;       // Full prompt to send to AI
  icon?: string;        // Optional emoji or icon
  shortcut?: string;    // Optional keyboard shortcut
}
```

---

## Advanced Usage

### Extending Mode Behavior

Add custom context providers to a mode:

```typescript
import { helpAssistantMode } from '@clippyjs/ai';

const customProvider = {
  name: 'user-preferences',
  description: 'User preference context',
  provide: async () => ({
    theme: 'dark',
    language: 'en',
  }),
};

<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'classic',
    mode: helpAssistantMode,
    contextProviders: [customProvider], // Merged with mode's providers
  }}
>
  <YourApp />
</AIClippyProvider>
```

### Customizing Proactive Behavior

Override mode's proactive strategy:

```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'classic',
    mode: 'code-reviewer',
    proactiveConfig: {
      enabled: true,
      intrusionLevel: 'low',     // Override mode default
      checkInterval: 30000,       // 30 seconds
      maxIgnoresBeforeCooldown: 3,
    },
  }}
>
  <YourApp />
</AIClippyProvider>
```

### Dynamic Mode Switching

Switch modes at runtime (requires remounting AIClippyProvider):

```typescript
function App() {
  const [mode, setMode] = useState<string>('help-assistant');
  const provider = useMemo(() => new AnthropicProvider(), []);

  return (
    <div>
      <select onChange={(e) => setMode(e.target.value)} value={mode}>
        <option value="help-assistant">Help Assistant</option>
        <option value="code-reviewer">Code Reviewer</option>
        <option value="shopping-assistant">Shopping Assistant</option>
      </select>

      <AIClippyProvider
        config={{
          provider,
          agentName: 'Clippy',
          personalityMode: 'classic',
          mode,
        }}
      >
        <YourApp />
      </AIClippyProvider>
    </div>
  );
}
```

---

## Mode Reference

### Help Assistant Mode

**ID**: `help-assistant`

**Use Case**: General website help and navigation assistance

**System Prompt Extension**:
```
You are a helpful website assistant. Your role is to:
- Answer questions about the current page and website
- Explain how to use features and functionality
- Guide users through navigation and tasks
- Provide clear, friendly explanations
- Offer suggestions when users seem stuck

Focus on being proactive but non-intrusive. Only offer help when it's genuinely useful.
Use the page context to provide specific, accurate guidance.
```

**Quick Actions**:
- ❓ What can I do here?
- 🧭 How do I...?
- 💡 Explain this

**Best For**:
- General purpose websites
- User onboarding
- Feature discovery
- FAQ assistance

**Example**:
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'extended',
    mode: 'help-assistant',
  }}
>
  <YourWebsite />
</AIClippyProvider>
```

---

### Code Reviewer Mode

**ID**: `code-reviewer`

**Use Case**: Technical code analysis and review assistance

**System Prompt Extension**:
```
You are an expert code reviewer and technical assistant. Your role is to:
- Analyze code structure and patterns
- Identify potential bugs and issues
- Suggest improvements and best practices
- Explain technical concepts clearly
- Review code for readability and maintainability

Focus on constructive feedback and educational explanations.
Consider performance, security, and code quality in your reviews.
Use examples to illustrate better approaches when suggesting improvements.
```

**Quick Actions**:
- 🔍 Review code
- 📖 Explain function
- ⭐ Best practices

**Best For**:
- Code documentation sites
- Developer tools
- IDE integrations
- Educational platforms

**Example**:
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Merlin',
    personalityMode: 'classic',
    mode: 'code-reviewer',
  }}
>
  <YourCodeEditor />
</AIClippyProvider>
```

---

### Shopping Assistant Mode

**ID**: `shopping-assistant`

**Use Case**: E-commerce guidance and product comparison

**System Prompt Extension**:
```
You are a helpful shopping assistant. Your role is to:
- Help users find and compare products
- Explain product features and specifications
- Suggest alternatives and complementary items
- Guide users through the checkout process
- Answer questions about shipping, returns, and policies

Be objective and helpful without being pushy.
Focus on understanding user needs and preferences.
Provide relevant comparisons when users are deciding between options.
```

**Quick Actions**:
- 🛒 Help me choose
- ⚖️ Compare products
- 📦 Explain features

**Best For**:
- E-commerce websites
- Product pages
- Shopping carts
- Checkout flows

**Example**:
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'extended',
    mode: 'shopping-assistant',
  }}
>
  <YourStore />
</AIClippyProvider>
```

---

### Form Helper Mode

**ID**: `form-helper`

**Use Case**: Form completion and validation assistance

**System Prompt Extension**:
```
You are a form completion assistant. Your role is to:
- Help users understand form fields and requirements
- Explain what information is needed and why
- Assist with validation errors and corrections
- Guide users through multi-step forms
- Provide context about privacy and data usage

Be clear and concise in your explanations.
Help users feel confident about providing information.
Explain technical terms in plain language.
```

**Quick Actions**:
- 📝 Help with form
- ❔ Explain field
- ✅ Validate input

**Best For**:
- Registration forms
- Survey platforms
- Application processes
- Data collection forms

**Example**:
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Genie',
    personalityMode: 'classic',
    mode: 'form-helper',
  }}
>
  <YourForm />
</AIClippyProvider>
```

---

### Accessibility Guide Mode

**ID**: `accessibility-guide`

**Use Case**: Accessibility support and navigation assistance

**System Prompt Extension**:
```
You are an accessibility assistant. Your role is to:
- Explain how to navigate the site using keyboard or screen readers
- Describe visual elements for users who can't see them
- Provide alternative ways to access content and features
- Explain accessibility features and shortcuts
- Help users customize their experience for better accessibility

Be descriptive and specific in your explanations.
Anticipate accessibility challenges and offer solutions.
Respect user preferences and needs.
```

**Quick Actions**:
- ♿ Check accessibility
- 🎯 Explain controls
- ⌨️ Keyboard shortcuts

**Best For**:
- Accessibility-focused sites
- Government websites
- Educational platforms
- Compliance requirements

**Example**:
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'F1',
    personalityMode: 'extended',
    mode: 'accessibility-guide',
  }}
>
  <YourAccessibleSite />
</AIClippyProvider>
```

---

## Best Practices

### Choosing the Right Mode

1. **Match Domain**: Select the mode that best fits your primary use case
2. **Consider User Needs**: Think about what your users most commonly need help with
3. **Start Simple**: Begin with a pre-built mode before creating custom configurations
4. **Test Interactions**: Validate that the mode's behavior matches user expectations

### Mode Selection Guidelines

| If your site is... | Use this mode |
|--------------------|---------------|
| General purpose website | help-assistant |
| Code documentation/IDE | code-reviewer |
| Online store | shopping-assistant |
| Has complex forms | form-helper |
| Accessibility-focused | accessibility-guide |

### Combining with Personality Modes

Modes work with any personality mode:

```typescript
// Professional code assistance
mode: 'code-reviewer',
agentName: 'Merlin',
personalityMode: 'extended'

// Friendly shopping help
mode: 'shopping-assistant',
agentName: 'Clippy',
personalityMode: 'classic'

// Concise form guidance
mode: 'form-helper',
agentName: 'F1',
personalityMode: 'classic'
```

### Custom Prompt Guidelines

When adding custom prompts to modes:

- **Be specific**: Add domain-specific instructions
- **Stay consistent**: Don't contradict the mode's core behavior
- **Keep it brief**: Add only what's necessary
- **Test thoroughly**: Validate that custom prompts work well with mode prompts

**Good Example:**
```typescript
mode: 'help-assistant',
customPrompt: 'This is a banking website. Always mention security best practices when discussing account access.'
```

**Bad Example:**
```typescript
mode: 'help-assistant',
customPrompt: 'You are a shopping assistant...' // Conflicts with mode
```

---

## TypeScript Types

### Mode Interface

```typescript
interface Mode {
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
```

### QuickAction Interface

```typescript
interface QuickAction {
  /** Display label for the action */
  label: string;
  /** Action prompt to send to AI */
  prompt: string;
  /** Optional icon or emoji */
  icon?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
}
```

### TriggerStrategy Interface

```typescript
interface TriggerStrategy {
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
```

---

## FAQ

### Can I create custom modes?

Currently, ClippyJS provides 5 pre-built modes. Custom mode creation is on the roadmap for a future release. However, you can extensively customize existing modes using:
- Custom prompts
- Additional context providers
- Custom proactive configurations

### Can I switch modes dynamically?

Yes, but it requires remounting the AIClippyProvider. See the "Dynamic Mode Switching" example in the Advanced Usage section.

### What happens if I use an invalid mode name?

If you pass an invalid mode name (string), it will be gracefully handled and the provider will operate without a mode (default behavior).

### Do modes work with all agent personalities?

Yes! Modes work with any combination of agent name (Clippy, Merlin, etc.) and personality mode (classic, extended).

### Can I use multiple modes simultaneously?

No, only one mode can be active at a time. However, you can customize a single mode extensively using additional context providers and custom prompts.

### How do modes affect proactive behavior?

Each mode includes a proactive strategy that can define when the AI should offer suggestions. You can override this with custom proactive configuration.

---

## Migration Guide

### From No Mode to Mode

**Before (No Mode):**
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'classic',
    customPrompt: 'You are a helpful assistant for our e-commerce site...',
  }}
>
  <App />
</AIClippyProvider>
```

**After (With Mode):**
```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'classic',
    mode: 'shopping-assistant', // Mode handles e-commerce behavior
    // customPrompt can still add site-specific details
  }}
>
  <App />
</AIClippyProvider>
```

**Benefits:**
- Standardized behavior
- Built-in quick actions
- Better user experience
- Less configuration needed

---

## Additional Resources

- [Main Documentation](./README.md)
- [AI Integration Specification](./AI_INTEGRATION_SPECIFICATION.md)
- [Storybook Examples](../packages/storybook/stories/Modes.stories.tsx)
- [E2E Tests](../packages/ai/tests/e2e/mode-configurations.spec.ts)

---

## Contributing

Have ideas for new modes or improvements to existing ones? See our [contribution guidelines](../CONTRIBUTING.md).

---

**Last Updated**: 2025-10-27
**Version**: 0.4.0 (Phase 4)
**Status**: Active Development
