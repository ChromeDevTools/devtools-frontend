# no-invalid-change-handler

Enforce usage of `@blur` over/in parallel with `@change` on select menu elements for accessibility. `@blur` should be used instead of `@change`, unless absolutely necessary and it causes no negative consequences for keyboard only or screen reader users. `@blur` is a more declarative action by the user: for instance in a dropdown, using the arrow keys to toggle between options will trigger the `@change` event in some browsers. Regardless, when a change of context results from an `@blur` event or an `@change` event, the user should be notified of the change unless it occurs below the currently focused element.

## Rule Details

This rule aims to prevent accessibility problems with `<select>` and `<option>` controls.

Examples of **incorrect** code for this rule:

```js
html` <select @change=${foo}></select> `;
```

```js
html` <option @change=${foo}></option> `;
```

Examples of **correct** code for this rule:

```js
html` <select @blur=${foo}></select> `;
```

```js
html`
  <select @change="${foo}" @blur="${foo}"></div>
`;
```

## When Not To Use It

If you do not use `<select>` controls in your lit-html templates, or you are certain that your usage
of `change` conforms to [WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/on-input)

## Further Reading

- [Understanding Success Criterion 3.2.2: On Input](https://www.w3.org/WAI/WCAG21/Understanding/on-input)
