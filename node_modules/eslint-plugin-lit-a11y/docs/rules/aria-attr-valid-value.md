# aria-attr-valid-value

ARIA state and property values must be valid.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <span aria-hidden="yes">foo</span> `;
```

Examples of **correct** code for this rule:

```js
html` <span aria-hidden="true">foo</span> `;
```

## Further Reading

- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [ARIA Spec, States and Properties](https://www.w3.org/TR/wai-aria/#states_and_properties)
- [Chrome Audit Rules, AX_ARIA_04](https://github.com/GoogleChrome/accessibility-developer-tools/wiki/Audit-Rules#ax_aria_04)
