#!/usr/bin/env python3
"""
Simple script runner for bo-eval-server examples.

Usage:
    python run.py basic      # Run basic server example
    python run.py stack      # Run evaluation stack example  
    python run.py prog       # Run programmatic evaluations example
    python run.py all        # Show all available examples
"""

import subprocess
import sys
from pathlib import Path


def run_with_uv(script_path: str, description: str):
    """Run a Python script using uv."""
    print(f"🚀 {description}")
    print(f"   Running: uv run python {script_path}")
    print("-" * 50)
    
    try:
        # Ensure logs directory exists
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Run the script with uv
        result = subprocess.run([
            "uv", "run", "python", script_path
        ], cwd=Path(__file__).parent)
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
        return 130
    except FileNotFoundError:
        print("❌ Error: 'uv' command not found. Please install uv first:")
        print("   curl -LsSf https://astral.sh/uv/install.sh | sh")
        return 1
    except Exception as e:
        print(f"💥 Error running script: {e}")
        return 1


def show_examples():
    """Show all available examples."""
    print("📚 Available Examples:")
    print()
    print("🔧 basic      - Basic WebSocket server setup")
    print("             Simple server that connects to one client and runs a single evaluation")
    print()
    print("📚 stack      - Evaluation stack usage")
    print("             Demonstrates LIFO queue for managing multiple evaluations")
    print()
    print("🏭 prog       - Programmatic evaluation creation")
    print("             Advanced example with dynamic evaluation generation and analytics")
    print()
    print("Usage:")
    print("  python run.py basic")
    print("  python run.py stack")
    print("  python run.py prog")
    print()
    print("Or with uv directly:")
    print("  uv run python examples/basic_server.py")
    print("  uv run python examples/with_stack.py")
    print("  uv run python examples/programmatic_evals.py")


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python run.py [basic|stack|prog|all]")
        print("       python run.py all    # Show all examples")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    examples = {
        "basic": ("examples/basic_server.py", "Basic WebSocket Server Example"),
        "stack": ("examples/with_stack.py", "Evaluation Stack Example"),
        "prog": ("examples/programmatic_evals.py", "Programmatic Evaluations Example"),
        "programmatic": ("examples/programmatic_evals.py", "Programmatic Evaluations Example"),
    }
    
    if command == "all":
        show_examples()
        return 0
    elif command in examples:
        script_path, description = examples[command]
        return run_with_uv(script_path, description)
    else:
        print(f"❌ Unknown command: {command}")
        print("Available commands: basic, stack, prog, all")
        return 1


if __name__ == "__main__":
    sys.exit(main())