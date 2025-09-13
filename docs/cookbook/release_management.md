# Release Management

## Merges and Cherry-Picks

The documentation on cherry-picks and merges (including backmerges and
backports) can be found in the
[Chromium DevTools Contribution Guidelines](../contributing/changes.md#Merges-and-cherry-picks).

## Versioning

There is no explicit versioning being done. At the time of writing no compelling
use case was found that would require version numbers. Commits are identified by
their commit hash, which should suffice for the projected future.

## What happens when Chromium cuts a new Canary branch

For each Chromium release branch, we create a mirror branch with the same name
on our repo. Rough outline:

1.  Chromium cuts a branch e.g. `3879`
1.  Bots create the `chromium/3879` branch on the `devtools-frontend` repo
1.  The end

## Handling of Beta/Stable branches

Generally speaking, Beta/Stable branches are the same as Canary branches.
However, there is a special waterfall that runs tests on the
[Beta](https://ci.chromium.org/p/devtools-frontend/g/beta/console) and
[Stable](https://ci.chromium.org/p/devtools-frontend/g/stable/console) branches.

To make this possible, whenever Chromium updates to a new major version, we
update the branch number in the
[`infra/config`](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/infra/config)
branch of `devtools-frontend`. Specifically, in `buckets/ci.start`, promote the
existing `beta` branch to the `stable` section and modify the `beta` section
with the corresponding branch number for the new Chromium milestone.

```python
generate_ci_configs(
    configurations = [
      ...
      config_section(
        name="beta",
        branch='refs/heads/chromium/4044',
      ),
      config_section(
        name="stable",
        branch='refs/heads/chromium/3987',
      ),
      ...
```

After editing the above mentioned file, run `lucicfg generate main.star` to have
the change propagated to the `*.cfg` files. Example:
[CL](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/2104476)

## Rolling/Integrating into Chromium

The
[Skia autoroller](https://skia.googlesource.com/buildbot/+/main/autoroll/README.md)
is used. The `devtools-frontend` auto-roller state can be seen and controlled
[here](https://autoroll.skia.org/r/devtools-frontend-chromium?tab=status).
