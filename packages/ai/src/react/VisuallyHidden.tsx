import React from 'react';

/**
 * VisuallyHidden Component
 *
 * Renders content that is hidden visually but accessible to screen readers.
 * Follows best practices for sr-only/visually-hidden patterns.
 *
 * Use cases:
 * - Providing text alternatives for icons
 * - Adding context for screen readers
 * - Creating screen reader-only instructions
 *
 * @example
 * ```tsx
 * <button>
 *   <span aria-hidden="true">🔧</span>
 *   <VisuallyHidden>Configure settings</VisuallyHidden>
 * </button>
 * ```
 */
export interface VisuallyHiddenProps {
  /** Content to hide visually */
  children: React.ReactNode;
  /** Whether to render as span or div */
  as?: 'span' | 'div';
  /** Optional className for additional styling */
  className?: string;
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  className = '',
}: VisuallyHiddenProps): JSX.Element {
  return (
    <Component className={`visually-hidden ${className}`} style={visuallyHiddenStyles}>
      {children}
    </Component>
  );
}

/**
 * CSS styles for visually hiding content while keeping it accessible.
 * Based on best practices from WebAIM and A11y Project.
 */
const visuallyHiddenStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * ScreenReaderAnnouncement Component
 *
 * Component for announcing dynamic content changes to screen readers.
 * Uses ARIA live regions to announce status updates.
 *
 * @example
 * ```tsx
 * <ScreenReaderAnnouncement
 *   message="Provider switched to OpenAI"
 *   politeness="polite"
 * />
 * ```
 */
export interface ScreenReaderAnnouncementProps {
  /** Message to announce */
  message: string;
  /** ARIA live region politeness level */
  politeness?: 'polite' | 'assertive' | 'off';
  /** Whether the content should be announced atomically */
  atomic?: boolean;
}

export function ScreenReaderAnnouncement({
  message,
  politeness = 'polite',
  atomic = true,
}: ScreenReaderAnnouncementProps): JSX.Element | null {
  // Don't render if no message
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      style={visuallyHiddenStyles}
    >
      {message}
    </div>
  );
}
