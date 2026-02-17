#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/.ralph/agents"
LOG_DIR="$PROJECT_ROOT/.ralph/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

show_help() {
    cat << 'EOF'
Agent Spawner - Launch specialized sub-agents for Ralph loop tasks

Usage: ./spawn-agent.sh <agent-type> [options]

Agent Types:
  architect    Design system architecture and component structure
  implementer  Write implementation code based on specifications
  tester       Write and run tests for implemented code
  reviewer     Review code for quality, patterns, and issues
  documenter   Generate documentation for code and APIs
  researcher   Research best practices and gather information
  integrator   Integrate components and resolve dependencies

Options:
  -t, --task TEXT      Task description for the agent
  -f, --file FILE      Target file or directory
  -p, --provider PROV  AI provider (claude|opencode) default: claude
  -s, --session ID     Resume from session ID
  -v, --verbose        Enable verbose output
  -h, --help           Show this help message

Examples:
  ./spawn-agent.sh architect -t "Design page parser module"
  ./spawn-agent.sh implementer -t "Create SemanticExtractor class" -f packages/browser-parser
  ./spawn-agent.sh tester -t "Write tests for FormAnalyzer"
EOF
    exit 0
}

AGENT_TYPE=""
TASK=""
TARGET_FILE=""
PROVIDER="claude"
SESSION_ID=""
VERBOSE=false

[[ $# -eq 0 ]] && show_help

AGENT_TYPE="$1"; shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--task) TASK="$2"; shift 2 ;;
        -f|--file) TARGET_FILE="$2"; shift 2 ;;
        -p|--provider) PROVIDER="$2"; shift 2 ;;
        -s|--session) SESSION_ID="$2"; shift 2 ;;
        -v|--verbose) VERBOSE=true; shift ;;
        -h|--help) show_help ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/agent_${AGENT_TYPE}_${TIMESTAMP}.log"

log() {
    local level="$1"; shift
    local message="$*"
    local ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [$level] $message" >> "$LOG_FILE"
    case $level in
        INFO)    echo -e "${BLUE}[INFO]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        ERROR)   echo -e "${RED}[ERROR]${NC} $message" ;;
    esac
}

get_agent_prompt() {
    local agent_type="$1"
    local agent_prompt_file="$AGENTS_DIR/${agent_type}.md"
    
    if [[ -f "$agent_prompt_file" ]]; then
        cat "$agent_prompt_file"
    else
        echo "You are a specialized $agent_type agent. Complete the assigned task following project conventions."
    fi
}

build_full_prompt() {
    local agent_prompt=$(get_agent_prompt "$AGENT_TYPE")
    
    cat << EOF
$agent_prompt

## Task
$TASK

$([ -n "$TARGET_FILE" ] && echo "## Target
$TARGET_FILE" || "")

## Project Context
Working directory: $PROJECT_ROOT
Review existing code patterns in @clippyjs/ packages.
Follow TypeScript strict mode conventions.
EOF
}

run_agent() {
    local full_prompt=$(build_full_prompt)
    
    log INFO "Spawning $AGENT_TYPE agent..."
    log INFO "Task: $TASK"
    [[ -n "$TARGET_FILE" ]] && log INFO "Target: $TARGET_FILE"
    
    set +e
    local output
    
    case "$PROVIDER" in
        claude)
            if ! command -v claude &> /dev/null; then
                log ERROR "Claude CLI not found"
                exit 1
            fi
            output=$(echo "$full_prompt" | claude --print 2>&1)
            ;;
        opencode)
            if ! command -v opencode &> /dev/null; then
                log ERROR "OpenCode CLI not found"
                exit 1
            fi
            if [[ -n "$SESSION_ID" ]]; then
                output=$(opencode --session "$SESSION_ID" --prompt "$full_prompt" 2>&1)
            else
                output=$(echo "$full_prompt" | opencode 2>&1)
            fi
            ;;
        *)
            log ERROR "Unknown provider: $PROVIDER"
            exit 1
            ;;
    esac
    
    local exit_code=$?
    set -e
    
    echo "$output" >> "$LOG_FILE"
    
    echo ""
    echo "$output"
    echo ""
    
    if [[ $exit_code -eq 0 ]]; then
        log SUCCESS "Agent completed successfully"
    else
        log ERROR "Agent failed with exit code: $exit_code"
    fi
    
    return $exit_code
}

echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║              Agent Spawner - $AGENT_TYPE" 
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

run_agent
