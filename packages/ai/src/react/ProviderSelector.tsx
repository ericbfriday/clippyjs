import React, { useState, useCallback } from 'react';
import type { ProviderInfo } from './AIClippyContext';

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
 * Provides UI for switching between AI providers and models.
 *
 * Features:
 * - Radio buttons for provider selection
 * - Dropdown for model selection
 * - Visual indicators for provider capabilities
 * - Responsive layout options
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

  const handleProviderChange = useCallback(async (providerId: string) => {
    if (isChanging || disabled) return;

    setIsChanging(true);
    try {
      await onProviderChange(providerId);
    } catch (error) {
      console.error('[ProviderSelector] Failed to switch provider:', error);
      // TODO: Show error notification to user
    } finally {
      setIsChanging(false);
    }
  }, [onProviderChange, isChanging, disabled]);

  const handleModelChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onModelChange && !disabled) {
      onModelChange(event.target.value);
    }
  }, [onModelChange, disabled]);

  const containerClass = `provider-selector provider-selector--${layout} ${className}`;

  return (
    <div className={containerClass} style={styles.container}>
      {/* Provider Selection */}
      <div style={styles.section}>
        <label style={styles.sectionLabel}>AI Provider</label>
        <div style={layout === 'horizontal' ? styles.horizontalRadios : styles.verticalRadios}>
          {providers.map((provider) => {
            const isActive = provider.id === currentProvider.id;
            const radioId = `provider-${provider.id}`;

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
                  style={styles.radioInput}
                />
                <label htmlFor={radioId} style={styles.radioLabel}>
                  <span style={styles.providerName}>{provider.name}</span>
                  <div style={styles.capabilities}>
                    {provider.supportsVision && (
                      <span style={styles.capabilityBadge} title="Supports Vision">
                        👁️ Vision
                      </span>
                    )}
                    {provider.supportsTools && (
                      <span style={styles.capabilityBadge} title="Supports Tools">
                        🔧 Tools
                      </span>
                    )}
                    <span style={styles.capabilityBadge} title="Available Models">
                      📊 {provider.models.length} models
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
          <label htmlFor="model-select" style={styles.sectionLabel}>
            Model
          </label>
          <select
            id="model-select"
            value={currentModel || currentProvider.models[0]}
            onChange={handleModelChange}
            disabled={disabled || isChanging}
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
      {isChanging && (
        <div style={styles.statusIndicator}>
          <span style={styles.spinner}>⟳</span>
          Switching provider...
        </div>
      )}
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
  radioLabel: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
};

// Export styles for external styling
export { styles as ProviderSelectorStyles };
