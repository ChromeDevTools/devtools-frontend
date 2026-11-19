---
name: devtools/ui-and-widgets/ui-lit-declarative-templates-and-directives
rubric: design
severity: should_fix
---

**Rule.** Use nothing, repeat with keys, classMap/styleMap, ?hidden, autofocus, and ifDefined in single-pass declarative templates instead of imperative DOM mutations
- **Look for**: Ternary branches returning `''` or `undefined` in `html` templates instead of `nothing`, unkeyed `.map()` on dynamic stateful lists instead of `repeat()`, keying `repeat()` by array index on `<devtools-data-grid>` rows containing `${widget(...)}` cells (key by item identity instead), `ifDefined` omissions on optional attributes or `Directives.ifDefined(val)` namespace access instead of bare `ifDefined(val)` (`const {ifDefined} = Directives;` is required by `lit-analyzer`), string-interpolated `style="width: ${x}px"` instead of `style=${Directives.styleMap({...})}`, multiple `render()` calls mutating the same container, rendering into a `DocumentFragment` and reparenting `fragment.firstElementChild` while continuing to re-render `fragment`, new `Lit.*` namespace imports in newly migrated views instead of direct `{Directives, html, nothing, render}` imports from `ui/lit/lit.js`, attaching `textContent`-mutating `ref()` helpers (`setTextContentTruncatedIfNeeded`, `highlightRangesWithStyleClass`) to an element that also contains `${...}` `ChildPart` expressions (crashes `ChildPart._clear` with `nextSibling` null; isolate on an empty leaf `<span ${ref(...)}></span>`), `<devtools-button>` placing `.variant=${Buttons.Button.Variant.ICON}` (or `TOOLBAR` / `PRIMARY_TOOLBAR`) *before* `.iconName=${...}` (`set variant` immediately calls `#render()` and throws `Icon button requires an icon`), passing unbound prototype methods to `@event=${...}` (`ui/lit/render.ts` passes no `host`), imperative `element.classList.add(...)`, `element.setAttribute(...)`, or `UI.ARIAUtils.*(element)` calls on a container element (`this.contentElement`, `this.element`, or a detached `HTMLDivElement`) that is rendered via `render(template, element)` instead of passing `{container: {classes: [...], attributes: {...}}}` as the third argument to `render(...)`, combining a `.hidden` CSS class (`class="... hidden"`, `classMap({hidden: ...})`, or `classList.toggle('hidden', ...)`) with the HTML `?hidden` attribute, or toggling `.hidden` via `classMap` when `?hidden=${...}` suffices (prefer `?hidden=${...}` exclusively; `inspectorCommon.css` already provides `[hidden] { display: none !important; }`), overriding `focus(): void` on a `UI.Widget`, calling `this.setDefaultFocusedElement(...)` or `this.setDefaultFocusedChild(...)` imperatively, mutating `element.autofocus` / `setAttribute('autofocus', ...)` / `toggleAttribute('autofocus', ...)` imperatively in TypeScript or `ref(...)` callbacks, or plumbing a `ref(...)` focus callback through `ViewOutput` merely to focus a default child element or widget when declarative `autofocus` or `?autofocus=${...}` in `DEFAULT_VIEW` suffices (`UI.Widget.prototype.focus()` natively queries `[autofocus]` via `getDefaultFocusedElement()`; ensure at most one element has `autofocus` in any render state).
- **Do not flag**: Static arrays of primitive labels where item identity never reorders. Pre-existing `import * as Lit` (`Lit.render`, `Lit.nothing`, `Lit.LitTemplate`) in files not migrating imports. Inline `.bind(this)` or arrow functions in `@event=${...}` bindings (Lit's `EventPart` swaps the stored callback without re-registering DOM listeners). Omitting Lit's `live()` directive on `<devtools-checkbox>` (`UI.UIUtils.CheckboxLabel`) `.checked` bindings (`live()` breaks `CheckboxLabel`'s host `checked` attribute synchronization when toggled externally), interpolating boolean values directly inside Lit text/`<td>` positions (Lit renders booleans as `'true'`/`'false'`), `override focus()` methods that perform dynamic focus restoration beyond focusing a single `[autofocus]` target (such as restoring text editor selection/coordinates or delegating to legacy sub-views), or newlines and indentation spaces between expressions and child elements in multi-line `html` templates (DevTools' custom `html` tag in `front_end/ui/lit/strip-whitespace.ts` strips `\n\s*` outside of `<...>` tags at runtime, so multi-line formatting does not introduce whitespace text nodes).

**Why.** Mutating DOM elements via `appendChild`, `classList.toggle`, `textContent`, or `innerHTML` alongside Lit templates, reparenting nodes out of a `DocumentFragment` managed by `render()`, ordering `.variant` before `.iconName` on `<devtools-button>`, returning `''`/`null` instead of `nothing` in conditional branches, or combining `.hidden` classes with `?hidden` attributes corrupts part tracking, throws at runtime, or creates redundant style rules. Using declarative `autofocus` leverages `UI.Widget`'s built-in focus delegation without imperative wiring or manual `ref` plumbing through `ViewOutput`.

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
