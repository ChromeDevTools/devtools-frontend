# AI Agents

This directory contains the implementations of various AI agents used in the AI Assistance panel in Chrome DevTools.

## Agent Lifecycle & State Management

AI Agents can maintain internal stateful variables to optimize performance or store context (e.g., stashed tool results, formatters, or instruction flags). However, this state must be carefully managed to prevent security leaks (such as cross-origin data leaks after page navigation) or stale results.

### Cache Clearing (`clearCache()`)

The `AiAgent` base class defines a `clearCache()` method. This method is automatically invoked by the system when:
- An execution error occurs.
- The user aborts the execution.
- A cross-origin navigation is detected (via the top-level origin blocking mechanism).

#### Overriding `clearCache()` in Subclasses

If you introduce new stateful member variables in an `AiAgent` subclass, you **must** override `clearCache()` to reset them:

1. Always call `super.clearCache()` to ensure base class cleanup is executed.
2. Reset any subclass-specific state (e.g., setting formatters to `null`, clearing lists, resetting boolean flags).

Example from `PerformanceAgent`:
```typescript
  override clearCache(): void {
    super.clearCache();
    this.#functionCallCacheForFocus.clear();
    this.#formatter = null;
    this.#traceFacts = [];
    // ... reset other stateful fields
  }
```

## Performance Agent

The `PerformanceAgent` analyzes performance traces. This documentation details the specific data provided to the agent and the data it can retrieve via functions.

### Initial Data Provided to the Agent

When a conversation starts or the context changes, the agent is provided with a set of "facts" and query enhancements. This data forms the agent's base knowledge about the trace.

#### Trace Facts (Initial Context)

Facts are text-based data summaries injected into the conversation. The agent receives:

- **Data Schema Descriptions**: Text explaining the format of call frame and network data to help the agent interpret subsequent tool outputs.
- **Environment State**: Flags indicating if the trace is a fresh recording or loaded from an external file.
- **Trace Summary Data**: A text summary containing key performance metrics (LCP, INP, CLS) and basic trace metadata.
- **Critical Requests Data**: A text list of the most critical network requests identified in the trace.
- **Main Thread Activity Data**: A bottom-up aggregated summary of where time was spent on the main thread.
- **Longest Tasks Data**: A list of the longest tasks found on the main thread.
- **Third Party Activity Data**: A summary of time spent on third-party scripts.

#### Context Selection (Additional initial context)

The agent receives additional initial context based on the user's context selection. The context can be a Trace, an Insight, or a specific Event:

- **Trace Context**: No additional context is added beyond the base trace facts.
- **Insight Context**: The agent receives the name and key of the specific performance insight selected.
- **Event Context**: The agent receives the serialized details of the specific trace event selected.


### Data Retrieval Functions (Tools)

The agent can request additional data by calling functions. Here is the data the agent receives from each function:

#### `getInsightDetails`
- **Arguments**: `insightSetId` (string), `insightName` (string)
- **Data Returned to Agent**: A detailed text representation of the specific insight (e.g., LCP breakdown components, render-blocking resource URLs).

#### `getEventByKey`
- **Arguments**: `eventKey` (string)
- **Data Returned to Agent**: The full JSON representation of the specific trace event.

#### `getNetworkTrackSummary`
- **Arguments**: `min` (integer, optional), `max` (integer, optional)
- **Data Returned to Agent**: A text summary of network requests and activity within the bounds.

#### `getDetailedCallTree`
- **Arguments**: `eventKey` (string)
- **Data Returned to Agent**: A detailed call tree representation for the specified event.

#### `addElementAnnotation`
- **Arguments**: `elementId` (string), `annotationMessage` (string)
- **Data Returned to Agent**: Confirmation of success or an error message. (Note: This function also modifies the DevTools UI by adding a visual annotation).

#### `addNetworkRequestAnnotation`
- **Arguments**: `eventKey` (string), `annotationMessage` (string)
- **Data Returned to Agent**: Confirmation of success or an error message. (Note: This function also modifies the DevTools UI by adding a visual annotation).

#### `getFunctionCode`
- **Arguments**: `scriptUrl` (string), `line` (integer), `column` (integer)
- **Data Returned to Agent**: The source code lines for the function, annotated with performance cost per line if available.

#### `getResourceContent`
- **Arguments**: `url` (string)
- **Data Returned to Agent**: The full text content of the specified resource (e.g., script file).

#### `selectEventByKey`
- **Arguments**: `eventKey` (string)
- **Data Returned to Agent**: Confirmation of success or an error message. (Note: This function also modifies the DevTools UI by selecting the event in the flamechart).

## Styling Agent

The `StylingAgent` assists with CSS styling and layout questions. It can interact with the page to inspect styles, execute Javascript, and optionally emulate devices or vision deficiencies.

### Initial Data Provided to the Agent

The agent is initialized with the selected DOM node context.

### Data Retrieval & Action Functions (Tools)

The agent can call the following functions to retrieve more details or perform actions:

#### `getStyles`
- **Arguments**: None (it uses the currently selected DOM node).
- **Data Returned to Agent**: Computed styles and authored styles (matching rules, active stylesheets, etc.) for the selected node.

#### `executeJavaScript`
- **Arguments**: `query` (string)
- **Data Returned to Agent**: The result of executing the JavaScript query in the context of the page.

#### `addElementAnnotation`
- **Arguments**: `elementId` (string), `annotationMessage` (string)
- **Data Returned to Agent**: Confirmation of success or an error message. (Note: This function also modifies the DevTools UI by adding a visual annotation to the node).

#### `activateDeviceEmulation`
- **Arguments**: `deviceName` (string), `visionDeficiency` (string, optional)
- **Data Returned to Agent**: Confirmation of success or an error message. (Note: This function modifies the DevTools UI by enabling device and/or vision deficiency emulation).
