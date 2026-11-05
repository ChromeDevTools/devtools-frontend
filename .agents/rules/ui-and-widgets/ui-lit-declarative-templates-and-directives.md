---
name: devtools/ui-and-widgets/ui-lit-declarative-templates-and-directives
rubric: design
severity: should_fix
---

**Rule.** Use Lit.nothing, repeat with keys, classMap/styleMap, ?hidden, autofocus, and ifDefined in single-pass declarative templates instead of imperative DOM mutations
- **Look for**: Ternary branches returning `''` or `undefined` in `html` templates instead of `Lit.nothing`, unkeyed `.map()` on dynamic stateful lists instead of `repeat()`, `ifDefined` omissions on optional attributes, multiple `Lit.render()` calls mutating the same container, `Lit.*` namespace calls instead of direct `{Directives, html, nothing, render}` imports from `ui/lit/lit.js`, `useShadowDom: true` in new or migrated `UI.Widget` constructors instead of `useShadowDom: 'pure'` (which makes `this.contentElement` the `ShadowRoot` directly without an extra inner `<div class="widget">` wrapper), `super(..., {classes: [...]})` / `super(..., {jslog: ...})` in `UI.Widget` constructors instead of passing `{container: {classes: [...], attributes: {jslog: ...}}}` as the third argument to every `render(template, target, {container: {classes: [...]}})` branch in the view function (with `useShadowDom: 'pure'` when shadow DOM is used), imperative `element.classList.add(...)`, `element.setAttribute(...)`, or `UI.ARIAUtils.*(element)` calls on a container element (`this.contentElement`, `this.element`, or a detached `HTMLDivElement`) that is rendered via `render(template, element)` instead of passing `{container: {classes: [...], attributes: {...}}}` as the third argument to `render(...)`, combining a `.hidden` CSS class (`class="... hidden"`, `classMap({hidden: ...})`, or `classList.toggle('hidden', ...)`) with the HTML `?hidden` attribute, or toggling `.hidden` via `classMap` when `?hidden=${...}` suffices (prefer `?hidden=${...}` exclusively; `inspectorCommon.css` already provides `[hidden] { display: none !important; }`), overriding `focus(): void` on a `UI.Widget`, calling `this.setDefaultFocusedElement(...)` or `this.setDefaultFocusedChild(...)` imperatively, or plumbing a `ref(...)` focus callback through `ViewOutput` merely to focus a default child element or widget when declarative `autofocus` or `?autofocus=${...}` in `DEFAULT_VIEW` suffices (`UI.Widget.prototype.focus()` natively queries `[autofocus]` via `getDefaultFocusedElement()`; ensure at most one element has `autofocus` in any render state), or `@SomeEvent` on `<devtools-widget>` when the child class does not use `eventMixin` on `UI.Widget` (no `dispatchDOMEvent`), when the listener is placed on an ancestor element (the `CustomEvent` does not bubble), or when the handler reads `event.data` instead of `event.detail`.
- **Do not flag**: Static arrays of primitive labels where item identity never reorders. Omitting Lit's `live()` directive on `<devtools-checkbox>` (`UI.UIUtils.CheckboxLabel`) `.checked` bindings (`live()` breaks `CheckboxLabel`'s host `checked` attribute synchronization when toggled externally), listening to `ObjectWrapper` events via Lit `@SomeEvent=${handler}` bindings on a `<devtools-widget>` whose class uses `Common.ObjectWrapper.eventMixin` on `UI.Widget` (`eventMixin` dispatches `new CustomEvent(type, {detail: data})` on `widget.element`, and Lit preserves the case of `@SomeEvent` from the template string), interpolating boolean values directly inside Lit text/`<td>` positions (Lit renders booleans as `'true'`/`'false'`), `override focus()` methods that perform dynamic focus restoration beyond focusing a single `[autofocus]` target (such as restoring text editor selection/coordinates or delegating to legacy sub-views), or newlines and indentation spaces between expressions and child elements in multi-line `html` templates (DevTools' custom `html` tag in `front_end/ui/lit/strip-whitespace.ts` strips `\n\s*` outside of `<...>` tags at runtime, so multi-line formatting does not introduce whitespace text nodes).

**Why.** Mutating DOM elements via `appendChild`, `classList.toggle`, or `innerHTML` alongside Lit templates, returning `''`/`null` instead of `Lit.nothing` in conditional branches, or combining `.hidden` classes with `?hidden` attributes corrupts part tracking and creates redundant style rules. Using declarative `autofocus` leverages `UI.Widget`'s built-in focus delegation without imperative wiring or manual `ref` plumbing through `ViewOutput`.

## Examples

Bad:

```ts
// String-interpolated classes, empty string ternary fallback, .hidden class + ?hidden, and ref focus plumbing
html`
  <div class="item ${isActive ? 'active' : ''} ${classMap({hidden: !isVisible})}" ?hidden=${!isVisible} title=${maybeTitle || ''}>
    ${showIcon ? html`<devtools-icon name="info"></devtools-icon>` : ''}
    <button ${ref(el => { if (el) output.focus = () => el.focus(); })}>Click</button>
  </div>
`
```

Good:

```ts
// Using classMap, ifDefined, nothing sentinel, ?hidden attribute exclusively, and autofocus
html`
  <div class=${classMap({item: true, active: isActive})} ?hidden=${!isVisible} title=${ifDefined(maybeTitle)}>
    ${showIcon ? html`<devtools-icon name="info"></devtools-icon>` : nothing}
    <button autofocus>Click</button>
  </div>
`
```
