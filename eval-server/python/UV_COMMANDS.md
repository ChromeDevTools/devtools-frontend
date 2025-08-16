# UV Commands Reference

Quick reference for using uv with bo-eval-server Python implementation.

## Installation & Setup

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install project dependencies
uv sync

# Install with development dependencies
uv sync --dev
```

## Running Examples

### Using the convenience runner (Recommended)

```bash
# Basic WebSocket server
python run.py basic

# Evaluation stack example
python run.py stack

# Programmatic evaluations with analytics
python run.py prog

# Show all available examples
python run.py all
```

### Direct uv execution

```bash
# Run examples directly
uv run python examples/basic_server.py
uv run python examples/with_stack.py  
uv run python examples/programmatic_evals.py

# Run with custom arguments or environment variables
uv run --env BO_EVAL_SERVER_PORT=8081 python examples/basic_server.py
```

## Development Commands

```bash
# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=src/bo_eval_server

# Format code
uv run black .
uv run black src/ examples/

# Type checking
uv run mypy src/

# Run all checks
uv run pytest && uv run black . && uv run mypy src/
```

## Package Management

```bash
# Add new dependencies
uv add requests
uv add --dev pytest-cov

# Remove dependencies  
uv remove requests

# Update dependencies
uv sync --upgrade

# Show installed packages
uv tree

# Show project info
uv show
```

## Virtual Environment

```bash
# Activate virtual environment
source .venv/bin/activate  # Unix/macOS
# or
.venv\Scripts\activate     # Windows

# Check Python version in venv
uv run python --version

# Run any command in the virtual environment
uv run <command>
```

## Project Scripts

The project includes entry point scripts defined in `pyproject.toml`:

```bash
# After installation, these commands become available:
bo-eval-basic         # Run basic server example
bo-eval-stack         # Run evaluation stack example  
bo-eval-programmatic  # Run programmatic evaluations example
```

## Useful UV Options

```bash
# Run with specific Python version
uv run --python 3.11 python examples/basic_server.py

# Run with environment variables
uv run --env DEBUG=1 python examples/basic_server.py

# Run in isolated environment (no local packages)
uv run --isolated python examples/basic_server.py

# Show verbose output
uv sync --verbose

# Force reinstall
uv sync --reinstall
```

## Integration with IDEs

For VS Code and other IDEs, point to the uv-created virtual environment:

```bash
# Show virtual environment path
echo $PWD/.venv/bin/python

# Or use uv to find it
uv run which python
```

Then configure your IDE to use this Python interpreter for the project.

## Common Workflows

### Quick Start Development

```bash
git clone <repo>
cd eval-server/python
uv sync --dev
python run.py basic
```

### Running Tests in CI

```bash
uv sync --dev --frozen
uv run pytest --cov=src/bo_eval_server --cov-report=xml
```

### Building and Publishing

```bash
uv build
uv publish  # If publishing to PyPI
```

## Troubleshooting

```bash
# Clear uv cache
uv cache clean

# Reinstall everything
rm -rf .venv uv.lock
uv sync

# Check uv version
uv --version

# Get help
uv --help
uv run --help
```