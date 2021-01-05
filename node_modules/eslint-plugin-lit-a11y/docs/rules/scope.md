# scope

Enforce scope attribute is only used on &lt;th&gt; elements.
The scope attribute may only be used on `<th>` elements.

## Rule Details

This rule aims to prevent invalid use of `scope` attribute.

Examples of **incorrect** code for this rule:

```js
html` <td scope="row"></td> `;
```

```js
html` <div scope="col"></div> `;
```

```js
html` <th scope="foo"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <th scope="col"></th> `;
```

```js
html` <th scope="row"></th> `;
```

```js
html` <th scope="colgroup"></th> `;
```

```js
html` <th scope="rowgroup"></th> `;
```

```js
html` <foo-bar scope="col"></div> `;
```

```js
html` <foo-bar scope="row"></div> `;
```

```js
html` <foo-bar scope="foo"></div> `;
```

## When Not To Use It

When you do not use the `scope` attribute in your lit-html templates.

## Further Reading

- [MDN: `<th>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#attr-scope)
- [WebAIM: Creating Accessible Tables](https://webaim.org/techniques/tables/data#headers)
