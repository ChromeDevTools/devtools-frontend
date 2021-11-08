# Enforces the presence or absence of quotes around expressions (quoted-expressions)

Expressions do not need to be surrounded by quotes when being bound to
attributes and properties in templates, though stylistically you may want
to enforce the presence of them or the absence of them.

## Rule Details

This rule enforces the absence or presence of quotes around expressions
in template bindings.

## Options

### never

The following patterns are considered warnings:

```ts
/* eslint "lit/quoted-expressions": "error" */

html`<x-foo attr="${val}"></x-foo>`;
html`<x-foo .prop="${val}"></x-foo>`;
```

The following patterns are not warnings:

```ts
/* eslint "lit/quoted-expressions": "error" */

html`<x-foo attr=${val}></x-foo>`;
html`<x-foo prop=${val}></x-foo>`;
```

### always

The following patterns are considered warnings:

```ts
/* eslint "lit/quoted-expressions": ["error", "always"] */

html`<x-foo attr=${val}></x-foo>`;
html`<x-foo .prop=${val}></x-foo>`;
```

The following patterns are not warnings:

```ts
/* eslint "lit/quoted-expressions": ["error", "always"] */

html`<x-foo attr="${val}"></x-foo>`;
html`<x-foo prop="${val}"></x-foo>`;
```

## When Not To Use It

If you do not care whether there are surrounding quotes or not, do not
use this rule.
