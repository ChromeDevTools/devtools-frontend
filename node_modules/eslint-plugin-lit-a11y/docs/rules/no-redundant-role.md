# no-redundant-role

Enforce explicit role property is not the same as implicit/default role property on element.

Some HTML elements have implicit roles. For example, a `<dialog>` element has the implicit role `dialog`.
For those elements, there's no need to define a role unless you need to explicity change the existing one.

## Rule Details

This rule aims to prevent redundant use of the `role` attribute.

Examples of **incorrect** code for this rule:

```js
html` <dialog role="dialog"></dialog> `;
```

```js
html` <button role="button"></button> `;
```

```js
html` <a href="foo" role="link"></a> `;
```

Examples of **correct** code for this rule:

```js
html` <img role="presentation" /> `;
```

## When Not To Use It

If you do not use ARIA roles in your lit-html templates.

## Further Reading

- [MDN: WAI-ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Web Fundamentals: Introduction to ARIA](https://developers.google.com/web/fundamentals/accessibility/semantics-aria/)
