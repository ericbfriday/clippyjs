import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ProviderInfo } from './AIClippyContext';
import { VisuallyHidden, ScreenReaderAnnouncement } from './VisuallyHidden';

/**
 * Provider Selector Props
 */
export interface ProviderSelectorProps {
  /** Available providers */
  providers: ProviderInfo[];
  /** Currently selected provider */
  currentProvider: ProviderInfo;
  /** Callback when provider is changed */
  onProviderChange: (providerId: string) => Promise<void>;
  /** Currently selected model */
  currentModel?: string;
  /** Callback when model is changed */
  onModelChange?: (model: string) => void;
  /** Whether to show model selector */
  showModelSelector?: boolean;
  /** Layout style: 'vertical' or 'horizontal' */
  layout?: 'vertical' | 'horizontal';
  /** Custom CSS class */
  className?: string;
  /** Whether selector is disabled */
  disabled?: boolean;
}

/**
 * Provider Selector Component
 *
 * Accessible AI provider and model selection interface.
 *
 * Accessibility Features:
 * - Full keyboard navigation (Arrow keys, Tab, Enter, Space)
 * - ARIA attributes for screen readers
 * - Focus management and visible focus indicators
 * - Screen reader announcements for state changes
 * - High contrast mode support
 *
 * Keyboard Shortcuts:
 * - Arrow Up/Down (vertical) or Left/Right (horizontal): Navigate providers
 * - Space/Enter: Select provider
 * - Tab: Move between provider group and model selector
 * - Shift+Tab: Move backwards
 *
 * Usage:
 * ```tsx
 * <ProviderSelector
 *   providers={availableProviders}
 *   currentProvider={currentProvider}
 *   onProviderChange={switchProvider}
 *   currentModel={currentModel}
 *   onModelChange={changeModel}
 *   showModelSelector={true}
 * />
 * ```
 */
