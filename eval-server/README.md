# bo-eval-server

A WebSocket-based evaluation server for LLM agents using LLM-as-a-judge methodology.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Use interactive CLI** (alternative to step 3)
   ```bash
   npm run cli
   ```

## Features

- 🔌 WebSocket server for real-time agent connections
- 🤖 Bidirectional RPC calls to connected agents
- ⚖️ LLM-as-a-judge evaluation using OpenAI GPT-4
- 📊 Structured JSON logging of all evaluations
- 🖥️ Interactive CLI for testing and management
- ⚡ Support for concurrent agent evaluations

## OpenAI Compatible API

The server provides an OpenAI-compatible `/v1/responses` endpoint for direct API access:

```bash
curl -X POST 'http://localhost:8081/v1/responses' \
  -H 'Content-Type: application/json' \
  -d '{
    "input": "What is 2+2?",
    "main_model": "gpt-4.1",
    "mini_model": "gpt-4.1-nano", 
    "nano_model": "gpt-4.1-nano",
    "provider": "openai"
  }'
```

**Model Precedence:**
1. **API calls** OR **individual test YAML models** (highest priority)
2. **config.yaml defaults** (fallback when neither API nor test specify models)

## Agent Protocol

Your agent needs to:

1. Connect to the WebSocket server (default: `ws://localhost:8080`)
2. Send a `{"type": "ready"}` message when ready for evaluations
3. Implement the `Evaluate` RPC method that accepts a string task and returns a string response

## For more details

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation of the architecture and implementation.