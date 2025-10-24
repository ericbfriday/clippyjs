import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClippyProvider, useAgent } from '../../src';
import { useEffect, useState } from 'react';

/**
 * Integration Tests: External Data
 *
 * Tests realistic scenarios where Clippy interacts with external data sources,
 * API responses, WebSockets, and dynamic content updates.
 */

// Mock the core load function
vi.mock('@clippyjs/core', () => ({
  load: vi.fn(() =>
    Promise.resolve({
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      play: vi.fn(() => Promise.resolve()),
      speak: vi.fn(() => Promise.resolve()),
      moveTo: vi.fn(() => Promise.resolve()),
      gestureAt: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(),
      isVisible: vi.fn(() => true),
      getAnimations: vi.fn(() => ['Wave', 'Idle']),
    })
  ),
}));

describe('Integration: External Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Response Handling', () => {
    it('responds to successful API calls', async () => {
      // Note: Using direct userEvent methods without setup() for compatibility
      const user = userEvent;

      function ApiDataFetcher() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [data, setData] = useState<any>(null);
        const [loading, setLoading] = useState(false);

        const fetchData = async () => {
          setLoading(true);

          try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 100));
            const mockData = { id: 1, name: 'Test User', items: 5 };
            setData(mockData);

            if (agent.agent) {
              await agent.play('Wave');
              await agent.speak(`Found ${mockData.items} items for ${mockData.name}!`);
            }
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button onClick={fetchData}>Fetch Data</button>
            {loading && <div data-testid="loading">Loading...</div>}
            {data && (
              <div data-testid="data-result">
                {data.name}: {data.items} items
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ApiDataFetcher />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      await user.click(screen.getByRole('button', { name: 'Fetch Data' }));

      await waitFor(() => {
        expect(screen.getByTestId('data-result')).toHaveTextContent('Test User: 5 items');
      }, { timeout: 10000 });
    });

    it('handles API errors with helpful messages', async () => {
      const user = userEvent;

      function ApiErrorHandler() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [error, setError] = useState('');

        const fetchData = async () => {
          try {
            // Simulate API error
            throw new Error('Network request failed');
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);

            if (agent.agent) {
              await agent.speak(
                'Oops! Something went wrong. Please check your connection and try again.'
              );
            }
          }
        };

        return (
          <div>
            <button onClick={fetchData}>Fetch Data</button>
            {error && (
              <div role="alert" data-testid="error-message">
                {error}
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ApiErrorHandler />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      await user.click(screen.getByRole('button', { name: 'Fetch Data' }));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Network request failed'
        );
      });
    });

    it('adapts to different response data structures', async () => {
      function DynamicDataDisplay() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [responseType, setResponseType] = useState<'user' | 'product' | null>(null);

        useEffect(() => {
          if (!agent.agent || !responseType) return;

          const messages = {
            user: 'I see you loaded user data. Need help with anything?',
            product: 'Product catalog loaded! Want to browse?',
          };

          agent.speak(messages[responseType]);
        }, [responseType, agent.agent]);

        return (
          <div>
            <button onClick={() => setResponseType('user')}>Load User</button>
            <button onClick={() => setResponseType('product')}>Load Product</button>
            {responseType && (
              <div data-testid="response-type">{responseType} data loaded</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <DynamicDataDisplay />
        </ClippyProvider>
      );

      const user = userEvent;
      const userButton = screen.getByRole('button', { name: 'Load User' });
      await user.click(userButton);

      await waitFor(() => {
        expect(screen.getByTestId('response-type')).toHaveTextContent('user data loaded');
      });
    });
  });

  describe('Real-Time Data Updates', () => {
    it('responds to WebSocket-like real-time notifications', async () => {
      vi.useFakeTimers();

      function RealTimeNotifications() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [notifications, setNotifications] = useState<string[]>([]);

        useEffect(() => {
          // Simulate WebSocket connection
          const interval = setInterval(() => {
            const newNotification = `New message at ${new Date().toLocaleTimeString()}`;
            setNotifications((prev) => [...prev, newNotification]);

            if (agent.agent) {
              agent.speak('You have a new message!');
            }
          }, 2000);

          return () => clearInterval(interval);
        }, [agent.agent]);

        return (
          <div>
            <div data-testid="notification-count">
              Notifications: {notifications.length}
            </div>
            {notifications.map((notif, i) => (
              <div key={i} data-testid={`notification-${i}`}>
                {notif}
              </div>
            ))}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <RealTimeNotifications />
        </ClippyProvider>
      );

      // Advance time for React effects to complete: isClient effect + autoLoad effect
      await vi.advanceTimersByTimeAsync(500);

      // Advance time to trigger notifications (use async to wait for state updates)
      await vi.advanceTimersByTimeAsync(4000); // 2 notifications

      // Run all pending timers to flush React state updates
      await vi.runOnlyPendingTimersAsync();

      // Now check state
      expect(screen.getByTestId('notification-count')).toHaveTextContent(
        'Notifications: 2'
      );

      vi.useRealTimers();
    }, 20000);

    it('handles streaming data updates', async () => {
      function StreamingData() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [progress, setProgress] = useState(0);
        const [complete, setComplete] = useState(false);

        useEffect(() => {
          // Simulate streaming progress
          const interval = setInterval(() => {
            setProgress((prev) => {
              const next = prev + 10;
              if (next >= 100) {
                clearInterval(interval);
                setComplete(true);
                if (agent.agent) {
                  agent.play('Wave');
                  agent.speak('Download complete! 🎉');
                }
                return 100;
              }
              return next;
            });
          }, 100);

          return () => clearInterval(interval);
        }, [agent.agent]);

        return (
          <div>
            <div data-testid="progress">{progress}%</div>
            {complete && (
              <div role="status" data-testid="complete">
                Complete!
              </div>
            )}
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <ClippyProvider>
          <StreamingData />
        </ClippyProvider>
      );

      // Advance time for React effects to complete: isClient effect + autoLoad effect
      await vi.advanceTimersByTimeAsync(500);

      // Advance time to complete progress
      await vi.advanceTimersByTimeAsync(1000);

      // Run all pending timers to flush React state updates
      await vi.runOnlyPendingTimersAsync();

      // Now check state
      expect(screen.getByTestId('progress')).toHaveTextContent('100%');
      expect(screen.getByTestId('complete')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('User Profile Data Integration', () => {
    it('personalizes greeting based on user data', async () => {
      const userData = {
        name: 'Alice',
        isFirstLogin: true,
        preferences: { theme: 'dark', language: 'en' },
      };

      function PersonalizedApp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [greeted, setGreeted] = useState(false);

        useEffect(() => {
          if (agent.agent && !greeted && userData.isFirstLogin) {
            agent.speak(`Welcome ${userData.name}! This is your first time here.`);
            agent.play('Wave');
            setGreeted(true);
          }
        }, [agent.agent, greeted]);

        return (
          <div>
            {greeted && (
              <div role="status" data-testid="greeting">
                Welcome {userData.name}!
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <PersonalizedApp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      await waitFor(() => {
        expect(screen.getByTestId('greeting')).toHaveTextContent('Welcome Alice!');
      });
    });

    it('adapts behavior based on user preferences', async () => {
      const userPreferences = {
        helpLevel: 'advanced' as const,
        showHints: true,
        autoAssist: false,
      };

      function AdaptiveAssistant() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [helpMessage, setHelpMessage] = useState('');

        const provideHelp = async () => {
          if (!agent.agent) return;

          const messages = {
            beginner: 'Let me walk you through this step by step...',
            intermediate: 'Here\'s what you need to do...',
            advanced: 'Quick tip: Try using the keyboard shortcut Ctrl+K',
          };

          const message = messages[userPreferences.helpLevel];
          setHelpMessage(message);
          await agent.speak(message);
        };

        return (
          <div>
            <button onClick={provideHelp}>Get Help</button>
            {helpMessage && (
              <div data-testid="help-message">{helpMessage}</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <AdaptiveAssistant />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const helpButton = screen.getByRole('button', { name: 'Get Help' });
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByTestId('help-message')).toHaveTextContent(
          'Quick tip: Try using the keyboard shortcut Ctrl+K'
        );
      }, { timeout: 10000 });
    }, 15000);
  });

  describe('Context-Aware Assistance', () => {
    it('provides context-specific help based on current page', async () => {
      function ContextAwareApp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [page, setPage] = useState<'home' | 'dashboard' | 'settings'>('home');

        useEffect(() => {
          if (!agent.agent) return;

          const contextMessages = {
            home: 'Welcome! Would you like a tour of the features?',
            dashboard: 'Here\'s your dashboard. Check out your recent activity!',
            settings: 'Need help configuring your settings?',
          };

          agent.speak(contextMessages[page]);
        }, [page, agent.agent]);

        return (
          <div>
            <nav>
              <button onClick={() => setPage('home')}>Home</button>
              <button onClick={() => setPage('dashboard')}>Dashboard</button>
              <button onClick={() => setPage('settings')}>Settings</button>
            </nav>
            <div data-testid="current-page">{page}</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ContextAwareApp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const dashboardButton = screen.getByRole('button', { name: 'Dashboard' });
      await user.click(dashboardButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('dashboard');
      });
    });

    it('tracks user journey and provides progressive help', async () => {
      function JourneyTracker() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [steps, setSteps] = useState<string[]>([]);

        const trackStep = async (step: string) => {
          setSteps((prev) => [...prev, step]);

          if (agent.agent) {
            const stepNumber = steps.length + 1;
            await agent.speak(`Step ${stepNumber} complete! You're doing great!`);

            if (stepNumber === 3) {
              await agent.play('Wave');
              await agent.speak('You\'ve completed all steps! Well done!');
            }
          }
        };

        return (
          <div>
            <button onClick={() => trackStep('Profile')}>Complete Profile</button>
            <button onClick={() => trackStep('Preferences')}>Set Preferences</button>
            <button onClick={() => trackStep('Verification')}>Verify Email</button>
            <div data-testid="steps-completed">{steps.length} steps completed</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <JourneyTracker />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const profileButton = screen.getByRole('button', { name: 'Complete Profile' });
      await user.click(profileButton);

      await waitFor(() => {
        expect(screen.getByTestId('steps-completed')).toHaveTextContent(
          '1 steps completed'
        );
      });
    });
  });

  describe('Search and Filter Assistance', () => {
    it('helps with empty search results', async () => {
      const user = userEvent;

      function SearchWithHelp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [results, setResults] = useState<any[]>([]);
        const [searched, setSearched] = useState(false);

        const handleSearch = async (query: string) => {
          setSearched(true);

          // Simulate search
          const mockResults = query === 'test' ? [{ id: 1, name: 'Test Item' }] : [];
          setResults(mockResults);

          if (mockResults.length === 0 && agent.agent) {
            await agent.speak(
              'No results found. Try different keywords or check your spelling!'
            );
          }
        };

        return (
          <div>
            <input
              data-testid="search-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e.currentTarget.value);
                }
              }}
              placeholder="Search..."
            />
            {searched && (
              <div data-testid="result-count">{results.length} results</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <SearchWithHelp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('result-count')).toHaveTextContent('0 results');
      });
    });

    it('suggests filters when too many results', async () => {
      function FilterSuggestions() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [resultCount, setResultCount] = useState(0);

        const simulateSearch = async (count: number) => {
          setResultCount(count);

          if (count > 100 && agent.agent) {
            await agent.speak(
              'Found many results! Try using filters to narrow down your search.'
            );
          }
        };

        return (
          <div>
            <button onClick={() => simulateSearch(150)}>Search All</button>
            {resultCount > 0 && (
              <div>
                <div data-testid="result-count">{resultCount} results</div>
                {resultCount > 100 && (
                  <div role="status" data-testid="filter-suggestion">
                    Consider using filters
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <FilterSuggestions />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const user = userEvent;
      const searchButton = screen.getByRole('button', { name: 'Search All' });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('filter-suggestion')).toBeInTheDocument();
      });
    });
  });
});
