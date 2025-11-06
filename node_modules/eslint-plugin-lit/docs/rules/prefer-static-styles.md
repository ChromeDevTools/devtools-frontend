# Enforces the use of static styles in elements (prefer-static-styles)

Static styles should be used instead of inline style tags for performance
benefits.

## Rule Details

This rule enforces the use of static styles.

## Options

### always (default)

The following patterns are considered warnings:

```ts
class Foo extends LitElement {
  render() {
    return html`
      <style>.foo { display: block; }</style>
    `;
  }
}
```

The following patterns are not warnings:

```ts
class Foo extends LitElement {
  static styles = css`.foo { display: block; }`;
}
```

### never

The following patterns are considered warnings:

```ts
class Foo extends LitElement {
  static styles = css`.foo { display: block; }`;
}
```

The following patterns are not warnings:

```ts
class Foo extends LitElement {
  render() {
    return html`
      <style>.foo { display: block; }</style>
    `;
  }
}
```

## When Not To Use It

If you have a mixture of static styles and inline stylesheets, you may
not want to use this rule.
