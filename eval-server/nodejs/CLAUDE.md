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

## Architecture

### Core Components

**WebSocket Server** (`src/server.js`)
- Accepts connections from LLM agents
- Manages agent lifecycle (connect, ready, disconnect)
- Orchestrates evaluation sessions
- Handles bidirectional RPC communication

**RPC Client** (`src/rpc-client.js`)
- Implements JSON-RPC 2.0 protocol for server-to-client calls
- Manages request/response correlation with unique IDs
- Handles timeouts and error conditions
- Calls `Evaluate(request: String) -> String` method on connected agents

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
- **LLM-as-a-Judge**: Automated evaluation of agent responses using GPT-4
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

### Configuration

All configuration is managed through environment variables and `src/config.js`. Key settings:
- Server port and host
- OpenAI API configuration
- RPC timeouts
- Logging levels and directories
- Maximum concurrent evaluations