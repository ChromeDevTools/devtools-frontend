# Disallows use of native attributes as properties (no-native-attributes)

Using global native attributes as lit properties can have unintended effects,
like for example the native `title` attribute will display a tooltip on hover
over your custom element, and and may affect the accessibility of your component
unintentionally.

## Rule Details

This rule disallows using global native attributes as lit properties.

The following patterns are considered warnings:

```ts
class MyEl extends LitElement {
  static get properties() {
    return {
      title: { type: String },
      role: { type: String }
    };
  }
}
```

The following patterns are not warnings:

```ts
class MyEl extends LitElement {
  static get properties() {
    return {
      foo: { type: String }
    };
  }
}
```

## When Not To Use It

If you don't care about overriding global native attributes.
