# alt-text

Enforce that all elements that require alternative text have meaningful information to relay back to the end user. This is a critical component of accessibility for screen reader users in order for them to understand the content's purpose on the page. By default, this rule checks for alternative text on `<img>` elements.

This rule also permits images which are completely removed from the <acronym>AOM (Accessibility Object Model)</acronym>:

> **Sometimes there is non-text content that really is not meant to be seen or understood by the user.** Transparent images used to move text over on a page; an invisible image that is used to track usage statistics; and a swirl in the corner that conveys no information but just fills up a blank space to create an aesthetic effect are all examples of this. Putting alternative text on such items just distracts people using screen readers from the content on the page. Not marking the content in any way, though, leaves users guessing what the non-text content is and what information they may have missed (even though they have not missed anything in reality). This type of non-text content, therefore, is marked or implemented in a way that assistive technologies (AT) will ignore it and not present anything to the user.

- [WCAG 1.1.1](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html#examples)

## Rule Details

Examples of **incorrect** code for this rule:

```js
html`
  <img src="${src}" />
  <div role="img"></div>
`;
```

Examples of **correct** code for this rule:

```js
html`
  <img src="${src}" alt="" />

  <img src="${src}" aria-hidden="true" />

  <img src="${src}" alt="foo" />

  <img src="${src}" aria-label="foo" />

  <label id="label">foo</label>
  <img src="${src}" aria-labelledby="label" />

  <div role="img" aria-label="foo"></div>

  <div role="img" aria-labelledBy="label"></div>

  <div role="img" aria-hidden="true"></div>
`;
```

## Further Reading

- [WCAG 1.1.1](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
- [axe-core, object-alt](https://dequeuniversity.com/rules/axe/3.2/object-alt)
- [axe-core, image-alt](https://dequeuniversity.com/rules/axe/3.2/image-alt)
- [axe-core, input-image-alt](https://dequeuniversity.com/rules/axe/3.2/input-image-alt)
- [axe-core, area-alt](https://dequeuniversity.com/rules/axe/3.2/area-alt)
