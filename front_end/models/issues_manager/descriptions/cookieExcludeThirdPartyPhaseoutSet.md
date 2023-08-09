# Cookie is blocked when set in cross-site context.

Cookies marked with `SameSite=None; Secure` and not `Partitioned` are blocked in cross-site contexts.
This behavior protects user data from cross-site tracking.

Please refer to the article linked to learn more about preparing your site to avoid potential breakage due to this.