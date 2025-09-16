# LLM Model Configuration Architecture

## Overview

This document outlines the comprehensive architecture for programmatic LLM model provider and configuration management in the browser-operator-core AI chat system. The system supports both manual user configuration and automated evaluation configuration with per-request overrides and persistent configuration updates.

## Current System Analysis

### Provider Support
- **4 LLM Providers**: LiteLLM, OpenAI, Groq, OpenRouter
- **3-Tier Model Selection**:
  - **Main Model**: Primary model for agent execution
  - **Mini Model**: Smaller/faster model for lightweight operations
  - **Nano Model**: Smallest/fastest model for simple tasks

### Current Configuration Flow
1. **Provider Selection** (localStorage: `ai_chat_provider`)
2. **Model Selection** (localStorage: `ai_chat_model_selection`, `ai_chat_mini_model`, `ai_chat_nano_model`)
3. **API Configuration** (localStorage: provider-specific API keys and endpoints)
4. **Context Propagation**: Configuration flows through AgentService → Graph → ConfigurableAgentTool → AgentRunner
5. **Model Usage**: Models selected via `AIChatPanel.getMiniModel()`, `AIChatPanel.getNanoModel()` static methods

### Current localStorage Keys
- `ai_chat_provider`: Selected provider ('openai', 'litellm', 'groq', 'openrouter')
- `ai_chat_model_selection`: Main model name
- `ai_chat_mini_model`: Mini model name
- `ai_chat_nano_model`: Nano model name
- `ai_chat_api_key`: OpenAI API key
- `ai_chat_litellm_endpoint`: LiteLLM server endpoint
- `ai_chat_litellm_api_key`: LiteLLM API key
- `ai_chat_groq_api_key`: Groq API key
- `ai_chat_openrouter_api_key`: OpenRouter API key

## Proposed Architecture: LLMConfigurationManager

### Core Design Principles
- **Single Source of Truth**: Centralized configuration management
- **Override System**: Automated mode can override without affecting localStorage
- **Persistent Configuration**: New eval API to set localStorage values programmatically
- **Backwards Compatible**: Existing localStorage-based code continues to work
- **Tab Behavior**:
  - **Manual Mode**: Shared configuration across tabs via localStorage
  - **Automated Mode**: Per-tab override capability for request multiplexing

### Two Configuration Modes

#### 1. Manual Mode
- User configures through Settings UI
- Configuration persisted to localStorage
- Changes shared across all tabs
- Traditional user experience maintained

#### 2. Automated Mode
Two sub-modes available:

**Per-Request Override (Temporary)**
- Configuration override for individual evaluation requests
- No localStorage changes
- Each tab can have different overrides simultaneously
- Clean up after request completion

**Persistent Configuration (New)**
- Programmatic equivalent of Settings UI
- Updates localStorage values
- Changes apply to all tabs
- Useful for evaluation setup/teardown

## Implementation

### 1. LLMConfigurationManager Singleton

```typescript
interface LLMConfig {
  provider: 'openai' | 'litellm' | 'groq' | 'openrouter';
  apiKey?: string;
  endpoint?: string; // For LiteLLM
  mainModel: string;
  miniModel?: string;
  nanoModel?: string;
}

class LLMConfigurationManager {
  private static instance: LLMConfigurationManager;
  private overrideConfig?: Partial<LLMConfig>; // Override for automated mode

  static getInstance(): LLMConfigurationManager;

  // Configuration retrieval with override fallback
  getProvider(): string;
  getMainModel(): string;
  getMiniModel(): string;
  getNanoModel(): string;
  getApiKey(): string;
  getEndpoint(): string | undefined;

  // Override management (per-request automated mode)
  setOverride(config: Partial<LLMConfig>): void;
  clearOverride(): void;

  // Persistence (manual mode & persistent automated mode)
  saveConfiguration(config: LLMConfig): void;
  loadConfiguration(): LLMConfig;
}
```

#### Configuration Precedence
1. **Override configuration** (if set) - for per-request automated mode
2. **localStorage values** (fallback) - for manual mode and persistent automated mode

### 2. Protocol Extension for Persistent Configuration

#### Add to EvaluationProtocol.ts

