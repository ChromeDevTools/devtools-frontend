# AI Chat Panel Architecture

## 1. Overview

The AI Chat Panel provides a conversational interface allowing users to interact with an AI assistant. The assistant can leverage various tools, including page context, accessibility information, and so on, to answer questions and perform tasks.

The architecture is designed to be modular and extensible, featuring a primary conversational agent graph and the ability to invoke more complex, self-contained "agent-like tools" that manage their own execution loops. This allows a multi-agent flow that can even handoff tasks to other specialized agents.

## 2. Core Components

### 2.1. `AIChatPanel` (UI Layer)
*   **Responsibilities**:
    *   Serves as the main entry point and container for the AI chat UI within DevTools.
    *   Manages the overall lifecycle of the chat panel.
    *   Integrates and orchestrates the `ChatView` component and the `AgentService`.
*   **Key Interactions**:
    *   With `ChatView`: Passes messages, state, and handlers for user input and UI actions.
    *   With `AgentService`: Initiates agent runs, sends user messages, and receives agent responses/updates.

### 2.2. `ChatView` (View Layer)
*   **Responsibilities**:
    *   A Lit-based component responsible for rendering the chat interface.
    *   Handles user input.
    *   Displays messages from the user, AI model, and tool results.
    *   Manages UI state (loading, input emptiness, selections).
    *   Uses a `MarkdownRenderer`.
    *   Combines tool calls and results for display.
*   **Key Data Structures**:
    *   `ChatMessage` (union type: `UserChatMessage`, `ModelChatMessage`, `ToolResultMessage`).
    *   `Props` (data for the component).
*   **Key Interactions**:
    *   Receives `messages` and `state` from `AIChatPanel`.
    *   Emits events for user actions.

### 2.3. Agent Orchestration (Logic Layer)

The system employs a two-tiered approach to agent orchestration:

#### 2.3.1. Primary Orchestration: `StateGraph` via `AgentService`

*   **`AgentService.ts`**: 
    *   Singleton service acting as the main backend interface for the UI (`AIChatPanel`).
    *   Manages overall `AgentState` (conversation history, API key, selected primary agent type).
    *   Initializes and holds a `CompiledGraph` instance (typically the `defaultAgentGraphConfig` processed by `createAgentGraphFromConfig`).
    *   The `sendMessage` method: 
        *   Updates history with the user message.
        *   Invokes the primary `StateGraph` using `graph.invoke(currentState)`.
        *   Streams `AgentState` updates (as messages are added by the graph) back to the UI via `MESSAGES_CHANGED` events.
        *   Handles top-level errors during graph execution.
*   **`StateGraph` (in `Graph.ts`)**: 
    *   A generic state machine executor used for the main conversational flow.
    *   Manages nodes (e.g., `AgentNode`, `ToolExecutorNode`) and conditional edges.
    *   Dynamically modifies the graph if needed (e.g., `toolExecutorNode` creation).
*   **Graph Configuration (`ConfigurableGraph.ts`, `GraphConfigs.ts`)**: 
    *   `ConfigurableGraph.ts` provides `createAgentGraphFromConfig` to build `StateGraph` instances from `GraphConfig` objects.
    *   `GraphConfigs.ts` stores typed `GraphConfig` definitions (e.g., `defaultAgentGraphConfig`).
*   **Core Nodes in Primary Graph (`Graph.ts`)**: 
    *   `AgentNode`: Interacts with `ChatOpenAI` for primary LLM calls, decides on actions (tool use or final answer).
    *   `ToolExecutorNode`: Executes tools requested by the `AgentNode`. This node can execute both simple tools and more complex `ConfigurableAgentTool`s.
    *   `FinalNode`: Represents the end of a successful turn.
*   **Routing Logic (`Graph.ts`, `ConfigurableGraph.ts`)**: 
    *   `routeNextNode`: Central function to determine next node type.
    *   Condition Factories in `ConfigurableGraph.ts` provide specific routing logic for edges.

#### 2.3.2. Secondary/Tool-Level Orchestration: `AgentRunner` for `ConfigurableAgentTool`s
*   **`ConfigurableAgentTool.ts`**: 
    *   Defines the `ConfigurableAgentTool` class, which implements the standard `Tool` interface. This allows these "agents" to be used as tools within the primary `StateGraph` (or by other `ConfigurableAgentTool`s).
    *   Each instance is configured via an `AgentToolConfig` (defining its own system prompt, sub-tools, model, handoffs, etc.).
    *   Its `execute(args)` method is the entry point when invoked as a tool.
    *   Crucially, `execute()` calls `AgentRunner.run(...)` to manage its internal execution.
*   **`AgentRunner.ts`**: 
    *   Provides a static `run(...)` method that implements an iteration-based execution loop for a `ConfigurableAgentTool`.
    *   This loop is independent of the primary `StateGraph`'s execution model.
    *   Directly handles LLM calls (via `OpenAIClient`), parsing responses, executing its configured sub-tools (which can include simple tools or other `ConfigurableAgentTool`s), and managing its iteration count.
    *   Implements a **Handoff Mechanism**: 
        *   A `ConfigurableAgentTool` can be configured to hand off tasks to another registered `ConfigurableAgentTool`.
        *   Handoffs can be triggered by the LLM selecting a dynamically generated `handoff_to_<TargetAgentName>` tool, or by other conditions like `max_iterations`.
        *   `executeHandoff` manages the transfer of control and relevant message history to the target agent, recursively calling `AgentRunner.run` for it.
    *   Uses `AgentRunnerConfig` and `AgentRunnerHooks` for its operation.
