# aria-activedescendant-has-tabindex

`aria-activedescendant` is used to manage focus within a [composite widget](https://www.w3.org/TR/wai-aria/#composite).
The element with the attribute `aria-activedescendant` retains the active document
focus; it indicates which of its child elements has secondary focus by assigning
the ID of that element to the value of `aria-activedescendant`. This pattern is
used to build a widget like a search typeahead select list. The search input box
retains document focus so that the user can type in the input. If the down arrow
key is pressed and a search suggestion is highlighted, the ID of the suggestion
element will be applied as the value of `aria-activedescendant` on the input
element.

Because an element with `aria-activedescendant` must be tabbable, it must either
have an inherent `tabIndex` of zero or declare a `tabIndex` of zero with the `tabIndex`
attribute.

## Rule Details

This rule aims to...

Examples of **incorrect** code for this rule:

```js
html` <div aria-activedescendant=${someID}></div> `;
```

Examples of **correct** code for this rule:

```js
html` <div aria-activedescendant="foo" tabindex="0"></div> `;
```

## Further Reading

- [MDN, Using the aria-activedescendant attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-activedescendant_attribute)
