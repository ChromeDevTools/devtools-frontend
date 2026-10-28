---
name: review-ui-widgets
description: >-
  Reviews Chrome DevTools frontend changes in path group ui-and-widgets (^front_end/(ui|panels)/.*\.(ts|css)$),
  strictly reflecting review standards, architectural invariants, and security boundaries
  derived from historical code reviews.
---

# Chrome DevTools frontend reviewer skill: ui-and-widgets

This skill provides review guidance for Chrome DevTools frontend changes matching the `ui-and-widgets` path group (^front_end/(ui|panels)/.*\.(ts|css)$). It focuses specifically on code review verification for UI and widget changes, complementing authoring guidance in `ui-widgets` and [`docs/ui_engineering.md`](../../../docs/ui_engineering.md), and integrating with the general review checklist in `code-review`. Every rule below recurred in at least 5 CLs from 2 distinct reviewers in historical reviews; cite the rule id in findings.

## Path group `ui-and-widgets` (17 rules)

### `UI_MODERN_COMPONENT_AND_ENCAPSULATION_STANDARDS`: Use modern DevTools UI primitives (`devtools-button`, `devtools-data-grid`, `devtools-icon`), #private fields, and module entrypoint imports
- **Severity**: WARNING
- **Why**: Legacy `UI.Fragment`, `DataGridImpl`, `LitElement`, `new Icon()`, and TypeScript `private` fields are superseded by standard `<devtools-*>` custom elements (imported via module entrypoints such as `import * as Buttons from '../../ui/components/buttons/buttons.js'` so custom tags register at runtime) and ECMAScript `#private` fields.
- **Look for**: `UI.Fragment.build`, legacy `DataGridImpl`, `extends LitElement`, `private ` keyword instead of `#` in new UI classes, `<devtools-*>` tags in Lit templates without importing the corresponding component module entrypoint (e.g. `import * as Buttons from '../../ui/components/buttons/buttons.js'`), or formatting dates or timestamps with `toLocaleString()` inside sortable `<devtools-data-grid>` cells without a numeric/ISO sort value (sorts alphabetically instead of chronologically; use `toISOString()` or a numeric sort value).
- **Do not flag**: Overriding inherited `protected` lifecycle methods on framework base classes (e.g. extending `UI.Widget.Widget`).

### `UI_TYPE_SAFETY_AND_EXHAUSTIVENESS`: Model multi-state UI workflows with discriminated unions, Platform.assertNever exhaustiveness checks, and strict domain types
- **Severity**: WARNING
- **Why**: Representing mutually exclusive UI states with loose optional boolean flags or `any` types permits impossible states and silently misses new enum variants. Discriminated unions paired with `Platform.assertNever` in `default:` branches enforce compile-time exhaustiveness.
- **Look for**: `switch` statements over union/enum types missing `Platform.assertNever(x)` in `default:`, `any` or `declare` field modifiers in UI classes, or multiple boolean flags (`isLoading`, `isError`, `isEmpty`) representing mutually exclusive states.
- **Do not flag**: Switch statements that intentionally handle only a small subset of a large external protocol enum.

### `UI_PURE_VIEW_AND_PRESENTER_SEPARATION`: Keep UI.Widget view functions pure and stateless by computing presentation data in presenters, passing decoupled ViewInput data structures, and preserving helper topology
- **Severity**: WARNING
- **Why**: In DevTools' MVP architecture, `DEFAULT_VIEW` functions must be pure projections of `ViewInput` to Lit templates. Querying SDK models, reading global settings, mutating presenter state, or calling host/clipboard APIs inside the view couples rendering to global state and breaks isolated view testing. Additionally, deleting existing standalone/module-level DOM helper functions or async class update helpers and inlining them into `performUpdate()` or `DEFAULT_VIEW` during Lit migrations unnecessarily flattens the abstraction topology and inflates diffs.
- **Look for**: `DEFAULT_VIEW` or view helper functions calling `Common.Settings.Settings.instance()`, `SDK.*`, `Host.*`, mutating `input.*` arrays in place, accepting raw `SDK`/`Protocol` domain objects instead of decoupled presentation interfaces on `ViewInput`, or Lit migrations that delete existing standalone/class DOM helper functions and inline their logic into `performUpdate()` or `DEFAULT_VIEW` instead of converting them in place to return `LitTemplate` (or `Promise<LitTemplate|null>`).
- **Do not flag**: Legacy `UI.Widget` subclasses that have not yet migrated to a `DEFAULT_VIEW` function.

