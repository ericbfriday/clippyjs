# Browser-Based AI Assistant — Phase 1 Implementation

**Goal:** Implement the Browser-Based AI Assistant Phase 1 as defined in `docs/prd/`.
**Source:** `.ralph/PROMPT.md`, `docs/prd/PRD_BROWSER_AI_ASSISTANT.md`, `docs/prd/TECHNICAL_ARCHITECTURE.md`, `docs/prd/API_SPECIFICATION.md`
**Completion Signal:** `<promise>IMPLEMENTATION COMPLETE</promise>`

---

## Phase A: Package Scaffolding (P0 — no dependencies)

- [x] **A1**: Create `packages/browser-assistant/` package scaffold (package.json, tsconfig.json, project.json, rollup.config.ts, vitest.config.ts, src/index.ts, README.md)
- [x] **A2**: Create `packages/browser-parser/` package scaffold (package.json, tsconfig.json, project.json, rollup.config.ts, vitest.config.ts, src/index.ts, README.md)
- [x] **A3**: Create `packages/context-providers/` package scaffold (package.json, tsconfig.json, project.json, rollup.config.ts, vitest.config.ts, src/index.ts, README.md)
- [x] **A4**: Add browser-assistant types to `packages/types/src/` (EmbedConfig, ContentType, Section, Entity, InteractiveElement, FormAnalysis, PageContext, UserBehaviorContext, ProactiveConfig, FrustrationSignal, ClippyAssistantConfig)
- [x] **A5**: Update `tsconfig.base.json` path aliases for new packages; verify `nx.json` workspace covers new packages

---

## Phase B: browser-parser Implementations (depends on A1, A2, A4)

- [ ] **B1**: Implement `SemanticExtractor` class at `packages/browser-parser/src/semantic/semantic-extractor.ts` — extract title, description, topics, contentType (product/article/form/checkout/etc.), sections, entities from live DOM
- [ ] **B2**: Implement `InteractionDetector` class at `packages/browser-parser/src/interaction/interaction-detector.ts` — detect all interactive elements (buttons, links, inputs, selects, ARIA roles), MutationObserver for real-time updates
- [ ] **B3**: Implement `FormAnalyzer` class at `packages/browser-parser/src/interaction/form-analyzer.ts` — deep form analysis: fields, validation rules, progress tracking, focused field detection, value suggestion
- [ ] **B4**: Wire up `packages/browser-parser/src/index.ts` public exports; verify `yarn nx run @clippyjs/browser-parser:typecheck` passes

---

## Phase C: context-providers Implementations (depends on B1-B4)

- [ ] **C1**: Implement `PageContextProvider` at `packages/context-providers/src/page-context/page-context-provider.ts` — gathers full page context using SemanticExtractor, InteractionDetector, FormAnalyzer; implements ContextProvider interface from @clippyjs/ai
- [ ] **C2**: Implement `UserBehaviorProvider` at `packages/context-providers/src/user-behavior/user-behavior-provider.ts` — tracks clicks, scrolls, idle time, rage clicks, form abandonment, backtracking; detects frustration signals
- [ ] **C3**: Wire up `packages/context-providers/src/index.ts` public exports; verify `yarn nx run @clippyjs/context-providers:typecheck` passes

---

## Phase D: browser-assistant Core (depends on B1-B4, C1-C3)

- [ ] **D1**: Implement `ShadowRenderer` at `packages/browser-assistant/src/shadow/shadow-renderer.ts` — Shadow DOM container, adopted stylesheets, agent/chat/balloon render slots, style isolation from host page
- [ ] **D2**: Implement `ClippyEmbedder` at `packages/browser-assistant/src/core/embedder.ts` — full init lifecycle: validate config → createShadowHost → initParser → initContextProviders → initAgent → startProactiveBehavior; plus destroy() cleanup
- [ ] **D3**: Implement CDN/IIFE bundle entry at `packages/browser-assistant/src/browser.ts` — `ClippyAssistant.init(config)` global; update rollup.config.ts to produce both ESM + IIFE outputs
- [ ] **D4**: Wire up `packages/browser-assistant/src/index.ts` public exports; verify `yarn nx run @clippyjs/browser-assistant:typecheck` passes and `yarn nx run @clippyjs/browser-assistant:build` succeeds

---

## Phase E: Tests (depends on B-D complete)

- [ ] **E1**: Unit tests for `browser-parser`: SemanticExtractor (5 content type cases), InteractionDetector (button/link/input detection), FormAnalyzer (field analysis, validation, progress) — `packages/browser-parser/tests/unit/`
- [ ] **E2**: Unit tests for `context-providers`: PageContextProvider.gather() mock DOM scenarios, UserBehaviorProvider frustration detection — `packages/context-providers/tests/unit/`
- [ ] **E3**: Unit tests for `browser-assistant`: ClippyEmbedder init/destroy, ShadowRenderer isolation — `packages/browser-assistant/tests/unit/`
- [ ] **E4**: Integration test: full embed cycle — create embedder, init on mock page, verify shadow DOM exists, verify context gathered, destroy cleanly — `packages/browser-assistant/tests/integration/embedding.test.ts`
- [ ] **E5**: Run full test suite — `yarn nx run-many --target=test --projects=@clippyjs/browser-assistant,@clippyjs/browser-parser,@clippyjs/context-providers` — ALL tests must pass

---

## Phase F: Finalization

- [ ] **F1**: Build all new packages — `yarn nx run-many --target=build --projects=@clippyjs/browser-assistant,@clippyjs/browser-parser,@clippyjs/context-providers` — confirm dist/ outputs
- [ ] **F2**: Update `.ralph/state/progress.md` — mark all Phase 1 items complete, document what was built
- [ ] **F3**: Git commit — "feat: implement Browser-Based AI Assistant Phase 1 (browser-assistant, browser-parser, context-providers)"

---

## Reference Architecture

### Package names
- `@clippyjs/browser-assistant` → `packages/browser-assistant/`
- `@clippyjs/browser-parser` → `packages/browser-parser/`
- `@clippyjs/context-providers` → `packages/context-providers/`

### Key patterns (copy from @clippyjs/ai)
- package.json: type=module, main=dist/index.js, module=dist/index.esm.js, types=dist/index.d.ts
- tsconfig.json: extends ../../tsconfig.react.json, composite:true
- project.json: executor=nx:run-commands for build, @nx/vite:test for test
- rollup.config.ts: @rollup/plugin-typescript, @rollup/plugin-node-resolve, @rollup/plugin-commonjs
- vitest.config.ts: environment=jsdom (browser DOM needed)

### Critical imports
- `browser-parser` depends on: `@clippyjs/types`
- `context-providers` depends on: `@clippyjs/types`, `@clippyjs/ai` (ContextProvider interface), `@clippyjs/browser-parser`
- `browser-assistant` depends on: `@clippyjs/types`, `@clippyjs/ai`, `@clippyjs/browser-parser`, `@clippyjs/context-providers`
