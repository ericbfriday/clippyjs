# Ralph Loop Infrastructure

This directory contains the self-referential development loop infrastructure for implementing the Browser-Based AI Assistant.

## What is Ralph Loop?

The Ralph Wiggum technique is an iterative development methodology where the same prompt is fed repeatedly to an AI. Each iteration sees its previous work in the files and git history, building incrementally toward the goal.

**Core concept:**
```bash
while :; do
  cat PROMPT.md | claude --print
done
```

## Directory Structure

```
.ralph/
├── PROMPT.md              # Main task prompt (fed to AI each iteration)
├── README.md              # This file
│
├── scripts/
│   ├── ralph-loop.sh          # Claude CLI runner
│   ├── ralph-loop-opencode.sh # OpenCode CLI runner
│   └── spawn-agent.sh         # Sub-agent spawner
│
├── agents/
│   ├── architect.md       # System architecture agent
│   ├── implementer.md     # Code implementation agent
│   ├── tester.md          # Test writing agent
│   ├── reviewer.md        # Code review agent
│   ├── documenter.md      # Documentation agent
│   ├── researcher.md      # Research agent
│   └── integrator.md      # Integration agent
│
├── state/
│   ├── progress.md        # Progress tracking
│   └── .loop-state        # Loop state (auto-generated)
│
└── logs/
    └── ralph_*.log        # Iteration logs
```

## Usage

### Starting a Ralph Loop

**With Claude CLI:**
```bash
cd /Users/ericfriday/dev/clippyjs
./.ralph/scripts/ralph-loop.sh
```

**With OpenCode CLI:**
```bash
./.ralph/scripts/ralph-loop-opencode.sh
```

**Options:**
```bash
# Custom max iterations
./.ralph/scripts/ralph-loop.sh --max-iterations 50

# Custom completion promise
./.ralph/scripts/ralph-loop.sh --promise "DONE" --max-iterations 20

# Verbose mode
./.ralph/scripts/ralph-loop.sh --verbose
```

### Spawning Sub-Agents

Spawn specialized agents for specific tasks:

```bash
# Architecture design
./.ralph/scripts/spawn-agent.sh architect -t "Design page parser module"

# Implementation
./.ralph/scripts/spawn-agent.sh implementer -t "Create SemanticExtractor" -f packages/browser-parser

# Testing
./.ralph/scripts/spawn-agent.sh tester -t "Write tests for FormAnalyzer"

# Review
./.ralph/scripts/spawn-agent.sh reviewer -t "Review PageContextProvider"

# Documentation
./.ralph/scripts/spawn-agent.sh documenter -t "Document API"

# Research
./.ralph/scripts/spawn-agent.sh researcher -t "Research Shadow DOM best practices"

# Integration
./.ralph/scripts/spawn-agent.sh integrator -t "Wire up context providers"
```

## Agent Types

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **architect** | Design system architecture | Starting new modules |
| **implementer** | Write implementation code | After architecture is defined |
| **tester** | Write tests | After implementation |
| **reviewer** | Review code quality | After implementation |
| **documenter** | Write documentation | After implementation |
| **researcher** | Research best practices | Before implementation |
| **integrator** | Connect components | After individual components work |

## Completion Promise

The loop continues until the AI outputs:
```
<promise>IMPLEMENTATION COMPLETE</promise>
```

This indicates all Phase 1 objectives are complete:
- All packages implemented
- All tests passing
- Documentation updated
- Working demo exists

## Progress Tracking

Progress is tracked in `state/progress.md`. Update this file after each iteration:
- Mark completed items
- Note any blockers
- Record what was attempted

## Resuming

If the loop is interrupted:
```bash
# State is automatically saved
# Just run again to resume
./.ralph/scripts/ralph-loop.sh
```

## Cancelling

To cancel an active loop:
```bash
# Remove loop state
rm .ralph/state/.loop-state
```

## Logs

All iterations are logged to `.ralph/logs/`:
```
.ralph/logs/ralph_20260217_120000.log
.ralph/logs/ralph_20260217_120500.log
```

## Related Documentation

- **PRD:** `docs/prd/PRD_BROWSER_AI_ASSISTANT.md`
- **Architecture:** `docs/prd/TECHNICAL_ARCHITECTURE.md`
- **API Spec:** `docs/prd/API_SPECIFICATION.md`
- **UX Design:** `docs/prd/UX_DESIGN.md`

## References

- [Ralph Wiggum Technique](https://ghuntley.com/ralph/) by Geoffrey Huntley
- [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
