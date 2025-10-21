import type { Preview } from '@storybook/react';
import React from 'react';
import { ClippyProvider } from '@clippyjs/react';

// Suppress React's act() warnings in Storybook
// These warnings are meant for testing environments, not Storybook
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('not wrapped in act')
  ) {
    return;
  }
  originalError.apply(console, args);
};

const preview: Preview = {
  decorators: [
    (Story) => (
      <ClippyProvider maxAgents={3}>
        <Story />
      </ClippyProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
