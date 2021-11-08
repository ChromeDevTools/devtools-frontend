# Disallows invalid binding positions in templates (binding-positions)

Expression bindings will cause problems when parsing templates if they
are used in tag names, HTML comments or attribute names.

## Rule Details

This rule disallows bindings in tag and attribute name positions.

The following patterns are considered warnings:

```ts
html`<x-foo ${expr}="bar">`;
html`<x-foo></${expr}>`;
html`<${expr} attr="bar">`;
html`<!-- ${expr} -->`;
html`<input .value=${foo}/>`;
```

The following patterns are not warnings:

```ts
html`<x-foo attr=${expr}>`;
html`<!-- \${expr} -->`;
html`<input .value=${foo} />`;
html`<input .value="${foo}"/>`;
```

In particular, note that you may escape an expression inside a comment
by using the backslash (`\`) character.

## When Not To Use It

If you don't care about potential parsing errors, then you will not
need this rule.
