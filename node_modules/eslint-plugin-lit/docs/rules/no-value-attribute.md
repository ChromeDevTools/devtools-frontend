# Detects usages of the `value` attribute (no-value-attribute)

Often with input elements, the `value` attribute is bound rather than
the property by the same name. This can lead to binding issues as only
the initial value is then set.

## Rule Details

This rule disallows use of the value attribute on input elements.

The following patterns are considered warnings:

```ts
html`<input value=${x} />`;
html`<input value=${"foo"} />`;
```

The following patterns are not warnings:

```ts
html`<x-foo value=${x}>`;
html`<input value="foo" />`;
```

## When Not To Use It

If you wish to bind the `value` attribute, you will not need this rule.
