# tabindex-no-positive

Enforce tabIndex value is not greater than zero.
HTML allows authors to specify an exact tab order for elements with the `tabindex` attribute,
but doing so can interfere with assistive technology. Authors should prefer to let the browser
determine the tab order by only using `-1` and `0` as values to the `tabindex` attribute.

## Rule Details

This rule aims to prevent degradation of keyboard accessibility for keyboard-focusable elements.

Examples of **incorrect** code for this rule:

```js
html` <div tabindex="1"></div> `;
```

```js
html` <div tabindex="2"></div> `;
```

```js
html` <div tabindex="foo"></div> `;
```

Examples of **correct** code for this rule:

```js
html` <div tabindex="0"></div> `;
```

```js
html` <div tabindex="-1"></div> `;
```

## When Not To Use It

If your lit-html templates do not make use of the tabindex attribute.

## Further Reading

[WebAIM: Keyboard Accessibility Page 2: Tabindex](https://webaim.org/techniques/keyboard/tabindex)
