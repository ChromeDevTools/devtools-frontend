# click-events-have-key-events

Enforce `@click` is accompanied by at least one of `@keyup`, `@keydown`, or `@keypress`. Coding for the keyboard is important for users with physical disabilities who cannot use a mouse, AT compatibility, and screenreader users. This does not apply for interactive or hidden elements.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <div @click="${onClick}"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <button @click="${onClick}"></button> `;
```

```js
html` <div @click="${onClick}" @keyup="${onKeyup}"></div> `;
```

### Options

The `allowList` option lets you specify tag names to exclude from this rule. the `allowCustomElements` option (true by default) excludes all custom-elements from this rule.

```json
{
  "rules": {
    "lit-a11y/click-events-have-key-events": [
      "error",
      {
        "allowList": ["foo-button"],
        "allowCustomElements": false
      }
    ]
  }
}
```

Examples of **incorrect** code with `allowCustomElements: false`:

```js
html` <custom-element @click="${onClick}"></custom-element> `;
```

Examples of **correct** code with `allowCustomElements: false, allowList: ['custom-element']`:

```js
html` <custom-element @click="${onClick}"></custom-element> `;
```

## Further Reading

- [WCAG 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
