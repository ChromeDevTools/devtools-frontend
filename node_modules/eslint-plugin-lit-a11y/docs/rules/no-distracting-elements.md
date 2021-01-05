# no-distracting-elements

Enforces that no distracting `<marquee>` or `<blink>` elements are used. These elements are visually distracting and can cause accessibility issues with visually impaired users. Such elements are also deprecated, and should not be used.

## Rule Details

Examples of **incorrect** code for this rule:

```js
html` <marquee>Can't read this</marquee> `;
```

```js
html` <blink>Can't read this</blink> `;
```

Examples of **correct** code for this rule:

```js
html` <span class="highlight">Readable Content</span> `;
```

## Accessibility guidelines

- [WCAG 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide)

### Resources

- [axe-core, marquee](https://dequeuniversity.com/rules/axe/3.2/marquee)
- [axe-core, blink](https://dequeuniversity.com/rules/axe/3.2/blink)
