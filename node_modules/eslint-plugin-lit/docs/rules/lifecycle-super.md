# Enforces calling `super` in lifecycle methods (lifecycle-super)

Enforces that `super` is called in lifecycle methods which require it.

For example, the `connectedCallback` should call `super.connectedCallback()` to
avoid interrupting lit's rendering.

## Rule Details

This rule enforces calling of `super` in the following lifecycle methods:

- `update`
- `connectedCallback`
- `disconnectedCallback`

The following patterns are considered warnings:

```ts
class Foo extends LitElement {
  connectedCallback() {
    doSomething();
  }
}
```

The following patterns are not warnings:

```ts
class Foo extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    doSomething();
  }
}
```

## When Not To Use It

If you want to override lit's default implementation of a lifecycle method,
you should disable this rule.
