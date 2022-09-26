# Ensure that the `attribution-reporting` Permissions Policy is explicitly enabled

This page tried to use the Attribution Reporting API in a cross-origin frame
that did not receive a specific opt-in via Permissions Policy from its parent
frame.

For the initial testing of the Attribution Reporting API, it is not required
to opt-in cross-origin frames, but it will become necessary when the API
matures. Add the permission policy as follows:
`<iframe src="…" allow="attribution-reporting">`.

