# AI Chat Tracing Implementation

This directory contains the tracing implementation for the AI Chat agent framework in Chrome DevTools. The tracing system provides comprehensive observability for agent interactions, LLM calls, and tool executions using Langfuse as the primary tracing backend.

## Architecture

### Core Components

1. **TracingProvider** (`TracingProvider.ts`) - Abstract base class defining the tracing interface
2. **LangfuseProvider** (`LangfuseProvider.ts`) - Langfuse-specific implementation 
3. **TracingConfig** (`TracingConfig.ts`) - Configuration management and provider factory

### Tracing Hierarchy

```
Session (per AgentService instance)
├── Trace (per user interaction/sendMessage)
    ├── Span (StateGraph node execution)
    ├── Generation (LLM calls in AgentNode)
    ├── Span (Tool executions in ToolExecutorNode)
    └── Span (Agent handoffs in AgentRunner)
```

## Configuration

**🎉 NEW: Persistent Configuration** - Tracing configuration now persists across page navigations and DevTools sessions!

### Method 1: Settings UI (Recommended)

1. Open AI Chat in DevTools
2. Click the Settings gear icon
3. Scroll to "Tracing Configuration" section
4. Check "Enable Tracing"
5. Enter your Langfuse credentials:
   - **Endpoint**: http://localhost:3000 (or your Langfuse server URL)
   - **Public Key**: pk-lf-... (from Langfuse project settings)
   - **Secret Key**: sk-lf-... (from Langfuse project settings)
6. Click "Test Connection" to verify
7. Click "Save" to persist settings

### Method 2: Browser Console

Run this in the DevTools console:

```javascript
// Quick configuration (replace with your actual credentials)
configureLangfuseTracing(
  'http://localhost:3000',           // endpoint
  'pk-lf-your-public-key',          // public key
  'sk-lf-your-secret-key'           // secret key
);
```

### Method 3: Configuration Script

```javascript
// Load and run the configuration script
const script = document.createElement('script');
script.src = '/front_end/panels/ai_chat/tracing/configure-langfuse.js';
document.head.appendChild(script);
```

### Method 4: Manual Console Commands

```javascript
// Check current configuration
getTracingConfig();

// Enable tracing manually
setTracingConfig({
  provider: 'langfuse',
  endpoint: 'http://localhost:3000',
  publicKey: 'pk-lf-your-public-key',
  secretKey: 'sk-lf-your-secret-key'
});

// Disable tracing
setTracingConfig({ provider: 'disabled' });

// Check if tracing is enabled
isTracingEnabled();
```

### Persistent Storage

Configuration is stored in a persistent singleton that survives:
- ✅ Page navigation 
- ✅ DevTools reloads
- ✅ URL changes
- ✅ Browser sessions (via localStorage backup)

## Implementation Details

### Trace Flow

1. **Session Creation** - When AgentService initializes, a unique session is created
2. **Trace Creation** - Each `sendMessage()` call creates a new trace with:
   - User input as trace input
   - Selected agent type as metadata
   - Current page URL/title as tags
3. **Observation Tracking** - Various components create observations:
   - **StateGraph**: Creates spans for each node execution
   - **AgentNode**: Creates generation observations for LLM calls
   - **ToolExecutorNode**: Creates spans for tool executions
   - **AgentRunner**: Creates spans for agent handoffs

### Context Propagation

Tracing context is passed through the existing `AgentState.context.tracingContext` field:

```typescript
interface TracingContext {
  sessionId: string;
  traceId: string;
  parentObservationId?: string;
}
```

This context flows through the entire execution pipeline without requiring changes to existing interfaces.

### Langfuse API Integration

The implementation uses Langfuse's batch ingestion API:

- **Endpoint**: `POST /api/public/ingestion`
- **Authentication**: Basic Auth with public/secret keys
- **Batching**: Events are buffered and sent in batches for efficiency
- **Auto-flush**: Automatic periodic flushing every 5 seconds or when buffer reaches 50 events

### Event Types

- **trace-create**: Main user interaction traces
- **generation-create**: LLM generation events with model parameters
- **span-create**: General execution spans (nodes, tools, handoffs)
- **event-create**: Discrete point-in-time events

## Usage Examples

### Basic Tracing

Once configured, tracing happens automatically:

1. Start a conversation in AI Chat
2. View traces in your Langfuse instance at the configured endpoint
3. Each user message creates a new trace with nested observations

### Debugging

To debug tracing issues:

1. Check browser console for tracing-related logs
2. Verify configuration: `getLangfuseConfig()`
3. Test connectivity to your Langfuse instance
4. Check Langfuse logs for ingestion errors

### Extending

To add custom tracing:

```typescript
import { createTracingProvider } from '../tracing/TracingConfig.js';

const tracingProvider = createTracingProvider();

// Create custom span
await tracingProvider.createObservation({
  id: 'custom-span-id',
  name: 'Custom Operation',
  type: 'span',
  startTime: new Date(),
  input: { /* operation input */ },
  metadata: { /* custom metadata */ }
}, traceId);
```

## Performance Considerations

- Events are batched to minimize network overhead
- Large inputs/outputs are truncated for tracing
- Tracing is async and doesn't block the main execution flow
- Graceful degradation when tracing fails

## Future Enhancements

- Support for additional tracing providers (OpenTelemetry, DataDog, etc.)
- Token usage tracking when available from LLM responses
- Custom scoring/evaluation integration
- Performance metrics and latency tracking
- Distributed tracing across multiple DevTools instances