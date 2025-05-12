# AI Chat Panel

This panel is a Multi-Agent Framework that allows a user to connect an existing LLM with the chromium browser.

### Setup and Development

1. Build the project and use watch mode
```sh
npm run build -- --watch
```

2. Serve the content of out/Default/gen/front_end on a web server, e.g. via python -m http.server.

```sh
cd out/Default/gen/front_end

python3 -m http.server
```

3. Use the AI Chat panel.

```sh
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --disable-infobars --custom-devtools-frontend=http://localhost:8000/
```


### Agent Architecture

The AI Chat Panel uses the multi-agent framework with the following components:

1. **State Management**: Tracks conversation history, user context, and DevTools state
2. **Tools**: Provides capabilities for DOM inspection, network analysis, and code execution
3. **Workflow**: Defines the agent's reasoning process and decision-making flow

### Implementation Details

The agent implementation is located in `front_end/panels/ai_chat/agent/` and consists of:

- `AgentService.ts`: Main service that interfaces between UI and Graph Workflow
- `State.ts`: Defines the agent's state schema
- `Tools.ts`: Implements DevTools-specific tools
- `Graph.ts`: Defines the agent's workflow and decision-making process

### Usage Example

```typescript
import { AgentService } from './agent/AgentService.js';

// Initialize the agent service
const agentService = new AgentService();

// Send a message to the agent
async function sendMessage(text: string) {
  const response = await agentService.sendMessage(text);
  // Update UI with response
}
```

## Reference
https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md#Standalone-checkout-Checking-out-source
