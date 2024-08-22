# Chromium DevTools Contribution Guide

[goo.gle/devtools-contribution-guide](https://goo.gle/devtools-contribution-guide)

This page assumes a working Chromium DevTools [checkout and build](../get_the_code.md).

1. [Design Documents](./design.md)
1. [Contributing changes](./changes.md)

## Legal stuff

All contributors must have valid Gerrit/Google accounts (which means you must
be [old enough to manage your own
account](https://support.google.com/accounts/answer/1350409)) and complete the
contributor license agreement.

For individual contributors, please complete the [Individual Contributor
License Agreement](https://cla.developers.google.com/about/google-individual?csw=1)] online. Corporate contributors must fill out the [Corporate Contributor License
Agreement](https://cla.developers.google.com/about/google-corporate?csw=1) and
send it to us as described on that page.

### First-time contributors

Add your or your organization's name and contact info to the [`AUTHORS`](./AUTHORS)
file for Chromium DevTools. Please include this as part of your first patch and
not as a separate standalone patch.

### External contributor checklist for reviewers

Before LGTMing a change from a non-`chromium.org` address, ensure that the
contribution can be accepted:

-   Definition: The "author" is the email address that owns the code review
    request on <https://chromium-review.googlesource.com>
-   Ensure the author is already listed in the [`AUTHORS`](./AUTHORS).
    In some cases, the author's company might have a wildcard rule
    (e.g. `*@google.com`).
-   If the author or their company is not listed, the CL should include a new
    [`AUTHORS`](./AUTHORS) entry.
    -    Ensure the new entry is reviewed by a reviewer who works for Google.
    -    Contributor License Agreement can be verified by Googlers at http://go/cla.
    -    If there is a corporate CLA for the author's company, it must list the
         person explicitly (or the list of authorized contributors must say
         something like "All employees"). If the author is not on their company's
         roster, do not accept the change.