```typescript
// New JSON-RPC method for persistent LLM configuration
export interface LLMConfigurationRequest {
  jsonrpc: '2.0';
  method: 'configure_llm';
  params: LLMConfigurationParams;
  id: string;
}

export interface LLMConfigurationParams {
  provider: 'openai' | 'litellm' | 'groq' | 'openrouter';
  apiKey?: string;
  endpoint?: string; // For LiteLLM
  models: {
    main: string;
    mini?: string;
    nano?: string;
  };
  // Optional: only update specific fields
  partial?: boolean;
}

export interface LLMConfigurationResponse {
  jsonrpc: '2.0';
  result: {
    status: 'success';
    message: string;
    appliedConfig: {
      provider: string;
      models: {
        main: string;
        mini: string;
        nano: string;
      };
    };
  };
  id: string;
}

// Type guard
export function isLLMConfigurationRequest(msg: any): msg is LLMConfigurationRequest;

// Helper function
export function createLLMConfigurationRequest(
  id: string,
  params: LLMConfigurationParams
): LLMConfigurationRequest;
```

#### Update EvaluationParams for Per-Request Override

```typescript
export interface EvaluationParams {
  evaluationId: string;
  name: string;
  url: string;
  tool: string;
  input: any;
  model?: {
    main_model?: string;
    mini_model?: string;
    nano_model?: string;
    provider?: string;
    api_key?: string;    // New: per-request API key
    endpoint?: string;   // New: per-request endpoint (LiteLLM)
  };
  timeout: number;
  metadata: {
    tags: string[];
    retries: number;
    priority?: 'low' | 'normal' | 'high';
  };
}
```

### 3. Integration Points

#### Manual Mode (Settings UI)
- Settings dialog calls `LLMConfigurationManager.getInstance().saveConfiguration()`
- All components read through manager methods
- Changes propagate across tabs via storage events
- User expectations: changes in one tab affect all tabs

#### Automated Mode - Per-Request Override
```typescript
// In EvaluationAgent.executeChatEvaluation()
const configManager = LLMConfigurationManager.getInstance();

// Set override if provided in request
if (input.provider || input.main_model || input.api_key) {
  configManager.setOverride({
    provider: input.provider,
    mainModel: input.main_model,
    miniModel: input.mini_model,
    nanoModel: input.nano_model,
    apiKey: input.api_key,
    endpoint: input.endpoint
  });
}

try {
  // Execute with override
  const result = await agentService.sendMessage(input.message);
  return result;
} finally {
  // Clean up override
  configManager.clearOverride();
}
```

#### Automated Mode - Persistent Configuration
```typescript
// In EvaluationAgent.handleLLMConfigurationRequest()
private async handleLLMConfigurationRequest(request: LLMConfigurationRequest): Promise<void> {
  const configManager = LLMConfigurationManager.getInstance();

  // Save to localStorage (same as Settings UI)
  configManager.saveConfiguration({
    provider: params.provider,
    apiKey: params.apiKey,
    endpoint: params.endpoint,
    mainModel: params.models.main,
    miniModel: params.models.mini,
    nanoModel: params.models.nano
  });

  // Reinitialize AgentService with new configuration
  const agentService = AgentService.getInstance();
  await agentService.refreshCredentials();

  // Send success response
}
```

### 4. Component Updates Required

1. **Replace localStorage access** in:
   - `AgentService.ts` - Use manager for provider/key retrieval
   - `AIChatPanel.ts` - Replace static model methods with manager calls
   - `AgentNodes.ts` - Use manager for graph configuration
   - `ConfigurableAgentTool.ts` - Use manager for CallCtx building

2. **Add configuration refresh mechanisms**:
   - AgentService reinitialize LLMClient when config changes
   - Graph recreation with new model configuration
   - Storage event listeners for cross-tab synchronization

3. **Update EvaluationAgent**:
   - Add `configure_llm` method handler
   - Update per-request override logic
   - Add configuration validation

## Usage Examples

### Per-Request Override (Temporary)
```typescript
// eval-server sends evaluation with custom config
{
  "jsonrpc": "2.0",
  "method": "evaluate",
  "params": {
    "evaluationId": "eval-123",
    "tool": "chat",
    "input": { "message": "Hello" },
    "model": {
      "provider": "openai",
      "main_model": "gpt-4",
      "api_key": "sk-temp-key"
    }
  },
  "id": "req-456"
}
```

### Persistent Configuration
```typescript
// eval-server sets persistent configuration
{
  "jsonrpc": "2.0",
  "method": "configure_llm",
  "params": {
    "provider": "openai",
    "apiKey": "sk-persistent-key",
    "models": {
      "main": "gpt-4",
      "mini": "gpt-4-mini",
      "nano": "gpt-3.5-turbo"
    }
  },
  "id": "config-789"
}
```

## Benefits

### Manual Mode
- ✅ Maintains current UX - shared configuration across tabs
- ✅ Settings persist in localStorage
- ✅ No breaking changes for existing users

### Automated Mode - Per-Request Override
- ✅ Per-request configuration without side effects
- ✅ Multiple evaluations with different configs in different tabs
- ✅ Clean separation from manual configuration
- ✅ Tab isolation for request multiplexing

