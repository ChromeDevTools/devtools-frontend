# AI in DevTools

## High level architecture

When the user interacts with AI via the AI Assistance Panel, they are having a _conversation_ with an agent.

### Contexts

Each agent has a _context_ defined, which represents the selected data that forms the context of the conversation the user is having with that agent. For example:

- The `PerformanceAgent` has an individual performance trace and a specific focus (an insight, or a call tree) as its context.
- The `StylingAgent` has a DOM Node as its context.

When defining a context, they must extend the `ConversationContext` interface, which defines a few methods which must be implemented, including:

- `getOrigin()`: the origin of the data. This is important as for security concerns if the user swaps to a new context with a different origin, a new conversation must be started to avoid any concerns of sharing data across origins.
- `getIcon()` and `getTitle()` which are used to represent the context in the UI.

When the user begins a conversation with the AI, we want to include information based on the active context to send as part of the prompt. This is done in the agent implementation by overriding the `enhanceQuery()` method, which takes the active context as the second argument. This method can be used to enrich the query with contextual information.

### Formatters

To deal with the work to take an object that is the AI agent's context and turn it into a text representation that can be sent to the AI, we use _formatters_. These are typically classes with `static` methods that can take in objects and return their text representation that we want to pass to the AI.

## Performance specific documentation

### `TimelineUtils.AIContext.AgentFocus`

The context for `PerformanceAgent` is `AgentFocus`, which supports different behavior for different entry-points of the "Ask AI" feature for a trace. The two entry-points now are "insight" and "call-tree". The agent modifies its capabilities based on this focus.

### Adding "Ask AI" to a new Insight

The process for adding "Ask AI" support to a new insight is mostly limited to updating the `PerformanceInsightFormatter` to support the new insight. There are a few methods with `switch` statements that will need updating:

- `#description()`: a succinct description of the insight. Focus on what sort of problems it tries to identify, and help the LLM understand any success or failure criteria. Note that the description is static; it does not alter based on the actual runtime value of the insight.
- `#details()`: this is the method where you inspect the value of the insight and output relevant information about it to describe what the insight identified. Remember that the AI has the ability to look up network requests, so if the insight identified any problematic requests, you should consider including the URLs here. You will see in this method that we determine which insight we have via assertion functions (e.g. `Models.LCPDiscovery.isLCPDiscovery`). You might need to add these to the insight you are working on.
- `#links()`: links to any relevant, external resources. Try to prefer sites we control like `web.dev`. If in doubt, ask barrypollard@ for suggestions.

Once you've done that, you will need to update the UI component to tell it that it can render the "Ask AI" button. To do this, override the `hasAskAiSupport()` method in the component and return `true`.

### Time bounds for insights

The `PerformanceAgent` has the ability to make function calls to be informed about network and main thread activity. When this happens we determine the time bounds that are relevant for the selected insight.

In general, the trace bounds are defined by the insight's overlays. If there are none, we use the insight set's navigation bounds.

See the `insightBounds` function in `InsightAIContext.ts`.


### Testing the new Insight

Once it's working, it's a good idea to manually experiment with the new Insight and ask a bunch of questions on different traces. Try to find (or create) websites that cause the insight to identify a variety of outputs and see how far you can push the AI. Look for instances where you can perhaps clarify the data you are passing into it, or tweak your wording, to try to make it clearer. You can also take the data you are sending and paste it into Gemini to get feedback on your prompt from the AI.

(We are working on a better, more automated way, of evaluating these responses).

## Debugging tips

To test the AI code, you must be running DevTools in a branded Chrome (e.g. official Chrome Canary) and be signed in. You can use the `npm start` with a canary flag in this repository to run against Chromium, or by running Chrome Canary and pointing it to your local DevTools.":

```
npm start -- --browser=canary
```

or

```
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --custom-devtools-frontend=file://$(realpath out/Fast/gen/front_end)
```

### Enable debug logs

To aid debugging, you can enable the AI Assistance logging. This setting is stored into local storage so is persisted. To enable it:

1. Load up your local DevTools in Canary
2. Load the AI Assistance Panel
3. Open DevTools on DevTools.
4. In the console, run `setDebugAiAssistanceEnabled(true)`.

Now, when interacting with the AI and sending requests, you will see output logged to the console. You can use the `debugLog` helper to add your own logging as you are building out your feature.
