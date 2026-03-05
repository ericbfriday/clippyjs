# Issue: Remove Duplicate "use client" Directive in Rollup Configuration

## Summary
The `"use client"` directive is duplicated three times in `packages/react/rollup.config.js`, creating unnecessary maintenance overhead. This directive is needed for Next.js App Router compatibility but should only be specified once in the configuration.

## Current State
The directive appears in three locations:
1. **Line 15**: `banner` property for CommonJS output
2. **Line 21**: `banner` property for ESM output  
3. **Line 48**: `preamble` property in terser configuration

## Problem
While this ensures the directive is preserved in the built files, it creates maintenance overhead:
- If the directive needs to be changed or removed, it must be updated in three places
- The `preamble` in terser configuration is redundant since terser preserves the banner by default
- Increases cognitive load for maintainers reviewing the configuration

## Proposed Solution
Remove the `preamble` from the terser configuration (line 48) since:
- The `banner` property on output configurations (lines 15 and 21) is sufficient to add the directive to built files
- Terser will preserve the banner by default, making the `preamble` redundant
- This reduces duplication from 3 instances to 2 instances (one per output format, which is necessary)

## Implementation Details

### Current Code (lines 46-50):
```javascript
terser({
  format: {
    preamble: '"use client";',
  },
}),
```

### Proposed Code:
```javascript
terser(),
```

Or if additional terser options are needed:
```javascript
terser({
  format: {
    // other format options
  },
}),
```

## Files to Modify
- `packages/react/rollup.config.js`

## Testing Checklist
After making the change, verify:
- [ ] Build the package: `yarn workspace @clippyjs/react build`
- [ ] Verify the directive is present in built files:
  - Check `dist/index.js` starts with `"use client";`
  - Check `dist/index.esm.js` starts with `"use client";`
- [ ] Run tests: `yarn workspace @clippyjs/react test`
- [ ] Verify the package works in a Next.js App Router environment (manual testing if automated tests don't cover this)

## Context and Sources
- **Original PR**: #10
- **Review Comment**: https://github.com/ericbfriday/clippyjs/pull/10#discussion_r2512059460
- **Commit with change**: 266dd8567adbdd98ec11fb73cddeeabb8f419e41
- **Terser Documentation**: Terser preserves banner comments by default when specified in output configuration
- **Next.js "use client" Directive**: Required for client components in Next.js App Router (App Directory)

## Priority
Low - This is a technical debt item that improves maintainability but doesn't affect functionality.

## Labels
- `technical-debt`
- `refactoring`
- `rollup`
- `good-first-issue`
