# AI Agent Framework

This framework allows creating configurable AI agents that can use tools and hand off tasks to each other within the AI Chat panel.

## Core Components

*   **`ConfigurableAgentTool.ts`**: Defines the `ConfigurableAgentTool` class. Agents are built by providing an `AgentToolConfig` object specifying name, description, prompt, tools, input schema, and optional handoffs.
*   **`AgentRunner.ts`**: Executes the agent's logic loop: calls the LLM, runs tools, manages iterations, and handles agent handoffs (triggered by LLM choice or hitting max iterations).
*   **`ToolRegistry` (in `ConfigurableAgentTool.ts`)**: A central place to register (`registerToolFactory`) and retrieve (`getToolInstance`, `getRegisteredTool`) instances of tools and agents. Agents are registered here so they can be used as tools or handoff targets.
*   **`implementation/ConfiguredAgents.ts`**: Contains concrete `AgentToolConfig` definitions (e.g., `createResearchAgentConfig`) and the `initializeConfiguredAgents()` function, which registers all predefined agents and tools into the `ToolRegistry` on startup.

## Adding a New Configurable Agent

Follow these steps, primarily within `implementation/ConfiguredAgents.ts`:

1.  **Define Configuration (`AgentToolConfig`)**: Create a function that returns an `AgentToolConfig` object for your agent. Key fields:
    *   `name`: Unique agent identifier (e.g., `'your_new_agent'`).
    *   `description`: What the agent does (used when it's a potential handoff target).
    *   `systemPrompt`: Instructions for the agent's behavior.
    *   `tools`: Array of *registered* tool/agent names it can use (e.g., `['navigate_url', 'fetcher_tool']`).
    *   `schema`: Input arguments the agent expects (JSON schema format).
    *   `handoffs`: (Optional) Array of `HandoffConfig` objects defining targets (`targetAgentName`), triggers (`llm_tool_call` or `max_iterations`), and optionally which tool results to pass (`includeToolResults`).
    *   Other optional fields: `maxIterations`, `modelName`, `temperature`, custom functions (`prepareMessages`, `createSuccessResult`, `createErrorResult`), `includeIntermediateStepsOnReturn`.

    ```typescript
    // Example structure in implementation/ConfiguredAgents.ts
    function createYourNewAgentConfig(): AgentToolConfig {
      return { /* ... fill in the config fields ... */ };
    }
    ```

2.  **Register Agent & Its Tools**: In `initializeConfiguredAgents()`:
    *   Instantiate your agent: `const yourNewAgent = new ConfigurableAgentTool(createYourNewAgentConfig());`
    *   Register it: `ToolRegistry.registerToolFactory('your_new_agent', () => yourNewAgent);`
    *   Ensure any tools listed in its `tools` config are *also* registered using `ToolRegistry.registerToolFactory()`. 

3.  **Integrate with Orchestrator (`core/BaseOrchestratorAgent.ts`)**: Make the new agent usable:
    *   **Option A (New Top-Level Agent)**: Add a type to `BaseOrchestratorAgentType` enum and a corresponding entry in `AGENT_CONFIGS`. The `availableTools` in this new config should likely include your agent's name (`'your_new_agent'`) so the orchestrator can call it.
    *   **Option B (As a Tool for Existing Agent)**: Add your agent's name (`'your_new_agent'`) to the `availableTools` array of an *existing* agent type in `AGENT_CONFIGS`. Update that existing agent's system prompt to explain when to use your new agent.

## Agent Handoffs Explained

Agents can pass control to other, potentially more specialized, agents.

*   **LLM Triggered**: Defined in `handoffs` with `trigger: 'llm_tool_call'`. The LLM sees a `handoff_to_<target_agent>` tool and can choose to call it.
*   **Max Iterations Triggered**: Defined with `trigger: 'max_iterations'`. Automatically hands off if the agent hits its iteration limit.
*   **Context Passing**: By default, the full message history is passed. Use `includeToolResults: ['tool1', 'tool2']` in the `HandoffConfig` to pass only the initial query and results from specified tools.