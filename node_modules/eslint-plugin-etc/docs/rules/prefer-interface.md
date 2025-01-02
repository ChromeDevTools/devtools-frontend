# Use interfaces instead of type aliases (`prefer-interface`)

_Some time after this rule was written, Anders Hejlsberg opened a PR that [preserves type aliases for union and intersection types](https://github.com/microsoft/TypeScript/pull/42149). That PR's changes should included in TypeScript 4.2, so when that version is released, the reasons for preferring interfaces might be less compelling._

---

This rule effects failures for type alias declarations that can be declared as interfaces.

> Honestly, my take is that it should really just be interfaces for anything that they can model. There is no benefit to type aliases when there are so many issues around display/perf.
>
> We tried for a long time to paper over the distinction because of people's personal choices, but ultimately unless we actually simplify the types internally (could happen) they're not really the same, and interfaces behave better.
>
> &mdash; Daniel Rosenwasser [October 22, 2020](https://twitter.com/drosenwasser/status/1319205169918144513)

## Rule details

Examples of **incorrect** code for this rule:

```ts
type Person = {
    age: number;
    name: string;
};
```

```ts
type Comparator<T> = (left: T, right: T) => number;
```

Examples of **correct** code for this rule:

```ts
interface Person {
    age: number;
    name: string;
}
```

```ts
interface Comparator<T> {
    (left: T, right: T): number;
}
```

```ts
type Worker = Person | Robot;
```

```ts
type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};
```

## Options

This rule accepts a single option which is an object with `allowIntersection` and `allowLocal` properties.

The `allowIntersection` option defaults to `true`. If set to `false`, the rule will disallow type aliases that are intersections:

<!-- prettier-ignore -->
```ts
interface Name { name: string; }
interface Age { age: number; }
type T = Name & Age;
```

and the rules fixer will replace the type alias declaration with an interface:

<!-- prettier-ignore -->
```ts
interface Name { name: string; }
interface Age { age: number; }
interface T extends Name, Age {}
```

The `allowLocal` option determines whether local - i.e. non-exported - type aliases that could be declared as interfaces are allowed. By default, they are not.

```json
{
    "etc/prefer-interface": [
        "error",
        {
            "allowIntersection": true,
            "allowLocal": true
        }
    ]
}
```

## Related to

-   [`no-type-alias`](https://github.com/typescript-eslint/typescript-eslint/blob/880ac753b90d63034f0a33f8f512d9fabc17c8f9/packages/eslint-plugin/docs/rules/no-type-alias.md)

## Further reading

-   The [Twitter thread](https://twitter.com/robpalmer2/status/1319188885197422594) from which the above quote was taken.
-   [Prefer Interfaces](https://ncjamieson.com/prefer-interfaces)
