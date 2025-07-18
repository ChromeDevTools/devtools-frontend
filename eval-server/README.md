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

## Agent Protocol

Your agent needs to:

1. Connect to the WebSocket server (default: `ws://localhost:8080`)
2. Send a `{"type": "ready"}` message when ready for evaluations
3. Implement the `Evaluate` RPC method that accepts a string task and returns a string response

## For more details

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation of the architecture and implementation.