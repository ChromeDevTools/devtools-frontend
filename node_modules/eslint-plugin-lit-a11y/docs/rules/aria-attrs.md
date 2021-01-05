# aria-attrs

Elements cannot use an invalid ARIA attribute. This will fail if it finds an `aria-*` property that is not listed in [WAI-ARIA States and Properties spec](https://www.w3.org/WAI/PF/aria-1.1/states_and_properties).

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <div aria-foo=""></div> `;
```

Examples of **correct** code for this rule:

```js
html` <div aria-labelledby="foo"></div> `;
```

## Further Reading

- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
