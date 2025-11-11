# ClippyJS 📎

> AI-powered Clippy agents for modern web applications

[![npm version](https://img.shields.io/npm/v/@clippyjs/react.svg)](https://www.npmjs.com/package/@clippyjs/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ClippyJS** brings the beloved Microsoft Office assistant into the modern era with AI-powered, context-aware agents for React applications. Built with TypeScript, powered by cutting-edge AI models (Claude, GPT), and optimized with Nx intelligent caching.

---

## ✨ Features

- 🤖 **AI-Powered Agents**: Integrate Claude (Anthropic) or GPT (OpenAI) with simple React hooks
- ⚛️ **React 19 Ready**: Modern React components with full TypeScript support
- 🎭 **Personality Modes**: Pre-configured assistant personalities (Helpful, Concise, Technical, Creative)
- 🎨 **Customizable UI**: Themeable components that match your design system
- 🔌 **Provider-Agnostic**: Swap AI providers without changing application code
- 🚀 **Nx Optimized**: 20-72% faster builds with intelligent caching
- 📦 **Monorepo Architecture**: Clean separation of concerns across packages

---

## 🚀 Quick Start

### Installation

```bash
# Install core React package
npm install @clippyjs/react

# Choose your AI provider
npm install @clippyjs/ai-anthropic  # For Claude
# OR
npm install @clippyjs/ai-openai     # For GPT
```

### Basic Usage

```tsx
import { ClippyProvider, useClippy } from '@clippyjs/react';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

// Wrap your app with ClippyProvider
function App() {
  return (
    <ClippyProvider provider={new AnthropicProvider({ apiKey: 'your-api-key' })}>
      <YourApp />
    </ClippyProvider>
  );
}

// Use Clippy in any component
function YourComponent() {
  const { ask, isVisible, toggle } = useClippy();

  return (
    <div>
      <button onClick={() => ask('Help me with this task')}>
        Ask Clippy
      </button>
      <button onClick={toggle}>Toggle Assistant</button>
    </div>
  );
}
```

---

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@clippyjs/types](packages/types) | 1.0.0 | Shared TypeScript types |
| [@clippyjs/react](packages/react) | 1.0.0 | React components and hooks |
| [@clippyjs/ai](packages/ai) | 0.4.0 | Core AI integration layer |
| [@clippyjs/ai-anthropic](packages/ai-anthropic) | 1.0.0 | Anthropic Claude provider |
| [@clippyjs/ai-openai](packages/ai-openai) | 0.1.0 | OpenAI GPT provider |

---

## 🛠️ Development

This workspace uses **Nx 22.0.3** for intelligent build caching and task orchestration, alongside **Yarn 4.9.2** with Plug'n'Play.

### Prerequisites

- Node.js 18+ 
- Yarn 4.9.2 (included via Corepack)

### Setup

```bash
# Clone repository
git clone https://github.com/ericbfriday/clippyjs.git
cd clippyjs

# Install dependencies
yarn install

# Build all packages (with Nx caching)
yarn nx:build

# Run tests
yarn nx:test
```

### Development Commands

#### Nx Commands (Recommended - 20-72% faster)

```bash
yarn nx:build                # Build all packages with intelligent caching
yarn nx:build:affected       # Build only changed packages
yarn nx:test                 # Test all packages with caching
yarn nx:test:affected        # Test only affected packages
yarn nx:typecheck            # TypeScript check all packages
yarn nx:graph                # View dependency graph
yarn nx:reset                # Clear Nx cache
```

#### Traditional Yarn Commands (Still supported)

```bash
yarn build:all               # Build all packages (parallel)
yarn test:all                # Test all packages
yarn typecheck               # TypeScript check
yarn lint                    # Lint all packages
```

### Performance Benefits

Nx provides significant performance improvements through intelligent caching:

- **Cold builds**: 20% faster (6.5s → 5.2s)
- **Cached builds**: 72% faster (6.5s → 1.8s)
- **Affected commands**: Build/test only what changed
- **Parallel execution**: 3 concurrent tasks

### Running Demos

```bash
yarn demo                    # Vanilla JS demo (http-server)
yarn demo:react              # React demo (Vite dev server)
yarn storybook               # Component documentation
```

---

## 📚 Documentation

- **[Documentation Index](docs/README.md)** - Comprehensive guides and tutorials
- **[Workspace Guide](WORKSPACE_GUIDE.md)** - Development workflow and commands
- **[Workspace Index](WORKSPACE_INDEX.md)** - Complete package and script reference
- **[API Reference](docs/api-reference/)** - Detailed API documentation
- **[Nx Commands](docs/NX_COMMANDS.md)** - Nx command reference and troubleshooting
- **[Nx Architecture](docs/NX_ARCHITECTURE.md)** - Build system design decisions

---

## 🏗️ Architecture

### Workspace Structure

```
clippyjs/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── react/              # React components and hooks
│   ├── ai/                 # Core AI integration layer
│   ├── ai-anthropic/       # Anthropic Claude provider
│   ├── ai-openai/          # OpenAI GPT provider
│   ├── storybook/          # Component documentation
│   ├── clippyjs-demo-react/  # React demo app
│   └── templates/          # Starter templates
├── docs/                   # Documentation
├── nx.json                 # Nx workspace configuration
├── tsconfig.base.json      # TypeScript workspace config
└── package.json            # Root workspace package
```

### Key Technologies

- **TypeScript 5.7.3** - Type safety across all packages
- **React 19.0.0** - Latest React with concurrent features
- **Nx 22.0.3** - Intelligent build system with caching
- **Yarn 4.9.2** - Fast, reliable package management with PnP
- **Vitest 3.0.5** - Fast unit testing
- **Playwright** - E2E and visual testing
- **Rollup 4.31.0** - Optimized builds (CJS + ESM)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test: `yarn nx:build:affected && yarn nx:test:affected`
4. Commit changes: `git commit -m "feat: add my feature"`
5. Push and create a Pull Request

---

## 📄 License

MIT © Eric Friday

---

## 🙏 Acknowledgments

- Inspired by the classic Microsoft Office Clippy
- Built with modern AI models from Anthropic and OpenAI
- Powered by the Nx build system for optimal developer experience

---

**Built with ❤️ and AI** | [Documentation](docs/README.md) | [npm](https://www.npmjs.com/org/clippyjs) | [GitHub](https://github.com/ericbfriday/clippyjs)
