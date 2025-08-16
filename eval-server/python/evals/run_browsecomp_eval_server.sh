#!/bin/bash
# Wrapper script to run browsecomp eval server with proper dependencies

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to eval-server python directory
cd "$EVAL_SERVER_DIR"

# Run with uv, passing all arguments
uv run python evals/browsecomp_eval_server.py "$@"