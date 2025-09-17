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

Some of the filters currently in use are:

- `cpp_debug_extension` builders only trigger on changes related to the extension
- `dtf_check_no_bundle` builder only trigger on GN changes
- all other builders will not trigger if only documentation files are updated

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
- regenerate the cfg files (`lucicfg main.star`), commit, upload and add
  liviurau@chromium.org as reviewer (or another infra team member)

Changing these numbers will reconfigure the CI and CQ for [beta](https://ci.chromium.org/p/devtools-frontend/g/beta/console),
[stable](https://ci.chromium.org/p/devtools-frontend/g/stable/console) and
[extended](https://ci.chromium.org/p/devtools-frontend/g/extended/console) branches.
After landing the change the three branch consoles will get reset.

## Toggle tree closing behaviour on CI builders

Sometimes we might need to avoid a misbehaving builder closing the tree. Or maybe
we need to make a FYI builder a tree closer.

To do so find your builder buckets/ci.star file and toggle the
`notification_muted` property (defaults to False if not present). Setting the
property to True/False will remove/add the tree closer notifier for this builder.
Make sure you regenerated the cfg files and upload your changes. [Example](https://crrev.com/c/6903184).

## Toggle blocking behaviour of CQ builders

CQ builders come in 3 flavors:

- regular try builder: will always prevent a CL from landing when the builder
  fails
- includable builder: will run only if explicitly added to a CQ run and will
  prevent a CL from landing if the builder fails
- experimental builder: will run a percentage of the times it gets an
  opportunity run and will not block the CL from landing if the builder fails

To toggle this behaviour you need to edit `buckets/try.star` file ([example](https://crrev.com/c/6903181)):

- all builders must be enumerated in `cq_builders.devtools_builders` list
- to make a builder includable add it's name `cq_builders.includable_only_builders`
  list; remove it from the list to make it a regular builder
- to make a builder experimental add it's name `cq_builders.experiment_builders`
  dictionary together with the desired experiment rate percentage; remove it
  from the list to make it a regular builder

## Adding a new builder in CQ

To add a new try-builder edit the [try.start](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config/buckets/try.star) file to call one of the
existing functions that generate builder definitions:

- `try_builder` used for builder with recipes that do not orchestrate other
  builders:
  - build only builders (`dtf_check_no_bundle`)
  - chromium builders (`devtools_frontend_linux_blink_light_rel_fastbuild`)
- `try_pair` used for builders with orchestrating recipes (delegates to a
  compilator builder before delegating testing to swarming)

Alternatively define your own builder function and call it for the instances you
need (see `presubmit_builder` and `cpp_debug_extension_try`).

You will need add your new builder to the `cq_builders.devtools_builders` list.

To control the CL blocking behaviour of your builder see above.

To control if the builder should be not present in the CQ for branches, add your
builder to `cq_builders.chromium_builders` list.

## Adding a new builder in CI

To add a new try-builder edit the [ci.start](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config/buckets/ci.star) file to add a new
`builder_descriptor` to the `builders` of `generate_ci_configs` function call.

In your descriptor decide for the name of builder, the recipe, any other custom
properties you might need and for which configurations (consoles) to include
your builder (`ci` stands for the main waterfall console). [Example](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config/buckets/ci.star#:~:text=name%20%3D%20%22-,Linux,-Compile%20Debug%22%2C).

## Anatomy of a CQ build

In CQ the builders that get most attention are `dtf_*_rel` builders. These builders
run the devtools/trybot_tester recipe and are responsible with building DevTools
Frontend and running our tests.

Below is a detailed description of what happens in such a build:

- The recipe will perform the `bot_update` and `gclient runhooks` step where
  the tip-of-tree for devtools-frontend gets checked out, your changes get
  patched on top of it and dependencies get updated.
- The compilator bot get triggered (`initialization` step)
- We wait for the compilator bot to finish. This bot is responsible for
  the actual build of devtools-frontend.
  - It does a `bot_update` of its own
  - Generates the GN files (`gn` step)
  - Compiles (`compile`) the project
  - Reads the e2e_non_hosted test lists
  - Creates a CAS archive with project and the compilation output
  - Outputs the `compilator_properties`
- Once the compilator is done we read the `compilator_properties` to find
  - the `cas_digest` to be used when triggering tests on swarming
  - the `e2e_non_hosted_test_list` for sharding the e2e tests execution
- Write the e2e test list at the location where building would have written it
- The default test run phase starts at `Run tests` step:
  - We trigger all tests on swarming in parallel (`Trigger Tests`) substep.
    - For all types of tests we calculate the command we want to run on swarming
      and trigger a task with that command and the collected CAS digest
    - Before calculating the command for e2e test we read the test list and
      and split it in a number of shards. Each shard will have the allocated
      tests specified in the command.
  - We wait for all swarming task to complete
- Next we re-run the failed tests in attempt to exonerate their initial
  failures (`Flake exoneration attempt` step):
  - We query ResultDB for any tests that might have failed
  - We collect the failed test names and construct new commands to re-run
    them on new swarming tasks
  - We wait for all swarming task to complete
- Finally we will stress test the tests that were added/modified by the
  current CL in the `Detect flakes in new tests` step
  - Run `git diff` to determine which tests were added/modified
  - Construct the command to be run on swarming
  - Trigger and wait for the swarming tasks to finish
- Calculate the outcome of the builder:
  - fail the builder if tests failed in the default run and the exoneration
    run was unsuccessful
  - fail the builder if tests failed in the deflaking phase
  - otherwise report build as passing

### Common build failures

The first place where a build usually fails is on `bot_update` and this usually
happens because your changes cannot be applied on top of the current tip-of-tree.
Rebase your CL and solve any merge conflicts and this failure will go away.

Another common failure is a compilation failure. You can inspect the compilator
builder (`dtf_*_compiler_rel`) separately by following the link next to the
`compilator steps` step.

If you have too many tests failing in the default phase the exoneration phase
gets skipped.

A test might not get exonerated in your build even if your CL does not touch
anything related to it. The exoneration phase will re-run previously failing
tests a number of times and at any point the test passes the tests gets
exonerated. Therefore a test can have a recent history of getting exonerated
even if it consistently failed 4 times out of 5 runs for some time. Try to
correlate your failure with a luci-analysis report on this test and skip it
until the flakiness gets resolved.

## Luci Analysis configuration

[Luci Analysis](go/luci-analysis) is a tool that helps you understand the
impact of test failures.

You can find the DevTools configuration in [luci-analysis.cfg](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config/luci-analysis.cfg).

We configure the rules for test failure clustering based on _file_/_suite_ and
_testcase_ names.

A policy named `too-many-failures` is defined in the configuration with
activation/deactivation thresholds and a bug template to be used when creating
a new bug. The bugs will be automatically created in Buganizer on the configured
default component (or on the component specified in a `DIR_METADATA` file on the
ancestor path of the failing test file).

After updating the `luci-analysis.cfg` file make sure you run `lucicfg main.star` to
refresh the copy of this file in the `generated/` folder.

## Autorollers

### Rolling DevTools to Chromium

A [Skia autoroller](https://skia.googlesource.com/buildbot/+/main/autoroll/README.md)
is responsible for rolling DevTools to Chromium. Follow the links to inspect the
[status](https://autoroll.skia.org/r/devtools-frontend-chromium?tab=status) of
the roller.

To update the configuration you will need to clone the skia [repo](sso://skia/skia-autoroll-internal-config)
and modify the `skia-infra-public/devtools-frontend-chromium.cfg` file ([example](https://review.skia.org/1014616)).

### Rolling dependencies to DevTools

To roll all DevTool's dependencies we rely on the [Roll deps and chromium pin
into devtools-frontend](https://ci.chromium.org/ui/p/devtools-frontend/builders/ci-hp/Roll%20deps%20and%20chromium%20pin%20into%20devtools-frontend)
builder that runs on the [infra](https://ci.chromium.org/ui/p/devtools-frontend/g/infra/builders)
console.

The builder is scheduled to run every day at 05 and 14 hours. In the [recipe](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipes/devtools/auto_roll_incoming.py?q=file:recipes%2Fdevtools%2Fauto_roll_incoming.py)
that runs on this builder you can configure dependencies that you need excluded
from the rolls and reviewer emails. The recipe uses the V8's autorolling rolling
[module](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipe_modules/v8_auto_roller/api.py),
that offers support for trusted and untrusted dependencies ([regular](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipe_modules/v8_auto_roller/deps_handlers.py)), [CfT](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipe_modules/v8_auto_roller/chrome_handler.py) pin rolling, and [script based](https://source.chromium.org/chromium/infra/infra_superproject/+/main:build/recipes/recipe_modules/v8_auto_roller/script_handlers.py) special rolls.
