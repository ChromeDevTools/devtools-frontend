# role-has-required-aria-attrs

Enforce that elements with ARIA roles must have all required attributes for that role.
Some ARIA roles require certain ARIA attributes to be present.

## Rule Details

This rule aims to ensure the validity of the Accessibility Object Model.

Examples of **incorrect** code for this rule:

```js
html` <span role="checkbox"></span> `;
```

```js
html` <div role="combobox"></div> `;
```

```js
html` <div role="slider"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <span role="alert" aria-atomic="foo" aria-live="foo"></span> `;
```

```js
html` <span role="checkbox" aria-checked="false" aria-labelledby="foo" tabindex="0"></span> `;
```

```js
html` <span role="row"></span> `;
```

```js
html` <input type="checkbox" role="switch" aria-checked="true" /> `;
```

```js
html` <div role="combobox" aria-controls="foo" aria-expanded="foo"></div> `;
```

## When Not To Use It

If you do not use ARIA roles in your lit-html templates.

## Further Reading

- [MDN: WAI-ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Web Fundamentals: Introduction to ARIA](https://developers.google.com/web/fundamentals/accessibility/semantics-aria/)
