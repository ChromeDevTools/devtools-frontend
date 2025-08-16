# bo-eval-server

A library-first evaluation server for LLM agents with modular architecture and programmatic API.

## Features

- 📚 **Library-First Architecture**: Programmatic API for custom integrations
- 🔌 **WebSocket Server**: Real-time agent connections (core)
- 🌐 **Optional HTTP API**: REST endpoints via separate wrapper
- 🤖 **Bidirectional RPC**: Call methods on connected agents
- ⚖️ **Optional LLM Judge**: GPT-4 evaluation (when configured)
- 📊 **Structured Logging**: JSON logging of all evaluations
- 🖥️ **Interactive CLI**: Built-in management interface
- ⚡ **Concurrent Evaluations**: Multi-agent support
- ✨ **No Configuration Required**: Works without config files or API keys

## Quick Start

### Basic WebSocket Server

```javascript
import { EvalServer } from 'bo-eval-server';

const server = new EvalServer({
  authKey: 'hello',
  host: '127.0.0.1',
  port: 8080
});

server.onConnect(async client => {
  console.log('Client connected:', client.id);
  
  const response = await client.evaluate({
    id: "test_eval",
    name: "Capital of France",
    tool: "chat",
    input: { message: "What is the capital of France?" }
  });
  
  console.log('Response:', JSON.stringify(response, null, 2));
});

await server.start();
console.log('Server running on ws://127.0.0.1:8080');
```

### With Optional HTTP API

```javascript
import { EvalServer, HTTPWrapper } from 'bo-eval-server';

// Create core WebSocket server
const evalServer = new EvalServer({
  authKey: 'hello',
  port: 8080
});

// Add optional HTTP API wrapper
const httpWrapper = new HTTPWrapper(evalServer, {
  port: 8081
});

// Set up client connection handler
evalServer.onConnect(async client => {
  // Handle evaluations...
});

// Start both servers
await evalServer.start();
await httpWrapper.start();

console.log('WebSocket: ws://localhost:8080');
console.log('HTTP API: http://localhost:8081');
```

## Installation & Setup

```bash
# Install dependencies
npm install

# Run examples
npm start              # Server with HTTP API
npm run lib:example    # WebSocket-only server
npm run cli           # Interactive CLI
npm run dev           # Development mode
```

## Library Usage

### Core EvalServer API

The `EvalServer` class provides the core WebSocket-based evaluation server:

```javascript
import { EvalServer } from 'bo-eval-server';

const server = new EvalServer({
  // Required
  authKey: 'your-secret-key',    // Client authentication key
  
  // Optional
  host: '127.0.0.1',            // Server host (default: 'localhost')
  port: 8080,                   // Server port (default: 8080)
  clientsDir: './clients',       // Client config directory
  evalsDir: './evals'           // Evaluations directory
});

// Event handlers
server.onConnect(clientProxy => {
  // Called when client connects and is ready
});

server.onDisconnect(clientInfo => {
  // Called when client disconnects
});

// Server lifecycle
await server.start();
await server.stop();

// Server status
console.log(server.getStatus());
```

### Client Proxy API

When a client connects, you receive a `ClientProxy` object:

```javascript
server.onConnect(async client => {
  // Client information
  console.log('Client ID:', client.id);
  console.log('Tab ID:', client.tabId);
  console.log('Base Client ID:', client.baseClientId);
  console.log('Info:', client.getInfo());
  
  // Execute evaluations
  const result = await client.evaluate({
    id: "eval_001",              // Unique evaluation ID
    name: "Test Evaluation",     // Human-readable name
    description: "Description",  // Optional description
    tool: "chat",               // Tool to use: "chat", "action", etc.
    input: {                    // Tool-specific input
      message: "Your question here"
    },
    timeout: 30000,             // Optional timeout (ms)
    model: {},                  // Optional model config
    metadata: {                 // Optional metadata
      tags: ['api', 'test']
    }
  });
  
  // Send custom messages
  client.sendMessage({
    type: 'custom',
    data: 'Hello client!'
  });
});
```

### Advanced Usage with YAML Evaluations

