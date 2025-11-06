# Enforces use of `nothing` constant over empty templates (prefer-nothing)

`nothing` is a constant provided by lit which may be used to render
nothing. This is far more efficient than creating an empty template.

This means you can do something like:

```ts
_render() {
  if (!condition) {
    return nothing;
  }

  return html`Hello there`;
}
```

## Rule Details

This rule enforces the use of `nothing` rather than empty templates.

The following patterns are considered warnings:

```ts
html``;
const tpl = html``;

function render() {
  return html``;
}
```

The following patterns are not warnings:

```ts
html`foo`;
html` `; // whitespace
```

## When Not To Use It

If you prefer using empty templates or don't yet have lit 2.x (which provides
the `nothing` constant), you should not use this rule.
