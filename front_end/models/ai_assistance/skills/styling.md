---
name: styling
description: Inspecting or modifying live CSS, styling, layouts, positioning, computed styles, DOM tree structure, and page styles.
allowed-tools:
  - executeJavaScript
  - getStyles
  - setElementStyles
---

# Tools & Workflow

1. **Inspect CSS Properties (`getStyles`)**:
   - Use `getStyles` to query computed and authored CSS properties for one or more element backend node IDs.
   - You MUST provide a specific list of CSS property names (e.g. `['display', 'position', 'flex-direction', 'z-index']`). Do not use generic values like "all" or "*".
   - Always consider the CSS cascade, inheritance, and stacking contexts.

2. **Modify Element Styles (`setElementStyles`)**:
   - Only call `setElementStyles` when the user asks to change, fix, or preview styles on the live page. On diagnostic ("why...") or how-to ("how do I..." / "how can I...") queries, stay read-only, explain the CSS fix, and offer to apply it.
   - ALWAYS use the `setElementStyles` tool (and NEVER `executeJavaScript`) when modifying or fixing CSS styles on elements.
   - `setElementStyles` takes `elements` (an array of numeric element `uid`s / backend node IDs, such as the selected element's `uid` or `uid`s discovered earlier) and `styleProperties` (an array of `{name, value}` CSS declaration objects in kebab-case, e.g. `[{name: 'display', value: 'flex'}, {name: 'justify-content', value: 'center'}]`).
   - `setElementStyles` is an internal tool name; do not mention `setElementStyles` directly to the user.

3. **Inspect Geometry or Traverse DOM (`executeJavaScript`)**:
   - Use `executeJavaScript` ONLY when inspecting computed geometry (`getBoundingClientRect()`), traversing related DOM nodes (`$0.parentElement`, `$0.children`) to inspect their structure/attributes, or reading DOM/layout state that getStyles cannot provide.
   - On informational, diagnostic ("why..."), and how-to ("how do I..." / "how can I...") queries, keep `executeJavaScript` strictly read-only: do not mutate DOM or styles, scroll the page (`scrollTo`, `scrollIntoView`, `scrollTop`), or dispatch synthetic events (such as `click` or `WheelEvent`) unless the user asks to apply a change or run a live interaction test.
   - When you need the numeric `uid` for an element not already listed in the active context, return the DOM `Element` itself in `data` (directly or inside an object/array) and read the numeric `uid` from its serialized `(uid=<id>)` prefix (for example `(uid=15) <div id="card">...</div>`), then pass that numeric `uid` to `getStyles` or `setElementStyles`. Never guess numeric `uid`s.
   - Never use executeJavaScript as a substitute for dedicated skills (such as browser storage/cookies, network requests, workspace source files, or accessibility tree inspection); call learnSkills to load the relevant skill instead.
   - Geometry & layout inspection example:
     ```javascript
     const rect = $0.getBoundingClientRect();
     const style = window.getComputedStyle($0);
     const parentStyle = $0.parentElement ? window.getComputedStyle($0.parentElement) : null;
     const data = {
       rect: {width: rect.width, height: rect.height, top: rect.top, left: rect.left},
       computedDisplay: style.display,
       parentDisplay: parentStyle?.display ?? null,
     };
     ```

# Considerations

* Meticulously investigate all potential causes for the observed behavior before concluding. Inspect parents, siblings, children, and overlapping elements where relevant.
* After applying a style fix, ask the user to verify if the visual change resolved their issue.
* If the target element is in a cross-origin iframe, stop and ask the user to select it in the Elements panel and start a new chat with that context.
