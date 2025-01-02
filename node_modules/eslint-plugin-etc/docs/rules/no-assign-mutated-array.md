# Avoid assigning mutated arrays (`no-assign-mutated-array`)

This rule forbids the assignment of values returned by the `fill`, `reverse` and `sort` array methods. These methods modify the array in place and return the array itself. When assigned to a variable - or passed to a function as an argument - the code _reads_ like it returns a modified copy of the array, but it does not.

Assignment is allowed in situations in which `fill`, `reverse` or `sort` is called on an intermediate array.

## Rule details

Examples of **incorrect** code for this rule:

```ts
const sorted = names.sort();
```

```ts
print(names.sort());
```

Examples of **correct** code for this rule:

```ts
names.sort();
```

```ts
const sorted = names.map(({ first }) => first).sort();
```

```ts
names.sort();
print(names);
```

## Options

This rule has no options.

## Further reading

- [Be Careful with Array Mutators](https://ncjamieson.com/be-careful-with-array-mutators/)