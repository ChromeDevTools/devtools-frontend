#!/usr/bin/env python3
"""
Script runner for bo-eval-server examples using uv.

This module provides entry points for running examples with uv.
"""

import asyncio
import sys
from pathlib import Path

# Add the examples directory to path
examples_dir = Path(__file__).parent / "examples"
sys.path.insert(0, str(examples_dir))


def run_basic_server():
    """Run the basic server example."""
    from examples.basic_server import main
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Error: {e}')
        sys.exit(1)


def run_with_stack():
    """Run the evaluation stack example."""
    from examples.with_stack import main
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Error: {e}')
        sys.exit(1)


def run_programmatic_evals():
    """Run the programmatic evaluations example."""
    from examples.programmatic_evals import main
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n👋 Goodbye!')
    except Exception as e:
        print(f'💥 Error: {e}')
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts.py [basic|stack|programmatic]")
        sys.exit(1)
    
    script = sys.argv[1]
    if script == "basic":
        run_basic_server()
    elif script == "stack":
        run_with_stack()
    elif script == "programmatic":
        run_programmatic_evals()
    else:
        print(f"Unknown script: {script}")
        print("Available scripts: basic, stack, programmatic")
        sys.exit(1)