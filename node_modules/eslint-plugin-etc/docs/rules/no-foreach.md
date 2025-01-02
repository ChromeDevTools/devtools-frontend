# Use `for` loops instead of `forEach` calls (`no-foreach`)

This rule forbids the use of the `forEach` method on the `Array`, `Map`, `NodeList` and `Set` types. Use a `for`/`of` statement instead.

## Rule details

Examples of **incorrect** code for this rule:

```ts
const answers = [42, 54];
answers.forEach(answer => console.log(answer));
```

Examples of **correct** code for this rule:

```ts
const answers = [42, 54];
for (const answer of answers) {
  console.log(answer);
}
```

```ts
import { of } from "rxjs";
of(42, 54).forEach(value => console.log(value));
```

## Options

This rule accepts a single option which is an object with a `types` property that indicates determines the types for which the rule is enforced. By default, the types are `Array`, `Map`, `NodeList` and `Set`.

```json
{
  "etc/no-foreach": [
    "error",
    { "types": ["Array", "Map", "NodeList", "Set"] }
  ]
}
```