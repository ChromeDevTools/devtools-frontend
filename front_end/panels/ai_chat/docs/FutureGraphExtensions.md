# Future Plans: Extending the Agent Graph System

This document outlines potential extensions and custom graph configurations for the AI Chat agent system. The core idea is to leverage the `createAgentGraphFromConfig` function by defining new `GraphConfig` objects to achieve diverse agent behaviors.

## Core Concepts for Extension

To create custom graph behaviors, the primary methods involve:

1.  **Defining New Node Types**:
    *   Identify steps in your desired workflow that have distinct behaviors or responsibilities.
    *   For each, define a new `type` string (e.g., `"critiqueAgent"`, `"intentRouterAgent"`) in your `GraphNodeConfig`.
    *   Implement a corresponding factory function in `ConfigurableGraph.ts` within the `nodeFactories` object. This factory will create the runnable node instance (e.g., `createCritiqueAgentNode(model)`).

2.  **Defining New Condition Logics**:
    *   Identify new ways your graph needs to decide which node to transition to based on the current `AgentState`.
    *   Define a new `conditionType` string (e.g., `"routeCritiqueDecision"`, `"routeByIntent"`) in your `GraphEdgeConfig`.
    *   Implement a corresponding factory function in `ConfigurableGraph.ts` within the `conditionFactories` object. This factory produces the condition function `(state: AgentState, graphInstance: StateGraph<AgentState>, edgeConfig: GraphEdgeConfig, model: ChatOpenAI) => string;`.

3.  **Leveraging `AgentState`**:
    *   Complex custom graphs often rely on information being stored and passed along in the `AgentState`. Nodes can add information (e.g., detected intent, critique feedback), and condition functions can read this information to make routing decisions.

4.  **Node Granularity**:
    *   Nodes can be highly specialized (e.g., a node that only calls one specific tool) or more general (like the existing agent node that can decide among many actions including multiple tools or providing a final answer).

## Example Custom Graph Configurations

### 1. Graph with Mandatory Critique Step

*   **Goal**: Ensure a `CritiqueTool` reviews answers from the main agent before they are presented to the user. The critique can accept the answer or send it back to the main agent for revision.
*   **Conceptual Flow**:
    `MAIN_AGENT` -> (optional `TOOL_EXECUTOR` -> `MAIN_AGENT`) -> `CRITIQUE_TOOL` (if main agent gives final answer) -> `FINAL_ANSWER` (if critique accepts) OR back to `MAIN_AGENT` (if critique rejects).
*   **Key `GraphConfig` Elements**:
    *   **Nodes**: `MAIN_AGENT` (type: `agent`), `CRITIQUE_TOOL` (new type: `critiqueTool`), `TOOL_EXECUTOR` (type: `toolExecutor`), `FINAL_ANSWER` (type: `final`).
    *   **Edges & Conditions**:
        *   `MAIN_AGENT` -> `conditionType: 'routeMainAgentOutput'`
            *   `targetMap`: `{'tool_executor': 'TOOL_EXECUTOR', 'critique_tool': 'CRITIQUE_TOOL'}`
        *   `TOOL_EXECUTOR` -> `conditionType: 'alwaysAgent'`
            *   `targetMap`: `{'agent': 'MAIN_AGENT'}`
        *   `CRITIQUE_TOOL` -> `conditionType: 'routeCritiqueDecision'`
            *   `targetMap`: `{'final_answer': 'FINAL_ANSWER', 'rework_answer': 'MAIN_AGENT'}`
*   **New Implementations Required**:
    *   Node factory for `critiqueTool` (e.g., `createCritiqueToolNode`).
    *   Condition factory for `routeMainAgentOutput`.
    *   Condition factory for `routeCritiqueDecision`.

### 2. Intent-Based Routing to Specialized Agents

*   **Goal**: Route user queries to different specialized agents (e.g., for general Q&A vs. code-related questions) based on detected intent.
*   **Conceptual Flow**:
    `ROUTER_AGENT` (determines intent) -> `GENERAL_AGENT` OR `CODE_AGENT`. Each specialized agent then follows its own logic (possibly including tool use) before reaching a `FINAL_ANSWER`.
