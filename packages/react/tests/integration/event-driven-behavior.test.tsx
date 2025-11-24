import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClippyProvider, useAgent } from '../../src';
import { useEffect, useState, useRef } from 'react';

/**
 * Integration Tests: Event-Driven Behavior
 *
 * Tests realistic scenarios where Clippy responds to user actions,
 * browser events, and application state changes.
 */

// Mock the core load function
vi.mock('../src', () => ({
  load: vi.fn(() =>
    Promise.resolve({
      show: vi.fn(() => Promise.resolve()),
      hide: vi.fn(() => Promise.resolve()),
      play: vi.fn(() => Promise.resolve()),
      animate: vi.fn(() => Promise.resolve()),
      speak: vi.fn(() => Promise.resolve()),
      moveTo: vi.fn(() => Promise.resolve()),
      gestureAt: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(),
      isVisible: vi.fn(() => true),
      getAnimations: vi.fn(() => ['Wave', 'Idle', 'Congratulate']),
    })
  ),
}));

describe('Integration: Event-Driven Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Interaction Events', () => {
    it('responds to button clicks with celebration', async () => {
      const user = userEvent;

      function ButtonWithCelebration() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [clicked, setClicked] = useState(false);

        const handleClick = async () => {
          setClicked(true);
          if (agent.agent) {
            await agent.play('Congratulate');
            await agent.speak('Great job clicking that button!');
          }
        };

        return (
          <div>
            <button onClick={handleClick}>Click Me!</button>
            {clicked && (
              <div role="status" data-testid="celebration">
                Button clicked!
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ButtonWithCelebration />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      await user.click(screen.getByRole('button', { name: 'Click Me!' }));

      await waitFor(() => {
        expect(screen.getByTestId('celebration')).toBeInTheDocument();
      });
    });

    it('tracks and responds to scroll position', async () => {
      function ScrollTracker() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [scrollHelp, setScrollHelp] = useState('');

        useEffect(() => {
          const handleScroll = async () => {
            const scrolledToBottom =
              window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;

            if (scrolledToBottom && agent.agent) {
              await agent.show();
              await agent.speak('You\'ve reached the bottom! Need help finding something?');
              setScrollHelp('Reached bottom');
            }
          };

          window.addEventListener('scroll', handleScroll);
          return () => window.removeEventListener('scroll', handleScroll);
        }, [agent.agent]);

        return (
          <div style={{ height: '2000px' }}>
            <div>Tall content</div>
            {scrollHelp && (
              <div data-testid="scroll-help" role="status">
                {scrollHelp}
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ScrollTracker />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate scroll to bottom
      Object.defineProperty(window, 'scrollY', { value: 2000, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2800, writable: true, configurable: true });

      fireEvent.scroll(window);

      await waitFor(() => {
        expect(screen.queryByTestId('scroll-help')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('responds to keyboard shortcuts', async () => {
      const user = userEvent;

      function KeyboardShortcutApp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [helpShown, setHelpShown] = useState(false);

        useEffect(() => {
          const handleKeyPress = async (e: KeyboardEvent) => {
            // Check for Ctrl+H or Cmd+H
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
              e.preventDefault();
              setHelpShown(true);

              if (agent.agent) {
                await agent.show();
                await agent.speak('How can I help you?');
              }
            }
          };

          window.addEventListener('keydown', handleKeyPress);
          return () => window.removeEventListener('keydown', handleKeyPress);
        }, [agent.agent]);

        return (
          <div>
            <p>Press Ctrl+H or Cmd+H for help</p>
            {helpShown && (
              <div role="dialog" data-testid="help-dialog">
                Help is here!
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <KeyboardShortcutApp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger keyboard shortcut
      await user.keyboard('{Control>}h{/Control}');

      await waitFor(() => {
        expect(screen.getByTestId('help-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Events', () => {
    it('responds to custom application events', async () => {
      function CustomEventApp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [achievement, setAchievement] = useState('');

        useEffect(() => {
          const handleAchievement = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const { type, points } = customEvent.detail;

            setAchievement(`${type}: ${points} points`);

            if (agent.agent) {
              await agent.play('Congratulate');
              await agent.speak(`Awesome! You earned ${points} points for ${type}!`);
            }
          };

          window.addEventListener('achievement', handleAchievement);
          return () => window.removeEventListener('achievement', handleAchievement);
        }, [agent.agent]);

        return (
          <div>
            {achievement && (
              <div role="status" data-testid="achievement">
                {achievement}
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <CustomEventApp />
        </ClippyProvider>
      );

      // Dispatch custom event
      const event = new CustomEvent('achievement', {
        detail: { type: 'First Login', points: 50 },
      });
      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByTestId('achievement')).toHaveTextContent(
          'First Login: 50 points'
        );
      });
    });

    it('handles task completion events', async () => {
      function TaskManager() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [completedTasks, setCompletedTasks] = useState(0);

        useEffect(() => {
          const handleTaskComplete = async () => {
            setCompletedTasks((prev) => prev + 1);

            if (agent.agent) {
              await agent.animate();
              await agent.speak('Task completed! Keep up the great work!');
            }
          };

          window.addEventListener('taskComplete', handleTaskComplete);
          return () => window.removeEventListener('taskComplete', handleTaskComplete);
        }, [agent.agent]);

        return (
          <div>
            <div data-testid="task-count">Completed: {completedTasks}</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <TaskManager />
        </ClippyProvider>
      );

      // Complete a task
      window.dispatchEvent(new Event('taskComplete'));

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('Completed: 1');
      });

      // Complete another task
      window.dispatchEvent(new Event('taskComplete'));

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('Completed: 2');
      });
    });
  });

  describe('Timer-Based Events', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('provides idle reminder after inactivity', async () => {
      function IdleDetector() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [idle, setIdle] = useState(false);
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);

        useEffect(() => {
          const resetTimer = () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(async () => {
              setIdle(true);
              if (agent.agent) {
                await agent.animate();
                await agent.speak('Still there? Need any help?');
              }
            }, 120000); // 2 minutes
          };

          const events = ['mousedown', 'mousemove', 'keypress', 'scroll'];
          events.forEach((event) => window.addEventListener(event, resetTimer));

          resetTimer(); // Start timer

          return () => {
            events.forEach((event) => window.removeEventListener(event, resetTimer));
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          };
        }, [agent.agent]);

        return (
          <div>
            {idle && (
              <div role="status" data-testid="idle-reminder">
                Are you still here?
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <IdleDetector />
        </ClippyProvider>
      );

      // Advance time for React effects to complete: isClient effect + autoLoad effect
      await vi.advanceTimersByTimeAsync(500);

      // Fast-forward time by 2 minutes (use async to wait for state updates)
      await vi.advanceTimersByTimeAsync(120000);

      // Run all pending timers to flush React state updates
      await vi.runOnlyPendingTimersAsync();

      // Now check state
      expect(screen.getByTestId('idle-reminder')).toBeInTheDocument();
    }, 15000);

    it('shows periodic tips during long tasks', async () => {
      vi.useFakeTimers();

      function LongTaskWithTips() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [tipCount, setTipCount] = useState(0);

        useEffect(() => {
          const tipInterval = setInterval(async () => {
            setTipCount((prev) => prev + 1);

            if (agent.agent) {
              await agent.speak(`Tip #${tipCount + 1}: Stay focused!`);
            }
          }, 30000); // Every 30 seconds

          return () => clearInterval(tipInterval);
        }, [agent.agent, tipCount]);

        return (
          <div>
            <div data-testid="tip-count">Tips shown: {tipCount}</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <LongTaskWithTips />
        </ClippyProvider>
      );

      // Advance time for React effects to complete: isClient effect + autoLoad effect
      await vi.advanceTimersByTimeAsync(500);

      // Fast-forward 90 seconds (3 tips) - use async to wait for state updates
      await vi.advanceTimersByTimeAsync(90000);

      // Run all pending timers to flush React state updates
      await vi.runOnlyPendingTimersAsync();

      // Now check state
      const tipCount = screen.getByTestId('tip-count');
      expect(tipCount.textContent).toMatch(/Tips shown: [3-9]/);
    }, 15000);
  });

  describe('Window Events', () => {
    it('responds to window resize', async () => {
      function ResponsiveHelper() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [isMobile, setIsMobile] = useState(false);

        useEffect(() => {
          const handleResize = async () => {
            const mobile = window.innerWidth < 768;

            if (mobile && !isMobile && agent.agent) {
              await agent.speak('I see you\'re on a mobile device. Tap to interact!');
            }

            setIsMobile(mobile);
          };

          window.addEventListener('resize', handleResize);
          handleResize(); // Check initial size

          return () => window.removeEventListener('resize', handleResize);
        }, [agent.agent, isMobile]);

        return (
          <div>
            {isMobile && (
              <div data-testid="mobile-mode">Mobile Mode</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <ResponsiveHelper />
        </ClippyProvider>
      );

      // Simulate resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-mode')).toBeInTheDocument();
      });
    });

    it('handles window visibility changes', async () => {
      function VisibilityTracker() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [welcomeBack, setWelcomeBack] = useState(false);

        useEffect(() => {
          const handleVisibilityChange = async () => {
            if (!document.hidden && agent.agent) {
              setWelcomeBack(true);
              await agent.play('Wave');
              await agent.speak('Welcome back!');
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);
          return () =>
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }, [agent.agent]);

        return (
          <div>
            {welcomeBack && (
              <div data-testid="welcome-back">Welcome back!</div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <VisibilityTracker />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
        configurable: true,
      });
      fireEvent(document, new Event('visibilitychange'));

      await waitFor(() => {
        expect(screen.getByTestId('welcome-back')).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 15000);
  });

  describe('Mouse Interaction Events', () => {
    it('responds to hover over help icons', async () => {
      const user = userEvent;

      function HoverHelp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [hovered, setHovered] = useState(false);

        const handleHover = async () => {
          setHovered(true);
          if (agent.agent) {
            await agent.speak('Click here for more information!');
          }
        };

        return (
          <div>
            <button
              data-testid="help-icon"
              onMouseEnter={handleHover}
              onMouseLeave={() => setHovered(false)}
            >
              ?
            </button>
            {hovered && (
              <div role="tooltip" data-testid="tooltip">
                Hover tooltip
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <HoverHelp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Hover over help icon
      await user.hover(screen.getByTestId('help-icon'));

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });

    it('tracks double-clicks for special actions', async () => {
      const user = userEvent;

      function DoubleClickEasterEgg() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [easterEgg, setEasterEgg] = useState(false);

        const handleDoubleClick = async () => {
          setEasterEgg(true);
          if (agent.agent) {
            await agent.play('Congratulate');
            await agent.speak('You found the easter egg! 🎉');
          }
        };

        return (
          <div>
            <div data-testid="easter-egg-trigger" onDoubleClick={handleDoubleClick}>
              Double-click me!
            </div>
            {easterEgg && (
              <div role="status" data-testid="easter-egg">
                Easter egg found!
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <DoubleClickEasterEgg />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Double-click
      await user.dblClick(screen.getByTestId('easter-egg-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop Events', () => {
    it('provides guidance during drag operations', async () => {
      function DragDropHelper() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [dragging, setDragging] = useState(false);

        const handleDragStart = async () => {
          setDragging(true);
          if (agent.agent) {
            await agent.speak('Drag the item to the target area!');
          }
        };

        const handleDrop = async () => {
          setDragging(false);
          if (agent.agent) {
            await agent.play('Congratulate');
            await agent.speak('Perfect! You dropped it in the right spot!');
          }
        };

        return (
          <div>
            <div
              data-testid="draggable"
              draggable
              onDragStart={handleDragStart}
            >
              Drag me
            </div>
            <div
              data-testid="drop-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              Drop here
            </div>
            {dragging && (
              <div role="status" data-testid="drag-status">
                Dragging...
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <DragDropHelper />
        </ClippyProvider>
      );

      const draggable = screen.getByTestId('draggable');
      const dropZone = screen.getByTestId('drop-zone');

      // Start drag
      fireEvent.dragStart(draggable);

      await waitFor(() => {
        expect(screen.getByTestId('drag-status')).toBeInTheDocument();
      });

      // Drop
      fireEvent.drop(dropZone);

      await waitFor(() => {
        expect(screen.queryByTestId('drag-status')).not.toBeInTheDocument();
      });
    });
  });
});
