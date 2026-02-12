# The `report-to` parameter in the `Connection-Allowlist` header is not a token.

If provided, the `report-to` parameter must be a [Token](sfToken)
naming a reporting endpoint.

For example:

```
Connection-Allowlist: ("https://example.com");report-to=endpoint
```