export function ProviderSelector({
  providers,
  currentProvider,
  onProviderChange,
  currentModel,
  onModelChange,
  showModelSelector = true,
  layout = 'vertical',
  className = '',
  disabled = false,
}: ProviderSelectorProps): JSX.Element {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const radiogroupRef = useRef<HTMLDivElement>(null);

  // Find current provider index
  const currentIndex = providers.findIndex(p => p.id === currentProvider.id);

  // Focus management - set initial focused index
  useEffect(() => {
    if (focusedIndex === -1 && currentIndex !== -1) {
      setFocusedIndex(currentIndex);
    }
  }, [currentIndex, focusedIndex]);

  const handleProviderChange = useCallback(async (providerId: string) => {
    if (isChanging || disabled) return;

    const newProvider = providers.find(p => p.id === providerId);
    if (!newProvider) return;

    setIsChanging(true);
    setError(null);
    setAnnouncement(`Switching to ${newProvider.name}...`);

    try {
      await onProviderChange(providerId);
      setAnnouncement(`Successfully switched to ${newProvider.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to switch provider: ${errorMessage}`);
      setAnnouncement(`Failed to switch to ${newProvider.name}. ${errorMessage}`);
      console.error('[ProviderSelector] Failed to switch provider:', error);
    } finally {
      setIsChanging(false);
    }
  }, [onProviderChange, isChanging, disabled, providers]);

  const handleModelChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onModelChange && !disabled) {
      const newModel = event.target.value;
      onModelChange(newModel);
      setAnnouncement(`Model changed to ${newModel}`);
    }
  }, [onModelChange, disabled]);

  // Keyboard navigation for provider selection
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled || isChanging) return;

    const isVertical = layout === 'vertical';
    const upKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const downKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (event.key) {
      case upKey:
        event.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : providers.length - 1;
          return newIndex;
        });
        break;

      case downKey:
        event.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev < providers.length - 1 ? prev + 1 : 0;
          return newIndex;
        });
        break;

      case ' ':
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < providers.length) {
          const provider = providers[focusedIndex];
          if (provider.id !== currentProvider.id) {
            handleProviderChange(provider.id);
          }
        }
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(providers.length - 1);
        break;
    }
  }, [providers, currentProvider, focusedIndex, layout, disabled, isChanging, handleProviderChange]);

  // Focus the appropriate radio button when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && radiogroupRef.current) {
      const radio = radiogroupRef.current.querySelector(
        `input[value="${providers[focusedIndex]?.id}"]`
      ) as HTMLInputElement;
      if (radio) {
        radio.focus();
      }
    }
  }, [focusedIndex, providers]);

  const containerClass = `provider-selector provider-selector--${layout} ${className}`;

  return (
    <div
      className={containerClass}
      style={styles.container}
      role="group"
      aria-labelledby="provider-selector-heading"
    >
      {/* Heading for the entire selector */}
      <h3 id="provider-selector-heading" style={styles.heading}>
        <VisuallyHidden>AI Provider and Model Selection</VisuallyHidden>
      </h3>

      {/* Provider Selection */}
      <div style={styles.section}>
        <label id="provider-section-label" style={styles.sectionLabel}>
          AI Provider
        </label>
        <p id="provider-section-description" style={styles.description}>
          <VisuallyHidden>
            Use arrow keys to navigate between providers, space or enter to select.
            {providers.length} providers available.
          </VisuallyHidden>
        </p>
        <div
          ref={radiogroupRef}
          role="radiogroup"
          aria-labelledby="provider-section-label"
          aria-describedby="provider-section-description"
          aria-required="true"
          aria-disabled={disabled || isChanging}
          onKeyDown={handleKeyDown}
          style={layout === 'horizontal' ? styles.horizontalRadios : styles.verticalRadios}
        >
          {providers.map((provider, index) => {
            const isActive = provider.id === currentProvider.id;
            const isFocused = index === focusedIndex;
            const radioId = `provider-${provider.id}`;
            const descId = `provider-${provider.id}-capabilities`;

            return (
              <div key={provider.id} style={styles.radioOption}>
                <input
                  type="radio"
                  id={radioId}
                  name="ai-provider"
                  value={provider.id}
                  checked={isActive}
                  onChange={() => handleProviderChange(provider.id)}
                  disabled={disabled || isChanging}
                  aria-describedby={descId}
                  aria-checked={isActive}
                  tabIndex={isFocused ? 0 : -1}
                  style={{
                    ...styles.radioInput,
                    ...(isFocused ? styles.radioInputFocus : {}),
                  }}
                />
                <label
                  htmlFor={radioId}
                  style={{
                    ...styles.radioLabel,
                    ...(isActive ? styles.radioLabelActive : {}),
                  }}
                >
                  <span style={styles.providerName}>{provider.name}</span>
                  <div
                    id={descId}
                    style={styles.capabilities}
                    role="list"
                    aria-label={`${provider.name} capabilities`}
                  >
                    {provider.supportsVision && (
                      <span style={styles.capabilityBadge} role="listitem">
                        <span aria-hidden="true">👁️</span>
                        <VisuallyHidden>Supports image and vision processing.</VisuallyHidden>
                        <span> Vision</span>
                      </span>
                    )}
                    {provider.supportsTools && (
                      <span style={styles.capabilityBadge} role="listitem">
                        <span aria-hidden="true">🔧</span>
                        <VisuallyHidden>Supports function and tool calling.</VisuallyHidden>
                        <span> Tools</span>
                      </span>
                    )}
                    <span style={styles.capabilityBadge} role="listitem">
                      <span aria-hidden="true">📊</span>
                      <VisuallyHidden>{provider.models.length} models available.</VisuallyHidden>
                      <span> {provider.models.length} models</span>
                    </span>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Selection */}
      {showModelSelector && onModelChange && currentProvider.models.length > 0 && (
        <div style={styles.section}>
          <label htmlFor="model-select" id="model-section-label" style={styles.sectionLabel}>
            Model
          </label>
          <p id="model-section-description" style={styles.description}>
            <VisuallyHidden>
              Select a model for {currentProvider.name}.
              {currentProvider.models.length} models available.
            </VisuallyHidden>
          </p>
          <select
            id="model-select"
            value={currentModel || currentProvider.models[0]}
            onChange={handleModelChange}
            disabled={disabled || isChanging}
            aria-labelledby="model-section-label"
            aria-describedby="model-section-description"
            aria-required="false"
            style={styles.modelSelect}
          >
            {currentProvider.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Indicator */}
      {(isChanging || error) && (
        <div
          role="status"
          aria-live="polite"
          aria-busy={isChanging}
          style={error ? styles.errorIndicator : styles.statusIndicator}
        >
          {isChanging && (
            <>
              <span style={styles.spinner} aria-hidden="true">⟳</span>
              Switching provider...
            </>
          )}
          {error && (
            <>
              <span aria-hidden="true">⚠️</span>
              {error}
            </>
          )}
        </div>
      )}

      {/* Screen Reader Announcements */}
      <ScreenReaderAnnouncement message={announcement} politeness="polite" />
    </div>
  );
}

/**
 * Inline styles for ProviderSelector
 * Can be overridden with custom CSS classes
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #e0e0e0',
    position: 'relative',
  },
  heading: {
    margin: 0,
    padding: 0,
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  description: {
    margin: 0,
    padding: 0,
  },
  verticalRadios: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  horizontalRadios: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    flexWrap: 'wrap',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  radioInput: {
    marginRight: '8px',
    marginTop: '4px',
    cursor: 'pointer',
  },
  radioInputFocus: {
    outline: '2px solid #0066cc',
    outlineOffset: '2px',
  },
  radioLabel: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  radioLabelActive: {
    backgroundColor: '#e8f4f8',
    fontWeight: 600,
  },
  providerName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#222',
  },
  capabilities: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  capabilityBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#e8f4f8',
    color: '#0066cc',
    border: '1px solid #b3d9f2',
  },
  modelSelect: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#666',
    padding: '8px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    border: '1px solid #ffc107',
  },
  errorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#721c24',
    padding: '8px',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
    border: '1px solid #f5c6cb',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
};

// Export styles for external styling
export { styles as ProviderSelectorStyles };
