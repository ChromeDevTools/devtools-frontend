# Custom ESLint rules for Chromium DevTools

The [`lib/` folder](./lib/) contains a set of [ESLint](https://eslint.org) rules
specific to Chromium DevTools. These rules are executed as part of the

```
npm run lint
```

command and implicitly via the [Presubmit checks](../../test/README.md#Presubmit-checks).

We follow the ESLint [Rule Naming Conventions](https://eslint.org/docs/latest/contribute/core-rules#rule-naming-conventions)
and consistently use dashes to separate words (instead of underscores), and prefix
all rules that disallow something with `no-`.

## Testing the rules

When writing a custom ESLint rule, place the logic into a file `lib/foo.ts` and
add a corresponding test for the logic to `tests/foo.test.ts`.

You can use

```
npm run test -- ./scripts/eslint_rules/tests
```

to run the tests for the custom ESLint rules.

To run only specific test cases, add `only: true` to the objects within the valid/invalid arrays.
