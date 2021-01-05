# aria-role

Elements with ARIA roles must use a valid, non-abstract ARIA role. A reference to role definitions can be found at [WAI-ARIA](https://www.w3.org/TR/wai-aria/#role_definitions) site.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <div role="foo"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <div role="alert"></div> `;
```

```js
html` <div role="navigation"></div> `;
```

```js
html` <div role="${foo}"></div> `;
```

```js
html` <div role=${foo}></div> `;
```

```js
html` <div></div> `;
```

## Further Reading

- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [Chrome Audit Rules, AX_ARIA_01](https://github.com/GoogleChrome/accessibility-developer-tools/wiki/Audit-Rules#ax_aria_01)
- [DPUB-ARIA roles](https://www.w3.org/TR/dpub-aria-1.0/)
