# Make sure a cookie is using the SameParty attribute correctly

Setting cross-site cookies with the `SameParty` attribute is only possible if
both domains are a part of the same First-Party Set.

To allow setting cross-site cookies, try one of the following:
* If the domains satisfy the First-Party Set criteria, add them to the same First-Party Set.
* If the domains don't satisfy the First-Party Set criteria, remove the `SameParty` attribute and specify `SameSite=None`.

If you don't have the option to do any of the above, cookies are not intended to be set in cross-site contexts.
