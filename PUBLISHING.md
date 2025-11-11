# Publishing Packages to NPM

This guide covers how to publish ClippyJS packages to npm under the `@clippyjs` scope.

## Prerequisites

### 1. NPM Account Setup

You need an npm account with access to the `@clippyjs` organization:

1. Create an npm account at https://www.npmjs.com/signup
2. Request access to the `@clippyjs` organization (or create it)
3. Enable 2FA (two-factor authentication) for your account (highly recommended)

### 2. Authentication Setup

You have two options for authentication:

#### Option A: Using NPM_TOKEN Environment Variable (Recommended)

1. Generate an access token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Select "Automation" token type for CI/CD, or "Publish" for manual publishing
   - Copy the token (you won't see it again!)

2. Set the environment variable:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export NPM_TOKEN=your_npm_token_here

# Or set it temporarily for current session
export NPM_TOKEN=your_npm_token_here
```

3. Verify the token is set:
```bash
echo $NPM_TOKEN
```

The `.npmrc` file in the project root is already configured to use this token:
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

#### Option B: Using npm login

Alternatively, you can authenticate directly:

```bash
npm login --scope=@clippyjs --registry=https://registry.npmjs.org/
```

This will prompt for your username, password, and 2FA code.

## Publishable Packages

The following packages are configured for publishing:

| Package | Version | Description |
|---------|---------|-------------|
| `@clippyjs/types` | 1.0.0 | Shared TypeScript types |
| `@clippyjs/react` | 1.0.0 | React components and hooks |
| `@clippyjs/ai` | 1.0.0 | AI integration core |
| `@clippyjs/ai-anthropic` | 1.0.0 | Anthropic Claude provider |
| `@clippyjs/ai-openai` | 0.1.0 | OpenAI GPT provider |

**Note**: Storybook, demo apps, and templates are marked as `private: true` and will not be published.

## Pre-Publishing Checklist

Before publishing, ensure:

- ✅ All tests pass: `yarn test:all`
- ✅ Build succeeds: `yarn build`
- ✅ TypeScript compiles: `yarn typecheck`
- ✅ Version numbers are updated (see [Versioning](#versioning) below)
- ✅ CHANGELOG.md is updated with changes
- ✅ README.md files are current in each package
- ✅ Git working directory is clean (commit changes first)
- ✅ You're on the `master` branch (or appropriate release branch)

## Versioning

### Semantic Versioning

ClippyJS follows [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

### Update Version Numbers

Use the built-in version scripts to update all publishable packages at once:

```bash
# Bump patch version (1.0.0 → 1.0.1)
yarn version:patch

# Bump minor version (1.0.0 → 1.1.0)
yarn version:minor

# Bump major version (1.0.0 → 2.0.0)
yarn version:major
```

Or update individual packages:

```bash
yarn workspace @clippyjs/react version patch
yarn workspace @clippyjs/ai version minor
```

After versioning, commit the changes:

```bash
git add .
git commit -m "chore: bump version to X.Y.Z"
git push
```

## Publishing Process

### Option 1: Publish All Packages (Recommended)

This is the safest option that ensures proper dependency order:

```bash
# Build all packages and publish in correct order
yarn publish:all
```

This will:
1. Run `yarn build` to build all packages
2. Publish in dependency order:
   - `@clippyjs/types` (no dependencies)
   - `@clippyjs/react` (depends on types)
   - `@clippyjs/ai` (depends on types)
   - `@clippyjs/ai-anthropic` (depends on ai)
   - `@clippyjs/ai-openai` (depends on ai)

### Option 2: Publish Individual Packages

If you only need to publish specific packages:

```bash
# Publish types first (other packages depend on it)
yarn publish:types

# Then publish other packages
yarn publish:react
yarn publish:ai
yarn publish:ai-anthropic
yarn publish:ai-openai
```

**Important**: Always publish `@clippyjs/types` first if you've updated it, as other packages depend on it.

## Post-Publishing

### 1. Verify Publication

Check that packages are available on npm:

```bash
npm view @clippyjs/react
npm view @clippyjs/ai
```

Or visit: https://www.npmjs.com/package/@clippyjs/react

### 2. Create Git Tag

Tag the release in git:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 3. Create GitHub Release

Create a release on GitHub:
1. Go to https://github.com/ericbfriday/clippyjs/releases
2. Click "Draft a new release"
3. Select the tag you just created
4. Add release notes (copy from CHANGELOG.md)
5. Publish release

### 4. Test Installation

Test that users can install the published packages:

```bash
# Create a test directory
mkdir /tmp/test-clippyjs
cd /tmp/test-clippyjs
npm init -y

# Install published packages
npm install @clippyjs/react @clippyjs/ai @clippyjs/ai-anthropic

# Verify installations
npm list @clippyjs/react
```

## Troubleshooting

### "You must be logged in to publish packages"

**Solution**: Set up authentication (see [Authentication Setup](#2-authentication-setup) above)

### "You do not have permission to publish @clippyjs/package-name"

**Solution**: Ensure you're a member of the `@clippyjs` organization on npm

### "npm ERR! 403 Forbidden"

**Causes**:
- Not authenticated
- Not a member of the organization
- Package name is already taken
- 2FA code required

**Solution**: 
```bash
npm login --scope=@clippyjs
```

### "npm ERR! 402 Payment Required"

**Solution**: The `@clippyjs` organization may need to be upgraded to a paid plan to publish scoped packages. Check npm billing settings.

### "This package has been marked as private"

**Solution**: Check that `"private": true` is **not** in the package.json you're trying to publish. Only these should have `private: false` or no private field:
- `@clippyjs/types`
- `@clippyjs/react`
- `@clippyjs/ai`
- `@clippyjs/ai-anthropic`
- `@clippyjs/ai-openai`

### Version Already Published

**Error**: `npm ERR! 403 You cannot publish over the previously published versions`

**Solution**: Increment the version number before publishing again:
```bash
yarn workspace @clippyjs/react version patch
```

### Build Failures Before Publishing

If `yarn build` fails before publishing:

1. Check TypeScript errors: `yarn typecheck`
2. Check individual package builds:
   ```bash
   yarn workspace @clippyjs/react build
   yarn workspace @clippyjs/ai build
   ```
3. Fix errors and try again

## CI/CD Publishing (GitHub Actions)

For automated publishing on releases, create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Enable Corepack
        run: corepack enable
      
      - name: Install dependencies
        run: yarn install --immutable
      
      - name: Build packages
        run: yarn build
      
      - name: Publish to NPM
        run: yarn publish:all
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup**:
1. Add your NPM token to GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm access token
2. Commit the workflow file
3. Create a GitHub release to trigger automatic publishing

## Best Practices

1. **Always test before publishing**
   - Run full test suite
   - Build locally
   - Test in a real project

2. **Update documentation**
   - Keep README.md files current
   - Update CHANGELOG.md
   - Document breaking changes

3. **Version consistently**
   - Use semantic versioning
   - Update all related packages together
   - Keep version numbers in sync when possible

4. **Publish in order**
   - Use `yarn publish:all` to handle dependencies
   - Or manually publish in dependency order

5. **Communicate changes**
   - Create GitHub releases
   - Update documentation
   - Notify users of breaking changes

6. **Keep tokens secure**
   - Never commit NPM_TOKEN to git
   - Use environment variables
   - Rotate tokens regularly
   - Use granular access tokens (not legacy tokens)

## Package Dependencies

Understanding dependency order is important:

```
@clippyjs/types (standalone)
    ↓
@clippyjs/react (depends on types)
@clippyjs/ai (depends on types)
    ↓
@clippyjs/ai-anthropic (depends on ai)
@clippyjs/ai-openai (depends on ai)
```

Always publish parent packages before their dependents.

## Support

For issues or questions:
- GitHub Issues: https://github.com/ericbfriday/clippyjs/issues
- NPM Documentation: https://docs.npmjs.com/
- Yarn Berry Documentation: https://yarnpkg.com/
