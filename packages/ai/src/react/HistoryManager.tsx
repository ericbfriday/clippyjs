import React from 'react';
import { useHistoryManager } from './useHistoryManager';

/**
 * Props for HistoryManager component
 */
export interface HistoryManagerProps {
  /** Optional CSS class name */
  className?: string;
  /** Show detailed message info */
  showDetails?: boolean;
}

/**
 * History Manager UI Component
 *
 * Provides a UI for viewing and managing conversation history persistence.
 * Displays conversation metadata, message counts, and provides controls for
 * clearing history.
 *
 * Features:
 * - View conversation history metadata
 * - Display message counts and timestamps
 * - Clear specific agent history
 * - Clear all histories
 * - Refresh history data
 *
 * Usage:
 * ```tsx
 * <HistoryManager showDetails={true} />
 * ```
 */
export function HistoryManager({
  className = '',
  showDetails = false,
}: HistoryManagerProps): JSX.Element {
  const {
    history,
    isLoading,
    clearHistory,
    clearAllHistories,
    refresh,
  } = useHistoryManager();

  const handleClearHistory = async () => {
    if (window.confirm('Clear conversation history for this agent?')) {
      await clearHistory();
    }
  };

  const handleClearAllHistories = async () => {
    if (window.confirm('Clear ALL conversation histories? This cannot be undone.')) {
      await clearAllHistories();
    }
  };

  return (
    <div className={`history-manager ${className}`}>
      <div className="history-manager-header">
        <h3>Conversation History</h3>
        <button onClick={refresh} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {history ? (
        <div className="history-info">
          <div className="history-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Agent:</span>
              <span className="metadata-value">{history.agentName}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Messages:</span>
              <span className="metadata-value">{history.messages.length}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Started:</span>
              <span className="metadata-value">
                {history.startedAt.toLocaleString()}
              </span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Last Interaction:</span>
              <span className="metadata-value">
                {history.lastInteraction.toLocaleString()}
              </span>
            </div>
          </div>

          {showDetails && history.messages.length > 0 && (
            <div className="history-messages">
              <h4>Recent Messages</h4>
              <div className="messages-list">
                {history.messages.slice(-5).map((msg) => (
                  <div key={msg.id} className={`message message-${msg.role}`}>
                    <div className="message-header">
                      <span className="message-role">{msg.role}</span>
                      <span className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-preview">
                      {typeof msg.content === 'string'
                        ? msg.content.substring(0, 100)
                        : '[Complex content]'}
                      {typeof msg.content === 'string' && msg.content.length > 100 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="history-actions">
            <button
              onClick={handleClearHistory}
              className="button-danger"
            >
              Clear This Agent History
            </button>
            <button
              onClick={handleClearAllHistories}
              className="button-danger"
            >
              Clear All Histories
            </button>
          </div>
        </div>
      ) : (
        <div className="history-empty">
          <p>No conversation history found for this agent.</p>
        </div>
      )}

      <style jsx>{`
        .history-manager {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: #ffffff;
        }

        .history-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .history-manager-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .history-manager-header button {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: #f9fafb;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .history-manager-header button:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .history-manager-header button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .history-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .history-metadata {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metadata-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
        }

        .metadata-value {
          font-size: 0.875rem;
          color: #111827;
        }

        .history-messages {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .history-messages h4 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .message {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: #f9fafb;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .message-role {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
        }

        .message-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .message-preview {
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.4;
        }

        .message-user {
          border-color: #dbeafe;
          background: #eff6ff;
        }

        .message-assistant {
          border-color: #ddd6fe;
          background: #f5f3ff;
        }

        .history-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .history-actions button {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: #ffffff;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .history-actions button:hover {
          background: #f9fafb;
        }

        .button-danger {
          color: #dc2626;
          border-color: #fecaca !important;
        }

        .button-danger:hover {
          background: #fef2f2 !important;
        }

        .history-empty {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .history-empty p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
