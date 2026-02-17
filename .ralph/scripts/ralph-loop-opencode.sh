#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROMPT_FILE="$PROJECT_ROOT/.ralph/PROMPT.md"
MAX_ITERATIONS=100
COMPLETION_PROMISE="IMPLEMENTATION COMPLETE"
LOG_DIR="$PROJECT_ROOT/.ralph/logs"
VERBOSE=false
ITERATION=0
STATE_FILE="$PROJECT_ROOT/.ralph/state/.opencode-loop-state"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    cat << 'EOF'
Ralph Loop Runner (OpenCode) - Self-referential development loop using OpenCode CLI

Usage: ./ralph-loop-opencode.sh [options]

Options:
  -p, --prompt FILE      Path to prompt file (default: .ralph/PROMPT.md)
  -m, --max-iterations N Maximum iterations (default: 100)
  -c, --promise TEXT     Completion promise text (default: "IMPLEMENTATION COMPLETE")
  -l, --log-dir DIR      Directory for logs (default: .ralph/logs)
  -s, --session ID       Resume from existing session ID
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

Based on the Ralph Wiggum technique by Geoffrey Huntley
https://ghuntley.com/ralph/
EOF
    exit 0
}

SESSION_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt) PROMPT_FILE="$2"; shift 2 ;;
        -m|--max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
        -c|--promise) COMPLETION_PROMISE="$2"; shift 2 ;;
        -l|--log-dir) LOG_DIR="$2"; shift 2 ;;
        -s|--session) SESSION_ID="$2"; shift 2 ;;
        -v|--verbose) VERBOSE=true; shift ;;
        -h|--help) show_help ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

mkdir -p "$LOG_DIR" "$(dirname "$STATE_FILE")"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/ralph_opencode_$TIMESTAMP.log"

log() {
    local level="$1"; shift
    local message="$*"
    local ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [$level] $message" >> "$LOG_FILE"
    case $level in
        INFO)     echo -e "${BLUE}[INFO]${NC} $message" ;;
        WARN)     echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR)    echo -e "${RED}[ERROR]${NC} $message" ;;
        SUCCESS)  echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        ITERATION) echo -e "${CYAN}[ITERATION $ITERATION]${NC} $message" ;;
    esac
}

check_completion() {
    grep -q "<promise>$COMPLETION_PROMISE</promise>" <<< "$1"
}

load_state() {
    [[ -f "$STATE_FILE" ]] && source "$STATE_FILE" && log INFO "Resuming from iteration $ITERATION" || log INFO "Starting fresh Ralph loop"
}

save_state() {
    cat > "$STATE_FILE" << EOF
ITERATION=$ITERATION
TIMESTAMP=$(date +%s)
PROMPT_FILE="$PROMPT_FILE"
COMPLETION_PROMISE="$COMPLETION_PROMISE"
SESSION_ID="$SESSION_ID"
EOF
}

clear_state() { rm -f "$STATE_FILE" && log INFO "Cleared loop state"; }

run_iteration() {
    local num=$1
    log ITERATION "Starting iteration $num of $MAX_ITERATIONS"
    
    [[ ! -f "$PROMPT_FILE" ]] && log ERROR "Prompt file not found: $PROMPT_FILE" && exit 1
    
    local prompt_content=$(cat "$PROMPT_FILE")
    local full_prompt="$prompt_content

---
## Ralph Loop Context

**Iteration:** $num / $MAX_ITERATIONS
**Completion Promise:** Output \`<promise>$COMPLETION_PROMISE</promise>\` when fully complete.

Continue from where you left off. Check git history and files for previous progress.
"
    
    log INFO "Invoking OpenCode CLI..."
    
    if ! command -v opencode &> /dev/null; then
        log ERROR "OpenCode CLI not found"
        exit 1
    fi
    
    set +e
    local output
    if [[ -n "$SESSION_ID" ]]; then
        log INFO "Using session: $SESSION_ID"
        output=$(opencode --session "$SESSION_ID" --prompt "$full_prompt" 2>&1)
    else
        output=$(echo "$full_prompt" | opencode 2>&1)
    fi
    local exit_code=$?
    set -e
    
    echo "$output" >> "$LOG_FILE"
    [[ $exit_code -ne 0 ]] && log WARN "OpenCode CLI returned exit code: $exit_code"
    
    if check_completion "$output"; then
        log SUCCESS "Completion promise detected!"
        echo ""
        echo "$output"
        clear_state
        return 0
    fi
    
    log INFO "Generated $(wc -l <<< "$output") lines of output"
    [[ "$VERBOSE" == "true" ]] && echo "$output" | tail -20
    return 1
}

cleanup() { [[ $? -ne 0 ]] && save_state && log INFO "State saved. Run again to resume."; }
trap cleanup EXIT

main() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║      Ralph Loop (OpenCode) - Browser AI Assistant       ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log INFO "Prompt file: $PROMPT_FILE"
    log INFO "Max iterations: $MAX_ITERATIONS"
    log INFO "Completion promise: $COMPLETION_PROMISE"
    log INFO "Log file: $LOG_FILE"
    [[ -n "$SESSION_ID" ]] && log INFO "Session ID: $SESSION_ID"
    echo ""
    
    load_state
    
    while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
        ITERATION=$((ITERATION + 1))
        save_state
        run_iteration $ITERATION && log SUCCESS "Ralph loop completed after $ITERATION iterations!" && exit 0
        sleep 2
    done
    
    log WARN "Reached maximum iterations ($MAX_ITERATIONS) without completion"
    exit 1
}

main "$@"
