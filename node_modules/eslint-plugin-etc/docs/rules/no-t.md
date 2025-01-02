# Use descriptive type parameters (`no-t`)

This rule forbids the use of single-character type parameters.

## Rule details

Examples of **incorrect** code for this rule:

```ts
function toArray<T>(elements: ArrayLike<T>) {
  return Array.from(elements);
}
```

```ts
type Entry<K, V> = {
  key: K;
  value: V;
};
```

Examples of **correct** code for this rule:

```ts
function toArray<Element>(elements: ArrayLike<Element>) {
  return Array.from(elements);
}
```

```ts
type Entry<Key, Value> = {
  key: Key;
  value: Value;
};
```

## Options

This rule accepts a single option which is an object with a `prefix` property that indicates the prefix - if any - that must be used for all type parameters. By default, there is no prefix.

```json
{
  "etc/no-t": [
    "error",
    { "prefix": "T" }
  ]
}
```
