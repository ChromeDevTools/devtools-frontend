# Avoid internal APIs (`no-internal`)

This rule forbids the use of APIs that have been tagged as `@internal` in the documentation comments.

## Options

This rule accepts a single option which is an object with an `ignored` property. The property itself is an object; the keys are regular expressions and the values are either `"name"` or `"path"`.

If `"name"` is specified, any internal identifiers that match the regular expression are ignored. And if `"path"` is specified, any internal APIs in modules that match the regular expression are ignored.

```json
{
  "etc/no-internal": [
    "error",
    {
      "ignored": {
        "node_modules/some-path": "path",
        "^SomeName$": "name"
      }
    }
  ]
}
```

## Related to

- [`no-deprecated`](./no-deprecated.md)