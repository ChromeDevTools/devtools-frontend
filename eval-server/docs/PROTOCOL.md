# WebSocket Evaluation Protocol

## Overview

This document describes the WebSocket communication protocol between evaluation clients (e.g., Chrome DevTools) and the evaluation server. The protocol supports client registration, authentication, and bidirectional evaluation task execution using JSON-RPC 2.0.

## Connection Flow

```
Client                           Server
  |                                |
  |------ WebSocket Connect ------>|
  |                                |
  |<----- Welcome Message ---------|
  |                                |
  |------ Register Message ------->|
  |                                |
  |<----- Registration ACK ---------|
  |                                |
  |------ Ready Signal ----------->|
  |                                |
  |<===== Evaluation Loop ========>|
```

## Message Types

### 1. Client → Server Messages

#### 1.1 Registration Message
Sent immediately after receiving the welcome message to register the client with the server.

```json
{
  "type": "register",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "secretKey": "optional-secret-key",  // Optional field for authentication
  "capabilities": {
    "tools": ["extract_schema_data", "research_agent", "action_agent"],
    "maxConcurrency": 3,
    "version": "1.0.0"
  }
}
```

**Fields:**
- `type`: Must be "register"
- `clientId`: UUID v4 format, unique identifier for the client
- `secretKey`: Optional authentication key
- `capabilities`: Object describing client capabilities
  - `tools`: Array of tool names the client can execute
  - `maxConcurrency`: Maximum number of concurrent evaluations
  - `version`: Client version string

#### 1.2 Ready Signal
Indicates the client is ready to receive evaluation tasks.

```json
{
  "type": "ready",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 1.3 Status Update
Provides progress updates for running evaluations.

```json
{
  "type": "status",
  "evaluationId": "eval-123",
  "status": "running" | "completed" | "failed",
  "progress": 0.5,  // Optional, value between 0 and 1
  "message": "Processing page content..."  // Optional status message
}
```

#### 1.4 Heartbeat (Ping)
Keep-alive message to maintain connection.

```json
{
  "type": "ping",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 2. Server → Client Messages

#### 2.1 Welcome Message
Sent immediately after WebSocket connection is established.

```json
{
  "type": "welcome",
  "serverId": "server-001",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2.2 Registration Acknowledgment
Response to client registration.

```json
{
  "type": "registration_ack",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted" | "rejected",
  "message": "Client registered successfully",
  "evaluationsCount": 5,  // Number of evaluations assigned to this client
  "reason": "Invalid secret key"  // Only present if status is "rejected"
}
```

#### 2.3 Heartbeat Response (Pong)
Response to client ping.

```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## JSON-RPC 2.0 Evaluation Protocol

The evaluation tasks are sent using JSON-RPC 2.0 protocol over the WebSocket connection.

### 3. Evaluation Request (Server → Client)

#### 3.1 Evaluate Method
Requests the client to execute an evaluation task.

```json
{
  "jsonrpc": "2.0",
  "method": "evaluate",
  "params": {
    "evaluationId": "wikipedia-chrome-devtools-001",
    "name": "Extract Chrome DevTools Wikipedia Article",
    "url": "https://en.wikipedia.org/wiki/Chrome_DevTools",
    "tool": "extract_schema_data",
    "input": {
      "schema": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "summary": {"type": "string"},
          "tableOfContents": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      }
    },
    "timeout": 30000,  // Timeout in milliseconds
    "metadata": {
      "tags": ["schema-extraction", "wikipedia"],
      "retries": 2,
      "priority": "normal"
    }
  },
  "id": "rpc-001"
}
```

**Parameters:**
- `evaluationId`: Unique identifier for this evaluation (from YAML definition)
- `name`: Human-readable name of the evaluation
- `url`: Target URL for the evaluation
- `tool`: Name of the tool to execute
- `input`: Tool-specific input parameters
- `timeout`: Maximum execution time in milliseconds
- `metadata`: Additional evaluation metadata

### 4. Evaluation Response (Client → Server)

#### 4.1 Success Response
Sent when evaluation completes successfully.

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "output": {
      "title": "Chrome DevTools",
      "summary": "Chrome DevTools is a set of web developer tools built directly into the Google Chrome browser.",
      "tableOfContents": [
        "Overview",
        "Features",
        "History",
        "Usage"
      ]
    },
    "executionTime": 2500,  // Total execution time in milliseconds
    "toolCalls": [
      {
        "tool": "extract_schema_data",
        "timestamp": "2024-01-01T00:00:00Z",
        "duration": 2400,
        "status": "success"
      }
    ],
    "metadata": {
      "pageLoadTime": 800,
      "extractionTime": 1700,
      "retryCount": 0
    }
  },
  "id": "rpc-001"
}
```

#### 4.2 Error Response
Sent when evaluation fails.

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Tool execution failed",
    "data": {
      "tool": "extract_schema_data",
      "error": "Page load timeout after 30000ms",
      "url": "https://en.wikipedia.org/wiki/Chrome_DevTools",
      "timestamp": "2024-01-01T00:00:00Z",
      "stackTrace": "Error: Timeout...\n  at PageLoader.load..."  // Optional
    }
  },
  "id": "rpc-001"
}
```

