# no-autofocus

Enforce that autofocus attribute is not used on elements. Autofocusing elements can cause usability issues for sighted and non-sighted users, alike.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html`
  <input autofocus />
  <input autofocus="true" />
  <input autofocus="false" />
  <input autofocus=${foo} />
  <input .autofocus=${foo} />
  <input .autofocus=${true} />
  <input .autofocus=${false} />
`;
```

Examples of **correct** code for this rule:

```js
html` <input /> `;
```

### Resources

- [WHATWG HTML Standard, The autofocus attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-fe-autofocus)
- [The accessibility of HTML 5 autofocus](https://www.brucelawson.co.uk/2009/the-accessibility-of-html-5-autofocus/)
