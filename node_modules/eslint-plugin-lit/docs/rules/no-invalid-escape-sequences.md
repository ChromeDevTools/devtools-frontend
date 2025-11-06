# Disallows invalid escape sequences in template strings (no-invalid-escape-sequences)

Some escape sequences are invalid inside template strings and will
cause a parse error or similar.

An example is if we were to template octal:

```ts
html`an octal escape sequence: \123`;
```

This should instead be escaped twice to ensure it remains intact:

```ts
html`an octal escape sequence: \\123`;
```

Alternatively, if you did mean to insert the value as is, you
should likely use hex or unicode instead: `\xFF`.

## Rule Details

This rule disallows invalid escape sequences in templates.

The following patterns are considered warnings:

```ts
html`foo \2c bar`; // because \2 is octal
html`foo \123 bar`; // because \1 is octal
html`foo \0123`;
```

The following patterns are not warnings:

```ts
html`foo \\2c bar`;
html`foo \xFF bar`;
html`foo \u0002 bar`;
```

## When Not To Use It

If you don't care about invalid escape sequences, then you
will not need this rule.
