# Release Management

## Merges and Cherry-Picks
The documentation on this can be found in the main [README.md](../README.md).

## Versioning
There is no explicit versioning being done. At the time of writing no compelling
use case was found that would require version numbers. Commits are identified by their commit hash, which should suffice for the projected future.

## What happens when Chromium cuts a new Canary branch

For each Chromium release branch, we create a mirror branch with the same name  on our repo. Rough
outline:

1. Chromium cuts a branch e.g. 3879
1. Bots create Chromium/3879 branch on the DevTools frontend repo
1. The end

## Handling of Beta/Stable branches
Generally speaking, beta/stable branches are the same as Canary branches. There
is a special waterfall though, that runs tests on the beta/stable branches.

Todo: mention what needs to be done when Chromium updates to a new major version

## Rolling/Integrating into Chromium

The [Skia
autoroller](https://skia.googlesource.com/buildbot/+/master/autoroll/README.md) is used. The DevTools-Frontend auto-roller state can be seen and controlled [here](https://autoroll.skia.org/r/devtools-frontend-chromium?tab=status).

