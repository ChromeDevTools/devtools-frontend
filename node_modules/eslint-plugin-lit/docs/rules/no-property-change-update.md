# Disallows property changes in the `update` lifecycle method after a super call (no-property-change-update)

Property changes in the `update` lifecycle method will not trigger a re-render
unless `super.update` is called _after_ the changes.

## Rule Details

This rule disallows assigning to observed properties in the `update` method
after `super.update` has been called.

The following patterns are considered warnings:

```ts
static get properties() {
  return { prop: { type: Number } };
}
update() {
  super.update();
  this.prop = 5;
}
```

The following patterns are not warnings:

```ts
class A extends LitElement {
  static get properties() {
    return {};
  }
  update() {
    this.unobserved = 5;
  }
}

class B extends LitElement {
  static get properties() {
    return { prop: { type: Number } };
  }
  update() {
    this.prop = 5;
    super.update();
  }
}
```

## When Not To Use It

If you are aware of the fact a render won't happen in these cases but still
wish to mutate the properties, you should not use this rule.
