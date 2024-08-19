# Custom ESLint rules for Chromium DevTools

The [`lib/` folder](./lib/) contains a set of [ESLint](https://eslint.org) rules
specific to Chromium DevTools. These rules are executed as part of the
```
npm run lint
```
command and implicitly via the [Presubmit checks](../../test/README.md#Presubmit-checks).

## Testing the rules

When writing a custom ESLint rule, place the logic into a file `lib/foo.js` and
add a corresponding test for the logic to `tests/foo_test.js`.

You can use
```
npm run eslint-test
```
to run the tests for the custom ESLint rules.
