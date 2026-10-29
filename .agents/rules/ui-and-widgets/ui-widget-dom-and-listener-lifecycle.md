---
name: devtools/ui-and-widgets/ui-widget-dom-and-listener-lifecycle
rubric: correctness
severity: blocking
---

**Rule.** Attach listeners to external models and managers in wasShown and detach them symmetrically in willHide
- **Look for**: `addEventListener`, `addModelListener`, or `addChangeListener` on singletons, models, or settings inside `UI.Widget` constructors or `wasShown()` without a matching `remove*` call in `willHide()` using the same function reference, scheduled or asynchronous `performUpdate()` methods on `SDKModelObserver` widgets that access or re-register a model without checking that `this.#model` is still active after `modelRemoved()` has run, or calling `removeChildren()` on a DOM or `TreeOutline` container that hosts imperatively mounted `UI.Widget` children without first detaching them (`this.detachChildWidgets()` or `UI.Widget.Widget.get(el)?.detach()`).
- **Do not flag**: Listeners attached to the widget's own internal DOM elements (`this.contentElement`), which are garbage-collected together with the widget. Model or target listeners on background recording/overview widgets (such as `NetworkOverview`) that must continuously record events while the widget is hidden or collapsed (especially when rendering is already gated on `this.isShowing()`), or pre-existing constructor listeners untouched by a DOM-to-Lit view migration.

**Why.** Subscribing to long-lived SDK `TargetManager`, `Settings`, or model events in a widget's constructor without unsubscribing in `willHide()` (or `onDetach()` / `onunbind()`) causes hidden panels to process background updates and leaks detached widget instances.

## Examples

Bad:

```ts
constructor() {
  super();
  SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this.#onUpdate, this);
}
```

Good:

```ts
override wasShown(): void {
  super.wasShown();
  SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this.#onUpdate, this);
}
override willHide(): void {
  super.willHide();
  SDK.TargetManager.TargetManager.instance().removeModelListener(
      SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated, this.#onUpdate, this);
}
```
