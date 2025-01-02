# Avoid throwing non-Error values (`throw-error`)

This rule forbids throwing or rejecting values that are neither `Error` nor `DOMException` instances.

## Rule details

Examples of **incorrect** code for this rule:

```ts
throw "Kaboom!";
```

```ts
const promise = Promise.reject("Kaboom!");
```

```ts
const promise = new Promise((resolve, reject) => {
  reject("Kaboom!");
});
```

Examples of **correct** code for this rule:

```ts
throw new Error("Kaboom!");
```

```ts
throw new RangeError("Kaboom!");
```

```ts
throw new DOMException("Kaboom!");
```

```ts
const promise = Promise.reject(new Error("Kaboom!"));
```

```ts
const promise = new Promise((resolve, reject) => {
  reject(new Error("Kaboom!"));
});
```

## Options

This rule has no options.