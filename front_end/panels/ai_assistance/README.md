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

The key to the walkthrough feature lies in the `parts` array of a `ModelChatMessage`. A `ModelMessagePart` can be one of two types:

1.  **`StepPart`**: Represents a single step in the model's reasoning process. It contains a `step` object with details like:
    -   `title`: The title of the step (e.g., "Analyzing CSS").
    -   `thought`: A textual description of what the model is thinking.
    -   `code`: Any code that the model is executing.
    -   `output`: The result of the executed code.

2.  **`AnswerPart`**: Represents the final, conclusive answer from the model.
    -   `text`: The markdown-formatted text of the answer.

A single `ModelChatMessage` will typically have **zero or more `StepPart`s** followed by **one `AnswerPart`**. This structure allows the UI to first show the final answer and provide the option to progressively disclose the "thinking" steps that led to it via the `WalkthroughView`.

## Understanding Step Loading States

There are two distinct `isLoading` properties related to the AI's response generation, serving different purposes:

1.  **`step.isLoading`**: This property resides within a single `Step` object and indicates the immediate parsing status of that specific step from the AI's response stream. It becomes `true` when a new step begins (e.g., "Querying...") and is set to `false` almost immediately once the first piece of meaningful information for that step (like a "thought" or a "code" block) is received. Essentially, it's a short-lived internal parsing state.

2.  **Conversation `isLoading`** (passed down to the `ChatMessage` component): This top-level property reflects the overall state of the entire conversation's response generation process. It is set to `true` as soon as the user submits a query and remains `true` until the AI has completed its entire thought process, including all steps, and has provided the final answer.

The spinner displayed next to a step in the UI is intentionally tied to the **conversation `isLoading`** property, not the individual `step.isLoading`. This design choice provides a better user experience by:

*   **Providing Continuous Feedback**: Using the conversation's `isLoading` ensures a persistent visual indicator that the AI is actively working on the query, even if individual steps are quickly parsed. This prevents the UI from appearing unresponsive.
*   **Avoiding a "Stuck" Feeling**: If the spinner were tied to `step.isLoading`, it would flicker on and off rapidly, potentially making the user feel that the AI has stopped processing or is stuck.
*   **Clear Progress Visualization**: The spinner is dynamically moved to the *last* active step in the list as long as the overall conversation is loading. Once a step is completed, it receives a checkmark, and the spinner moves to the next active step.

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
