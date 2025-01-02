# Use less-than instead of greater-than comparisons (`prefer-less-than`)

Yes, this is the rule for [Ben Lesh comparisons](https://twitter.com/BenLesh/status/1397593619096166400).

## Rule details

Examples of **incorrect** code for this rule:

```ts
if (x > a && x < b) { /* .. */ }
```

```ts
if (x >= a && x =< b) { /* .. */ }
```

Examples of **correct** code for this rule:

```ts
if (a < x && x < b) { /* .. */ }
```

```ts
if (a <= x && x =< b) { /* .. */ }
```