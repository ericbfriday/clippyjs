import { useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useAIClippy } from './AIClippyContext';
import type { StreamChunk } from '../providers/AIProvider';

/**
 * Chat message for display
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * AI Chat hook result
 */
export interface UseAIChatResult {
  /** Current messages in the conversation */
  messages: ChatMessage[];
  /** Whether AI is currently streaming a response */
  isStreaming: boolean;
  /** Send a message and stream the response */
  sendMessage: (content: string) => Promise<void>;
  /** Clear all messages */
  clearMessages: () => void;
  /** Cancel current streaming response */
  cancelStream: () => void;
}

/**
 * Hook for AI chat functionality
 *
 * Provides message history, streaming responses, and conversation management.
 *
 * Features:
 * - Maintains local message history for UI
 * - Streams AI responses token by token
 * - Handles cancellation
 * - Automatic context gathering
 *
 * Usage:
 * ```tsx
 * const { messages, isStreaming, sendMessage } = useAIChat();
 *
 * <button onClick={() => sendMessage("Hello!")}>
 *   Send
 * </button>
 * ```
 */
export function useAIChat(): UseAIChatResult {
  const { conversationManager, recordAccept } = useAIClippy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const cancelRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming) {
        return; // Don't send while streaming
      }

      // Record that user is actively using the AI (not ignoring)
      recordAccept();

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Use flushSync to ensure UI updates immediately before async work
      flushSync(() => {
        setMessages((prev) => [...prev, userMessage]);
        setIsStreaming(true);
      });
      cancelRef.current = false;

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      let assistantContent = '';

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      // Use flushSync to ensure assistant message placeholder appears immediately
      flushSync(() => {
        setMessages((prev) => [...prev, assistantMessage]);
      });

      try {
        // Stream response from conversation manager
        const stream = conversationManager.sendMessage(content);

        for await (const chunk of stream) {
          if (cancelRef.current) {
            break;
          }

          if (chunk.type === 'content_delta' && chunk.delta) {
            assistantContent += chunk.delta;

            // Update assistant message with new content, preserving isStreaming
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantContent, isStreaming: true }
                  : msg
              )
            );
          } else if (chunk.type === 'error') {
            // Handle error
            assistantContent = `Error: ${chunk.error}`;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantContent, isStreaming: false }
                  : msg
              )
            );
            break;
          } else if (chunk.type === 'complete') {
            // Mark streaming complete
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
          }
        }
      } catch (error) {
        console.error('Error streaming response:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  isStreaming: false,
                }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationManager, isStreaming, recordAccept]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const cancelStream = useCallback(() => {
    cancelRef.current = true;
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
    cancelStream,
  };
}