## Error Codes

Standard JSON-RPC 2.0 error codes:
- `-32700`: Parse error - Invalid JSON was received
- `-32600`: Invalid request - JSON is not a valid request object
- `-32601`: Method not found - Method does not exist
- `-32602`: Invalid params - Invalid method parameters
- `-32603`: Internal error - Internal JSON-RPC error

Custom error codes for evaluation:
- `-32000`: Tool execution error - Tool failed during execution
- `-32001`: Timeout error - Evaluation exceeded timeout
- `-32002`: Authentication error - Invalid or missing credentials
- `-32003`: Rate limit exceeded - Too many requests
- `-32004`: Invalid tool - Requested tool not available
- `-32005`: Resource error - Unable to access required resources

## Connection Management

### Reconnection
- Clients should implement automatic reconnection with exponential backoff
- On reconnection, clients must re-register with the same clientId
- Server maintains evaluation state across reconnections

### Timeouts
- Default connection timeout: 60 seconds
- Ping interval: 30 seconds
- Evaluation timeout: Specified per evaluation in YAML

### Rate Limiting
- Server may implement rate limiting per client
- Rate limit errors use code `-32003`
- Clients should respect rate limit headers in error responses

## Security Considerations

1. **Authentication**: Clients may use optional secret keys for authentication
2. **Transport Security**: Production deployments should use WSS (WebSocket Secure)
3. **Input Validation**: All inputs should be validated against schemas
4. **Resource Limits**: Enforce timeouts and memory limits for evaluations

## Examples

### Complete Flow Example

1. **Client connects and registers:**
```json
// Client → Server
{"type": "register", "clientId": "550e8400-e29b-41d4-a716-446655440000", "capabilities": {"tools": ["extract_schema_data"], "maxConcurrency": 3, "version": "1.0.0"}}

// Server → Client
{"type": "registration_ack", "clientId": "550e8400-e29b-41d4-a716-446655440000", "status": "accepted", "message": "Client registered successfully", "evaluationsCount": 2}
```

2. **Client signals ready:**
```json
// Client → Server
{"type": "ready", "timestamp": "2024-01-01T00:00:00Z"}
```

3. **Server sends evaluation:**
```json
// Server → Client
{"jsonrpc": "2.0", "method": "evaluate", "params": {"evaluationId": "test-001", "url": "https://example.com", "tool": "extract_schema_data", "input": {"schema": {"type": "object", "properties": {"title": {"type": "string"}}}}, "timeout": 30000}, "id": "rpc-001"}
```

4. **Client returns result:**
```json
// Client → Server
{"jsonrpc": "2.0", "result": {"status": "success", "output": {"title": "Example Domain"}, "executionTime": 1500}, "id": "rpc-001"}
```

## Version History

- **1.0.0** (2024-01-01): Initial protocol version