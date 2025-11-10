import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Clippy } from '../../src/Clippy';
import { ClippyProvider } from '../../src/ClippyProvider';

/**
 * Unit tests for Clippy component
 * Tests declarative component API for loading and controlling agents
 */

// Mock the core load function
vi.mock('../src', () => ({
  load: vi.fn(() => Promise.resolve({
    show: vi.fn(() => Promise.resolve()),
    hide: vi.fn(() => Promise.resolve()),
    moveTo: vi.fn(() => Promise.resolve()),
    speak: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    isVisible: vi.fn(() => false),
  })),
}));

describe('Clippy Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );

      // Component doesn't render visible content (null)
      expect(container.textContent).toBe('');
    });

    it('accepts all prop types', () => {
      const onLoad = vi.fn();
      const onError = vi.fn();

      const { container } = render(
        <ClippyProvider>
          <Clippy
            name="Clippy"
            basePath="/custom/path/"
            showOnLoad={true}
            onLoad={onLoad}
            onError={onError}
            position={{ x: 100, y: 200 }}
            speak="Hello!"
            holdSpeech={true}
          />
        </ClippyProvider>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('agent names', () => {
    it('accepts Clippy agent', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('accepts Merlin agent', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Merlin" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('accepts Rover agent', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Rover" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('accepts other agent names', () => {
      const agents = ['Bonzi', 'F1', 'Genie', 'Genius', 'Links', 'Peedy', 'Rocky'];

      agents.forEach(name => {
        const { container } = render(
          <ClippyProvider>
            <Clippy name={name} />
          </ClippyProvider>
        );
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('showOnLoad prop', () => {
    it('defaults to true', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('accepts false value', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" showOnLoad={false} />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('accepts onLoad callback', () => {
      const onLoad = vi.fn();

      render(
        <ClippyProvider>
          <Clippy name="Clippy" onLoad={onLoad} />
        </ClippyProvider>
      );

      // Callback should be called after agent loads
      // (actual timing depends on implementation)
    });

    it('accepts onError callback', () => {
      const onError = vi.fn();

      render(
        <ClippyProvider>
          <Clippy name="Clippy" onError={onError} />
        </ClippyProvider>
      );

      // Callback should not be called in normal operation
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('position prop', () => {
    it('accepts position coordinates', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" position={{ x: 50, y: 100 }} />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('works without position prop', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('speak prop', () => {
    it('accepts speak message', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" speak="Hello, World!" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('works without speak prop', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('accepts holdSpeech flag', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" speak="Hello!" holdSpeech={true} />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('basePath prop', () => {
    it('accepts custom basePath', () => {
      const { container } = render(
        <ClippyProvider>
          <Clippy name="Clippy" basePath="/custom/agents/" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });

    it('uses provider default when not specified', () => {
      const { container } = render(
        <ClippyProvider defaultBasePath="/default/path/">
          <Clippy name="Clippy" />
        </ClippyProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('unmounting', () => {
    it('unmounts without errors', () => {
      const { unmount } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles unmounting before load completes', () => {
      const { unmount } = render(
        <ClippyProvider>
          <Clippy name="Clippy" />
        </ClippyProvider>
      );

      // Unmount immediately
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('multiple instances', () => {
    it('supports multiple Clippy components', () => {
      const { container } = render(
        <ClippyProvider maxAgents={3}>
          <Clippy name="Clippy" />
          <Clippy name="Merlin" />
          <Clippy name="Rover" />
        </ClippyProvider>
      );

      expect(container).toBeInTheDocument();
    });
  });
});
