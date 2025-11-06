# Disallows usages of "non-public" property bindings (no-private-properties)

When following a naming convention to signify the visibility of properties, any which are non-public should
not be accessed by a consumer of the element. Such properties should be made public and documented
as such. For example, when following the convention of `private` properties being prefixed
by `__` (two underscores) and `protected` properties being prefixed by `_` (one underscore), it
should generally be required that only properties without a `__` or `_` prefix are accessed
from outside the element.

## Rule Details

This rule allows you to enforce that all properties being set on elements are public. By default, it enforces nothing.

## Options

You can specify a regular expression to be tested against when detecting the visibility of a property. `private` and `protected` are supported.

The following patterns are considered warnings with `{ "private": "^__" }` specified:

```ts
html`
  <x-foo .__bar=${x}></x-foo>
`;
```

The following patterns are not warnings with `{ "private": "^__" }` specified:

```ts
html`
  <x-foo ?__bar=${x}></x-foo>
`;
html`
  <x-foo ._bar=${x}></x-foo>
`;
html`
  <x-foo __bar=${x}></x-foo>
`;
html`
  <x-foo @__bar=${x}></x-foo>
`;
```

## When Not To Use It

If you do not want to enforce per-visibility naming rules for properties.
