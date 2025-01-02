# Avoid const enum declarations (`no-const-enum`)

This rule forbids `const enum` declarations. Programs that use `const enum` declarations cannot be compiled using without fully checking the program's types. That means they are not compatible with TypeScript's `transpileModule` function nor can they be transpiled with Babel.

## Options

This rule accepts a single option which is an object with an `allowLocal` property that determines whether local - i.e. non-exported - const enums are allowed. By default, they are not.

```json
{
  "etc/no-const-enum": [
    "error",
    { "allowLocal": true }
  ]
}
```

## Related to

- [`no-enum`](./no-enum.md)

## Further reading

- [const enums](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums)
- [Don’t Export const enums](https://ncjamieson.com/dont-export-const-enums/)