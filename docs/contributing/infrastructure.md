# Infrastructure

Chromium DevTools has an infrastructure component that consists of
recipes that define how to build and test the frontend in CQ and CI
plus a set of rollers to automate dependency updates.

## Overview of the code

TODO(b/428881540): how is the infra code structured and what is where.

The configuration for the DevTools infrastructure is in the
`infra/config` branch. The recipes are located in the
[`chromium/tools/build`](https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main)
repository.

## Checking out the infra config branch

```bash
mkdir devtools-infra
cd devtools-infra
fetch devtools-frontend
cd devtools-frontend
git checkout infra/config
```

Run `git clean -fd` and remove the rest of the remaining files from the `main`
branch.

## Submitting an infra config change

First, create a branch for the change and set upstream to the `infra/config`:

```bash
git newbranch branch-name --upstream-current
```

Run `git cl upload`. Infra changes are submitted similar to the regular
frontend CLs using `git cl upload`. After a review on Gerrit, the change
will be merged into the infra branch.

Note that the changes made in the CL are not picked up by the bots before the
change is merged. After the CL is merged, the change will be deployed to the
bots.

## Submitting a recipe change

Follow the instructions at
https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main/recipes/README.md
and upload a CL for
[`chromium/tools/build`](https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main).

- `buckets/try.star`: configurations for default try-jobs for a CL.
- `buckets/try-misc.star`: configurations for additional builders that can be manually added to CLs in Gerrit or via `git cl try`.
- `buckets/cpp_debugging_extension.star`: configurations for the C++ debugging extension tests.
- `buckets/serving_app.star`: configurations for the DevTools server app.
- `buckets/ci.star`: configurations to run on the main branch after a CL is submitted also known as CI or Waterfall builders.
- `buckets/ci-hp.star`: configurations for the highly privileged builders that
rolls dependencies.

After you update a `.star` file, re-generate generated files using `lucicfg main.star`.

These `.star` definitions roughly correspond to the CI console view https://ci.chromium.org/ui/p/devtools-frontend.

## Updating test commands in the infrastructure

TODO(b/428881540): where are the test commands that infra invokes in the repo defined.

## Determining if a change needs to run tests

TODO(b/428881540): how to update the configuration so that some
directories/file types do not trigger all testing bots in CQ.
