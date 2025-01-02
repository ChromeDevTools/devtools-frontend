# Prefix internal APIs with underscores (`underscore-internal`)

Ensures that APIs tagged with `@internal` are prefixed with underscores, as that's the convention stipulated by [api-extractor](https://api-extractor.com/):

> To emphasize this, an underscore prefix should be used in the name of a declaration with an (explicit) `@internal` tag. API Extractor validates this naming convention and will report [ae-internal-missing-underscore](API Extractor validates this naming convention and will report ae-internal-missing-underscore if the underscore is missing) if the underscore is missing.

## Rule details

Examples of **incorrect** code for this rule:

<!-- prettier-ignore -->
```ts
/**
 * @internal
 */
export function enableLogging() { /* ... */ }
```

Examples of **correct** code for this rule:

<!-- prettier-ignore -->
```ts
/**
 * @internal
 */
export function _enableLogging() { /* ... */ }
```
