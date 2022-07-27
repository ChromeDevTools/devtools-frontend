# Ensure that the `attribution-reporting` permission policy is enabled

This page tried to use the Attribution Reporting API but failed because the
`attribution-reporting` permission policy is not enabled.

This API is enabled by default in the top-level context and in same-origin
child frames, but must be explicitly opted-in for cross-origin frames. Add the
permission policy as follows:
`<iframe src="..." allow="attribution-reporting">`.
