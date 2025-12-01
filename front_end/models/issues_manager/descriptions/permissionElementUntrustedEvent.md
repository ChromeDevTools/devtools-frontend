# Untrusted event

The "{PLACEHOLDER_Type}" element can only be activated by actual user clicks, not simulated ones.

To resolve this issue, do not use frameworks which simulate click events, (e.g. via `click()`) and do not prevent the `DOMActivate` event.

You can use the command line flag `--runtime-enabled-features=BypassPepcSecurityForTesting` to bypass this behavior for testing purposes.
