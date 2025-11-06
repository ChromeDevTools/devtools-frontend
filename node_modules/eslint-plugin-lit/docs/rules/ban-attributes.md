# Disallows a set of attributes from being used (ban-attributes)

You may prefer to disallow some attributes for various reasons in templates,
this simply allows you to create such a denylist.

## Rule Details

This rule disallows a list of attributes within templates.

The following patterns are considered warnings:

```ts
/*eslint lit/ban-attributes: ["error", "attr"] */
html`<x-foo attr>`;
```

The following patterns are not warnings:

```ts
html`<x-foo attr>`;
```

## When Not To Use It

If you don't have any particular attributes you wish to disallow, you do not
need this rule.
