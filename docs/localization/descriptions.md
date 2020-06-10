## Description
Good descriptions can improve localizability as it will provide more context to the translators.

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
- Where is the text located? (e.g. button, title, link, pull-down menu in the Sources pane)
- What triggers the string and/or what is the result? What page or text comes before and after?
- What do the placeholders stand for? Will this message replace a placeholder in another message? Do they need to be arranged in a certain way?
- Is this a verb or a noun? If it's an adjective, what does it refer to?
- Who is the message intended for (e.g. accessible label)?
