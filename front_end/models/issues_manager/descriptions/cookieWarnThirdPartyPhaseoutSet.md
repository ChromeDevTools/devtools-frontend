# Cookie set in cross-site context will be blocked in future Chrome versions

In a future version of the browser, cookies marked with `SameSite=None; Secure` and not `Partitioned` will be blocked in cross-site context.
This behavior protects user data from cross-site tracking.

Please refer to the article linked to learn more about preparing your site to avoid potential breakage.
