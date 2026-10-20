---
name: devtools/models-and-core/core-ai-agent-context-and-prompt-discipline
rubric: design
severity: should_fix
---

**Rule.** Keep AI agent prompts, tool schemas, and data formatters deterministic, token-efficient, and decoupled from UI and locale state
- **Look for**: Localized `i18nString` calls or verbose boilerplate prose inside AI data formatters, unsorted flag/property lists in prompt serializers, AI tools missing permission policy declarations, or monolithic trace models passed to response widgets.
- **Do not flag**: User-facing UI labels rendered in the AI assistance panel chrome rather than sent to the LLM.

**Why.** AI agent data formatters (`models/ai_assistance/data_formatters/`) must produce deterministic, unlocalized, concise text representations decoupled from UI widgets and trace insight models, while tools must declare explicit permission policies and flatten verbose CDP types.

## Examples

Bad:

```ts
export function formatInsightForPrompt(insight: Insight): string {
  return `Here is a detailed explanation: ${i18nString(UIStrings.localizedSummary)}`;
}
```

Good:

```ts
export function formatInsightForPrompt(insight: Insight): string {
  return `metric=${insight.metricValue}ms, savings=${insight.estimatedSavings}ms`;
}
```
