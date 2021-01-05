# heading-has-content

Enforce that heading elements (`h1`, `h2`, etc.) have content and that the content is accessible to screen readers. Accessible means that it is not hidden using the `aria-hidden` attribute. Refer to the references to learn about why this is important.

## Rule Details

This rule aims to...

Examples of **incorrect** code for this rule:

```js
html`
  <h1>
    <div aria-hidden="true">foo</div>
  </h1>
`;
```

```js
html` <h1></h1> `;
```

Examples of **correct** code for this rule:

```js
html` <h1>Foo</h1> `;
```

```js
html`
  <h1>
    <div aria-hidden="true">foo</div>
    foo
  </h1>
`;
```

### Options

The `customHeadingElements` option lets you specify tag names to include in this rule, for example, if you have a custom element which implements heading semantics.

```js
customElements.define(
  'custom-heading',
  class CustomHeading extends HTMLElement {
    static get observedAttributes() {
      return ['level'];
    }

    get level() {
      const parsed = parseInt(this.getAttribute('level'));
      if (!Number.isNaN(parsed)) return parsed;
      else return null;
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (typeof this.level === 'number') this.render();
    }

    render() {
      const heading = `h${this.level}`;
      this.shadowRoot.innerHTML = `
      <${heading}>
        <slot></slot>
      </${heading}>
    `;
    }
  },
);
```

```json
{
  "rules": {
    "lit-a11y/heading-has-content": [
      "error",
      {
        "customHeadingElements": ["custom-heading"]
      }
    ]
  }
}
```

Examples of **incorrect** code with `customHeadingElements: ["custom-heading"]`:

```js
html` <custom-heading></custom-heading> `;
```

Examples of **incorrect** code with `customHeadingElements: ["custom-heading"]`:

```js
html`
  <custom-heading>Heading</custom-heading>
  <custom-heading><span>Heading</span></custom-heading>
  <custom-heading>${foo}</custom-heading>
`;
```

## Further Reading

- [WCAG 2.4.6](https://www.w3.org/TR/UNDERSTANDING-WCAG20/navigation-mechanisms-descriptive.html)
- [axe-core, empty-heading](https://dequeuniversity.com/rules/axe/3.2/empty-heading)
