# no-access-key

Enforce no accesskey attribute on element. Access keys are HTML attributes that allow web developers to assign keyboard shortcuts to elements. Inconsistencies between keyboard shortcuts and keyboard commands used by screenreader and keyboard only users create accessibility complications so to avoid complications, access keys should not be used.

## Rule Details

This rule takes no arguments.

Examples of **incorrect** code for this rule:

```js
html` <a accesskey="j"></a> `;
html` <a accesskey="${foo}"></a> `;
html` <a accesskey="${'f'}"></a> `;
```

Examples of **correct** code for this rule:

```js
html` <div></div> `;
```

## Further Reading

- [WebAIM, Keyboard Accessibility: Accesskey](http://webaim.org/techniques/keyboard/accesskey#spec)
