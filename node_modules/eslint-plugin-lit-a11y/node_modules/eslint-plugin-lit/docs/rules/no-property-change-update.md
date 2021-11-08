# Disallows property changes in the `update` lifecycle method (no-property-change-update)

Property changes in the `update` lifecycle method will not trigger a re-render
so, when encountered, are usually due to a typo of `updated`.

## Rule Details

This rule disallows assigning to observed properties in the `update` method.

The following patterns are considered warnings:

```ts
static get properties() {
  return { prop: { type: Number } };
}
update() {
  this.prop = 5;
}
```

The following patterns are not warnings:

```ts
static get properties() {
  return {};
}
update() {
  this.unobserved = 5;
}
```

## When Not To Use It

If you don't care about potential spelling errors of the `updated` method,
then you will not need this rule.
