# Use type-safe error callbacks (`no-implicit-any-catch`)

This rule requires an explicit type annotation for error parameters in promise `catch` callbacks. It's similar to the TypeScript [`no-implicit-any-catch`](https://github.com/typescript-eslint/typescript-eslint/blob/e01204931e460f5e6731abc443c88d666ca0b07a/packages/eslint-plugin/docs/rules/no-implicit-any-catch.md) rule, but is for promises - not `try`/`catch` statements.

## Rule details

Examples of **incorrect** code for this rule:

```ts
Promise
  .reject(new Error("Kaboom!")
  .catch(error => console.log(error));
```

Examples of **correct** code for this rule:

```ts
Promise
  .reject(new Error("Kaboom!")
  .catch((error: unknown) => console.log(error));
```

## Options

This rule accepts a single option which is an object with an `allowExplicitAny` property that determines whether or not the error variable can be explicitly typed as `any`. By default, the use of explicit `any` is forbidden.

```json
{
  "etc/no-implicit-any-catch": [
    "error",
    { "allowExplicitAny": true }
  ]
}
```

## Related

- [`no-implicit-any-catch`](https://github.com/typescript-eslint/typescript-eslint/blob/e01204931e460f5e6731abc443c88d666ca0b07a/packages/eslint-plugin/docs/rules/no-implicit-any-catch.md)

## Further reading

- [Catching Unknowns](https://ncjamieson.com/catching-unknowns/)