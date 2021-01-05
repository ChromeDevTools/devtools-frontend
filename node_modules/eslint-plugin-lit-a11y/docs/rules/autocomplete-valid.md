# autocomplete-valid

Ensure the autocomplete attribute is correct and suitable for the form field it is used with.

## Rule Details

This rule aims to...

Examples of **incorrect** code for this rule:

```js
html` <input type="text" autocomplete="foo" /> `;
```

```js
html` <input type="date" autocomplete="email" />; `;
```

Examples of **correct** code for this rule:

```js
html` <input type="text" autocomplete="name" /> `;
```

```js
html` <input type="text" autocomplete=${autocompl} /> `;
```

```js
html` <input type="text" autocomplete="section-somewhere shipping work email" />; `;
```

## Further Reading

- [WCAG 1.3.5](https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose)
- [axe-core, autocomplete-valid](https://dequeuniversity.com/rules/axe/3.2/autocomplete-valid)
- [HTML 5.2, Autocomplete requirements](https://www.w3.org/TR/html52/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute)
