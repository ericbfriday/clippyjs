import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClippyProvider } from '../../src/ClippyProvider';

/**
 * Unit tests for ClippyProvider component
 * Tests provider configuration, props, and context provision
 */

describe('ClippyProvider', () => {
  it('renders children correctly', () => {
    render(
      <ClippyProvider>
        <div>Test Child</div>
      </ClippyProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('accepts maxAgents prop', () => {
    const { container } = render(
      <ClippyProvider maxAgents={10}>
        <div>Content</div>
      </ClippyProvider>
    );

    // Provider should render without error
    expect(container).toBeInTheDocument();
  });

  it('accepts soundEnabled prop', () => {
    const { container } = render(
      <ClippyProvider soundEnabled={false}>
        <div>Content</div>
      </ClippyProvider>
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts defaultBasePath prop', () => {
    const { container } = render(
      <ClippyProvider defaultBasePath="/custom/path/">
        <div>Content</div>
      </ClippyProvider>
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts onError callback prop', () => {
    const onError = vi.fn();

    const { container } = render(
      <ClippyProvider onError={onError}>
        <div>Content</div>
      </ClippyProvider>
    );

    expect(container).toBeInTheDocument();
    // onError should not be called during normal rendering
    expect(onError).not.toHaveBeenCalled();
  });

  it('renders multiple children', () => {
    render(
      <ClippyProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ClippyProvider>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('can be nested without error', () => {
    const { container } = render(
      <ClippyProvider>
        <ClippyProvider>
          <div>Nested Content</div>
        </ClippyProvider>
      </ClippyProvider>
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText('Nested Content')).toBeInTheDocument();
  });
});
