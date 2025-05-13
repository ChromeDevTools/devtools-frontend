# Customizing the Base Orchestrator Agent

This document outlines how to customize the `BaseOrchestratorAgent.ts` file, specifically focusing on adding new agent types and their corresponding UI buttons.

## Overview

**What is a Base Orchestrator Agent?**

The Base Orchestrator Agent acts as a central controller within the AI chat panel. It is responsible for managing different specialized AI agent types (like Search, Deep Research, Shopping, etc.). Based on user selection or context, it determines which agent configuration (including system prompts and available tools) should be active, thereby orchestrating the AI's behavior and capabilities for the specific task at hand.

The `BaseOrchestratorAgent.ts` file defines different types of AI agents, their system prompts, available tools, and how they are rendered as selectable buttons in the UI. Customizing this file allows you to introduce new specialized agents tailored to specific tasks.

**What is Graph-Based Workflow?**

The `BaseOrchestratorAgent` (and the agents it invokes) often follows a structured process defined by a workflow graph, such as `defaultAgentGraph` found in `GraphConfigs.ts`. This graph outlines a map of possible steps (like 'Agent Action', 'Tool Execution', 'Final Output') and the allowed paths between them. Using a graph provides explicit control over the execution sequence, ensuring certain steps happen in a specific order, rather than leaving the entire flow up to the LLM. For example, a graph can be designed to always include a final critique step before displaying the answer.

## Adding a New Agent Type

To add a new agent type and its button, you need to modify three main parts of the `BaseOrchestratorAgent.ts` file:

1.  **`BaseOrchestratorAgentType` enum:**
    Add your new agent type to this enum. This provides a typed identifier for your agent.

    ```typescript
    export enum BaseOrchestratorAgentType {
      SEARCH = 'search',
      DEEP_RESEARCH = 'deep-research',
      SHOPPING = 'shopping',
      YOUR_NEW_AGENT_TYPE = 'your-new-agent-type' // Add your new type here
    }
    ```

2.  **`SYSTEM_PROMPTS` constant:**
    Define the system prompt for your new agent. This prompt guides the AI's behavior and responses.

    ```typescript
    export const SYSTEM_PROMPTS = {
      // ... existing prompts ...
      [BaseOrchestratorAgentType.YOUR_NEW_AGENT_TYPE]: \`You are a [description of your new agent]. 
      Your goal is to [explain the agent\'s purpose and how it should behave]. 
      You have access to the following tools: [list tools if specific].\` // Define your prompt here
    };
    ```

3.  **`AGENT_CONFIGS` constant:**
    Add a configuration object for your new agent. This object links the agent type, its UI representation (icon, label, description), system prompt, and the tools it can use.

    ```typescript
    export const AGENT_CONFIGS: {[key: string]: AgentConfig} = {
      // ... existing agent configurations ...
      [BaseOrchestratorAgentType.YOUR_NEW_AGENT_TYPE]: {
        type: BaseOrchestratorAgentType.YOUR_NEW_AGENT_TYPE,
        icon: '🤖', // Choose an appropriate emoji or icon
        label: 'Your New Agent', // Label for the button
        description: 'A brief description of what your new agent does.', // Tooltip for the button
        systemPrompt: SYSTEM_PROMPTS[BaseOrchestratorAgentType.YOUR_NEW_AGENT_TYPE],
        availableTools: [
          // Add instances of tools your agent will use
          // e.g., new NavigateURLTool(), ToolRegistry.getToolInstance('some_tool')
        ]
      }
    };
    ```

## How Buttons are Added

The UI buttons for selecting an agent type are rendered by the `renderAgentTypeButtons` function. This function iterates over the `AGENT_CONFIGS` object. Therefore, by adding a new entry to `AGENT_CONFIGS` as described above, a new button for your custom agent will automatically be created and displayed in the UI.

No further changes are needed to display the button once the `AGENT_CONFIGS` entry is correctly added. The `createAgentTypeSelectionHandler` function will handle the selection logic for the newly added button.

## Available Tools

When defining `availableTools` for your new agent, you can use existing tools imported at the top of the file (e.g., `NavigateURLTool`, `SchemaBasedExtractorTool`) or tools registered in the `ToolRegistry`.

Make sure any tools retrieved via `ToolRegistry.getToolInstance('tool_name')` are properly registered elsewhere in the codebase.

## Default Behavior

If an agent type is requested that doesn't have a specific configuration in `AGENT_CONFIGS`:
*   The `getSystemPrompt` function will return a default system prompt.
*   The `getAgentTools` function will return a default set of tools.

This ensures that the system can gracefully handle unknown agent types, though for a fully functional custom agent, providing a specific configuration is essential.
