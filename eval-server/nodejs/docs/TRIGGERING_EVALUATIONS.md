# How to Trigger Evaluations

This guide explains all the different ways to trigger evaluations in the system.

## Prerequisites

1. **Server Running**: Make sure the evaluation server is running:
   ```bash
   npm start
   ```

2. **Client Connected**: A DevTools client must be connected and ready. You'll see logs like:
   ```
   [info]: Client registered successfully {"clientId":"550e8400...","capabilities":"extract_schema_data, research_agent"}
   [info]: Client ready for evaluations {"clientId":"550e8400..."}
   ```

## Method 1: Interactive CLI

Start the interactive CLI:
```bash
npm run cli
```

### Available Commands

#### List Clients and Evaluations
```bash
eval-server> clients
```
This shows all registered clients and their available evaluations with current status.

#### Run Specific Evaluation
```bash
eval-server> run <client-id> <evaluation-id>
```
Example:
```bash
eval-server> run 550e8400-e29b-41d4-a716-446655440000 wikipedia-chrome-devtools-001
```

#### Run All Evaluations for a Client
```bash
eval-server> run-all <client-id>
```
Example:
```bash
eval-server> run-all 550e8400-e29b-41d4-a716-446655440000
```

#### Check Status
```bash
eval-server> status
```
Shows server status, connected clients, and active evaluations.

#### Get Help
```bash
eval-server> help
```

## Method 2: HTTP API

The server also exposes an HTTP API on port 8081.

### Get Server Status
```bash
curl http://localhost:8081/status
```

### List All Clients
```bash
curl http://localhost:8081/clients
```

### Get Client Evaluations
```bash
curl "http://localhost:8081/clients/:id/evaluations?id=550e8400-e29b-41d4-a716-446655440000"
```

### Trigger Specific Evaluation
```bash
curl -X POST http://localhost:8081/evaluate \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "evaluationId": "wikipedia-chrome-devtools-001"
  }'
```

### Trigger All Evaluations for a Client
```bash
curl -X POST http://localhost:8081/evaluate \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "runAll": true
  }'
```


## Method 3: Programmatic Integration

You can integrate the evaluation system into your own applications:

### Node.js Example
```javascript
import { EvaluationServer } from './src/server.js';

const server = new EvaluationServer();
server.start();

// Wait for client to connect
setTimeout(async () => {
  const clientId = '550e8400-e29b-41d4-a716-446655440000';
  const evaluationId = 'wikipedia-chrome-devtools-001';
  
  // Get client connection
  const connection = server.connectedAgents.get(clientId);
  if (connection && connection.ready) {
    // Get evaluation
    const evaluation = server.getClientManager()
      .getClientEvaluations(clientId)
      .find(e => e.id === evaluationId);
    
    if (evaluation) {
      // Execute evaluation
      await server.executeEvaluation(connection, evaluation);
      console.log('Evaluation completed!');
    }
  }
}, 5000);
```

### Python Example (using HTTP API)
```python
import requests
import json

def trigger_evaluation(client_id, evaluation_id):
    response = requests.post('http://localhost:8081/evaluate', 
        headers={'Content-Type': 'application/json'},
        json={
            'clientId': client_id,
            'evaluationId': evaluation_id
        })
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to trigger evaluation: {response.text}")

# Example usage
result = trigger_evaluation(
    '550e8400-e29b-41d4-a716-446655440000',
    'wikipedia-chrome-devtools-001'
)
print(json.dumps(result, indent=2))
```

## Method 4: Webhook Integration

You can set up webhooks to trigger evaluations from external systems:

### GitHub Actions Example
```yaml
name: Run Evaluations
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM
  workflow_dispatch:  # Manual trigger

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Evaluation
        run: |
          curl -X POST ${{ secrets.EVAL_SERVER_URL }}/evaluate \\
            -H "Content-Type: application/json" \\
            -d '{
              "clientId": "${{ secrets.CLIENT_ID }}",
              "runAll": true
            }'
```

### Slack Bot Example
```javascript
// Slack bot command: /eval wikipedia
app.command('/eval', async ({ command, ack, respond }) => {
  await ack();
  
  const evaluationId = command.text.trim();
  const clientId = process.env.DEFAULT_CLIENT_ID;
  
  try {
    const response = await fetch('http://localhost:8081/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, evaluationId })
    });
    
    const result = await response.json();
    await respond(`✅ Evaluation '${evaluationId}' completed successfully!`);
  } catch (error) {
    await respond(`❌ Evaluation failed: ${error.message}`);
  }
});
```

## Monitoring Evaluation Results

### Real-time Logs
Monitor the server logs to see evaluation progress:
```bash
tail -f logs/combined.log
```

### Status Checking
Check evaluation status via API:
```bash
# Get all evaluations for a client
curl "http://localhost:8081/clients/:id/evaluations?id=CLIENT_ID"

# Check server status
curl http://localhost:8081/status
```

### Log Files
Evaluation results are logged to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Troubleshooting

### Client Not Connected
```
❌ Client 'CLIENT_ID' is not connected or not ready
```
**Solutions:**
1. Make sure DevTools is running and connected
2. Check that the client ID matches
3. Verify the WebSocket connection is working

### Evaluation Not Found
```
❌ Evaluation 'EVAL_ID' not found for client 'CLIENT_ID'
```
**Solutions:**
1. Check the YAML file for the correct evaluation ID
2. Ensure the evaluation is enabled (`enabled: true`)
3. Reload the server if you changed the YAML file

### Tool Not Available
```
Tool execution failed: Tool not found: tool_name
```
**Solutions:**
1. Verify the tool is registered in DevTools
2. Check that the tool name matches exactly
3. Ensure DevTools has the required capabilities

### Connection Timeout
```
WebSocket connection failed
```
**Solutions:**
1. Check if the server is running on the correct port
2. Verify firewall settings
3. Check network connectivity

## Best Practices

1. **Start Simple**: Begin with manual evaluations before setting up automation
2. **Monitor Logs**: Always monitor logs when running evaluations
3. **Test Connections**: Use the `status` command to verify everything is connected
4. **Gradual Rollout**: Test individual evaluations before running batch operations
5. **Error Handling**: Implement proper error handling in automated systems
6. **Rate Limiting**: Don't run too many evaluations simultaneously

## Example Workflow

Here's a typical workflow for triggering evaluations:

```bash
# 1. Start the server
npm start

# 2. In another terminal, start the CLI
npm run cli

# 3. Check status and clients
eval-server> status
eval-server> clients

# 4. Run a specific evaluation
eval-server> run 550e8400-e29b-41d4-a716-446655440000 wikipedia-chrome-devtools-001

# 5. Check results in logs
# (Monitor the server logs for detailed results)

# 6. Run all evaluations if needed
eval-server> run-all 550e8400-e29b-41d4-a716-446655440000
```

This comprehensive guide covers all the ways to trigger and monitor evaluations in your system!