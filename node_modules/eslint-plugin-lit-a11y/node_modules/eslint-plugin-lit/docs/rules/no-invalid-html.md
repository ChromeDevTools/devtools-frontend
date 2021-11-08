# Disallows invalid HTML in templates (no-invalid-html)

Templates should all contain valid HTML, if any, as it is expected
to be parsed as part of rendering.

## Rule Details

This rule disallows invalid HTML in templates.

The following patterns are considered warnings:

```ts
html`<x-foo />`;
html`<x-foo invalid"attribute></x-foo>`;
```

The following patterns are not warnings:

```ts
html`<x-foo bar=${true}></x-foo>`;
```

## When Not To Use It

If you don't care about invalid HTML, then you will not need this rule.