```javascript
import { EvalServer, EvaluationLoader } from 'bo-eval-server';

const server = new EvalServer({
  authKey: 'secret-key',
  port: 8080
});

// Load evaluations from YAML files
await server.loadEvaluations('./evals');

// Access evaluation loader
const loader = server.evaluationLoader;

// Get evaluation statistics
const stats = loader.getStatistics();
console.log('Total evaluations:', stats.total);
console.log('Categories:', stats.categories);

// Filter evaluations
const chatEvals = loader.filterEvaluations({
  tool: 'chat',
  enabled: true
});

const actionAgentEvals = loader.getEvaluationsByCategory('action-agent');

// Create custom evaluations
const customEval = loader.createEvaluation({
  name: 'Custom Test',
  tool: 'chat',
  input: { message: 'What is AI?' },
  metadata: { tags: ['custom'] }
});

server.onConnect(async client => {
  // Run YAML-loaded evaluation
  const result1 = await client.evaluate(chatEvals[0]);
  
  // Run custom evaluation
  const result2 = await client.evaluate(customEval);
  
  console.log('Results:', { result1, result2 });
});

await server.start();
```

### Optional LLM Judge System

```javascript
import { EvalServer, LLMJudge } from 'bo-eval-server';

const server = new EvalServer({
  authKey: 'secret-key',
  port: 8080
});

// Configure LLM judge (requires OPENAI_API_KEY)
if (process.env.OPENAI_API_KEY) {
  const judge = new LLMJudge({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    temperature: 0.1
  });
  
  server.setJudge(judge);
  
  // Judge will automatically validate evaluation responses
  // when evaluations have validation configuration
}

await server.start();
```

### Standalone Components

#### EvaluationLoader

```javascript
import { EvaluationLoader } from 'bo-eval-server/EvaluationLoader';

const loader = new EvaluationLoader('./evals');

// Load from directory
await loader.loadFromDirectory('./my-evals');

// Access evaluations
const all = loader.getAllEvaluations();
const byCategory = loader.getEvaluationsByCategory('action-agent');
const byId = loader.getEvaluationById('test-001');

// Filter evaluations
const filtered = loader.filterEvaluations({
  tool: 'chat',
  enabled: true,
  category: 'research-agent'
});

// Create evaluations programmatically
const custom = loader.createEvaluation({
  name: 'Custom Evaluation',
  tool: 'chat',
  input: { message: 'Hello world' }
});
```

#### LLM Judge

```javascript
import { LLMJudge } from 'bo-eval-server/judges/LLMJudge';

const judge = new LLMJudge({
  apiKey: 'your-openai-key',
  model: 'gpt-4',
  temperature: 0.1
});

const evaluation = await judge.evaluate(
  'Summarize this article',
  'This article discusses...',
  { 
    criteria: ['accuracy', 'completeness', 'clarity'],
    model: 'gpt-4'
  }
);

console.log('Score:', evaluation.score);
console.log('Reasoning:', evaluation.reasoning);
```

## HTTP API (Optional)

The `HTTPWrapper` provides REST endpoints for integration with external systems:

```javascript
import { EvalServer, HTTPWrapper } from 'bo-eval-server';

const evalServer = new EvalServer({ port: 8080 });
const httpWrapper = new HTTPWrapper(evalServer, { 
  port: 8081,
  host: 'localhost'
});

await evalServer.start();
await httpWrapper.start();

// HTTP wrapper status
console.log(httpWrapper.getStatus());
```

### HTTP Endpoints

Once the HTTP wrapper is running, you can use these endpoints:

```bash
# Server status
curl http://localhost:8081/status

# List clients
curl http://localhost:8081/clients

# Trigger evaluation
curl -X POST http://localhost:8081/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"clientId": "client-123", "evaluationId": "eval-001"}'

# OpenAI-compatible responses endpoint
curl -X POST http://localhost:8081/v1/responses \
  -H 'Content-Type: application/json' \
  -d '{"input": "What is 2+2?"}'
```

## CLI Usage

Interactive command-line interface for server management:

```bash
# Using npm scripts
npm run cli

# Using the binary
npx eval-server

# Or directly
node src/cli/index.js
```

