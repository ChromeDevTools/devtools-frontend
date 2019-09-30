Descriptive information in .grdp messages can improve localizability as it will provide more context to the translators.

Types of descriptive information:
- [Description](#Description)
- [Placeholder name and example](#Placeholder)

## Description
**Good description**:
```html
  <message name="IDS_DEVTOOLS_04efed137e5da6d8b456e83d87915f16" desc="Tooltip text that appears when hovering over the 'Focusable' attribute name under the Computed Properties section in the Accessibility pane of the Elements pane">
    If true, this element can receive focus.
  </message>
```

**Bad description**:
```html
  <message name="IDS_DEVTOOLS_04efed137e5da6d8b456e83d87915f16" desc="Elements pane 'Focusable' tooltip">
    If true, this element can receive focus.
  </message>
```

### Process to add descriptions
1. Locate the string in the source code
2. Figure out where/how the string shows up in which tool from the content of source code
3. Write a description. See below for guidelines on what to add.

### What information should I provide in the message description?
- Where is the text located? (e.g. button, title, link, pull-down menu in the Sources pane)
- What triggers the string and/or what is the result? What page or text comes before and after?
- What do the placeholders stand for? Will this message replace a placeholder in another message? Do they need to be arranged in a certain way?
- Is this a verb or a noun? If it's an adjective, what does it refer to?
- Who is the message intended for (e.g. accessible label)?

## Placeholder
- If the auto-generated `<ph>` tag name is not descriptive, change it to something that explains what the placeholder is used for. Use all uppercase letters connected by underscores.
- Placeholder tag names under the same message tag cannot be the same.
- Use `<ex></ex>` to add an example to a placeholder. Text between `<ex>` will be used as an example for the placeholder content.
- Example:
```xml
Hey <ph name="USER_NAME">$1<ex>Joe</ex></ph>, you have <ph name="COUNT"><ex>10</ex>$2</ph> messages.
```