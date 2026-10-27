---
name: devtools/ui-and-widgets/ui-view-output-and-callback-contracts
rubric: design
severity: should_fix
---

**Rule.** Encapsulate imperative DOM actions in ViewOutput callbacks and pass user actions via semantic ViewInput callbacks instead of raw DOM references
- **Look for**: `ViewOutput` interfaces containing `HTMLElement` or `Element` properties, or `ViewInput` callbacks typed as `(event: Event) => void` instead of semantic domain values.
- **Do not flag**: Third-party editor hosts, `<canvas>` (`HTMLCanvasElement`) and canvas sizing/resizer containers, or elements returned by existing public cross-widget APIs (such as `UI.ListDelegate.createElementForItem` or `ConsolePrompt.belowEditorElement`).

**Why.** Exposing raw `HTMLElement` references on `ViewOutput` or passing raw `MouseEvent`/`KeyboardEvent` objects to presenter callbacks leaks DOM details into presenters. Views should populate narrow functional closures on `ViewOutput` (e.g. `output.focusInput = () => ...`) and unpack event values before calling `input.onSelect(value)`.

## Examples

Bad:

```ts
export interface ViewOutput {
  inputElement?: HTMLInputElement;
}
export interface ViewInput {
  onInputChange: (event: Event) => void;
}
```

Good:

```ts
export interface ViewOutput {
  focusInput?: () => void;
}
export interface ViewInput {
  onFilterChanged: (newFilterText: string) => void;
}
```
