# Disallows redundant literal values in templates (no-useless-template-literals)

Literal values being interpolated into templates are redundant.

## Rule Details

This rule disallows using literal values in templates.

The following patterns are considered warnings:

```ts
html`foo ${'bar'}`;
html`foo ${true}`;
```

The following patterns are not warnings:

```ts
html`foo ${someVar}`;
```

## When Not To Use It

If you don't care about interpolating literal values, then you will not need this rule.
