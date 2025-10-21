import type { Preview } from '@storybook/react';
import { ClippyProvider } from '@clippyjs/react';
import React from 'react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ClippyProvider maxAgents={10}>
        <Story />
      </ClippyProvider>
    ),
  ],
};

export default preview;
