# Infrastructure

Chromium DevTools has an infrastructure component that consists of
recipes that define how to build and test the frontend in CQ and CI
plus a set of rollers to automate dependency updates.

## Overview of the code

The configuration for the DevTools infrastructure is in the
[`infra/config`](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config)
branch. The recipes are located in the
[`chromium/tools/build`](https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main)
repository.

[Luci-config app](https://config.luci.app) is consuming the configuration from infra/config. You can force refresh from the app. DevTools configuration is located [here](https://chrome-internal.googlesource.com/infradata/config/+/master/configs/luci-config/projects.cfg).

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
git new-branch branch-name --upstream_current
```

- `buckets/try.star`: configurations for default try-jobs for a CL.
- `buckets/try-misc.star`: configurations for additional builders that
  can be manually added to CLs in Gerrit or via `git cl try`.
- `buckets/cpp_debugging_extension.star`: configurations for the C++
  debugging extension tests.
- `buckets/serving_app.star`: configurations for the DevTools server
  app.
- `buckets/ci.star`: configurations to run on the main branch after a CL
  is submitted also known as CI or Waterfall builders.
- `buckets/ci-hp.star`: configurations for the highly privileged
builders that rolls dependencies.

After you update a `.star` file, re-generate generated files using
`lucicfg main.star`.

These `.star` definitions roughly correspond to the CI console view
https://ci.chromium.org/ui/p/devtools-frontend.

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

## Updating test commands in the infrastructure

The DevTools recipes are defined in
[`chromium/tools/build`](https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main)
repository. Once a change is made there, the recipes are packaged
as a cipd package and the `infra/config` data defines how to fetch that
cipd package. The recipes are bundled by
https://ci.chromium.org/ui/p/chrome/builders/official.infra/recipe-bundler.

DevTools recipes live at
https://chromium.googlesource.com/chromium/tools/build/+/refs/heads/main/recipes/recipes/devtools/.

## Determining if a change needs to run tests

The
[`try.star`](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config/buckets/try.star)
file in the `infra/config` branch contains the logic that determines
which builders are needed to verify a CQ. See `custom_locationsfilters`
for the current logic.

## Branch cutting process

At the end of every release cycle Chromium will cut a new branch for the current release.

The branch cut process for DevTools is as simple as updating the beta, stable
and extended branch numbers in infra/config (example [CL](https://crrev.com/c/6850649)):
  - checkout infra/config branch
  - pull and create a new branch ([see](#Submitting an infra config change))
  - update the definitions.star file:
    - extended number gets updated every second release:
      - if the extended number is equal to the stable number, then update
        extended to the current beta number
      - otherwise update it to the current stable number
    - stable number updates to the current beta number
    - beta number updates to the Chromium beta brunch number ([see](https://chromiumdash.appspot.com/branches))
  - regenrate the cfg files (`lucicfg main.star`), commit, upload and add
    liviurau@chromium.org as reviewer (or another infra team member)

Changing these numbers will reconfigure the CI and CQ for [beta](https://ci.chromium.org/p/devtools-frontend/g/beta/console),
[stable](https://ci.chromium.org/p/devtools-frontend/g/stable/console) and
[extended](https://ci.chromium.org/p/devtools-frontend/g/extended/console) branches.
After landing the change the three branch consoles will get reset.

## Toggle tree closing behaviour on CI builders

Sometimes we might need to avoid a misbehaing builder closing the tree. Or maybe
we need to make a FYI builder a tree closer.

To do so find your builder buckets/ci.star file and toggle the
`notification_muted` property (defaults to False if not present). Setting the
property to True/False will remove/add the tree closer notifier for this builder.
Make sure you regenerated the cfg files and upload your changes. [Example](https://crrev.com/c/6903184).

## Toggle blocking behaviour of CQ builders

CQ builders come in 3 flavors:
  - regular try builder: will always prevent a CL from landing when the builder
    fails
  - includable builder: will run only if expecitly added to a CQ run and will
    prevent a CL from landing if the builder fails
  - experimental builder: will run a percentage of the times it gets an
    oppotunity run and will not block the CL from landing if the builder fails

To toggle this behaviour you need to edit `buckets/try.star` file ([example](https://crrev.com/c/6903181)):
  - all builders must be enumetated in `cq_builders.devtools_builders` list
  - to make a builder includable add it's name `cq_builders.includable_only_builders`
    list; remove it from the list to make it a regular builder
  - to make a builder experimental add it's name `cq_builders.experiment_builders`
    dictionary together with the desired experiment rate percentage; remove it
    from the list to make it a regular builder

## Controlling when a builder runs
// TODO

## Adding a new builder
// TODO

## Anatomy of a CQ build
// TODO
