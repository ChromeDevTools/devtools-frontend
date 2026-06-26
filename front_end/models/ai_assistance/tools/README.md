# AI Assistant Tools Architecture

This directory defines the **Tools** used by `AiAgent2` and other AI agents to execute code, read page state, or apply mutations to the inspected page.

## Core Concepts

The architecture relies on three primary concepts to guarantee 100% compile-time type safety for tools:
1. **BaseTool**: An interface capturing non-generic tool metadata (e.g. `name`, `description`, `parameters`). This allows the agent and DevTools UI to generically store, register, and describe functions to the AIDA client without needing to know their specific types at runtime.
2. **Capability Interfaces**: Narrow TypeScript interfaces wrapping individual DevTools dependencies (e.g., ChangeManager, executeJsCode). This decouples tools from monolithic agent environments, making them reusable and easier to unit test.
3. **Tool**: A generic TypeScript interface (`Tool<Args, ReturnType, ContextType>`) binding the execution handler to specific capability requirements. This enforces compile-time safety, ensuring that a tool handler is only invoked by an agent that fulfills all the required capabilities.

## Capability Interfaces

Instead of passing a monolithic "grab-bag" context object to all tool handlers, DevTools AI tools declare exactly the capabilities they require. Available capability interfaces defined in `Tool.ts` include:

- `BaseToolCapability`: Base interface providing access to the top-level conversation context step.
- `PageExecutionCapability`: For tools executing JavaScript code on the inspected page.
- `StyleMutationCapability`: For tools managing and applying style mutations via a `ChangeManager`.
- `TargetCapability`: For tools requiring access to the page's current SDK `Target`.
- `OriginLockCapability`: For tools enforcing cross-origin security via origin locks. Tools that fetch resources or state from the inspected page (such as styling or source code) must use this capability to verify that the target resource matches the conversation's established origin. This prevents the LLM from executing tools against out-of-origin elements or documents.

### Unified Context

The Agent (e.g., `AiAgent2`) builds the complete dependency union (`AllToolsCapabilities`) and fulfills all capabilities. When the handler is invoked, TypeScript validates that the provided context matches the intersection of capabilities requested by that tool.

## Authoring a New Tool

To author a new tool:

1. **Define the Args interface**: Extend `ToolArgs` to represent the JSON parameter schema expected by the LLM.
2. **Declare Capability Dependencies**: Determine which capabilities your tool handler needs. Intersect them to define the tool's `ContextType`.
3. **Implement the `Tool` interface**: Pass the args interface, return type, and intersected ContextType to the generic parameters of `Tool`.
4. **Instantiate in `ToolRegistry.ts`**: Add the instantiated tool class to the static `TOOLS` registry.

See concrete, production examples of capability-based tools in this directory:
- [ExecuteJavaScript.ts](ExecuteJavaScript.ts): Demonstrates use of `PageExecutionCapability` and `StyleMutationCapability`.
- [GetStyles.ts](GetStyles.ts): Demonstrates use of `TargetCapability` and `OriginLockCapability`.

## ToolRegistry Lookup

To retrieve a tool from the registry with 100% type safety, call `ToolRegistry.get()` with the literal `ToolName` key:

```typescript
const getStylesTool = ToolRegistry.get(ToolName.GET_STYLES); // Returns GetStylesTool class type
```
