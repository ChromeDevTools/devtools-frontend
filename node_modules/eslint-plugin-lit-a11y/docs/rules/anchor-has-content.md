# anchor-has-content

Enforce that anchors have content and that the content is accessible to screen readers. Accessible means that it is not hidden using the `aria-hidden` attribute. Refer to the references to learn about why this is important.

## Rule Details

This rule aims to...

Examples of **incorrect** code for this rule:

```js
html`
  <a></a>
  <a><some-text-bearing-component aria-hidden></some-text-bearing-component></a>
`;
```

Examples of **correct** code for this rule:

```js
html`
  <a>Anchor Content!</a>
  <a><some-text-bearing-component></some-text-bearing-component></a>
`;
```

## Further Reading

- [WCAG 2.4.4](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context)
- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
- [axe-core, link-name](https://dequeuniversity.com/rules/axe/3.2/link-name)
