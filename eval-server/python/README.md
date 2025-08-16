# bo-eval-server (Python)

A minimal Python library for creating WebSocket-based evaluation servers for LLM agents.

## Features

- 🔌 **WebSocket Server**: Real-time agent connections with asyncio
- 🤖 **Bidirectional RPC**: JSON-RPC 2.0 for calling methods on connected agents
- 📚 **Programmatic API**: Create and manage evaluations in Python code
- 📊 **Evaluation Stack**: LIFO stack for managing evaluation queues
- ⚡ **Concurrent Support**: Full async/await support for multiple agents
- 🔍 **Enhanced Logging**: Structured logging with loguru
- ✨ **Minimal Dependencies**: Only websockets and loguru required

## Quick Start

### Basic WebSocket Server

```python
import asyncio
from bo_eval_server import EvalServer

async def main():
    server = EvalServer(
        auth_key='hello',
        host='127.0.0.1',
        port=8080
    )
    
    @server.on_connect
    async def handle_client(client):
        print(f'Client connected: {client.id}')
        
        response = await client.evaluate({
            "id": "test_eval",
            "name": "Capital of France",
            "tool": "chat",
            "input": {"message": "What is the capital of France?"}
        })
        
        print(f'Response: {response}')
    
    await server.start()
    print('Server running on ws://127.0.0.1:8080')
    
    # Keep server running
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

### Using Evaluation Stack

```python
import asyncio
from bo_eval_server import EvalServer, EvaluationStack

async def main():
    server = EvalServer(auth_key='secret', port=8080)
    stack = EvaluationStack()
    
    # Add evaluations to stack
    stack.push({
        "id": "eval_001",
        "name": "Math Question",
        "tool": "chat",
        "input": {"message": "What is 2 + 2?"}
    })
    
    stack.push({
        "id": "eval_002", 
        "name": "Science Question",
        "tool": "chat",
        "input": {"message": "What is the speed of light?"}
    })
    
    @server.on_connect
    async def handle_client(client):
        print(f'Client connected: {client.id}')
        
        # Process evaluations from stack
        while not stack.is_empty():
            evaluation = stack.pop()
            try:
                result = await client.evaluate(evaluation)
                print(f'✅ {evaluation["name"]}: {result["status"]}')
            except Exception as e:
                print(f'❌ {evaluation["name"]}: {e}')
    
    await server.start()
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

## Installation

### Using uv (Recommended)

```bash
# Install uv package manager (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies and create virtual environment
uv sync

# Run examples using the convenient runner
python run.py basic      # Basic server example
python run.py stack      # Evaluation stack example  
python run.py prog       # Programmatic evaluations example
python run.py all        # Show all available examples

# Or run examples directly with uv
uv run python examples/basic_server.py
uv run python examples/with_stack.py
uv run python examples/programmatic_evals.py
```

### Using pip (Alternative)

```bash
# Install the package
pip install -e .

# Or install with development dependencies
pip install -e ".[dev]"

# Or install from requirements.txt
pip install -r requirements.txt
```

## Library Usage

### EvalServer API

```python
from bo_eval_server import EvalServer

# Create server instance
server = EvalServer(
    auth_key='your-secret-key',  # Required: client authentication
    host='127.0.0.1',           # Optional: default 'localhost'
    port=8080,                  # Optional: default 8080
)

# Register event handlers
@server.on_connect
async def handle_connect(client):
    # Called when client connects and is ready
    pass

@server.on_disconnect  
async def handle_disconnect(client_info):
    # Called when client disconnects
    pass

# Server lifecycle
await server.start()        # Start the server
await server.stop()         # Stop the server
await server.wait_closed()  # Wait for server to close

# Server status
status = server.get_status()
print(f"Server running: {status['running']}")
```

### Client Proxy API

```python
@server.on_connect
async def handle_client(client):
    # Client information
    print(f'Client ID: {client.id}')
    print(f'Tab ID: {client.tab_id}')
    print(f'Base Client ID: {client.base_client_id}')
    
    # Execute evaluations
    result = await client.evaluate({
        "id": "eval_001",
        "name": "Test Evaluation",
        "description": "Optional description",
        "tool": "chat",
        "input": {"message": "Your question here"},
        "timeout": 30.0,  # Optional timeout in seconds
        "metadata": {"tags": ["api", "test"]}
    })
    
    # Send custom messages
    await client.send_message({
        "type": "custom", 
        "data": "Hello client!"
    })
```

