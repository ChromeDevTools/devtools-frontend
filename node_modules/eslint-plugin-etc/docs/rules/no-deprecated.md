# Avoid deprecated APIs (`no-deprecated`)

This rule forbids the use of APIs that have been tagged as `@deprecated` in the documentation comments.

## Options

This rule accepts a single option which is an object with an `ignored` property. The property itself is an object; the keys are regular expressions and the values are either `"name"` or `"path"`.

If `"name"` is specified, any deprecated identifiers that match the regular expression are ignored. And if `"path"` is specified, any deprecated APIs in modules that match the regular expression are ignored.

```json
{
  "etc/no-deprecated": [
    "error",
    {
      "ignored": {
        "^SomeName$": "name",
        "node_modules/some-path": "path"
      }
    }
  ]
}
```

## Related to

- [`no-internal`](./no-internal.md)