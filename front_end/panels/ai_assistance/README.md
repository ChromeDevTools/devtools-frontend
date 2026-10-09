# AI Walkthrough: Data and UI Structure

This document outlines the structure of the data and UI for the AI Walkthrough feature in DevTools.

## UI Layers

The UI is composed of several nested components, each with a specific responsibility.

### 1. `AiAssistancePanel`

This is the top-level UI component for the entire AI Assistance feature. It acts as the main container and controller.

-   **Manages State:** It holds the state of the conversation, including the history of messages.
-   **Renders Child Views:** It determines which of the main views to render: the `ChatView` for an active conversation, an `ExploreWidget` for discovering features, or a `DisabledWidget` if the feature is not enabled.
-   **Orchestrates Walkthrough:** It manages the state of the `WalkthroughView`, including whether it is visible, whether it is rendered inline or in a sidebar, and which model message's steps are being displayed.

### 2. `ChatView`

This component is responsible for displaying the entire chat interface.

-   **Renders Messages:** It takes the list of messages from the `AiAssistancePanel` and renders a `ChatMessage` component for each one.
-   **Hosts Input:** It contains the `ChatInput` component where the user types their queries.

### 3. `ChatMessage`

This component displays a single message in the conversation, which can be either from the user or from the AI model.

-   **User Message:** Renders the user's text query.
-   **Model Message:** Renders the multi-part response from the model, which includes the thinking process (steps) and the final answer. It also contains the "Show thinking" button that triggers the `WalkthroughView`.

### 4. `WalkthroughView`

This component is dedicated to displaying the "Investigation steps" or the "thinking process" of the AI model for a given response.

-   **Displays Steps:** It receives the list of `Step` objects from a `ModelChatMessage` and renders them in a readable format.
-   **Flexible Rendering:** It can be displayed either as a separate sidebar view (managed by `AiAssistancePanel`) or inline within a `ChatMessage` component, depending on the available screen width.

## Data Structure

The conversation is built upon a clear data model that distinguishes between user input and the model's complex output.

### The Message Model

A conversation is an array of `Message` objects. There are two types of messages:

-   **`UserChatMessage`**: Represents a query from the user. It has a simple structure:
    -   `entity`: Always `ChatMessageEntity.USER`.
    -   `text`: The user's query as a string.

-   **`ModelChatMessage`**: Represents a response from the AI model. It has a more complex structure to accommodate the walkthrough feature:
    -   `entity`: Always `ChatMessageEntity.MODEL`.
    -   `parts`: An array of `ModelMessagePart` objects.

### User and Model Message Relationship

In a typical conversation flow, there is a one-to-one relationship between a `UserChatMessage` and the subsequent `ModelChatMessage`. The user asks a question, and the model provides a response that contains its reasoning and final answer.

### `ModelChatMessage` Structure: Steps and Answer

The key to the walkthrough feature lies in the `parts` array of a `ModelChatMessage`. A `ModelMessagePart` is one of three types:

1.  **`StepPart`**: Represents a single step in the model's reasoning process, usually one tool call. It contains a `step` object with details like:
    -   `state`: The step's state. See [Step states](#step-states).
    -   `title`: The title of the step (e.g., "Analyzing CSS").
    -   `thought`: A textual description of what the model is thinking.
    -   `code`: The text shown in the step's code box. For tools that run code, this is the code. For other tools, it is a readable form of the call.
    -   `output`: The tool's result.

2.  **`AnswerPart`**: Represents text from the model.
    -   `text`: The markdown-formatted text of the answer.

