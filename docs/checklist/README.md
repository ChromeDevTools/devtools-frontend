# Chromium DevTools support checklist (for [Blink Intents](https://developer.chrome.com/docs/web-platform/blink-intents))

[goo.gle/devtools-checklist](https://goo.gle/devtools-checklist)

**Shipping new Web Platform features (WPFs) in Chromium requires tooling support.**

Many new Web Platform Features (WPFs) can piggyback off of DevTools' general tooling for HTML, DOM, CSS, JavaScript,
WebAssembly, Network, and other aspects — requiring only minimal or no changes to make DevTools behave as expected
in light of the new WPF. This document refers to such cases as _basic support_.

However, some WPFs might warrant larger changes, including brand-new DevTools features. This document refers to such
cases as _extended support_.

**What is basic support?**
Basic support ensures that a new WPF is introspectable and DevTools does not break or crash Chromium in its presence. In addition, developers should have a way of knowing if their web application uses this WPF correctly. Definitions and examples of basic support for common WPF categories can be found below.

**What is extended support?**
Extended support involves dedicated, custom tooling to reduce friction and ensure the adoption of a new Web Platform Feature. It is considered on a case-by-case basis, typically for WPFs that are particularly complex and/or expected to be very popular. Examples include a custom UI editor for a new CSS feature (e.g. the flexbox editor) or dedicated debugging support in the Network panel for a new protocol (e.g. WebSocket).

Extended support is not a requirement for shipping a WPF. If you believe your feature requires extended support, please refer to the [guidelines for working with the DevTools team](../playbook.md) to start the discussion.

It’s the WPF owner’s responsibility to ensure the tooling story is thought through, by answering the question:
_"how would a web developer making use of your new WPF test and debug their code?"_

- Basic support must be implemented before shipping a new WPF.
- Extended support must be considered on a case-by-case basis, and is not tightly bound to or blocking a WPF's shipping.

The following sections capture examples of different kinds of WPFs, the tooling support they require, and how this can be achieved.

***
**IMPORTANT:** Please take a look at the [DevTools UI feature checklist](./ui.md) prior
to changing or extending the DevTools user interface (UI).
***

[TOC]

## JavaScript (ECMAScript) language features

See the [Chromium DevTools support checklist for JavaScript language features](https://goo.gle/v8-checklist).


## WebAssembly language features

See the [Chromium DevTools checklist for WebAssembly features](https://goo.gle/devtools-wasm-checklist).


## DOM, HTML, and Web APIs

### New HTML elements

> **Basic support requirement:** The new element is displayed in the DOM tree with the correct tag name and structure, and both the element and its attributes are editable.

This is often automatically supported because the Elements panel directly reflects the browser's internal DOM representation; any element that the browser can parse and add to the DOM will therefore appear in the tree. Verify that inspecting the new element in the Elements tab looks alright and works as expected (typically, this requires no additional implementation effort).

### New WebIDL/DOM interfaces and attributes

> **Basic support requirement:** New interfaces, attributes, and methods are accessible as properties on their corresponding DOM objects in the Console and appear in autocomplete suggestions.

This is often automatically supported because the DevTools Console has access to the same JavaScript runtime as the page. Any property that is programmatically accessible on a DOM object will be discoverable by the Console's autocomplete mechanism.

Verify that the new properties show up in the DevTools Console autocomplete functionality. To enable argument hints for new or changed parameterized functions, run
```bash
devtools-frontend/src/scripts/deps/roll_deps.py
```
to re-generate `devtools-frontend/src/front_end/models/javascript\_metadata/NativeFunctions.js` ([Example CL](http://crrev.com/c/3432787)). For more details, see the [Chromium DevTools support checklist for JavaScript language features](https://goo.gle/v8-checklist).

![](./images/checklist-autocomplete-idl-attribute.png "Console autocompletion for IDL attributes")

### New DOM events

> **Basic support requirement:** The new DOM event is discoverable. This means it must (1) appear in the **Event Listeners** sidebar tab in the Elements panel when a listener for it is added to an element, and (2) be listed under an appropriate category in the **Event Listener Breakpoints** tab in the Sources panel.

Displaying the event in the Elements panel's 'Event Listeners' tab is often automatically supported, as this tab reflects the runtime state of the element.

However, adding the event to the 'Event Listener Breakpoints' tab is not automatic. The list of debuggable events is maintained in the DevTools frontend. Adding a new event requires modifying this list to make it visible in the UI under an "appropriate category" (a logical grouping like `Mouse` or `Keyboard`). If a suitable category doesn't exist, a new one should be created.

![](./images/checklist-event-listener-breakpoints.png "Event Listener Breakpoints")

Pointer: [`front_end/core/sdk/DOMDebuggerModel.ts`](https://source.chromium.org/chromium/chromium/src/+/main:third\_party/devtools-frontend/src/front_end/core/sdk/DOMDebuggerModel.ts;l=766-870;drc=79e812efee4be5e4d4378562f8acebffe9771f20)


## CSS

For CSS WPFs, basic support involves the ability to view and edit styles via the DevTools Styles tab.
This mostly works out of the box, but some minimal changes might be needed depending on the specifics.

### New CSS at-rules

> **Basic support requirement:** The new at-rule and its contents are displayed in the Styles tab, correctly linked to the stylesheet, and editable.

WPFs that introduce new CSS at-rules (i.e. `@foo (bar: baz) { … }`) must surface the new at-rules over the Chrome
DevTools Protocol (CDP) so that DevTools can show them in the Styles tab. Interlinking the at-rule to the style rules that reference it (e.g., linking a `@property` definition to its usage) is considered extended support and is not a requirement for shipping.
Please refer to [goo.gle/devtools-generic-at](https://goo.gle/devtools-generic-at) for instructions and examples on
how to add DevTools support for a new at-rule.

### New CSS pseudo-classes

> **Basic support requirement:** The new pseudo-class must be toggleable in the 'Force element state' UI. When the pseudo-class is active, the corresponding style rules must appear and be editable in the Styles tab, just like any other style rule.

To add a new pseudo-class to the UI, you must add it to the list of states in the constructor of `ElementStatePaneWidget`.

![](./images/checklist-pseudo-classes.png "Pseudo classes in the Styles tab")

Pointer: [`front_end/panels/elements/ElementStatePaneWidget.ts`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/elements/ElementStatePaneWidget.ts)

Example for `:target`: [Chromium back-end CL](https://chromium-review.googlesource.com/c/chromium/src/+/2575668),
[DevTools front-end CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/2581544).

### New CSS properties or values

> **Basic support requirement:** The new CSS property or value is recognized by the Styles tab, autocompletes correctly, and does not show up as an "Unknown Property".

Any new CSS property that is applied to an element should also appear correctly in the **Computed** tab of the Elements panel, displaying its resolved value. This is generally automatic, as the Computed tab reflects the browser's computed style.

To recognize new CSS properties/values in the DevTools Styles tab’s autocomplete functionality, roll
[Chromium’s `css_properties.json5`](https://source.chromium.org/chromium/chromium/src/+/main:third\_party/blink/renderer/core/css/css_properties.json5;drc=be2c473625b9c28a4ff6735547cb0c1b6743f4ae) into the `devtools-frontend` repository by running
```bash
devtools-frontend/src/scripts/deps/roll_deps.py
```
see this [example CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/2972583).

![](./images/checklist-css-properties.png "CSS property value completion")

Additionally, verify that the Styles tab tooltips showing the property's definition and baseline status are correct and up-to-date. Otherwise, let DevTools team know that this should be updated.

### New CSS Functions and Value Indirection

> **Basic support requirement:** The new function or value mechanism is correctly parsed and displayed in the Styles tab, showing the *authored* value (e.g., `var(--my-color)`). Hovering over the value should reveal its computed result in a tooltip. The function name should also be autocompleted.

Support for new CSS functions and other forms of value indirection (like CSS custom properties via `var()`) is a mix of automatic and manual work. While the browser's backend handles parsing and computation, ensuring the DevTools UI provides features like autocomplete for new function names or value tracing in hover-to-resolve tooltips require frontend changes. Value tracing example can be found [here](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/6269777).

### New CSS pseudo-elements

> **Basic support requirement:** If the new pseudo-element is tree-abiding, it is displayed in the DOM tree (usually as a child of its originating element) and can be selected to inspect and edit its styles in the Styles tab. If it participates in style cascade of its originating element, its participating style should show up in the originating element's Style tab sections as well (e.g. Pseudo ::before element section).

Support for new pseudo-elements is not automatic. The browser's backend must be updated to expose the new pseudo-element over the Chrome DevTools Protocol (CDP). Additionally, the DevTools frontend must be updated to recognize and display these pseudo-elements in the Elements panel.

Pointers: [InspectorDOMAgent's supported pesudos](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/inspector/inspector_dom_agent.cc;l=122;drc=90e6a37b7c43154ea99d7cc7ff632ee181078fb2), [InspectorStyleResolver's list of supported pseudo-elements](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/inspector/inspector_style_resolver.cc;l=57-71;drc=c182cb38dc164e2b83c75cdf8699b076dfe6bc5e), and [DevTools Frontend DOMModel updates example CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/6195233).


## Network-related features

### New request types

> **Basic support requirement:** Any request initiated by the feature must appear as a distinct row in the Network panel with the correct **Type** (e.g., 'fetch', 'image'). This includes, at a minimum, the URL, status, method, size, and timing. Crucially, the **Initiator** column must correctly identify the source of the request.

Support for new request types is not automatic. It requires instrumenting the browser's network stack to send the right information to DevTools via the Chrome DevTools Protocol (CDP). The DevTools frontend may also need to be updated to correctly classify and display the new request type.

Pointer: The `ResourceType` class in [`front_end/core/common/ResourceType.ts`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/core/common/ResourceType.ts) is the source of truth for request types in the frontend.

### New network protocols or data formats

> **Basic support requirement:** The new protocol or data format is identifiable in the Network panel. For new protocols, individual frames or messages should be inspectable. For new data formats, the response should be displayed in a format that is at least debuggable.

Note that this level of support often requires significant implementation in both the browser's backend and the DevTools frontend to correctly interpret and display the new protocol's data. Aim for correctness first, then consider improving UX in a follow-up.

---
*Extended support might involve a dedicated panel for a new protocol, such as the one for WebSockets, [DirectSockets CL1](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/6316791), [DirectSockets CL2](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/6406321), or the custom tab for [Trust Tokens](http://crbug.com/1126824) shown below.*

![](./images/checklist-network-trust-tokens.png "Trust Tokens tab in the Network panel")


## Storage, Workers, and Background Services

WPFs related to Web Application Manifest, service workers, background services, notifications, storage, caching are
covered under the DevTools Application tab. Given the broad scope of features captured here, there is no generic
guidance that applies, other than: review the existing DevTools functionality related to your WPF, and ensure the
new WPF works well with it.

Depending on the WPF specifics, extended support might be warranted. For example, [Trust Tokens](http://crbug.com/1126824)
shipped with a new subpanel under the Application tab:

![](./images/checklist-application-trust-tokens.png "Trust Tokens tab in the Application panel")

Reach out to the DevTools team via [devtools-dev@chromium.org](mailto:devtools-dev@chromium.org) prior to sending out
your Intent email.


## Warnings, deprecations, removals

If your Blink Intent is about the deprecation/removal of a WPF, or an otherwise risky change from a Web compatibility
standpoint, the basic support requirement can be satisfied by integrating with DevTools’ Issues panel. See
[how to pipe your messages into the Issues tab](https://docs.google.com/document/d/13zZBu6RG7D23FSWecSy3AHPEdFHJMkp732-uJ5CFbmc)
for details.

* For issues that should be reported on the browser process, use `devtools_instrumentation::ReportBrowserInitiatedIssue()`.
  See its use sites for examples. Browser-side issues may contain information that would be unsafe for a renderer to know.
* For renderer-side issues, use `ExecutionContext::AddInspectorIssue(AuditsIssue)`. Consider adding a static method to
  `AuditsIssue` which is defined in `third_party/blink/renderer/core/inspector/inspector_audits_issue.h` that creates and
  reports the issue. `inspector_audits_issue.h` is crafted such that it minimizes dependencies (and hence can be included
  without adding too much overhead). ([Example CL](https://chromium-review.googlesource.com/c/chromium/src/+/2892206))

Try to avoid adding a new Console message — these are deprecated in favor of the Issues panel.
