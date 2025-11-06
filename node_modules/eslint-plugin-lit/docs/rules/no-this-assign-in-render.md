# Disallows assignments to members of `this` in render methods (no-this-assign-in-render)

Assignments to `this` in the render method of a `LitElement` are generally a
mistake since it should ideally act like a pure function.

Property updates should usually happen in the other lifecycle methods
(e.g. `updated`) or in event handlers.

## Rule Details

This rule disallows assigning to `this` in the render method.

The following patterns are considered warnings:

```ts
render() {
  this.prop = 5;
}
```

The following patterns are not warnings:

```ts
render() {
  const prop = 5;
}

updated() {
  this.prop = 5;
}
```

## When Not To Use It

If you have non-observed properties you wish to update per render, you may
want to disable this rule.
