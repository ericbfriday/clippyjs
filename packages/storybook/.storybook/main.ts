import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../../clippyjs-lib/assets'],
  viteFinal: async (config) => {
    config.build = config.build || {};
    
    // Disable the chunk size warning limit, we want to split them instead of ignoring it
    config.build.chunkSizeWarningLimit = 700;
    
    // Split chunks for better performance
    config.build.rollupOptions = config.build.rollupOptions || {};
    config.build.rollupOptions.output = config.build.rollupOptions.output || {};
    
    config.build.rollupOptions.output = {
      ...config.build.rollupOptions.output,
      manualChunks(id) {
        if (id.includes('node_modules')) {
          if (id.includes('@storybook/test/dist/components')) return 'vendor-storybook-test-components';
          if (id.includes('@storybook/test/dist/spy')) return 'vendor-storybook-test-spy';
          if (id.includes('@storybook/test/dist/matchers')) return 'vendor-storybook-test-matchers';
          if (id.includes('@storybook/test/dist/')) return 'vendor-storybook-test-dist';
          if (id.includes('@storybook/test')) return 'vendor-storybook-test';
          
          if (id.includes('@storybook/core/dist/components')) {
             if (id.includes('syntaxhighlighter')) return 'vendor-storybook-core-components-syntax';
             return 'vendor-storybook-core-components';
          }
          if (id.includes('@storybook/core/dist/theming')) return 'vendor-storybook-core-theming';
          if (id.includes('@storybook/core/dist/manager-api')) return 'vendor-storybook-core-manager-api';
          if (id.includes('@storybook/core/dist/router')) return 'vendor-storybook-core-router';
          
          if (id.includes('@storybook/core')) {
             if (id.includes('preview')) return 'vendor-storybook-core-preview';
             return 'vendor-storybook-core';
          }
          
          if (id.includes('@storybook/components')) return 'vendor-storybook-components';
          if (id.includes('@storybook/theming')) return 'vendor-storybook-theming';
          if (id.includes('@storybook/manager-api')) return 'vendor-storybook-manager-api';
          if (id.includes('@storybook/router')) return 'vendor-storybook-router';
          if (id.includes('@storybook/blocks')) return 'vendor-storybook-blocks';
          
          if (id.includes('@storybook/addon-essentials')) return 'vendor-storybook-essentials';
          if (id.includes('@storybook/addon-interactions')) return 'vendor-storybook-interactions';
          if (id.includes('storybook/internal')) return 'vendor-storybook-internal';
          
          if (id.includes('@storybook/')) return 'vendor-storybook-other';
          
          if (id.includes('react/') || id.includes('react-dom/')) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-lucide';
          if (id.includes('lodash')) return 'vendor-lodash';
          if (id.includes('polished')) return 'vendor-polished';
          if (id.includes('tinyspy')) return 'vendor-tinyspy';
          if (id.includes('vitest')) return 'vendor-vitest';
          if (id.includes('radix-ui')) return 'vendor-radix-ui';
          if (id.includes('@base2/pretty-print-object')) return 'vendor-pretty-print';
          if (id.includes('expect')) return 'vendor-expect';
          if (id.includes('jest-mock')) return 'vendor-jest-mock';
          if (id.includes('loupe')) return 'vendor-loupe';
          if (id.includes('chai')) return 'vendor-chai';
          
          return 'vendor-other';
        } else if (id.includes('packages/react')) {
            return 'clippy-react';
        } else if (id.includes('packages/ai')) {
            return 'clippy-ai';
        }
      }
    };
    
    // Ignore the specific Vite warning about "use client" in the output bundle
    const previousOnWarn = config.build.rollupOptions.onwarn;
    config.build.rollupOptions.onwarn = (warning, warn) => {
      if (
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        warning.message.includes('"use client"')
      ) {
        return;
      }
      if (previousOnWarn) {
        previousOnWarn(warning, warn);
      } else {
        warn(warning);
      }
    };

    return config;
  },
};

export default config;
