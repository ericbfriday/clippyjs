import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ClippyProvider } from '../../src/ClippyProvider';

/**
 * Custom render function that wraps components with ClippyProvider
 * Use this instead of @testing-library/react's render for components that use ClippyJS hooks
 */
export function renderWithProvider(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    providerProps?: React.ComponentProps<typeof ClippyProvider>;
  }
) {
  const { providerProps, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ClippyProvider {...providerProps}>{children}</ClippyProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Wait for animations to complete
 * Useful for testing animation-based components
 */
export function waitForAnimation(ms: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock agent instance for testing
 * Use when you need to test code that expects an Agent object
 */
export function createMockAgent() {
  return {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    animate: vi.fn().mockResolvedValue(undefined),
    moveTo: vi.fn().mockResolvedValue(undefined),
    gestureAt: vi.fn().mockResolvedValue(undefined),
    stopCurrent: vi.fn(),
    stop: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
    closeBalloon: vi.fn(),
    animations: vi.fn().mockReturnValue([]),
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
