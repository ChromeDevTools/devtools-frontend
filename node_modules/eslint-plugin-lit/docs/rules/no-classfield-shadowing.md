# Disallows class fields with same name as reactive properties

Class fields set with same names as reactive properties will not trigger updates as expected. They will overwrite
accessors used for detecting changes. See https://lit.dev/msg/class-field-shadowing for more information.

## Rule Details

This rule disallows class fields with same name as reactive properties.

The following patterns are considered warnings:

```ts
class MyEl extends LitElement {
  foo;

  static properties = {
    foo: {}
  }
}
```

The following patterns are not warnings:

```ts
class MyEl extends LitElement {
  static properties = {
    foo: {}
  }
}
```

## When Not To Use It

If you don't care about class fields with same name as static properties.
