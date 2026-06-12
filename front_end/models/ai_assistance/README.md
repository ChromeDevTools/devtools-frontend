# AI in DevTools

## High level architecture

When the user interacts with AI via the AI Assistance Panel, they are having a _conversation_ with an agent.

### Contexts

Each agent has a _context_ defined, which represents the selected data that forms the context of the conversation the user is having with that agent. For example:

- The `PerformanceAgent` has an individual performance trace and a specific focus (an insight, or a call tree) as its context.
- The `StylingAgent` has a DOM Node as its context.

Contexts are defined as subclasses extending the `ConversationContext` abstract class, which defines the following key methods:

- `getOrigin()`: the origin of the data. This is critical for security: if the user switches to a new context with a different origin, the panel forces a new conversation to avoid cross-origin data exposure.
- `getTitle()`: returns the user-facing title of the context.
- `getPromptDetails()`: returns a Markdown formatted description of the context item to be directly included in the LLM prompt.
- `getUserFacingDetails()`: returns structured details (such as request/response headers, timings, etc.) displayed to the user in the UI under the "Analyzing data" accordion.

Encapsulating prompt formatting and UI generation within the context classes simplifies agent implementations and promotes reusability. Contexts are located in the `contexts/` directory.

### Formatters

To deal with the work to take an object that is the AI agent's context and turn it into a text representation that can be sent to the AI, we use _formatters_. These are typically classes with `static` methods that can take in objects and return their text representation that we want to pass to the AI.

## Future Architecture (V2) - WIP

We are migrating the DevTools AI Assistance from a siloed multi-agent architecture to a unified, skill-based single-agent architecture (`AIAgent2`).

In this new architecture:
- A single agent (`AIAgent2`) handles multiple domains.
- Capabilities are defined as **Skills** in Markdown files.
- The agent can dynamically load skills as needed via a `learnSkill` tool.

This work is currently in progress and behind a feature flag.

### Skills Build System

To support dynamic loading of skills, we generate JavaScript files from Markdown files containing skill definitions.
We use a nested `BUILD.gn` file in the `skills/` subdirectory specifically for this purpose. This ensures that GN's `target_gen_dir` points to `gen/front_end/models/ai_assistance/skills/`, placing the generated `.skill.js` files in the same relative structure as their source `.md` files. This allows TypeScript files in the `skills/` directory (like `map.ts`) to import the generated files using relative paths (e.g., `./styling.skill.js`) seamlessly. See the [Skills README](skills/README.md) for full details.

### Tools and ToolRegistry

To support skills requiring execution of code or fetching page state (like computed styles), the architecture defines **Tools** in the `tools/` directory.

- **BaseTool**: A non-generic base interface capturing tool metadata (`name`, `description`, `parameters`). This acts as the type-erased representation for generic registry storage and fallback string lookups.
- **Tool**: A generic interface parameterized by `<Args, ReturnType, ContextType>` that binds parameter argument types and handler execution to strict contracts. `ContextType` defaults to `BaseToolCapability`, ensuring that each tool explicitly requests only the dependencies it requires.
- **Capability Contexts**: Instead of passing a monolithic grab-bag context to all tools, dependencies are broken into narrow capability interfaces (e.g. `PageExecutionCapability`, `StyleMutationCapability`, `TargetCapability`, `OriginLockCapability`). Tools declare their required dependencies by intersecting these interfaces on their generic `ContextType` definition. The caller/Agent fulfills the complete capability context (`AllToolsContext`), guaranteeing 100% compile-time type safety for dependencies without runtime checks.
- **ToolRegistry**: A static registry (`ToolRegistry`) storing instantiated tools. It uses TypeScript function overloading and generic lookups (`static get<K extends keyof typeof TOOLS>(name: K): typeof TOOLS[K]`) to return the precise class type of each tool, preventing type-erasure and escape-hatches (such as `any` or `as unknown` type assertions) at integration points like `AiAgent2.ts`. See the [Tools README](tools/README.md) for authoring instructions.

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