### `UI_LIT_DECLARATIVE_TEMPLATES_AND_DIRECTIVES`: Use Lit.nothing, repeat with keys, classMap/styleMap, and ifDefined in declarative templates while preserving modular helper functions
- **Severity**: WARNING
- **Why**: Mutating DOM elements via `appendChild`, `classList.toggle`, or `innerHTML` alongside Lit templates, or returning `''`/`null` instead of `Lit.nothing` in conditional branches, corrupts Lit's part tracking and creates unnecessary text nodes or wrapper `<div>`s. Conversely, collapsing existing standalone DOM helper functions (e.g., `linkifyIcon`, `maybeCreateLinkToElementsPanel`) or class rendering helpers into a single monolithic `DEFAULT_VIEW` template harms readability and reviewability compared to converting those helpers in place to return `LitTemplate`.
- **Look for**: Ternary branches returning `''` or `undefined` in `html` templates instead of `Lit.nothing`, unkeyed `.map()` on dynamic stateful lists instead of `repeat()`, `ifDefined` omissions on optional attributes, multiple `Lit.render()` calls mutating the same container, or Lit migrations that flatten/inline existing DOM helper functions and class helper methods instead of preserving them in their original locations returning `LitTemplate`.
- **Do not flag**: Static arrays of primitive labels where item identity never reorders. Omitting Lit's `live()` directive on `<devtools-checkbox>` (`UI.UIUtils.CheckboxLabel`) `.checked` bindings (`live()` breaks `CheckboxLabel`'s host `checked` attribute synchronization when toggled externally), listening to `ObjectWrapper` events via Lit `@event=${...}` bindings on `UI.Widget` elements (`ObjectWrapper` instances set up via `eventMixin` on `Widget` dispatch on the DOM), or interpolating boolean values directly inside Lit text/`<td>` positions (Lit renders booleans as `'true'`/`'false'`). Newlines and indentation spaces between expressions and child elements in multi-line `html` templates (DevTools' custom `html` tag in `front_end/ui/lit/strip-whitespace.ts` strips `\n\s*` outside of `<...>` tags at runtime, so multi-line formatting does not introduce whitespace text nodes).

### `UI_WIDGET_DOM_AND_LISTENER_LIFECYCLE`: Attach listeners to external models and managers in wasShown and detach them symmetrically in willHide
- **Severity**: ERROR
- **Why**: Subscribing to long-lived SDK `TargetManager`, `Settings`, or model events in a widget's constructor without unsubscribing in `willHide()` (or `onDetach()` / `onunbind()`) causes hidden panels to process background updates and leaks detached widget instances.
- **Look for**: `addEventListener`, `addModelListener`, or `addChangeListener` on singletons, models, or settings inside `UI.Widget` constructors or `wasShown()` without a matching `remove*` call in `willHide()` using the same function reference, or scheduled or asynchronous `performUpdate()` methods on `SDKModelObserver` widgets that access or re-register a model without checking that `this.#model` is still active after `modelRemoved()` has run.
- **Do not flag**: Listeners attached to the widget's own internal DOM elements (`this.contentElement`), which are garbage-collected together with the widget. Model or target listeners on background recording/overview widgets (such as `NetworkOverview`) that must continuously record events while the widget is hidden or collapsed (especially when rendering is already gated on `this.isShowing()`), or pre-existing constructor listeners untouched by a DOM-to-Lit view migration.

### `UI_ACCESSIBILITY_AND_SEMANTIC_HTML`: Use native semantic HTML controls with accurate ARIA attributes, keyboard handlers, and !event.isComposing guards
- **Severity**: WARNING
- **Why**: Clickable `<div>`/`<span>` elements and nested interactive controls (`<button>` inside `<a>` or `<button>`) break keyboard navigation and screen readers. Interactive elements require semantic tags (`<button>`, `<details>`/`<summary>`, `<thead>`/`<tbody>`), synchronized ARIA state (`aria-expanded`, `aria-details` for rich tooltips vs `aria-describedby` for plain text), and `!event.isComposing` checks on `Enter` keydown handlers.
- **Look for**: `@click` on `<div>`/`<span>` without button semantics, `<button>` nested inside `<button>`/`<x-link>`, `Enter` keydown handlers missing `!event.isComposing`, or `aria-describedby` pointing to interactive `<devtools-tooltip>` elements.
- **Do not flag**: Delegating click listeners on container elements that handle bubbled events from child buttons. Rendering `<tr>` rows directly into `this.affectedResources` (`<table class="affected-resource-list">`) in `AffectedResourcesView` subclasses without a `<tbody>` wrapper (`AffectedResourcesView` creates the `<table>` container without a `<tbody>` and subclasses render `<tr>` rows directly into `this.affectedResources`).

### `UI_PERFORMANCE_AND_FLAMECHART_RENDERING`: Precompute expensive metrics outside render loops, use Set/Map for O(1) lookups, and debounce high-frequency UI updates
- **Severity**: WARNING
- **Why**: Performing linear `Array.includes`/`find` scans, sorting, or regex parsing inside FlameChart canvas draw loops, `ElementsTreeOutline` mutation callbacks, or Lit render passes causes frame drops and UI jank on large traces and DOM trees.
- **Look for**: `.includes()` / `.find()` / `.sort()` inside canvas draw or event iteration loops, repeated `ResizeObserver` registrations on individual child items instead of the parent container, or un-debounced filter/mutation handlers.
- **Do not flag**: One-time initialization passes over bounded small arrays (less than 20 items).

### `UI_LOCALIZATION_AND_UISTRINGS_HYGIENE`: Define user-facing strings in sentence-case UIStrings using complete sentences and i18nTemplate for embedded elements, and prune unused entries
- **Severity**: WARNING
- **Why**: Concatenating translated fragments breaks word order in non-English locales, title-Cased strings violate Chromium UX standards, translating English-only experimental strings wastes localization quota, and unused `UIStrings` entries bloat locale bundles.
- **Look for**: String concatenation around `i18nString(...)`, HTML/DOM elements interpolated without `i18nTemplate`, Title Case labels in `UIStrings`, unlocalized English literals in templates, or unused keys in `UIStrings`.
- **Do not flag**: Technical protocol identifiers, MIME types, or strings in `UIStringsNotTranslate` / `i18n.i18n.lockedString(...)`. Pre-existing `UIStrings` entries (such as legacy Title Case strings) or pre-existing unlocalized string literals that are moved verbatim from imperative DOM creation into a Lit template during a refactoring CL.

### `UI_REACTIVE_WIDGET_UPDATE_LIFECYCLE`: Schedule widget re-renders asynchronously via this.requestUpdate() and guard property setters with equality checks
- **Severity**: WARNING
- **Why**: Calling `this.performUpdate()` or invoking `this.#view(...)` synchronously inside property setters causes redundant synchronous DOM renders when multiple properties change in the same tick. Setters should short-circuit if the value is unchanged and call `this.requestUpdate()`.
- **Look for**: Widget property setters calling `this.performUpdate()` or `this.#view(...)` directly, setters calling `this.requestUpdate()` without checking `if (this.#prop === value) return;`, or synchronous `this.performUpdate()` calls inside a `UI.Widget` `constructor()` (creates DOM and reads `UI.Context` before the widget is attached or visible; use `this.requestUpdate()` or `wasShown()` instead).
- **Do not flag**: Internal test helpers or synchronous initialization paths explicitly documented as requiring immediate flush. Synchronous `this.performUpdate()` calls in a constructor when the constructor or methods callable before `wasShown()` depend on `ViewOutput`, `widgetRef`, or `ref` fields populated by the initial render.

### `UI_VISUAL_LOGGING_INSTRUMENTATION`: Instrument interactive UI elements and containers with kebab-case VisualLogging contexts registered in KnownContextValues
- **Severity**: WARNING
- **Why**: DevTools relies on Visual Elements (`jslog`) telemetry to measure feature usage. Omitting `jslog` on new buttons/toggles/menus, using localized or camelCase context strings, adding redundant panel prefixes inside already-logged containers, or dropping `jslog` during Lit refactors breaks analytics.
- **Look for**: Interactive elements (`<button>`, `<devtools-button>`, `<input>`, menus, drawers) missing `jslog` or `jslogContext`, non-kebab-case context names, or new context values missing from `KnownContextValues.ts`.
- **Do not flag**: Purely decorative icons or internal wrapper `<div>`s that represent neither a distinct visual section nor an interactive control.

### `UI_CSS_SCOPING_AND_FLEX_LAYOUT`: Scope light-DOM stylesheets and align elements using flexbox or grid rather than competing margin and position offsets
- **Severity**: INFO
- **Why**: Unscoped class or tag selectors in light-DOM widget stylesheets leak across the DevTools document, while combining `vertical-align`, negative margins, and `position: relative` offsets creates brittle layouts that break under font scaling or zoom.
- **Look for**: Unscoped generic selectors in light-DOM `.css` files (or `:host` inside `@scope` blocks instead of `:scope`), or CSS rules combining `vertical-align`, negative `margin-top`, and pixel offsets to center icons and buttons.
- **Do not flag**: Shadow DOM component stylesheets where `:host` scoping is native. `<style>${styles}</style>` interpolations of `*.css.js` default imports in Lit templates (generated `.css.js` files export plain CSS strings, not `CSSStyleSheet` objects, and `<style>${...}</style>` is the standard replacement for deprecated `registerRequiredCSS`).

### `UI_VIEW_OUTPUT_AND_CALLBACK_CONTRACTS`: Encapsulate imperative DOM and child widget actions in ViewOutput callbacks and pass user actions via semantic ViewInput callbacks instead of raw DOM or Widget references
- **Severity**: WARNING
- **Why**: Exposing raw `HTMLElement` or `UI.Widget` references on `ViewOutput` (e.g. `output.childWidget = w`) or passing raw `MouseEvent`/`KeyboardEvent` objects to presenter callbacks leaks view implementation details into presenters. Supply all configuration through setters/inputs on the child widget, or if imperative calls are strictly necessary, populate narrow functional closures on `ViewOutput` (e.g. `output.focusInput = () => ...`, `output.scrollWidgetToSomething = () => widgetRef.scrollToSomething()`), and unpack event values before calling `input.onSelect(value)`.
- **Look for**: `ViewOutput` interfaces containing `HTMLElement`, `Element`, or `UI.Widget` subclass properties (other than temporary intermediate CL bridges), `get*ForTest()` presenter methods backed by `ViewOutput` widget references, or `ViewInput` callbacks typed as `(event: Event) => void` instead of semantic domain values.
- **Do not flag**: Third-party editor hosts, `<canvas>` (`HTMLCanvasElement`) and canvas sizing/resizer containers, or elements returned by existing public cross-widget APIs (such as `UI.ListDelegate.createElementForItem` or `ConsolePrompt.belowEditorElement`).

### `UI_PANEL_AND_META_REGISTRATION`: Follow DevTools panel directory conventions and register settings and views in the appropriate *-meta.ts scope
- **Severity**: WARNING
- **Why**: Panel-level `UI.Widget` views belong directly under `front_end/panels/<panel>/` (reserving `components/` for reusable leaf components), internal non-user-facing settings must use `SettingCategory.NONE` or model descriptors rather than appearing in Settings UI, and shared SDK settings belong in `sdk-meta.ts`.
- **Look for**: Panel-level `UI.Widget` views placed inside `panels/<panel>/components/`, internal state flags registered with user-facing titles in `*-meta.ts`, or `loadView` callbacks calling `.instance()` instead of using the passed `Universe` context.
- **Do not flag**: Standalone reusable leaf components inside `components/` or genuine user-configurable preferences.

### `UI_WEAK_DOM_REFERENCES_AND_OBSERVER_CLEANUP`: Store DOM node metadata in WeakMap or WeakRef collections and clean up observers when elements detach
- **Severity**: WARNING
- **Why**: Retaining DOM `Element` or `SDK.Target` references in strong `Map`/`Set` collections (or in `WeakMap` values that hold strong references back to their keys) prevents detached DOM trees from being garbage-collected, while leaving `ResizeObserver`, `MutationObserver`, or `Lit.Directives.ref` callbacks active after unmount leaks memory.
- **Look for**: Strong `Map<Element, ...>` / `Set<Element>` collections holding DOM/model associations, `WeakMap` values retaining strong references back to their DOM keys, `ResizeObserver`/`IntersectionObserver` without `.unobserve()`/`.disconnect()` on teardown, or `ref(el => ...)` callbacks that do not handle `el === undefined`.
- **Do not flag**: Module-level `WeakMap<Element, ...>` globals whose values do not strongly reference the key, or short-lived local maps created and discarded within a single synchronous function call.

### `UI_SECURITY_AND_OUTPUT_SANITIZATION`: Sanitize untrusted strings, URLs, CSS selectors, and Markdown exports before rendering or exporting
- **Severity**: ERROR
- **Why**: Interpolating untrusted network URLs, DOM attributes, or user strings into raw HTML snippets, `CSS.escape`-free attribute selectors, Markdown table exports, or `href` attributes without protocol validation risks injection, XSS, broken layout formatting, or text spoofing.
- **Look for**: Raw string interpolation in `querySelector('[attr="' + val + '"]')` without `CSS.escape`, `href` attribute bindings with unvalidated `javascript:` URLs, Markdown table cell serialization without escaping `|*_<>\`, or raw HTML snippet generation without HTML escaping.
- **Do not flag**: Standard Lit `html` text bindings (`${text}`), which escape HTML entities automatically.

### `UI_DECLARATIVE_CHILD_WIDGET_COMPOSITION`: Compose child UI.Widget instances declaratively in Lit templates using ${widget(ChildWidget, {...})} instead of imperative show() calls, single-argument factory callbacks, or bare <devtools-widget> tags
- **Severity**: WARNING
- **Why**: Imperatively instantiating child widgets and calling `child.show(container)` inside presenters or views bypasses Lit reconciliation, complicates lifecycle management, and recreates widgets unnecessarily across renders. Similarly, single-argument factory callbacks `widget(element => ...)` only run on initial creation and fail to propagate updated properties on subsequent re-renders; strongly prefer the two-argument `widget(ChildWidget, {...})` form (converting `setFoo()` methods on the child widget into `set foo()` setters if needed). Prefer `${widget(ChildWidget, {...})}` directly as a child expression over `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>`; only use an explicit `<devtools-widget>` tag when setting other attributes, applying other directives (such as `widgetRef` or `ref`), or providing child nodes.
- **Look for**: `new ChildWidget()` followed by `.show(...)` or `.appendChild(child.element)` inside Lit view functions or migrated `performUpdate()` methods, `widget(element => ...)` factory callbacks configuring child widget properties imperatively instead of `${widget(ChildWidget, {...})}`, or `<devtools-widget ${widget(ChildWidget, {...})}></devtools-widget>` tags that have no other attributes, directives, or child nodes.
- **Do not flag**: Top-level legacy split widgets or tabbed panes that have not migrated to Lit views, or `<devtools-widget>` tags that set other attributes, use additional directives (e.g. `widgetRef`), or contain child nodes.

### `UI_AWAIT_UPDATE_COMPLETE_POST_RENDER`: Await this.updateComplete before executing post-render DOM measurements, focus changes, or scroll adjustments
- **Severity**: ERROR
- **Why**: Because `this.requestUpdate()` schedules rendering asynchronously in a microtask, querying DOM geometry, focusing newly rendered controls, or anchoring popovers immediately after `requestUpdate()` operates on stale pre-render DOM state.
- **Look for**: `this.requestUpdate()` followed synchronously by `.focus()`, `.getBoundingClientRect()`, `.scrollIntoView()`, or child widget measurement without `await this.updateComplete`.
- **Do not flag**: State updates that do not interact with rendered DOM nodes after scheduling the update.
