## How to write good descriptions
Good descriptions can improve localizability by providing more context to the translators.
There are some details that are very important to have in other languages!

**Good description**:
```javascript
const UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over the 'Focusable' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane.
   */
  computedPropertyTooltip: 'If true, this element can receive focus.',
};
```
**Bad description**:
```javascript
const UIStrings = {
  /**
   * @description Elements pane 'Focusable' tooltip.
   */
  computedPropertyTooltip: 'If true, this element can receive focus.',
};
```

### What information should I provide in the message description?
- The type of UI element where the text is displayed. Is it regular text, a label, button text, a tooltip, a link, or an accessible label? Button text is often imperative i.e. a command to do something, which is important to know in some languages.
- _When_: What triggers the string and/or what is the result? What page or text comes before and after? e.g. "Status text while waiting for X", "Shown when the audit is finished and X error was encountered".
- What do the placeholders stand for? Placeholder examples are sent to translators, but extra information in the description will help too. e.g. "Total time in ms that the profile took to complete", "The CSS property name that is being edited"
- Is this a verb or a noun? Many words in English can be both, e.g. 'request', 'address', 'change', 'display', 'increase'. Particularly if the string is short, this can be hard to guess. If it's an adjective, what does it refer to? This is important for inflection in some languages, where the ending of the adjective must change for gender or case.
- Explain or name any complex terms, e.g. "Trust Tokens are a web API - https://web.dev/trust-tokens/"
- Where is the text located? e.g. A table header in the Sources panel, a context-menu item in the Network panel. Many strings in the code base have _only_ the location, which is not the most important context.
