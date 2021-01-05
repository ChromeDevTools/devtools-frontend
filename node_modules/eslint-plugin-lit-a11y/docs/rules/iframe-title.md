# iframe-title

`<iframe>` elements must have a unique title property to indicate its content to the user.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <iframe src="${foo}"></iframe> `;
```

Examples of **correct** code for this rule:

```js
html` <iframe title="Foo" src="${foo}"></iframe> `;
```

## Further Reading

- [WCAG 2.4.1](https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks)
- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [axe-core, frame-title](https://dequeuniversity.com/rules/axe/3.2/frame-title)