3.  **`WidgetPart`**: Represents widgets attached to an answer. See [AI-Defined UI Widgets](#ai-defined-ui-widgets).

Parts appear in the order the panel receives them, so steps and answers can interleave. For example, the model can reply with some text and a tool call, and then with more text after the tool returns. This gives `[answer, step, answer]`. A text-only reply gives a single `AnswerPart`.

## From response events to steps

`AiAssistancePanel#consumeResponseStream()` turns the stream of response events from the agent into chat messages. The `ResponseType` JSDoc in `front_end/models/ai_assistance/agents/AiAgent.ts` documents which events the agent yields and in what order. This section covers what the panel does with them.

### The current step

The event handlers share one mutable variable, `step`. Each handler writes into `step`, then calls `commitStep()`. `commitStep()` appends `step` to the message's `parts`, unless `step` is already the last part.

-   `QUERYING` (one per model request) sets `step` to a fresh step. The panel only commits this step if it is the first part of the message, so that a spinner shows while the first request runs. Otherwise, the step stays hidden until a tool call fills it in.
-   `TITLE`, `THOUGHT`, `SIDE_EFFECT` and `ACTION` first set `step = stepForCall(data.callId)`, then write into `step`.
-   `ANSWER` adds or updates an `AnswerPart`.

### `stepForCall()`

Every event for one tool call carries the same `callId`. `stepForCall(callId)` returns the step for that call:

| Case | What happens | Why |
| :--- | :--- | :--- |
| `callId` is `undefined` | Returns `step` unchanged. | Conversations saved before `callId` existed have no `callId`. Their events keep updating the current step, so they render as before. |
| `callId` is known | Returns that call's step. | All events for one call go to one step. |
| `callId` is new | If `step` already belongs to another call, creates a fresh step; otherwise uses `step`. Records `callId` → that step and returns it. | The first call after `QUERYING` takes over the step that `QUERYING` created, so the spinner turns into that call's step. A further call in the same model response gets its own step. |

### Example: two tool calls in one model response

| Event | `step` before | Result | `parts` after |
| :--- | :--- | :--- | :--- |
| `QUERYING` | — | `step = S0`. S0 is committed because it is the first part. | `[S0]` |
| `TITLE {callId: a}` | S0, not owned | New `a`. S0 is not owned, so `a` → S0. | `[S0]` |
| `THOUGHT {callId: a}` | S0 | Known `a`, so `step = S0`. | `[S0]` |
| `ACTION {callId: a}` | S0 | Known `a`, so `step = S0`. | `[S0]` |
| `TITLE {callId: b}` | S0, owned by `a` | New `b`. S0 is owned, so `step = S1` and `b` → S1. | `[S0, S1]` |
| `ACTION {callId: b}` | S1 | Known `b`, so `step = S1`. | `[S0, S1]` |
| `QUERYING` | S1 | `step = S2`. S2 is not committed because `parts` is not empty. | `[S0, S1]` |
| `ANSWER` | S2 | Appends an `AnswerPart`. | `[S0, S1, answer]` |

`commitStep()` only checks the last part. This relies on all events for one call arriving before the events for the next call, which holds because the agent runs tool calls one at a time.

## Step states

Each `Step` has a `state` (`StepState` in `components/ChatMessage.ts`):

| State | Set when | Badge |
| :--- | :--- | :--- |
| `in_progress` | `QUERYING` creates the step. | A spinner if the step is the last step. Otherwise, a checkmark. |
| `needs_approval` | A `SIDE_EFFECT` event asks the user to approve a tool call. The state holds the approval dialog. | A pause icon, with the approval prompt in the step. Only the last step can be in this state. |
| `canceled` | An `ACTION` with `canceled: true` arrives because the user denied the tool call, or the user aborts the run while this is the last step. | A cross. |
| `completed` | A `CONTEXT`, `THOUGHT`, `ACTION`, `CONTEXT_CHANGE` or `ANSWER` event arrives, or the user answers the approval prompt. | A checkmark. |

A `THOUGHT` marks the step as completed before the tool runs, so the badge shows a checkmark while the tool is still running. If the run fails with an error other than an abort while the last step is still `in_progress`, the panel removes that step.

Separately, the conversation-level `isLoading` flag is `true` from when the user submits a query until the agent finishes. While it is `true`, the walkthrough toggle button in the last `ChatMessage` shows a spinner. This spinner gives continuous feedback that the agent is working, even when every step already shows a checkmark.

## AI-Defined UI Widgets

To provide a richer user experience, AI functions can now return data that represents UI widgets. These widgets are then rendered directly within the AI assistance panel, allowing for more interactive and contextual responses.

### Data Structure for Widgets

This is achieved through a new type of `ModelMessagePart`: the `WidgetPart`.

-   **`WidgetPart`**: Represents a UI widget to be rendered. It contains a `widget` object with the following properties:
    -   `name`: A string identifier for the widget to be rendered (e.g., `'freestyler'`). This name is used by the frontend to select the correct widget component.
    -   `data`: An object containing the data required by the widget. The structure of this data is specific to each widget.

A `ModelChatMessage` can contain one or more `WidgetPart`s, usually as part of the final answer.

**Example `ModelChatMessage` with a `WidgetPart`:**

```json
{
  "entity": "MODEL",
  "parts": [
    {
      "type": "answer",
      "text": "Here is a widget to help you with CSS."
    },
    {
      "type": "widget",
      "widget": {
        "name": "freestyler",
        "data": {
          "css": "color: red;"
        }
      }
    }
  ]
}
```

### From AI Function to UI

The process of rendering an AI-defined UI widget begins within the AI function handler itself. AI functions, typically defined in `front_end/models/ai_assistance/agents/AiAgent.js`, can return an `AiWidget` type as part of their response.

1.  **AI Function Output**: An AI function constructs an `AiWidget` object, specifying its `name` (e.g., `'freestyler'` or `'COMPUTED_STYLES'`) and a `data` payload that contains all the necessary information for the widget to render.

2.  **`ModelChatMessage` Integration**: This `AiWidget` is then encapsulated within a `WidgetPart`, which is added to the `parts` array of a `ModelChatMessage`. This `ModelChatMessage` is what the `ChatMessage` UI component receives.

3.  **`ChatMessage` Processing**: In `front_end/panels/ai_assistance/components/ChatMessage.ts`, the `ChatMessage` component is responsible for iterating through the `parts` of a `ModelChatMessage`. When it encounters a `WidgetPart`, it delegates the rendering to the `renderStepWidgets` function.

4.  **`renderStepWidgets` Mapping**: The `renderStepWidgets` function acts as a registry and renderer for different widget types. It reads the `widget.name` from the `WidgetPart` and, based on this name, calls a specific `make...Widget` function (e.g., `makeComputedStyleWidget` for `'COMPUTED_STYLES'` widgets).

5.  **Widget Instantiation and Rendering**: Each `make...Widget` function is responsible for taking the `widget.data` and converting it into a `UI.Widget.widgetConfig` object. This configuration is then used with the `<devtools-widget>` Lit component, which dynamically instantiates the corresponding `UI.Widget` subclass and renders it into the DOM.

This modular approach ensures that new UI widgets can be introduced and managed by AI functions without requiring significant changes to the core messaging or rendering infrastructure.

The `ChatMessage` component is responsible for handling `WidgetPart`s. When it encounters a `WidgetPart`, it will:

1.  Look up the widget name (`widget.name`) in a registry of available widget components.
2.  Instantiate the corresponding widget component.
3.  Pass the `widget.data` to the component as properties.

This allows for a flexible system where new widgets can be added to the frontend and then invoked by the AI without requiring changes to the core message handling logic.
