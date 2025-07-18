# Client Setup Guide

## Overview

This guide explains how to set up a new evaluation client to connect to the evaluation server. Clients can be any application that implements the WebSocket evaluation protocol, such as Chrome DevTools or custom test agents.

## Prerequisites

- WebSocket client library
- JSON-RPC 2.0 implementation
- UUID v4 generator
- Tools/agents to execute evaluations

## Setup Steps

### 1. Generate Client ID

Generate a unique UUID v4 for your client:

```javascript
// JavaScript example
import { v4 as uuidv4 } from 'uuid';
const clientId = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

Store this ID persistently - it will be used for all connections.

### 2. Request YAML Configuration

Contact the evaluation server administrator to:
1. Create a YAML evaluation file for your client ID
2. Optionally set up a secret key for authentication
3. Configure appropriate evaluations for your client

Example request:
```
Client ID: 550e8400-e29b-41d4-a716-446655440000
Client Name: Chrome DevTools Production
Tools Available: extract_schema_data, research_agent, action_agent
Purpose: Automated regression testing
```

### 3. Implement WebSocket Connection

```javascript
class EvaluationClient {
  constructor(serverUrl, clientId, secretKey) {
    this.serverUrl = serverUrl;
    this.clientId = clientId;
    this.secretKey = secretKey;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(this.serverUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to evaluation server');
    };
    
    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
}
```

### 4. Implement Protocol Messages

#### Handle Welcome Message
```javascript
handleMessage(message) {
  switch (message.type) {
    case 'welcome':
      // Server is ready, send registration
      this.register();
      break;
    
    case 'registration_ack':
      if (message.status === 'accepted') {
        console.log(`Registered! ${message.evaluationsCount} evaluations assigned`);
        this.sendReady();
      } else {
        console.error('Registration rejected:', message.reason);
      }
      break;
    
    default:
      // Handle other messages...
  }
}
```

#### Send Registration
```javascript
register() {
  this.send({
    type: 'register',
    clientId: this.clientId,
    secretKey: this.secretKey, // Optional
    capabilities: {
      tools: ['extract_schema_data', 'research_agent'],
      maxConcurrency: 3,
      version: '1.0.0'
    }
  });
}
```

#### Send Ready Signal
```javascript
sendReady() {
  this.send({
    type: 'ready',
    timestamp: new Date().toISOString()
  });
}
```

### 5. Implement RPC Handler

```javascript
handleMessage(message) {
  // ... existing code ...
  
  // Handle JSON-RPC requests
  if (message.jsonrpc === '2.0' && message.method) {
    this.handleRpcRequest(message);
  }
}

async handleRpcRequest(request) {
  if (request.method === 'evaluate') {
    try {
      const result = await this.executeEvaluation(request.params);
      
      this.send({
        jsonrpc: '2.0',
        result: {
          status: 'success',
          output: result.output,
          executionTime: result.duration,
          toolCalls: result.toolCalls,
          metadata: result.metadata
        },
        id: request.id
      });
    } catch (error) {
      this.send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error.message,
          data: {
            tool: request.params.tool,
            error: error.toString(),
            timestamp: new Date().toISOString()
          }
        },
        id: request.id
      });
    }
  }
}
```

### 6. Implement Tool Execution

```javascript
async executeEvaluation(params) {
  const startTime = Date.now();
  
  // Send status update
  this.send({
    type: 'status',
    evaluationId: params.evaluationId,
    status: 'running',
    progress: 0.1,
    message: 'Starting evaluation...'
  });
  
  // Execute the appropriate tool
  let result;
  switch (params.tool) {
    case 'extract_schema_data':
      result = await this.extractSchema(params.url, params.input);
      break;
    
    case 'research_agent':
      result = await this.runResearchAgent(params.url, params.input);
      break;
    
    default:
      throw new Error(`Unknown tool: ${params.tool}`);
  }
  
  const executionTime = Date.now() - startTime;
  
  return {
    output: result,
    duration: executionTime,
    toolCalls: [{
      tool: params.tool,
      timestamp: new Date().toISOString(),
      duration: executionTime,
      status: 'success'
    }],
    metadata: {
      url: params.url,
      toolVersion: '1.0.0'
    }
  };
}
```

## Chrome DevTools Integration

For Chrome DevTools specifically:

### 1. Update EvaluationConfig

```typescript
// In EvaluationConfig.ts
interface EvaluationConfiguration {
  enabled: boolean;
  endpoint: string;
  secretKey?: string;
  clientId?: string; // Add client ID field
}

