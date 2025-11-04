import { useEffect, useState } from 'react';

/**
 * StorageInspector component props
 */
export interface StorageInspectorProps {
  /** Database name to inspect */
  dbName?: string;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';
  /** Update interval in milliseconds */
  updateInterval?: number;
}

/**
 * IndexedDB store information
 */
interface StoreInfo {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  itemCount: number;
}

/**
 * Storage quota information
 */
interface QuotaInfo {
  usage: number;
  quota: number;
  usagePercent: number;
}

/**
 * Cache storage information
 */
interface CacheInfo {
  name: string;
  size: number;
  itemCount: number;
}

/**
 * Stored item
 */
interface StoredItem {
  key: string;
  value: unknown;
  size: number;
}

/**
 * StorageInspector - IndexedDB and Cache storage viewer
 *
 * Features:
 * - IndexedDB content viewing
 * - Storage quota display
 * - Cache statistics
 * - Data import/export
 * - Cleanup utilities
 * - Size breakdown
 * - Search and filter
 * - Pretty-printed JSON
 */
export function StorageInspector({
  dbName = 'clippyjs',
  theme = 'light',
  updateInterval = 5000,
}: StorageInspectorProps) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [items, setItems] = useState<StoredItem[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [caches, setCaches] = useState<CacheInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<StoredItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load storage information
  useEffect(() => {
    loadStorageInfo();
    const interval = setInterval(loadStorageInfo, updateInterval);
    return () => clearInterval(interval);
  }, [dbName, updateInterval]);

  // Load store items when selected
  useEffect(() => {
    if (selectedStore) {
      loadStoreItems(selectedStore);
    }
  }, [selectedStore]);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load IndexedDB stores
      const db = await openDatabase(dbName);
      const storeNames = Array.from(db.objectStoreNames);
      const storeInfos = await Promise.all(
        storeNames.map(async (name) => {
          const tx = db.transaction(name, 'readonly');
          const store = tx.objectStore(name);
          const count = await countItems(store);

          return {
            name,
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            itemCount: count,
          };
        })
      );
      setStores(storeInfos);
      db.close();

      // Load storage quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setQuota({
            usage: estimate.usage,
            quota: estimate.quota,
            usagePercent: (estimate.usage / estimate.quota) * 100,
          });
        }
      }

      // Load cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const cacheInfos = await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            let totalSize = 0;

            for (const request of keys.slice(0, 10)) {
              // Sample first 10
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            }

            return {
              name,
              size: totalSize,
              itemCount: keys.length,
            };
          })
        );
        setCaches(cacheInfos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage info');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoreItems = async (storeName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const db = await openDatabase(dbName);
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const allKeys = await getAllKeys(store);

      const loadedItems: StoredItem[] = [];
      for (const key of allKeys.slice(0, 100)) {
        // Limit to 100 items
        const value = await getItem(store, key);
        const size = calculateSize(value);
        loadedItems.push({
          key: String(key),
          value,
          size,
        });
      }

      setItems(loadedItems);
      db.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearStore = async (storeName: string) => {
    if (!confirm(`Clear all data from "${storeName}"?`)) return;

    try {
      const db = await openDatabase(dbName);
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await clearStore(store);
      await tx.complete;
      db.close();

      loadStorageInfo();
      if (selectedStore === storeName) {
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear store');
    }
  };

  const handleDeleteItem = async (storeName: string, key: string) => {
    if (!confirm(`Delete item "${key}"?`)) return;

    try {
      const db = await openDatabase(dbName);
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await deleteItem(store, key);
      await tx.complete;
      db.close();

      loadStoreItems(storeName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleExportStore = async (storeName: string) => {
    try {
      const db = await openDatabase(dbName);
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const allKeys = await getAllKeys(store);

      const data: Record<string, unknown> = {};
      for (const key of allKeys) {
        data[String(key)] = await getItem(store, key);
      }
      db.close();

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storeName}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  const handleClearAllCaches = async () => {
    if (!confirm('Clear all caches?')) return;

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        setCaches([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear caches');
    }
  };

  // Filter items by search term
  const filteredItems = items.filter((item) =>
    item.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isDark = theme === 'dark';
  const totalStoreSize = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div
      className={`storage-inspector storage-inspector--${theme}`}
      style={isDark ? { ...styles.container, ...styles.containerDark } : styles.container}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>💾 Storage Inspector</h3>
        {quota && (
          <div style={styles.quotaBadge}>
            {formatBytes(quota.usage)} / {formatBytes(quota.quota)} (
            {quota.usagePercent.toFixed(1)}%)
          </div>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Storage Quota */}
      {quota && (
        <div style={styles.quotaSection}>
          <div style={styles.quotaLabel}>Storage Quota</div>
          <div style={styles.quotaBar}>
            <div
              style={{
                ...styles.quotaFill,
                width: `${quota.usagePercent}%`,
                background:
                  quota.usagePercent > 90
                    ? '#f44336'
                    : quota.usagePercent > 70
                      ? '#ff9800'
                      : '#4caf50',
              }}
            />
          </div>
        </div>
      )}

      {/* IndexedDB Stores */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>📦 IndexedDB: {dbName}</h4>
        </div>

        {stores.length === 0 ? (
          <div style={styles.emptyState}>No stores found in database</div>
        ) : (
          <div style={styles.storesList}>
            {stores.map((store) => (
              <div
                key={store.name}
                style={{
                  ...styles.storeCard,
                  ...(isDark ? styles.storeCardDark : {}),
                  ...(selectedStore === store.name ? styles.storeCardSelected : {}),
                }}
              >
                <div
                  style={styles.storeCardContent}
                  onClick={() => setSelectedStore(store.name)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && setSelectedStore(store.name)}
                >
                  <div style={styles.storeName}>{store.name}</div>
                  <div style={styles.storeInfo}>
                    {store.itemCount} items
                    {store.keyPath && ` • Key: ${String(store.keyPath)}`}
                  </div>
                </div>
                <div style={styles.storeActions}>
                  <button
                    onClick={() => handleExportStore(store.name)}
                    style={styles.iconButton}
                    aria-label="Export store"
                    title="Export"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => handleClearStore(store.name)}
                    style={styles.iconButton}
                    aria-label="Clear store"
                    title="Clear"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Store Items */}
      {selectedStore && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionTitle}>
              📄 Items in "{selectedStore}" ({filteredItems.length})
            </h4>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={isDark ? { ...styles.searchInput, ...styles.searchInputDark } : styles.searchInput}
            />
          </div>

          {totalStoreSize > 0 && (
            <div style={styles.storageSize}>
              Total Size: {formatBytes(totalStoreSize)}
            </div>
          )}

          {isLoading ? (
            <div style={styles.loading}>Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div style={styles.emptyState}>
              {searchTerm ? 'No items match search' : 'No items in store'}
            </div>
          ) : (
            <div style={styles.itemsList}>
              {filteredItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    ...styles.itemCard,
                    ...(isDark ? styles.itemCardDark : {}),
                  }}
                >
                  <div style={styles.itemHeader}>
                    <div
                      style={styles.itemKey}
                      onClick={() => setSelectedItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => e.key === 'Enter' && setSelectedItem(item)}
                    >
                      {item.key}
                    </div>
                    <div style={styles.itemMeta}>
                      <span style={styles.itemSize}>{formatBytes(item.size)}</span>
                      <button
                        onClick={() => handleDeleteItem(selectedStore, item.key)}
                        style={styles.deleteButton}
                        aria-label="Delete item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {selectedItem?.key === item.key && (
                    <div style={styles.itemValue}>
                      <pre style={styles.itemValuePre}>
                        {JSON.stringify(item.value, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cache Storage */}
      {caches.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionTitle}>🗂️ Cache Storage</h4>
            <button onClick={handleClearAllCaches} style={styles.clearButton}>
              Clear All
            </button>
          </div>
          <div style={styles.cachesList}>
            {caches.map((cache) => (
              <div
                key={cache.name}
                style={{
                  ...styles.cacheCard,
                  ...(isDark ? styles.cacheCardDark : {}),
                }}
              >
                <div style={styles.cacheName}>{cache.name}</div>
                <div style={styles.cacheInfo}>
                  {cache.itemCount} items • ~{formatBytes(cache.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Open IndexedDB database
 */
function openDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Count items in store
 */
function countItems(store: IDBObjectStore): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Get all keys from store
 */
function getAllKeys(store: IDBObjectStore): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Get item from store
 */
function getItem(store: IDBObjectStore, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Delete item from store
 */
function deleteItem(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Clear store
 */
function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Helper: Calculate size of value
 */
function calculateSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

/**
 * Helper: Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '13px',
    padding: '20px',
    maxWidth: '800px',
  },
  containerDark: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    borderColor: '#3c3c3c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  quotaBadge: {
    padding: '4px 12px',
    background: '#f0f0f0',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  error: {
    padding: '12px',
    background: '#fff5f5',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    color: '#f44336',
    marginBottom: '16px',
  },
  quotaSection: {
    marginBottom: '20px',
  },
  quotaLabel: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  quotaBar: {
    height: '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  section: {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '16px',
    marginTop: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  searchInput: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    width: '200px',
  },
  searchInputDark: {
    background: '#2a2a2a',
    borderColor: '#444',
    color: '#d4d4d4',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
    fontStyle: 'italic',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#999',
  },
  storesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  storeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  storeCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  storeCardSelected: {
    borderColor: '#2196f3',
    borderWidth: '2px',
  },
  storeCardContent: {
    flex: 1,
  },
  storeName: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  storeInfo: {
    fontSize: '11px',
    color: '#666',
  },
  storeActions: {
    display: 'flex',
    gap: '4px',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
  },
  clearButton: {
    padding: '4px 12px',
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  storageSize: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '8px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
  },
  itemCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemKey: {
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemSize: {
    fontSize: '11px',
    color: '#666',
  },
  deleteButton: {
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '16px',
    lineHeight: '16px',
    cursor: 'pointer',
    padding: 0,
  },
  itemValue: {
    marginTop: '12px',
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '4px',
    maxHeight: '300px',
    overflow: 'auto',
  },
  itemValuePre: {
    margin: 0,
    fontSize: '11px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cachesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cacheCard: {
    padding: '12px',
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
  },
  cacheCardDark: {
    background: '#2a2a2a',
    borderColor: '#444',
  },
  cacheName: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  cacheInfo: {
    fontSize: '11px',
    color: '#666',
  },
};
