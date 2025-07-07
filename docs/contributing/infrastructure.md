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

Infra changes are submitted similar to the regular frontend CLs using `git cl
upload`. After a review on Gerrit, the change will be merged into the infra
branch.

Note that the changes made in the CL are not picked up by the bots before the
change is merged. After the CL is merged, the change will be deployed to the
bots.

## Submitting a recipe change

Follow the instructions at
https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main/recipes/README.md
and upload a CL for
[`chromium/tools/build`](https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main).

## Updating test commands in the infrastructure

TODO(b/428881540): where are the test commands that infra invokes in the repo defined.

## Determining if a change needs to run tests

TODO(b/428881540): how to update the configuration so that some
directories/file types do not trigger all testing bots in CQ.
