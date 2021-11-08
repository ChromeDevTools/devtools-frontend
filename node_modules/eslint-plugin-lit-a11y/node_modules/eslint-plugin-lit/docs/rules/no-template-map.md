# Disallows array `.map` in templates (no-template-map)

Mapping arrays in templates can be difficult to read.

Instead, you should do something like so:

```ts
_render() {
  const items = this.arr.map((item) => html`<span>${item}</span>`);

  return html`<div>${items}</div>`;
}
```

## Rule Details

This rule disallows using `.map` on arrays in templates.

The following patterns are considered warnings:

```ts
html`<div>${arr.map(i => i+1)}</div>`;
html`<div>${arr.map(i => html`<span>${i}</span>`)}</div>`;
```

The following patterns are not warnings:

```ts
html`foo ${someVar}`;
```

## When Not To Use It

If you don't care about readability of your templates, then you will not need this rule.