*   **Key `GraphConfig` Elements**:
    *   **Nodes**: `ROUTER_AGENT` (new type: `routerAgent`), `GENERAL_AGENT` (type: `agent`), `CODE_AGENT` (new type: `codeAgent`), `TOOL_EXECUTOR` (type: `toolExecutor`), `FINAL_ANSWER` (type: `final`).
    *   **Edges & Conditions**:
        *   `ROUTER_AGENT` -> `conditionType: 'routeByIntent'`
            *   `targetMap`: `{'general_query': 'GENERAL_AGENT', 'code_query': 'CODE_AGENT'}`
        *   `GENERAL_AGENT` -> `conditionType: 'routeOrPrepareToolExecutor'` (standard agent behavior)
            *   `targetMap`: `{'tool_executor': 'TOOL_EXECUTOR', 'final': 'FINAL_ANSWER', 'agent': 'GENERAL_AGENT'}`
        *   `CODE_AGENT` -> `conditionType: 'routeOrPrepareToolExecutor'` (standard agent behavior)
            *   `targetMap`: `{'tool_executor': 'TOOL_EXECUTOR', 'final': 'FINAL_ANSWER', 'agent': 'CODE_AGENT'}`
        *   `TOOL_EXECUTOR` -> `conditionType: 'routeToolResultToOriginAgent'` (more complex, needs state to track caller)
            *   `targetMap`: `{'GENERAL_AGENT': 'GENERAL_AGENT', 'CODE_AGENT': 'CODE_AGENT'}`
*   **New Implementations Required**:
    *   Node factories for `routerAgent` and `codeAgent`.
    *   Condition factory for `routeByIntent`.
    *   Condition factory for `routeToolResultToOriginAgent` (requires careful state management for the tool executor to know where to return results). Alternatively, dedicated tool executors per specialized agent could be considered.

### 3. Sequential Multi-Tool Execution

*   **Goal**: For a specific task, ensure a predefined sequence of tools are called (e.g., Tool A, then Tool B) before an agent processes the combined results.
*   **Conceptual Flow**:
    `INITIAL_AGENT` (decides to start sequence) -> `RUN_TOOL_A_NODE` -> `RUN_TOOL_B_NODE` -> `PROCESSING_AGENT` -> `FINAL_ANSWER`.
*   **Key `GraphConfig` Elements**:
    *   **Nodes**: `INITIAL_AGENT` (type: `agent`), `RUN_TOOL_A_NODE` (new type: `toolRunnerAgent` or specialized agent), `RUN_TOOL_B_NODE` (new type: `toolRunnerAgent`), `PROCESSING_AGENT` (type: `agent`), `TOOL_EXECUTOR` (type: `toolExecutor`), `FINAL_ANSWER` (type: `final`).
    *   The `toolRunnerAgent` nodes might have internal configuration (e.g., `{ toolName: 'toolA', nextNodeAfterToolResult: 'RUN_TOOL_B_NODE' }`).
    *   **Edges & Conditions**:
        *   `INITIAL_AGENT` -> `conditionType: 'decideToStartSequence'`
            *   `targetMap`: `{'start_tool_sequence': 'RUN_TOOL_A_NODE', ...}`
        *   Edges from `RUN_TOOL_A_NODE` and `RUN_TOOL_B_NODE` would use conditions that first route to `TOOL_EXECUTOR` to run their respective tools, and then, upon receiving the result (again routed via `TOOL_EXECUTOR`), would route to the next step in the sequence (`RUN_TOOL_B_NODE` or `PROCESSING_AGENT`). This requires sophisticated condition logic or more stateful `toolRunnerAgent` nodes.
        *   `PROCESSING_AGENT` -> (standard agent edges)
        *   `TOOL_EXECUTOR` -> (condition needs to route back to the correct `toolRunnerAgent` or `PROCESSING_AGENT` based on which tool's result it is).
*   **New Implementations Required**:
    *   Potentially a new `toolRunnerAgent` node type whose `invoke` method prepares a specific tool call and whose subsequent routing (after the tool result is returned to it) is driven by its configuration.
    *   More complex condition logic (e.g., `routeAfterSequentialTool`) for the shared `TOOL_EXECUTOR` to correctly route results back to the appropriate point in the sequence.

## General Considerations

*   **State Management (`AgentState`)**: As graphs become more complex, careful design of what information is stored in `AgentState` is crucial. This state is the primary way nodes and conditions communicate and make decisions.
*   **Error Handling**: Consider how errors in custom nodes or during complex sequences should be handled. Should they route to a specific error-handling node? Should they attempt retries? This can also be built into the graph logic.
*   **Configuration Validation**: As the number of possible node types and condition types grows, adding validation to `createAgentGraphFromConfig` to check for structural correctness and valid type names in a given `GraphConfig` will be beneficial.
*   **Debugging and Logging**: Enhanced logging within custom nodes and conditions will be essential for debugging complex graph flows. The `console.log` messages in `ConfigurableGraph.ts` are a good start.

This document provides a roadmap for evolving the agent's capabilities through configurable graph structures. 