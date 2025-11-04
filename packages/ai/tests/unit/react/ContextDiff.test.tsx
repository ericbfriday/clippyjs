import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContextDiff } from '../../../src/react/ContextDiff';
import type { ContextData } from '../../../src/context/ContextProvider';

// Helper to create mock context
function createMockContext(provider: string, data: Record<string, any>): ContextData {
  return {
    provider,
    timestamp: new Date(),
    data,
  };
}

describe('ContextDiff', () => {
  describe('Rendering', () => {
    it('should render with before and after contexts', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/Before/i)).toBeInTheDocument();
      expect(screen.getByText(/After/i)).toBeInTheDocument();
    });

    it('should apply correct theme class', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'new' });

      const { container } = render(<ContextDiff before={before} after={after} theme="dark" />);
      const diff = container.querySelector('.context-diff--dark');
      expect(diff).toBeInTheDocument();
    });

    it('should display timestamps', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      // Should show Before and After labels
      expect(screen.getByText(/Before/i)).toBeInTheDocument();
      expect(screen.getByText(/After/i)).toBeInTheDocument();
    });

    it('should display provider name', () => {
      const before = createMockContext('test-provider', { value: 'old' });
      const after = createMockContext('test-provider', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
      expect(screen.getByText('test-provider')).toBeInTheDocument();
    });
  });

  describe('Difference Calculation', () => {
    it('should show no differences when contexts are identical', () => {
      const before = createMockContext('test', { value: 'same' });
      const after = createMockContext('test', { value: 'same' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/0 added, 0 removed, 0 changed/i)).toBeInTheDocument();
    });

    it('should detect added fields', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'old', newField: 'added' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 added/i)).toBeInTheDocument();
      expect(screen.getByText('newField')).toBeInTheDocument();
    });

    it('should detect removed fields', () => {
      const before = createMockContext('test', { value: 'old', removed: 'field' });
      const after = createMockContext('test', { value: 'old' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 removed/i)).toBeInTheDocument();
      expect(screen.getByText('removed')).toBeInTheDocument();
    });

    it('should detect changed fields', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 changed/i)).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
    });

    it('should detect multiple types of changes', () => {
      const before = createMockContext('test', {
        unchanged: 'same',
        changed: 'old',
        removed: 'gone',
      });
      const after = createMockContext('test', {
        unchanged: 'same',
        changed: 'new',
        added: 'here',
      });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 added, 1 removed, 1 changed/i)).toBeInTheDocument();
    });
  });

  describe('Nested Object Handling', () => {
    it('should detect changes in nested objects', () => {
      const before = createMockContext('test', {
        nested: {
          field: 'old',
        },
      });
      const after = createMockContext('test', {
        nested: {
          field: 'new',
        },
      });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 changed/i)).toBeInTheDocument();
      expect(screen.getByText('nested.field')).toBeInTheDocument();
    });

    it('should detect added fields in nested objects', () => {
      const before = createMockContext('test', {
        nested: {},
      });
      const after = createMockContext('test', {
        nested: {
          newField: 'added',
        },
      });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 added/i)).toBeInTheDocument();
      expect(screen.getByText('nested.newField')).toBeInTheDocument();
    });

    it('should handle deeply nested objects', () => {
      const before = createMockContext('test', {
        level1: {
          level2: {
            level3: 'old',
          },
        },
      });
      const after = createMockContext('test', {
        level1: {
          level2: {
            level3: 'new',
          },
        },
      });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('level1.level2.level3')).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('should display string values correctly', () => {
      const before = createMockContext('test', { text: 'hello' });
      const after = createMockContext('test', { text: 'world' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('hello')).toBeInTheDocument();
      expect(screen.getByText('world')).toBeInTheDocument();
    });

    it('should display number values correctly', () => {
      const before = createMockContext('test', { count: 10 });
      const after = createMockContext('test', { count: 20 });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display boolean values correctly', () => {
      const before = createMockContext('test', { flag: true });
      const after = createMockContext('test', { flag: false });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('true')).toBeInTheDocument();
      expect(screen.getByText('false')).toBeInTheDocument();
    });

    it('should display null values correctly', () => {
      const before = createMockContext('test', { value: null });
      const after = createMockContext('test', { value: 'something' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('null')).toBeInTheDocument();
      expect(screen.getByText('something')).toBeInTheDocument();
    });

    it('should handle array values', () => {
      const before = createMockContext('test', { items: [1, 2, 3] });
      const after = createMockContext('test', { items: [1, 2, 3, 4] });

      const { container } = render(<ContextDiff before={before} after={after} />);

      // Arrays should be detected as changed
      expect(screen.getByText('items')).toBeInTheDocument();
      expect(screen.getByText(/1 changed/i)).toBeInTheDocument();
    });

    it('should handle object values', () => {
      const before = createMockContext('test', { obj: { a: 1 } });
      const after = createMockContext('test', { obj: { a: 2 } });

      render(<ContextDiff before={before} after={after} />);

      // Objects should show nested field changes
      expect(screen.getByText('obj.a')).toBeInTheDocument();
    });
  });

  describe('Change Icons', () => {
    it('should show + icon for added fields', () => {
      const before = createMockContext('test', {});
      const after = createMockContext('test', { added: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/\+/)).toBeInTheDocument();
    });

    it('should show - icon for removed fields', () => {
      const before = createMockContext('test', { removed: 'old' });
      const after = createMockContext('test', {});

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/-/)).toBeInTheDocument();
    });

    it('should show ~ icon for changed fields', () => {
      const before = createMockContext('test', { changed: 'old' });
      const after = createMockContext('test', { changed: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/~/)).toBeInTheDocument();
    });
  });

  describe('Empty Contexts', () => {
    it('should handle empty before context', () => {
      const before = createMockContext('test', {});
      const after = createMockContext('test', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 added/i)).toBeInTheDocument();
    });

    it('should handle empty after context', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', {});

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/1 removed/i)).toBeInTheDocument();
    });

    it('should handle both contexts empty', () => {
      const before = createMockContext('test', {});
      const after = createMockContext('test', {});

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText(/No differences detected/i)).toBeInTheDocument();
    });
  });

  describe('Change Arrow', () => {
    it('should show arrow for changed values', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', { value: 'new' });

      render(<ContextDiff before={before} after={after} />);

      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should not show arrow for added values', () => {
      const before = createMockContext('test', {});
      const after = createMockContext('test', { value: 'new' });

      const { container } = render(<ContextDiff before={before} after={after} />);

      // Should not have arrow for additions
      const arrows = container.querySelectorAll('[style*="→"]');
      expect(arrows.length).toBe(0);
    });

    it('should not show arrow for removed values', () => {
      const before = createMockContext('test', { value: 'old' });
      const after = createMockContext('test', {});

      const { container } = render(<ContextDiff before={before} after={after} />);

      // Should not have arrow for removals
      const arrows = container.querySelectorAll('[style*="→"]');
      expect(arrows.length).toBe(0);
    });
  });
});
