# ClippyJS Task Completion Guidelines

## What to Do When a Task is Completed

### 1. Code Quality Checks

Before marking any coding task as complete, perform these checks in order:

#### Type Checking (Mandatory)
```bash
cd packages/clippyjs-lib
tsc --noEmit
```
- **Must Pass**: Zero TypeScript errors
- **Fix Immediately**: Any type errors must be resolved before proceeding
- **Strict Mode**: Project uses strict TypeScript, all type safety rules apply

#### Linting (Required)
```bash
cd packages/clippyjs-lib
yarn lint
```
- **Target**: Zero ESLint errors
- **Warnings**: Acceptable in some cases, but should be minimal
- **Auto-fix**: Many issues can be auto-fixed with `eslint --fix`

#### Build Verification (Critical)
```bash
cd packages/clippyjs-lib
yarn build
```
- **Success Required**: Build must complete without errors
- **Output Check**: Verify dist/ directory contains all expected files
- **Bundle Sizes**: Check that bundles are reasonable (no unexpected bloat)

### 2. Testing Requirements

#### Run Tests
```bash
cd packages/clippyjs-lib
yarn test
```
- **All Tests Must Pass**: Zero test failures
- **New Features**: Add tests for new functionality
- **Bug Fixes**: Add regression tests to prevent recurrence

#### Manual Testing
- **React Demo**: Test changes in demo app
  ```bash
  yarn demo:react
  ```
- **Functionality**: Verify feature works as expected
- **Edge Cases**: Test boundary conditions and error scenarios
- **Browser Testing**: Check in target browsers if UI changes made

### 3. Documentation Updates

#### Code Documentation
- **JSDoc Comments**: Add/update for new/changed public APIs
- **Type Definitions**: Ensure all exports have proper types
- **Inline Comments**: Explain complex logic

#### README Updates (if applicable)
- **New Features**: Document new APIs in README
- **Breaking Changes**: Clearly note any breaking changes
- **Usage Examples**: Provide code examples for new functionality

#### Changelog (for significant changes)
- **Version Consideration**: Note if change warrants version bump
- **Migration Guide**: Provide upgrade instructions for breaking changes

### 4. Git Workflow

#### Before Committing
```bash
# 1. Check status
git status

# 2. Review changes
git diff

# 3. Stage files
git add <relevant-files>  # Be selective, don't use 'git add .'

# 4. Commit with descriptive message
git commit -m "feat: add [feature]" 
# or
git commit -m "fix: resolve [issue]"
# or
git commit -m "refactor: improve [component]"
```

#### Commit Message Format
- **Type Prefix**: feat, fix, refactor, docs, test, chore
- **Scope**: Optional component/module name
- **Description**: Clear, concise summary (50 chars or less ideal)
- **Body**: Detailed explanation if needed (wrap at 72 chars)

#### Branch Strategy
- **Feature Branches**: Work on feature/* branches
- **Main Branch**: `master` (never commit directly)
- **Current Work**: `feat/rewrite-to-react`

### 5. Workspace Considerations

#### Monorepo Awareness
- **Multiple Packages**: Changes might affect multiple packages
- **Workspace Dependencies**: Rebuild if changing clippyjs-lib used by demos
- **Cross-Package Testing**: Test in dependent packages when applicable

#### Build Propagation
```bash
# After library changes
cd packages/clippyjs-lib && yarn build

# Test in React demo
yarn demo:react
```

### 6. Performance Checks

#### Bundle Size
- **Monitor**: Check dist/ file sizes after build
- **Optimization**: Ensure tree-shaking is working
- **Assets**: Verify assets aren't bundled (should be CDN-loaded)

#### Runtime Performance
- **Agent Loading**: Should be fast (~100-300ms)
- **Animations**: Should be smooth (60fps)
- **Memory**: No memory leaks from event listeners or timers

### 7. Backward Compatibility

#### API Changes
- **Breaking Changes**: Avoid if possible
- **Deprecation Path**: Provide warnings before removing features
- **Versioning**: Follow semantic versioning (major.minor.patch)

#### React Compatibility
- **React 19**: Ensure compatibility with React 19 patterns
- **Hooks Rules**: Follow React Hooks rules of use
- **No Legacy Patterns**: Don't use deprecated React patterns

### 8. Final Checklist

Before marking task as complete, verify:

- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] Linting passes (`yarn lint`)
- [ ] Build succeeds (`yarn build`)
- [ ] All tests pass (`yarn test`)
- [ ] Manual testing completed in demo app
- [ ] Code is documented (JSDoc, inline comments)
- [ ] README updated (if adding/changing public API)
- [ ] Git changes reviewed (`git diff`)
- [ ] Commit message is descriptive
- [ ] No debug code left in (console.logs, debuggers)
- [ ] No temporary files committed
- [ ] Clean working tree or intentional uncommitted changes

### 9. Special Considerations

#### React 19 + TypeScript 5.7.3 Migration
- **Known Issues**: Reference docs/react19-typescript-fixes.md
- **Module Resolution**: Uses "bundler" mode
- **JSX Runtime**: Automatic, no React imports needed
- **Type-Only Imports**: Prefer `import type` where applicable

#### Asset Management
- **CDN Default**: Assets load from GitHub CDN
- **No Bundling**: Don't include assets in bundle
- **Base Path**: Respect basePath configuration option

#### Yarn Workspaces
- **Install from Root**: Run `yarn install` from root
- **Build Order**: Build library before demos
- **Workspace Links**: Changes to library reflect immediately in demos

### 10. When to Ask for Clarification

Don't proceed if:
- **Unclear Requirements**: Task goal is ambiguous
- **Breaking Changes**: Change would break existing API
- **Major Refactor**: Change affects multiple core components
- **New Dependencies**: Adding new package dependencies
- **Architecture Decision**: Structural changes to codebase

Always better to confirm than to implement incorrectly.

## Task-Specific Guidelines

### Adding New Features
1. Design API interface
2. Add TypeScript types
3. Implement functionality
4. Add unit tests
5. Update documentation
6. Add demo example

### Fixing Bugs
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test now passes
4. Check for similar issues elsewhere
5. Document fix in commit message

### Refactoring
1. Ensure tests exist and pass
2. Make incremental changes
3. Run tests after each change
4. Verify no behavior changes
5. Update comments/docs if needed

### Updating Dependencies
1. Check for breaking changes
2. Update code for new APIs
3. Run full test suite
4. Test in demo applications
5. Update documentation if APIs changed
