# Disallows duplicate names in template bindings (no-duplicate-template-bindings)

Binding a property or attribute multiple times results in the previous
values being overwritten, thus making them useless.

## Rule Details

This rule disallows binding the same property multiple times in templates.

The following patterns are considered warnings:

```ts
html`<x-foo bar bar>`;
html`<x-foo bar=${x} bar=${y} baz>`;
```

The following patterns are not warnings:

```ts
html`<x-foo bar baz=${x}>`;
```

## When Not To Use It

If you don't care about repeated bindings, then you will not need this rule.