// Generate and store client ID
function ensureClientId(): string {
  let clientId = localStorage.getItem('ai_chat_evaluation_client_id');
  if (!clientId) {
    clientId = generateUUID();
    localStorage.setItem('ai_chat_evaluation_client_id', clientId);
  }
  return clientId;
}
```

### 2. Create Evaluation Agent

```typescript
// EvaluationAgent.ts
import { WebSocketRPCClient } from '../common/WebSocketRPCClient.js';
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';

export class EvaluationAgent {
  private client: WebSocketRPCClient;
  private clientId: string;
  
  constructor(config: EvaluationConfiguration) {
    this.clientId = config.clientId || ensureClientId();
    this.client = new WebSocketRPCClient({
      endpoint: config.endpoint,
      secretKey: config.secretKey
    });
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.client.on('connected', () => {
      this.register();
    });
    
    // Handle RPC requests
    this.client.on('rpc-request', async (request) => {
      if (request.method === 'evaluate') {
        const result = await this.handleEvaluation(request.params);
        return result;
      }
    });
  }
  
  private async handleEvaluation(params: any): Promise<any> {
    const tool = ToolRegistry.getRegisteredTool(params.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${params.tool}`);
    }
    
    // Execute tool with params.input
    const result = await tool.execute(params.input);
    
    return {
      status: 'success',
      output: result,
      executionTime: Date.now() - startTime
    };
  }
}
```

## Testing Your Client

### 1. Local Testing

Use the example agent to test your server setup:

```bash
# In bo-eval-server directory
npm test
```

### 2. Connection Test

```javascript
// Quick connection test
const client = new EvaluationClient(
  'ws://localhost:8080',
  'your-client-id',
  'optional-secret'
);

client.connect();

// Should see:
// Connected to evaluation server
// Registered! X evaluations assigned
```

### 3. Manual Evaluation Test

You can trigger evaluations manually through the server's CLI:

```bash
npm run cli
> run-evaluation your-client-id evaluation-id
```

## Troubleshooting

### Connection Issues

1. **Check server is running**
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080
   ```

2. **Verify client ID exists**
   - Check `clients/{your-client-id}.yaml` exists on server
   - Ensure client ID format is valid UUID v4

3. **Authentication failures**
   - Verify secret key matches server configuration
   - Check for typos in client ID or secret

### Evaluation Failures

1. **Tool not found**
   - Ensure tool name in YAML matches client capabilities
   - Verify tool is registered in your client

2. **Timeouts**
   - Increase timeout in YAML configuration
   - Check for infinite loops in tool execution

3. **Invalid input**
   - Validate input against expected schema
   - Check for required fields

## Security Best Practices

1. **Store credentials securely**
   - Never hardcode secret keys
   - Use environment variables or secure storage

2. **Validate inputs**
   - Sanitize URLs before navigation
   - Validate schemas before execution

3. **Resource limits**
   - Implement timeout handling
   - Limit concurrent evaluations

4. **Use WSS in production**
   ```javascript
   const client = new EvaluationClient(
     'wss://eval-server.example.com',  // Use WSS
     clientId,
     secretKey
   );
   ```

## Example: Minimal Client

```javascript
// minimal-client.js
import WebSocket from 'ws';

const CLIENT_ID = 'your-uuid-here';
const SECRET_KEY = 'your-secret-here';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', async (data) => {
  const msg = JSON.parse(data);
  
  if (msg.type === 'welcome') {
    // Register
    ws.send(JSON.stringify({
      type: 'register',
      clientId: CLIENT_ID,
      secretKey: SECRET_KEY,
      capabilities: {
        tools: ['extract_schema_data'],
        maxConcurrency: 1,
        version: '1.0.0'
      }
    }));
  }
  
  if (msg.type === 'registration_ack' && msg.status === 'accepted') {
    // Send ready
    ws.send(JSON.stringify({
      type: 'ready',
      timestamp: new Date().toISOString()
    }));
  }
  
  if (msg.jsonrpc && msg.method === 'evaluate') {
    // Simple evaluation response
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        status: 'success',
        output: { message: 'Evaluation completed' },
        executionTime: 1000
      },
      id: msg.id
    }));
  }
});

ws.on('error', console.error);
```