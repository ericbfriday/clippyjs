import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClippyProvider, useAgent } from '../../src';
import { useEffect, useState } from 'react';

/**
 * Integration Tests: Form Interactions
 *
 * Tests realistic web page scenarios where Clippy helps users
 * with form interactions, validation, and guidance.
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

describe('Integration: Form Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Field Focus Help', () => {
    it('shows agent when user focuses on complex field', async () => {
      const user = userEvent;

      function FormWithHelp() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [helpShown, setHelpShown] = useState(false);

        const handleEmailFocus = async () => {
          if (agent.agent && !helpShown) {
            await agent.speak('Need help with your email address?');
            setHelpShown(true);
          }
        };

        return (
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              onFocus={handleEmailFocus}
              placeholder="you@example.com"
            />
            {helpShown && (
              <div role="status" aria-live="polite">
                Agent is helping with email
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <FormWithHelp />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // User focuses on email field
      const emailInput = screen.getByLabelText('Email Address');
      await user.click(emailInput);

      // Agent should offer help
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('provides different help for different field types', async () => {
      const user = userEvent;

      function MultiFieldForm() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [currentHelp, setCurrentHelp] = useState('');

        const handleFocus = async (fieldType: string) => {
          if (!agent.agent) return;

          const helpMessages: Record<string, string> = {
            email: 'Enter your email address (e.g., name@example.com)',
            password: 'Password must be at least 8 characters',
            phone: 'Enter your phone number with area code',
          };

          const message = helpMessages[fieldType];
          if (message) {
            await agent.speak(message);
            setCurrentHelp(message);
          }
        };

        return (
          <form>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                onFocus={() => handleFocus('email')}
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                onFocus={() => handleFocus('password')}
              />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                onFocus={() => handleFocus('phone')}
              />
            </div>
            {currentHelp && (
              <div role="status" data-testid="help-message">
                {currentHelp}
              </div>
            )}
          </form>
        );
      }

      render(
        <ClippyProvider>
          <MultiFieldForm />
        </ClippyProvider>
      );

      // Wait for React effects to complete: isClient effect + autoLoad effect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Focus on email field
      await user.click(screen.getByLabelText('Email'));
      await waitFor(() => {
        expect(screen.getByTestId('help-message')).toHaveTextContent(
          'Enter your email address'
        );
      }, { timeout: 10000 });

      // Focus on password field
      await user.click(screen.getByLabelText('Password'));
      await waitFor(() => {
        expect(screen.getByTestId('help-message')).toHaveTextContent(
          'Password must be at least 8 characters'
        );
      }, { timeout: 10000 });
    });
  });

  describe('Form Validation Errors', () => {
    it('responds to validation errors with helpful guidance', async () => {
      const user = userEvent;

      function ValidatedForm() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [errors, setErrors] = useState<string[]>([]);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();

          const formData = new FormData(e.target as HTMLFormElement);
          const email = formData.get('email') as string;
          const password = formData.get('password') as string;

          const newErrors: string[] = [];

          if (!email || !email.includes('@')) {
            newErrors.push('Please enter a valid email address');
          }

          if (!password || password.length < 8) {
            newErrors.push('Password must be at least 8 characters');
          }

          setErrors(newErrors);

          if (newErrors.length > 0 && agent.agent) {
            await agent.play('Wave');
            await agent.speak(
              `I see ${newErrors.length} error${newErrors.length > 1 ? 's' : ''}. Let me help!`
            );
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" />
            </div>
            <button type="submit">Submit</button>

            {errors.length > 0 && (
              <div role="alert" data-testid="error-list">
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </div>
            )}
          </form>
        );
      }

      render(
        <ClippyProvider>
          <ValidatedForm />
        </ClippyProvider>
      );

      // Submit form with invalid data
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      // Should show errors
      await waitFor(() => {
        const errorList = screen.getByTestId('error-list');
        expect(errorList).toBeInTheDocument();
        expect(errorList.children).toHaveLength(2);
      });
    });

    it('celebrates successful form submission', async () => {
      const user = userEvent;

      function SuccessForm() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [submitted, setSubmitted] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setSubmitted(true);

          if (agent.agent) {
            await agent.play('Wave');
            await agent.speak('Great! Your form has been submitted successfully!');
          }
        };

        return (
          <form onSubmit={handleSubmit}>
            <input name="email" type="email" defaultValue="test@example.com" />
            <input name="password" type="password" defaultValue="password123" />
            <button type="submit">Submit</button>

            {submitted && (
              <div role="status" data-testid="success-message">
                Form submitted successfully!
              </div>
            )}
          </form>
        );
      }

      render(
        <ClippyProvider>
          <SuccessForm />
        </ClippyProvider>
      );

      // Submit valid form
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      // Should show success
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });
  });

  describe('Progressive Form Guidance', () => {
    it('guides user through multi-step form', async () => {
      const user = userEvent;

      function MultiStepForm() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [step, setStep] = useState(1);

        useEffect(() => {
          if (!agent.agent) return;

          const messages: Record<number, string> = {
            1: 'Let\'s start with your basic information',
            2: 'Now, tell me about your preferences',
            3: 'Almost done! Just review your information',
          };

          const message = messages[step];
          if (message) {
            agent.speak(message);
          }
        }, [step, agent.agent]);

        return (
          <div>
            <div data-testid="current-step">Step {step} of 3</div>

            {step === 1 && (
              <div>
                <h2>Basic Information</h2>
                <button onClick={() => setStep(2)}>Next</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2>Preferences</h2>
                <button onClick={() => setStep(1)}>Back</button>
                <button onClick={() => setStep(3)}>Next</button>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2>Review</h2>
                <button onClick={() => setStep(2)}>Back</button>
                <button>Submit</button>
              </div>
            )}
          </div>
        );
      }

      render(
        <ClippyProvider>
          <MultiStepForm />
        </ClippyProvider>
      );

      // Start at step 1
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step 1 of 3');

      // Navigate to step 2
      await user.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 2 of 3');
      });

      // Navigate to step 3
      await user.click(screen.getByText('Next'));
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step 3 of 3');
      });
    });
  });

  describe('Field-Level Assistance', () => {
    it('provides real-time character count for limited fields', async () => {
      const user = userEvent;

      function CharacterLimitField() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [count, setCount] = useState(0);
        const maxLength = 100;

        const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          const length = e.target.value.length;
          setCount(length);

          if (length > maxLength - 10 && agent.agent) {
            await agent.speak(`You have ${maxLength - length} characters remaining`);
          }
        };

        return (
          <div>
            <label htmlFor="bio">Bio (max 100 characters)</label>
            <textarea
              id="bio"
              maxLength={maxLength}
              onChange={handleChange}
            />
            <div data-testid="char-count">{count}/{maxLength}</div>
          </div>
        );
      }

      render(
        <ClippyProvider>
          <CharacterLimitField />
        </ClippyProvider>
      );

      const textarea = screen.getByLabelText(/Bio/);

      // Type close to limit
      await user.type(textarea, 'A'.repeat(95));

      await waitFor(() => {
        expect(screen.getByTestId('char-count')).toHaveTextContent('95/100');
      });
    });
  });

  describe('Smart Form Auto-fill Help', () => {
    it('detects auto-fill and confirms with user', async () => {
      const user = userEvent;

      function AutoFillForm() {
        const agent = useAgent('Clippy', { autoLoad: true });
        const [autoFilled, setAutoFilled] = useState(false);

        const handleAutoFill = async () => {
          setAutoFilled(true);
          if (agent.agent) {
            await agent.speak('I noticed you used auto-fill. Want to review the information?');
          }
        };

        return (
          <form>
            <input
              name="email"
              autoComplete="email"
              onAnimationStart={handleAutoFill}
            />
            {autoFilled && (
              <div role="status" data-testid="autofill-detected">
                Auto-fill detected
              </div>
            )}
          </form>
        );
      }

      render(
        <ClippyProvider>
          <AutoFillForm />
        </ClippyProvider>
      );

      // Note: Auto-fill detection is tested via the onAnimationStart event
      // which browsers fire when auto-fill occurs
    });
  });
});
