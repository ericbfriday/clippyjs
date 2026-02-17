# Ralph Loop Quick Start

Get up and running with the self-referential development loop for implementing the Browser-Based AI Assistant.

## Prerequisites

- **Claude CLI** or **OpenCode CLI** installed
- **Node.js 18+** and **Yarn 4+**
- **Git** configured

## Installation

```bash
# Clone the repository
git clone https://github.com/ericbfriday/clippyjs.git
cd clippyjs

# Install dependencies
yarn install

# Build the workspace
yarn nx:build
```

## Validate Setup

```bash
./ralph validate
```

Expected output:
```
✓ .ralph/PROMPT.md
✓ .ralph/README.md
✓ .ralph/scripts/ralph-loop.sh
✓ All PRD documents (3,532 lines)
✓ Claude CLI available

All validations passed!
```

## Start the Loop

### Option 1: Claude CLI

```bash
./ralph start
```

### Option 2: OpenCode CLI

```bash
./ralph start-opencode
```

### Options

```bash
# Limit iterations
./ralph start -m 20

# Verbose output
./ralph start -v

# Custom completion promise
./ralph start -c "PHASE_1_COMPLETE" -m 50
```

## What Happens

1. **Prompt loaded**: `.ralph/PROMPT.md` contains the task
2. **Context added**: Current iteration number, completion criteria
3. **AI invoked**: Claude/OpenCode processes the prompt
4. **Work done**: Files are created/modified
5. **Check completion**: Look for `<promise>IMPLEMENTATION COMPLETE</promise>`
6. **Repeat**: If not complete, next iteration starts

## Monitor Progress

```bash
# Check current status
./ralph status

# View progress checklist
cat .ralph/state/progress.md

# Watch logs
tail -f .ralph/logs/ralph_*.log
```

## Spawn Sub-Agents

Break down complex tasks with specialized agents:

```bash
# Architecture
./ralph spawn architect -t "Design page parser module"

# Implementation
./ralph spawn implementer -t "Create SemanticExtractor class" -f packages/browser-parser

# Testing
./ralph spawn tester -t "Write tests for FormAnalyzer"

# Code review
./ralph spawn reviewer -t "Review PageContextProvider"

# Documentation
./ralph spawn documenter -t "Document API surface"
```

## Cancel/Resume

```bash
# Cancel active loop
./ralph cancel

# Resume (state is auto-saved)
./ralph start
```

## Key Files

| File | Purpose |
|------|---------|
| `.ralph/PROMPT.md` | Main task prompt (edit to change task) |
| `.ralph/state/progress.md` | Progress checklist (update manually) |
| `.ralph/logs/` | Iteration logs |
| `docs/prd/` | PRD and technical specs |

## Tips

1. **Review PRD first**: Read `docs/prd/PRD_BROWSER_AI_ASSISTANT.md` before starting
2. **Commit regularly**: The AI will commit after each iteration
3. **Update progress**: Mark completed items in `.ralph/state/progress.md`
4. **Check git history**: See what previous iterations accomplished
5. **Limit iterations**: Use `-m` flag to prevent infinite loops during testing

## Troubleshooting

### CLI Not Found

```bash
# Install Claude CLI
# Visit: https://docs.anthropic.com/claude/docs/claude-cli

# Install OpenCode CLI
# Visit: https://github.com/opencode-ai/opencode
```

### Validation Fails

```bash
# Check missing files
ls -la .ralph/

# Re-run validation
./ralph validate
```

### Loop Stuck

```bash
# Check logs
cat .ralph/logs/ralph_*.log | tail -100

# Cancel and restart
./ralph cancel
./ralph start -m 10
```

### Build Errors

```bash
# Clean and rebuild
yarn clean
yarn nx:build
```

## Architecture

```
.ralph/
├── PROMPT.md           # Task definition
├── scripts/
│   ├── ralph-loop.sh   # Claude runner
│   └── spawn-agent.sh  # Agent spawner
├── agents/             # Agent configurations
│   ├── architect.md
│   ├── implementer.md
│   └── ...
└── state/
    └── progress.md     # Progress tracking
```

## Next Steps

1. Run `./ralph validate` to confirm setup
2. Run `./ralph start` to begin the loop
3. Monitor progress with `./ralph status`
4. Spawn agents for specific tasks as needed

---

**Need help?** See `.ralph/README.md` for detailed documentation.
