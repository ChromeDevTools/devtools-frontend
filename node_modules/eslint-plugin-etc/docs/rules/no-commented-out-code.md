# Avoid commented-out code (`no-commented-out-code`)

This rule forbids commented-out code by effecting failures for comment blocks can be parsed without error.

The rule uses a relatively simple heuristic and if a comment is mistakenly deemed to be commented out code, using `/// ...` or `/*/ ... */` will function as a workaround.

## Rule details

Examples of **incorrect** code for this rule:

```ts
// const answer = 54;
const answer = 42;
```

Examples of **correct** code for this rule:

```ts
// This comment is not code.
const answer = 42;
```

```ts
// This comment includes code as an example:
// const answer = 54;
// However, the comment - treated as a block - won't parse, so it won't effect
// a failure.
const answer = 42;
```

## Options

This rule has no options.
