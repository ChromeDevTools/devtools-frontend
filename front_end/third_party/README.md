# third_party packages shipped as part of the DevTools `front_end/`

This directory contains all packages that are shipped in the DevTools `front_end/` bundle.
All third_party packages that are solely used for building DevTools should live in `//third_party` instead.
third_party packages included in this directory will be subject to additional security review and monitoring.

## Inclusion of new `front_end/third_party/` packages

If you would like to add a new third_party package to this directory, please perform the following steps:

1. Assess the increase in bundle size and make sure this is not too big.
This will be determined on a case-by-case basis, taking into account the portion of DevTools users that will take advantage of the new feature.
    1. To determine by how much the bundle size increases, build Chromium both with and without the additional package. Then compare the size of the DevTools bundles via `ls -l out/Default/gen/content/browser/devtools/devtools_resources.pak`.
    2. If you are unsure whether the size will be an issue, please email devtools-dev+third_party@chromium.org for guidance before opening any CL.
1. Obtain security review from chrome. You can read full guidance on this process [here](https://www.chromium.org/Home/chromium-security/security-reviews).
    1. Send an email to security@chromium.org with some context, the package you want to add and a link to a Design Doc or other documentation
    1. Add devtools-dev+security@ in the CC and start the title with `[DevTools]`.
    1. Note that all existing third_party packages in `front_end/` will be legacied in, but will receive post-inclusion security review.
1. Open a single CL with only the source of the third_party package and required Ninja build configuration.
    1. Add chromium-third-party@google.com as a reviewer. The `gwsq` bot will choose an appropriate reviewer for the CL.
    1. All existing Chromium third_party policies about documenting the code's context still apply.
    You can read the "Document the code's context" section [here](https://chromium.googlesource.com/chromium/src.git/+/main/docs/adding_to_third_party.md#document-the-code_s-context).
    1. You will be responsible for keeping the package up-to-date.
    As such, add yourself as OWNER.
    1. Wait for approval from both the security- and the third-party reviewer before landing the CL.
    Reviewers might not have +1 permission so approval could be an email or a comment on the CL.
    See below for more information on updating existing packages.
1. After the first CL has been submitted, open a follow-up CL with the implementation/usage of the new third_party package.

## Updating existing `front_end/third_party/` packages

Packages must be updated on a suitable cadence (preferably monthly or weekly).
Any breaking changes must be mitigated in a separate CL, before the package update CL is submitted.
If breaking changes can not be mitigated in isolation, assess the overall impact on codebase and notify devtools-dev@ about the upcoming breaking change.
That way, other code contributors are aware of potential merge conflicts and regression mitigations.

If the functionality of the package changed significantly in the update, you might have to obtain another security review.
Ask devtools-dev+security@ for guidance if you are unsure.
