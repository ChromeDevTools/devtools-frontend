# Enforces that `value` is bound on an input after validation constraints (value-after-constraints)

When binding both the `value` of an input and a validation constraint such
as `min`, you should ensure the `value` is bound _last_ such that the
constraints are enabled before the value is set.

## Rule Details

This rule disallows setting the `value` of an input before any validation
constraints are also bound.

The following patterns are considered warnings:

```ts
html`<input .value=${expr} min=${expr2}>`;

html`<input value=${expr} min=${expr2}>`;
```

The following patterns are not warnings:

```ts
html`<input .value=${expr} min=100>`;
html`<input min=${expr2} .value=${expr}>`;
```

## When Not To Use It

If you are not concerned with applying input validation to the values
you initially set, do not use this rule.
