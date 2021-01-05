# role-supports-aria-attr

Enforce that elements with a defined role contain only supported ARIA attributes for that role.
Some ARIA attributes are invalid when used with certain roles.

## Rule Details

This rule aims to ensure the validity of the Accessibility Object Model.

Examples of **incorrect** code for this rule:

```js
html` <li aria-required role="radio" aria-checked="false">Rainbow Trout</li> `;
```

```js
html` <div role="combobox" aria-checked="true"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <div role="checkbox" aria-checked="true"></div> `;
```

```js
html` <div role="presentation"></div> `;
```

## When Not To Use It

If you do not use ARIA roles in your lit-html templates.

## Further Reading

- [MDN: WAI-ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Web Fundamentals: Introduction to ARIA](https://developers.google.com/web/fundamentals/accessibility/semantics-aria/)
