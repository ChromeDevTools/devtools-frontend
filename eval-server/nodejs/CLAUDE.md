# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

bo-eval-server is a WebSocket-based evaluation server for LLM agents that implements an LLM-as-a-judge evaluation system. The server accepts connections from AI agents, sends them evaluation tasks via RPC calls, collects their responses, and uses an LLM to judge the quality of responses.

## Commands

### Development
- `npm start` - Start the WebSocket server
- `npm run dev` - Start server with file watching for development
- `npm run cli` - Start interactive CLI for server management and testing
- `npm test` - Run example agent client for testing

### Installation
- `npm install` - Install dependencies
- Copy `.env.example` to `.env` and configure environment variables

### Required Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for LLM judge functionality
- `PORT` - WebSocket server port (default: 8080)

### LLM Provider Configuration (Optional)
- `GROQ_API_KEY` - Groq API key for Groq provider support
- `OPENROUTER_API_KEY` - OpenRouter API key for OpenRouter provider support
- `LITELLM_ENDPOINT` - LiteLLM server endpoint URL
- `LITELLM_API_KEY` - LiteLLM API key for LiteLLM provider support
- `DEFAULT_PROVIDER` - Default LLM provider (openai, groq, openrouter, litellm)
- `DEFAULT_MAIN_MODEL` - Default main model name
- `DEFAULT_MINI_MODEL` - Default mini model name
- `DEFAULT_NANO_MODEL` - Default nano model name

## Architecture

### Core Components

**WebSocket Server** (`src/server.js`)
- Accepts connections from LLM agents
- Manages agent lifecycle (connect, ready, disconnect)
- Orchestrates evaluation sessions
- Handles bidirectional RPC communication

**RPC Client** (`src/rpc-client.js`)
- Implements JSON-RPC 2.0 protocol for bidirectional communication
- Manages request/response correlation with unique IDs
- Handles timeouts and error conditions
- Calls `Evaluate(request: String) -> String` method on connected agents
- Supports `configure_llm` method for dynamic LLM provider configuration

**LLM Evaluator** (`src/evaluator.js`)
- Integrates with OpenAI API for LLM-as-a-judge functionality
- Evaluates agent responses on multiple criteria (correctness, completeness, clarity, relevance, helpfulness)
- Returns structured JSON evaluation with scores and reasoning

**Logger** (`src/logger.js`)
- Structured logging using Winston
- Separate log files for different event types
- JSON format for easy parsing and analysis
- Logs all RPC calls, evaluations, and connection events

### Evaluation Flow

1. Agent connects to WebSocket server
2. Agent sends "ready" signal
3. Server calls agent's `Evaluate` method with a task
4. Agent processes task and returns response
5. Server sends response to LLM judge for evaluation
6. Results are logged as JSON with scores and detailed feedback

### Project Structure

```
src/
├── server.js          # Main WebSocket server and evaluation orchestration
├── rpc-client.js      # JSON-RPC client for calling agent methods
├── evaluator.js       # LLM judge integration (OpenAI)
├── logger.js          # Structured logging and result storage
├── config.js          # Configuration management
└── cli.js             # Interactive CLI for testing and management

logs/                  # Log files (created automatically)
├── combined.log       # All log events
├── error.log          # Error events only
└── evaluations.jsonl  # Evaluation results in JSON Lines format
```

### Key Features

- **Bidirectional RPC**: Server can call methods on connected clients
- **Multi-Provider LLM Support**: Support for OpenAI, Groq, OpenRouter, and LiteLLM providers
- **Dynamic LLM Configuration**: Runtime configuration via `configure_llm` JSON-RPC method
- **Per-Client Configuration**: Each connected client can have different LLM settings
- **LLM-as-a-Judge**: Automated evaluation of agent responses using configurable LLM providers
- **Concurrent Evaluations**: Support for multiple agents and parallel evaluations
- **Structured Logging**: All interactions logged as JSON for analysis
- **Interactive CLI**: Built-in CLI for testing and server management
- **Connection Management**: Robust handling of agent connections and disconnections
- **Timeout Handling**: Configurable timeouts for RPC calls and evaluations

### Agent Protocol

Agents must implement:
- WebSocket connection to server
- JSON-RPC 2.0 protocol support
- `Evaluate(task: string) -> string` method
- "ready" message to signal availability for evaluations

### LLM Configuration Protocol

The server supports dynamic LLM configuration via the `configure_llm` JSON-RPC method:

```json
{
  "jsonrpc": "2.0",
  "method": "configure_llm",
  "params": {
    "provider": "openai|groq|openrouter|litellm",
    "apiKey": "your-api-key",
    "endpoint": "endpoint-url-for-litellm",
    "models": {
      "main": "main-model-name",
      "mini": "mini-model-name",
      "nano": "nano-model-name"
    },
    "partial": false
  },
  "id": "config-request-id"
}
```

### Evaluation Model Configuration

Evaluations support nested model configuration for flexible per-tier settings:

```json
{
  "jsonrpc": "2.0",
  "method": "evaluate",
  "params": {
    "tool": "chat",
    "input": {"message": "Hello"},
    "model": {
      "main_model": {
        "provider": "openai",
        "model": "gpt-4",
        "api_key": "sk-main-key"
      },
      "mini_model": {
        "provider": "openai",
        "model": "gpt-4-mini",
        "api_key": "sk-mini-key"
      },
      "nano_model": {
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "api_key": "gsk-nano-key"
      }
    }
  }
}
```

### Configuration

All configuration is managed through environment variables and `src/config.js`. Key settings:
- Server port and host
- OpenAI API configuration
- RPC timeouts
- Logging levels and directories
- Maximum concurrent evaluations