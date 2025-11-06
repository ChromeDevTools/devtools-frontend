# Disallows unencoded HTML entities in attribute values (attribute-value-entities)

Reserved characters should be encoded as HTML entities in attribute
values to avoid parsing errors.

For example, `>` should be represented as `&gt;`.

## Rule Details

This rule disallows using unencoded reserved characters in attribute values.

The following patterns are considered warnings:

```ts
html`<x-foo attr=">">`;
html`<x-foo attr="<">`;
html`<x-foo attr="&">`;
html`<x-foo attr='"'>`;
```

The following patterns are not warnings:

```ts
html`<x-foo attr="value">`;
```

## When Not To Use It

If you don't care about potential parsing errors, then you will not
need this rule.
