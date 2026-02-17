#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo ""
echo "Validating Ralph Loop Infrastructure..."
echo ""

errors=0

info "Checking required files..."
files=(
    ".ralph/PROMPT.md"
    ".ralph/README.md"
    ".ralph/scripts/ralph-loop.sh"
    ".ralph/scripts/ralph-loop-opencode.sh"
    ".ralph/scripts/spawn-agent.sh"
    ".ralph/agents/architect.md"
    ".ralph/agents/implementer.md"
    ".ralph/agents/tester.md"
    ".ralph/agents/reviewer.md"
    ".ralph/agents/documenter.md"
    ".ralph/agents/researcher.md"
    ".ralph/agents/integrator.md"
    ".ralph/state/progress.md"
)

for file in "${files[@]}"; do
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        pass "$file"
    else
        fail "$file (missing)"
        ((errors++))
    fi
done

info "Checking directories..."
dirs=(".ralph/logs" ".ralph/state")
for dir in "${dirs[@]}"; do
    if [[ -d "$PROJECT_ROOT/$dir" ]]; then
        pass "$dir/"
    else
        warn "$dir/ (will be created on first run)"
    fi
done

info "Checking script permissions..."
scripts=(
    ".ralph/scripts/ralph-loop.sh"
    ".ralph/scripts/ralph-loop-opencode.sh"
    ".ralph/scripts/spawn-agent.sh"
)

for script in "${scripts[@]}"; do
    if [[ -x "$PROJECT_ROOT/$script" ]]; then
        pass "$script is executable"
    else
        warn "$script not executable (run: chmod +x $script)"
    fi
done

info "Checking PRD documents..."
prd_files=(
    "docs/prd/PRD_BROWSER_AI_ASSISTANT.md"
    "docs/prd/TECHNICAL_ARCHITECTURE.md"
    "docs/prd/API_SPECIFICATION.md"
    "docs/prd/UX_DESIGN.md"
)

for file in "${prd_files[@]}"; do
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
        lines=$(wc -l < "$PROJECT_ROOT/$file")
        pass "$file ($lines lines)"
    else
        fail "$file (missing)"
        ((errors++))
    fi
done

info "Checking CLI tools..."
if command -v claude &> /dev/null; then
    pass "Claude CLI available"
else
    warn "Claude CLI not found (optional)"
fi

if command -v opencode &> /dev/null; then
    pass "OpenCode CLI available"
else
    warn "OpenCode CLI not found (optional)"
fi

echo ""
if [[ $errors -eq 0 ]]; then
    pass "All validations passed!"
    echo ""
    echo "Ready to run Ralph loop:"
    echo "  ./.ralph/scripts/ralph-loop.sh"
    exit 0
else
    fail "$errors validation(s) failed"
    exit 1
fi
