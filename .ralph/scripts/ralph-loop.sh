#!/usr/bin/env bash
#
# Ralph Loop Runner
#
# Executes a self-referential development loop using Claude CLI.
# The same prompt is fed repeatedly until completion promise is detected
# or max iterations are reached.
#
# Usage:
#   ./ralph-loop.sh [options]
#
# Options:
#   -p, --prompt FILE      Path to prompt file (default: .ralph/PROMPT.md)
#   -m, --max-iterations N Maximum iterations (default: 100)
#   -c, --promise TEXT     Completion promise text (default: "IMPLEMENTATION COMPLETE")
#   -l, --log-dir DIR      Directory for logs (default: .ralph/logs)
#   -v, --verbose          Enable verbose output
#   -h, --help             Show this help message
#
# Based on the Ralph Wiggum technique by Geoffrey Huntley
# https://ghuntley.com/ralph/

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROMPT_FILE="$PROJECT_ROOT/.ralph/PROMPT.md"
MAX_ITERATIONS=100
COMPLETION_PROMISE="IMPLEMENTATION COMPLETE"
LOG_DIR="$PROJECT_ROOT/.ralph/logs"
VERBOSE=false
ITERATION=0
STATE_FILE="$PROJECT_ROOT/.ralph/state/.loop-state"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt)
            PROMPT_FILE="$2"
            shift 2
            ;;
        -m|--max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        -c|--promise)
            COMPLETION_PROMISE="$2"
            shift 2
            ;;
        -l|--log-dir)
            LOG_DIR="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Initialize directories
mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$STATE_FILE")"

# Generate timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/ralph_$TIMESTAMP.log"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        ITERATION) echo -e "${CYAN}[ITERATION $ITERATION]${NC} $message" ;;
    esac
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[$timestamp] [$level] $message"
    fi
}

# Check for completion promise in output
check_completion() {
    local output="$1"
    if echo "$output" | grep -q "<promise>$COMPLETION_PROMISE</promise>"; then
        return 0
    fi
    return 1
}

# Load state from previous run
load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        source "$STATE_FILE"
        log INFO "Resuming from iteration $ITERATION"
    else
        ITERATION=0
        log INFO "Starting fresh Ralph loop"
    fi
}

# Save state for resumption
save_state() {
    cat > "$STATE_FILE" << EOF
ITERATION=$ITERATION
TIMESTAMP=$(date +%s)
PROMPT_FILE="$PROMPT_FILE"
COMPLETION_PROMISE="$COMPLETION_PROMISE"
EOF
}

# Clear state on completion
clear_state() {
    rm -f "$STATE_FILE"
    log INFO "Cleared loop state"
}

# Main loop function
run_iteration() {
    local iteration_num=$1
    log ITERATION "Starting iteration $iteration_num of $MAX_ITERATIONS"
    
    # Read the prompt
    if [[ ! -f "$PROMPT_FILE" ]]; then
        log ERROR "Prompt file not found: $PROMPT_FILE"
        exit 1
    fi
    
    local prompt_content
    prompt_content=$(cat "$PROMPT_FILE")
    
    # Add iteration context to prompt
    local full_prompt="$prompt_content

---
## Ralph Loop Context

**Iteration:** $iteration_num / $MAX_ITERATIONS
**Completion Promise:** Output \`<promise>$COMPLETION_PROMISE</promise>\` when fully complete.

Continue from where you left off. Check git history and files for previous progress.
"
    
    # Run Claude CLI
    log INFO "Invoking Claude CLI..."
    
    local output
    local exit_code
    
    # Check if claude CLI is available
    if ! command -v claude &> /dev/null; then
        log ERROR "Claude CLI not found. Please install it first."
        log INFO "Visit: https://docs.anthropic.com/claude/docs/claude-cli"
        exit 1
    fi
    
    # Execute Claude with the prompt
    set +e
    output=$(echo "$full_prompt" | claude --print 2>&1)
    exit_code=$?
    set -e
    
    # Log output
    echo "$output" >> "$LOG_FILE"
    
    if [[ $exit_code -ne 0 ]]; then
        log WARN "Claude CLI returned non-zero exit code: $exit_code"
    fi
    
    # Check for completion
    if check_completion "$output"; then
        log SUCCESS "Completion promise detected!"
        echo ""
        echo "$output"
        clear_state
        return 0
    fi
    
    # Show summary of output
    local output_lines
    output_lines=$(echo "$output" | wc -l)
    log INFO "Generated $output_lines lines of output"
    
    # Show last few lines
    if [[ "$VERBOSE" == "true" ]]; then
        echo "--- Output (last 20 lines) ---"
        echo "$output" | tail -20
        echo "--- End Output ---"
    fi
    
    return 1
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        save_state
        log INFO "State saved. Run again to resume."
    fi
}

trap cleanup EXIT

# Main execution
main() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           Ralph Loop - Browser AI Assistant            ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log INFO "Prompt file: $PROMPT_FILE"
    log INFO "Max iterations: $MAX_ITERATIONS"
    log INFO "Completion promise: $COMPLETION_PROMISE"
    log INFO "Log file: $LOG_FILE"
    echo ""
    
    load_state
    
    # Main loop
    while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
        ITERATION=$((ITERATION + 1))
        save_state
        
        if run_iteration $ITERATION; then
            echo ""
            log SUCCESS "Ralph loop completed successfully after $ITERATION iterations!"
            exit 0
        fi
        
        # Brief pause between iterations
        sleep 2
    done
    
    log WARN "Reached maximum iterations ($MAX_ITERATIONS) without completion"
    log INFO "State saved. Run again with --max-iterations to continue."
    exit 1
}

main "$@"