*   **`ToolRegistry` (in `ConfigurableAgentTool.ts`)**: 
    *   A static registry for tool factories and instances. `ConfigurableAgentTool`s (and potentially other tools) are registered here so they can be looked up by name, especially for handoffs and when a `ConfigurableAgentTool` specifies its own list of usable tools by name.

### 2.4. `AgentState`
*   **Responsibilities**: Defines the `AgentState` interface, passed between nodes of the primary `StateGraph`. Includes `messages`, `selectedAgentType`, `error`, `currentPageUrl`, `currentPageTitle`.

### 2.5. Tools
*   **Standard Tools (`Tools.ts`, specific tool files)**: 
    *   Defined via `getTools` in `Tools.ts`. Each has `name`, `description`, `schema`, `execute`.
    *   Used by both the primary `AgentNode` (via `ToolExecutorNode`) and by `ConfigurableAgentTool`s (via `AgentRunner`).
*   **`ConfigurableAgentTool` (as a Tool Type)**: 
    *   As described in 2.3.2, these are sophisticated tools that are themselves agents.
*   **`BaseOrchestratorAgent.ts`**: Provides `getAgentTools` and `getSystemPrompt` based on `selectedAgentType`, influencing which tools and persona the primary agent (in `StateGraph`) adopts.
*   **`ToolRegistry`**: Manages instances of all tools, especially important for `ConfigurableAgentTool`s and their sub-tools/handoffs.

### 2.6. Page Context and History
*   **`PageInfoManager.ts`**: Singleton for rich page context (URL, title, accessibility tree, iframes). Used by `enhancePromptWithPageContext` (which is called by `ChatOpenAI` for the primary graph and by `AgentRunner` for `ConfigurableAgentTool`s).
*   **`VisitHistoryManager.ts`**: Stores page visit history.
*   **`AgentService` Direct Fetch**: `AgentService` also fetches current page URL/title directly via SDK calls when a message is sent, adding this to the `AgentState` for the graph run. This seems to provide initial, quickly available context, while `PageInfoManager` provides a more comprehensive, potentially asynchronous update for prompt enhancement.

### 2.7. Supporting Types and Utilities
*   **`Types.ts`**: Common interfaces (`CompiledGraph`, `Runnable`, `NodeType`).
*   **`utils.ts`**: General utilities.
*   **`ai_chat_impl.ts`**: Re-exports `AIChatPanel`.

## 3. Data Flow (Illustrative - focusing on a `ConfigurableAgentTool` being used)

1.  **User Input**: User interacts with `ChatView`.
2.  **`AgentService` Handles**: `AIChatPanel` sends message to `AgentService`.
3.  **Primary Graph Invocation**: `AgentService` updates its `AgentState` and calls `primaryGraph.invoke(state)`.
4.  **`AgentNode` (Primary Graph)**: Processes, calls `ChatOpenAI.generate()`.
5.  **LLM Decides to Use a `ConfigurableAgentTool`**: Model response indicates calling, e.g., "ResearchAgentTool".
6.  **`AgentNode` Updates State**: Adds model's tool call message to `AgentState.messages`.
7.  **`StateGraph` Routes to `ToolExecutorNode`**.
8.  **`ToolExecutorNode`**: 
    *   Retrieves "ResearchAgentTool" instance (a `ConfigurableAgentTool`) from `ToolRegistry` (or it's passed if tools are instantiated per run).
    *   Calls `ResearchAgentTool.execute(toolArgsFromLLM)`.
9.  **`ConfigurableAgentTool.execute()`**: 
    *   Sets up `AgentRunnerConfig` and `AgentRunnerHooks` for itself.
    *   Calls `AgentRunner.run(initialMessagesForThisAgent, toolArgsFromLLM, runnerConfig, hooks, thisConfigurableAgentTool)`.
10. **`AgentRunner.run()` Loop**: 
    *   Iteratively calls `OpenAIClient` using *its own* system prompt and sub-tools.
    *   May execute its own sub-tools (simple ones, or other `ConfigurableAgentTool`s, leading to nested `AgentRunner.run` calls via handoff).
    *   Eventually produces a `ConfigurableAgentResult` (success or error).
11. **Return to `ToolExecutorNode`**: `AgentRunner.run` returns its result to `ConfigurableAgentTool.execute()`, which returns it to `ToolExecutorNode`.
12. **`ToolExecutorNode` Updates State**: Adds the `ConfigurableAgentResult` (formatted as a `ToolResultMessage`) to `AgentState.messages`.
13. **`StateGraph` Routes Back to `AgentNode`**.
14. **`AgentNode` (Primary Graph)**: Processes the result of "ResearchAgentTool" and continues conversation.
15. **UI Updates**: `AgentService` streams all message updates (from primary graph and potentially detailed intermediate steps if configured) to `ChatView` via events.

## 4. Extensibility and Future Directions

*   **Custom Agent Behaviors via `GraphConfig`**: For the primary flow.
*   **Modular, Reusable Agent-Tools via `ConfigurableAgentTool`**: For complex, self-contained tasks that can be plugged into the main graph or used by other agent-tools.
*   **Handoffs**: Allow building sophisticated multi-agent collaborations.
*   **New Tools**: Both simple tools and new `ConfigurableAgentTool`s can be added via `ToolRegistry`.
*   **Specialized Primary Agents**: Different `selectedAgentType` can load entirely different primary `GraphConfig`s.

This document provides a high-level snapshot. Further details are in the source code and `FutureGraphExtensions.md`. 