### Automated Mode - Persistent Configuration
- ✅ Programmatic equivalent of Settings UI
- ✅ Evaluation setup/teardown capabilities
- ✅ Cross-tab configuration updates
- ✅ Integration with existing localStorage system

### Technical
- ✅ Single source of truth for all configuration
- ✅ Backwards compatible with existing code
- ✅ Simple mental model: override if present, localStorage otherwise
- ✅ No complex mode management needed
- ✅ Flexible evaluation server capabilities

## Implementation Status

### ✅ Phase 1: Core Infrastructure (COMPLETED)
1. ✅ **Create LLMConfigurationManager** singleton class - `/front_end/panels/ai_chat/core/LLMConfigurationManager.ts`
2. ✅ **Update AgentService** to use manager instead of localStorage
3. ✅ **Update AIChatPanel** model selection methods
4. ✅ **Add configuration refresh mechanisms**

### ✅ Phase 2: Per-Request Override Support (COMPLETED)
5. ✅ **Update EvaluationAgent** per-request override logic
6. ✅ **Update Graph/AgentNodes** configuration passing via LLMConfigurationManager
7. ✅ **Per-request override functionality** implemented

### ✅ Phase 3: Persistent Configuration API (COMPLETED)
8. ✅ **Extend EvaluationProtocol** with `configure_llm` method
9. ✅ **Implement `configure_llm` handler** in EvaluationAgent
10. 🔄 **Add eval-server support** for persistent configuration (server-side implementation needed)
11. ✅ **Add configuration validation** and error handling

### 🔄 Phase 4: Testing & Documentation (NEXT)
12. ✅ **Maintain backwards compatibility** during transition
13. 🔄 **Add comprehensive tests** for both modes
14. ✅ **Update documentation** and usage examples
15. 🔄 **Performance testing** with multiple tabs and configurations

## Key Implemented Features

### LLMConfigurationManager (`/front_end/panels/ai_chat/core/LLMConfigurationManager.ts`)
- ✅ Singleton pattern with override support
- ✅ Configuration validation
- ✅ Change listeners for real-time updates
- ✅ localStorage persistence for manual mode
- ✅ Override system for automated mode

### Per-Request Override Support
- ✅ EvaluationAgent supports model overrides via request parameters
- ✅ Automatic cleanup after request completion
- ✅ Configuration fallback hierarchy (override → localStorage)

### Persistent Configuration API
- ✅ `configure_llm` JSON-RPC method in EvaluationProtocol
- ✅ Handler implementation in EvaluationAgent
- ✅ Real-time AgentService reinitialization
- ✅ Cross-tab configuration synchronization

### Integration Points Updated
- ✅ AgentService: Uses LLMConfigurationManager instead of direct localStorage
- ✅ AIChatPanel: Static model methods updated to use manager
- ✅ AgentNodes: Tool execution context uses manager configuration
- ✅ EvaluationAgent: Supports both override and persistent modes

## Usage Examples

### Manual Mode (Settings UI)
```typescript
// Settings dialog usage
const panel = AIChatPanel.instance();
panel.setLLMConfiguration({
  provider: 'openai',
  apiKey: 'sk-...',
  mainModel: 'gpt-4',
  miniModel: 'gpt-4-mini',
  nanoModel: 'gpt-3.5-turbo'
});
```

### Automated Mode - Per-Request Override
```typescript
// Evaluation request with model override
{
  "jsonrpc": "2.0",
  "method": "evaluate",
  "params": {
    "tool": "chat",
    "input": { "message": "Hello" },
    "model": {
      "provider": "openai",
      "main_model": "gpt-4",
      "api_key": "sk-temp-key"
    }
  }
}
```

### Automated Mode - Persistent Configuration
```typescript
// Set persistent configuration
{
  "jsonrpc": "2.0",
  "method": "configure_llm",
  "params": {
    "provider": "openai",
    "apiKey": "sk-persistent-key",
    "models": {
      "main": "gpt-4",
      "mini": "gpt-4-mini",
      "nano": "gpt-3.5-turbo"
    }
  }
}
```

## Migration Strategy

### Backwards Compatibility
- Existing localStorage-based code continues to work during transition
- Gradual migration of components to use LLMConfigurationManager
- Fallback mechanisms for missing configuration values
- No breaking changes to existing evaluation requests

### Testing Strategy
- Unit tests for LLMConfigurationManager override logic
- Integration tests for Settings UI compatibility
- End-to-end tests for evaluation server scenarios
- Cross-tab synchronization testing
- Performance testing with multiple concurrent evaluations

This architecture provides a comprehensive solution for both manual user configuration and programmatic evaluation server control, while maintaining backwards compatibility and enabling powerful new automation capabilities.