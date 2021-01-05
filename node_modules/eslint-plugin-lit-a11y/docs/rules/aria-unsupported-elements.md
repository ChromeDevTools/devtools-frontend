# aria-unsupported-elements

Certain reserved DOM elements do not support ARIA roles, states and properties. This is often because they are not visible, for example `meta`, `script`, and `style`. This rule enforces that these DOM elements do not contain the role and/or aria-\* attributes.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <meta charset="UTF-8" aria-hidden="false" /> `;
html` <script role="foo"></script> `;
html` <style aria-hidden="foo"></style> `;
html` <style role="foo" aria-hidden="foo"></style> `;
```

Examples of **correct** code for this rule:

```js
html` <script src="./foo.js"></script> `;
html` <meta charset="UTF-8" /> `;
html` <style></style> `;
```

## Further Reading

- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [Chrome Audit Rules, AX_ARIA_12](https://github.com/GoogleChrome/accessibility-developer-tools/wiki/Audit-Rules#ax_aria_12)
- [DPUB-ARIA roles](https://www.w3.org/TR/dpub-aria-1.0/)