The CLI provides commands for:
- Server management
- Client connections
- Evaluation execution
- Real-time monitoring

## Agent Protocol

Your agent needs to implement the WebSocket protocol:

### 1. Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8080');
```

### 2. Send Registration
```javascript
ws.send(JSON.stringify({
  type: 'register',
  clientId: 'your-client-id',
  secretKey: 'your-secret-key',
  capabilities: ['chat', 'action']
}));
```

### 3. Send Ready Signal
```javascript
ws.send(JSON.stringify({
  type: 'ready'
}));
```

### 4. Handle RPC Calls
```javascript
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.jsonrpc === '2.0' && message.method === 'evaluate') {
    // Handle evaluation request
    const result = await handleEvaluation(message.params);
    
    // Send response
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: result
    }));
  }
});
```

## Architecture

```
src/
├── lib/                    # Core library
│   ├── EvalServer.js      # Main server class (WebSocket only)
│   ├── HTTPWrapper.js     # Optional HTTP API wrapper 
│   ├── EvaluationLoader.js # YAML evaluation loader
│   └── judges/            # Judge implementations
│       ├── Judge.js       # Base judge interface
│       └── LLMJudge.js    # LLM-based judge
├── cli/                   # CLI implementation
│   ├── CLI.js            # CLI class
│   └── index.js          # CLI entry point
├── examples/              # Usage examples
│   ├── library-usage.js  # Basic WebSocket-only example
│   └── with-http-wrapper.js # Example with HTTP API
└── [utilities]           # Configuration, logging, etc.
```

### Design Principles

- **Library-First**: Everything built as composable modules
- **Optional Components**: HTTP API, LLM Judge, YAML loading all optional
- **Clean Architecture**: No external dependencies for core functionality
- **Event-Driven**: React to client connections with callbacks
- **Programmatic**: Full control through code, no required config files

## Examples

### Example 1: Simple Chat Evaluation
```javascript
import { EvalServer } from 'bo-eval-server';

const server = new EvalServer({ authKey: 'test', port: 8080 });

server.onConnect(async client => {
  const response = await client.evaluate({
    id: "chat_test",
    name: "Simple Chat",
    tool: "chat",
    input: { message: "Hello, how are you?" }
  });
  
  console.log('Chat response:', response.output.response);
});

await server.start();
```

### Example 2: Action Agent Evaluation
```javascript
import { EvalServer } from 'bo-eval-server';

const server = new EvalServer({ authKey: 'test', port: 8080 });

server.onConnect(async client => {
  const response = await client.evaluate({
    id: "action_test",
    name: "Click Button",
    tool: "action",
    input: {
      objective: "Click the submit button on the form",
      url: "https://example.com/form"
    }
  });
  
  console.log('Action completed:', response.output.success);
});

await server.start();
```

### Example 3: Batch Evaluations
```javascript
import { EvalServer } from 'bo-eval-server';

const server = new EvalServer({ authKey: 'test', port: 8080 });

// Load evaluations from YAML
await server.loadEvaluations('./evals');

server.onConnect(async client => {
  const chatEvals = server.evaluationLoader.filterEvaluations({
    tool: 'chat',
    enabled: true
  });
  
  // Run all chat evaluations
  for (const evaluation of chatEvals.slice(0, 5)) {
    try {
      const result = await client.evaluate(evaluation);
      console.log(`✅ ${evaluation.name}: ${result.status}`);
    } catch (error) {
      console.log(`❌ ${evaluation.name}: ${error.message}`);
    }
  }
});

await server.start();
```

## Environment Variables

```bash
# Optional - only needed if using LLM Judge
OPENAI_API_KEY=your-openai-api-key

# Optional - server configuration
PORT=8080
HOST=localhost
LOG_LEVEL=info
LOG_DIR=./logs

# Optional - RPC configuration  
RPC_TIMEOUT=1500000
MAX_CONCURRENT_EVALUATIONS=10
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Architecture and implementation details  
- **[docs/](./docs/)** - Protocol specifications and setup guides
- **[examples/](./examples/)** - Working code examples

---

The library provides a clean, modular architecture for building custom evaluation workflows with LLM agents.