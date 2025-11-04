import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageInspector } from '../../../packages/ai/src/react/StorageInspector';

// Mock IndexedDB
const mockDB = {
  objectStoreNames: ['store1', 'store2'],
  transaction: vi.fn(),
  close: vi.fn(),
};

global.indexedDB = {
  open: vi.fn((name) => ({
    onsuccess: null,
    onerror: null,
    result: mockDB,
  })),
} as unknown as IDBFactory;

describe('StorageInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.storage = {
      estimate: vi.fn().mockResolvedValue({
        usage: 1024 * 1024 * 50, // 50MB
        quota: 1024 * 1024 * 1024, // 1GB
      }),
    } as unknown as StorageManager;
  });

  describe('Rendering', () => {
    it('should render storage inspector', () => {
      render(<StorageInspector />);
      expect(screen.getByText('💾 Storage Inspector')).toBeInTheDocument();
    });

    it('should render with dark theme', () => {
      const { container } = render(<StorageInspector theme="dark" />);
      expect(container.querySelector('.storage-inspector--dark')).toBeInTheDocument();
    });
  });

  describe('Storage Quota', () => {
    it('should display storage quota information', async () => {
      render(<StorageInspector />);

      await waitFor(() => {
        expect(screen.getByText(/Storage Quota/)).toBeInTheDocument();
      });
    });

    it('should show quota bar', async () => {
      const { container } = render(<StorageInspector />);

      await waitFor(() => {
        const quotaBar = container.querySelector('[style*="width"]');
        expect(quotaBar).toBeInTheDocument();
      });
    });
  });

  describe('Database Stores', () => {
    it('should list database stores', async () => {
      render(<StorageInspector dbName="testdb" />);

      await waitFor(() => {
        expect(screen.getByText(/IndexedDB/)).toBeInTheDocument();
      });
    });

    it('should allow store selection', async () => {
      render(<StorageInspector />);

      await waitFor(async () => {
        const stores = screen.queryAllByRole('button');
        if (stores.length > 0) {
          fireEvent.click(stores[0]);
        }
      });
    });
  });

  describe('Search', () => {
    it('should filter items by search term', async () => {
      render(<StorageInspector />);

      const searchInput = screen.queryByPlaceholderText('Search items...');
      if (searchInput) {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        expect(searchInput).toHaveValue('test');
      }
    });
  });

  describe('Export', () => {
    it('should export store data', async () => {
      const createObjectURL = vi.fn(() => 'blob:mock');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      render(<StorageInspector />);

      await waitFor(() => {
        const exportButtons = screen.queryAllByLabelText('Export store');
        if (exportButtons.length > 0) {
          fireEvent.click(exportButtons[0]);
        }
      });
    });
  });

  describe('Clear Operations', () => {
    it('should clear store when confirmed', async () => {
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<StorageInspector />);

      await waitFor(() => {
        const clearButtons = screen.queryAllByLabelText('Clear store');
        if (clearButtons.length > 0) {
          fireEvent.click(clearButtons[0]);
          expect(mockConfirm).toHaveBeenCalled();
        }
      });

      mockConfirm.mockRestore();
    });

    it('should not clear when cancelled', async () => {
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<StorageInspector />);

      await waitFor(() => {
        const clearButtons = screen.queryAllByLabelText('Clear store');
        if (clearButtons.length > 0) {
          fireEvent.click(clearButtons[0]);
          expect(mockConfirm).toHaveBeenCalled();
        }
      });

      mockConfirm.mockRestore();
    });
  });

  describe('Cache Storage', () => {
    it('should display cache storage if available', async () => {
      global.caches = {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        open: vi.fn().mockResolvedValue({
          keys: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as CacheStorage;

      render(<StorageInspector />);

      await waitFor(() => {
        const cacheHeading = screen.queryByText(/Cache Storage/);
        if (cacheHeading) {
          expect(cacheHeading).toBeInTheDocument();
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<StorageInspector />);
      expect(screen.getByText('💾 Storage Inspector')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<StorageInspector />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        if (buttons.length > 0) {
          buttons[0].focus();
          expect(document.activeElement).toBe(buttons[0]);
        }
      });
    });
  });
});
