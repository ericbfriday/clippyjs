# ClippyJS Suggested Commands

## Package Management

### Installation
```bash
yarn install                    # Install all workspace dependencies
```

### Clean Install
```bash
rm -rf node_modules dist yarn.lock
yarn install                    # Fresh installation
```

## Build Commands

### Library Build (packages/clippyjs-lib)
```bash
cd packages/clippyjs-lib
yarn build                      # Full build: clean + TypeScript + bundle
yarn build:ts                   # TypeScript compilation only
yarn build:bundle               # Rollup bundling only
yarn clean                      # Remove dist directory
```

### From Root
```bash
yarn workspace clippyjs build  # Build library from root
```

### Build Script
```bash
chmod +x scripts/install-and-build.sh
./scripts/install-and-build.sh # Complete install and build process
```

## Development Commands

### Demo Applications
```bash
yarn demo                       # Start vanilla JS demo (HTTP server)
yarn demo:react                 # Start React demo app (Vite dev server)
```

### React Demo (from packages/clippyjs-demo-react)
```bash
cd packages/clippyjs-demo-react
yarn start                      # Start Vite dev server
yarn build                      # Build production bundle
```

## Code Quality

### Type Checking
```bash
cd packages/clippyjs-lib
yarn tsc --noEmit              # Type check without emitting files
tsc --noEmit                   # Can run tsc directly
```

### Linting
```bash
cd packages/clippyjs-lib
yarn lint                       # Run ESLint on all TypeScript files
eslint src/**/*.{ts,tsx}       # Direct ESLint command
```

### Testing
```bash
cd packages/clippyjs-lib
yarn test                       # Run Jest tests
```

## Git Commands (macOS/Darwin)

### Status and Branches
```bash
git status                      # Check working tree status
git branch                      # List branches
git log --oneline -10          # View recent commits
```

### Common Workflows
```bash
git checkout -b feature/name   # Create feature branch
git add .                      # Stage all changes
git commit -m "message"        # Commit changes
git push origin branch-name    # Push to remote
```

### Diff and Comparison
```bash
git diff                       # Show unstaged changes
git diff --staged              # Show staged changes
git diff master...HEAD --stat  # Compare with master branch
```

## System Utilities (macOS/Darwin)

### File Operations
```bash
ls -la                         # List files with details
find . -name "pattern"         # Find files by name
grep -r "pattern" src/         # Search in files
cat filename                   # Display file contents
```

### Directory Navigation
```bash
pwd                            # Print working directory
cd path/to/directory           # Change directory
cd ..                          # Go up one level
```

### File Permissions
```bash
chmod +x script.sh             # Make script executable
chmod 644 file                 # Set file permissions
```

## Workspace Commands

### Yarn Workspaces
```bash
yarn workspaces list           # List all workspaces
yarn workspace clippyjs build  # Run command in specific workspace
yarn workspace clippyjs-demo-react start  # Start specific workspace
```

## Publishing

### Pre-publish
```bash
cd packages/clippyjs-lib
yarn prepublishOnly            # Runs automatically before publish (builds project)
```

### NPM Publishing
```bash
cd packages/clippyjs-lib
npm publish                    # Publish to NPM registry
```

## Troubleshooting Commands

### Clear Build Cache
```bash
rm -rf dist node_modules .yarn/cache
yarn install
yarn build
```

### Check TypeScript Version
```bash
tsc --version                  # Should show 5.7.3
```

### Check Node/Yarn Versions
```bash
node --version
yarn --version
```

### Verify Build Output
```bash
ls -la packages/clippyjs-lib/dist/  # Check generated files
```

## Quick Reference

### Most Common Development Flow
```bash
# 1. Install dependencies
yarn install

# 2. Build library
cd packages/clippyjs-lib && yarn build

# 3. Run React demo
yarn demo:react

# 4. Make changes, then rebuild
cd packages/clippyjs-lib && yarn build

# 5. Type check
tsc --noEmit

# 6. Lint
yarn lint
```

### Pre-commit Checklist
```bash
tsc --noEmit                   # Type check
yarn lint                      # Lint
yarn test                      # Run tests
yarn build                     # Ensure builds successfully
```
