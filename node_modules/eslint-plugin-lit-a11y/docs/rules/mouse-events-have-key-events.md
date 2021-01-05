# mouse-events-have-key-events

Enforce `@mouseover`/`@mouseout` are accompanied by `@focus`/`@blur`. Coding for the keyboard is important for users with physical disabilities who cannot use a mouse, AT compatibility, and screenreader users.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html`
  <button @mouseout="${onMouseout}"></button>
  <button @mouseover="${onMouseover}"></button>
`;
```

Examples of **correct** code for this rule:

```js
html`
  <button @mouseout="${onMouseout}" @blur="${onBlur}"></button>
  <button @mouseover="${onMouseover}" @blur="${onBlur}"></button>
`;
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
html` <custom-element @mouseout="${onClick}"></custom-element> `;
```

Examples of **correct** code with `allowCustomElements: false, allowList: ['custom-element']`:

```js
html` <custom-element @mouseout="${onClick}"></custom-element> `;
```

## Further Reading

- [WCAG 2.1.1](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