### EvaluationStack API

```python
from bo_eval_server import EvaluationStack

stack = EvaluationStack()

# Add evaluations (LIFO - Last In, First Out)
stack.push({
    "id": "eval_001",
    "name": "Test",
    "tool": "chat", 
    "input": {"message": "Hello"}
})

# Remove and get evaluation
evaluation = stack.pop()  # Returns dict or None if empty

# Stack operations
size = stack.size()           # Get number of evaluations
is_empty = stack.is_empty()   # Check if empty
top = stack.peek()            # View top without removing
stack.clear()                 # Remove all evaluations
all_evals = stack.to_array()  # Get copy as list
```

## Agent Protocol

Your agent needs to implement the WebSocket protocol:

### 1. Connect to WebSocket
```python
import websockets
import json

ws = await websockets.connect('ws://localhost:8080')
```

### 2. Receive Authentication Challenge
The server sends an authentication challenge with the secret key:
```python
challenge = json.loads(await ws.recv())
# Expected: {"type": "auth_challenge", "secretKey": "hello", "connectionId": "uuid"}
```

### 3. Send Registration Response
Client validates the secret key and responds:
```python
await ws.send(json.dumps({
    "type": "register",
    "clientId": "your-client-id",
    "acceptAuth": True,  # True if secret key is acceptable
    "connectionId": challenge["connectionId"],
    "capabilities": ["chat", "action"]
}))
```

### 4. Receive Registration Confirmation
```python
confirmation = json.loads(await ws.recv())
# Expected: {"type": "registered", "clientId": "your-client-id", "serverTime": 123456}
```

### 5. Send Ready Signal
```python
await ws.send(json.dumps({"type": "ready"}))
```

### 6. Handle RPC Calls
```python
async for message in ws:
    data = json.loads(message)
    
    if data.get("jsonrpc") == "2.0" and data.get("method") == "evaluate":
        # Handle evaluation request
        result = await handle_evaluation(data["params"])
        
        # Send response
        await ws.send(json.dumps({
            "jsonrpc": "2.0",
            "id": data["id"],
            "result": result
        }))
```

## Architecture

```
src/bo_eval_server/
├── __init__.py           # Package exports
├── eval_server.py        # Main EvalServer class
├── evaluation_stack.py   # EvaluationStack implementation
├── client_manager.py     # Client connection management
├── rpc_client.py         # JSON-RPC client implementation
├── config.py             # Configuration management
└── logger.py             # Enhanced logging setup
```

## Design Principles

- **Async-First**: Built on asyncio for high concurrency
- **Minimal Dependencies**: Only essential packages required
- **Type Hints**: Full typing support for better development experience
- **Event-Driven**: React to client connections with decorators
- **Programmatic**: Full control through Python code
- **Clean API**: Simple, Pythonic interface

## Examples

See the `examples/` directory for complete working examples:

- `basic_server.py` - Simple WebSocket server setup
- `with_stack.py` - Using evaluation stack for queuing
- `programmatic_evals.py` - Creating evaluations in code

## Evaluation Scripts

The `evals/` directory contains ready-to-use evaluation scripts for various benchmarks:

- `browsecomp_eval_server.py` - Browsecomp benchmark server (1,266 web browsing questions)
  - Run with: `./evals/run_browsecomp_eval_server.sh`
  - See `evals/README.md` for detailed usage

## Development

### Using uv

```bash
# Install with development dependencies
uv sync --dev

# Run tests
uv run pytest

# Format code
uv run black src/ examples/

# Type checking
uv run mypy src/

# Run all development commands
uv run pytest && uv run black src/ examples/ && uv run mypy src/
```

### Using pip

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/ examples/

# Type checking
mypy src/
```

## Environment Variables

```bash
# Optional configuration
BO_EVAL_SERVER_HOST=localhost
BO_EVAL_SERVER_PORT=8080
BO_EVAL_SERVER_LOG_LEVEL=INFO
```

---

This Python implementation provides the core WebSocket evaluation server functionality with a clean, async API for programmatic evaluation management.