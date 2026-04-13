# AI Agents

This directory contains the implementations of various AI agents used in the AI Assistance panel in Chrome DevTools.

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

#### `getMainThreadTrackSummary`
- **Arguments**: `min` (integer, optional), `max` (integer, optional)
- **Data Returned to Agent**: A comprehensive text summary of main thread activity *within the specified bounds*.
  - **Note**: This differs from the initial "Main Thread Activity Data" fact as it is scoped to the provided time range and includes significantly more data: a **top-down tree**, a **bottom-up tree**, a **third-parties summary**, and a list of **related insights** for events in that range.

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
