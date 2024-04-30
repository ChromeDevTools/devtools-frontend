# Contributing changes to Chromium DevTools

See [Get the Code](get_the_code.md) for details on how to checkout the code, and [Chrome DevTools Design Review Guidelines](design_guidelines.md) for
information regarding our design process.

[TOC]

## Creating a change

Usual [steps](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#creating-a-change) for creating a change work out of the box, when executed in the DevTools frontend repository.

Tips to create meaningful CL descriptions:
- Provide information on what was changed and why
- Provide before/after screenshots (if applicable)
- Provide relevant link to demo or example (if applicable)
- Provide link to design doc (if applicable)

Example CL, adapted from [Chromium guidelines](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#uploading-a-change-for-review):

```
Summary of change (one line)

Longer description of change addressing as appropriate:
what change was made, why the change is made, context if
it is part of many changes, description of previous behavior
and newly introduced differences, etc.

Long lines should be wrapped to 72 columns for easier log message
viewing in terminals.

How to test:
  1. ..
  2. ..

Before:  https://page-to-before-screenshot.com/before
After:  https://page-to-after-screenshot.com/after
Bug: 123456

```
## Merges and cherry-picks

_Merge request/approval is handled by Chromium Release Managers. DevTools follows [Chromium's merge criteria](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/process/merge_request.md#merge-criteria-phases). In exceptional cases please get in touch with hablich@chromium.org._

Step-by-step guide on how to merge:

1. Request approval to merge by adding the `Merge-Request-XX` label to the relevant crbug. A bot will come by and either ask for more info ([example](https://bugs.chromium.org/p/chromium/issues/detail?id=1123307#c1)) or approve the request.
1. Backmerges are done to the `chromium/xxxx` (e.g. `chromium/3979`) branch on the DevTools frontend repo.
   Use <https://chromiumdash.appspot.com/branches> or [Omahaproxy](https://omahaproxy.appspot.com/)
   to find out what branch a major Chromium version has (column `true_branch`).
1. Open the to-be-merged commit in Gerrit
   ([example](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/1928912)).
1. Click the hamburger menu on the top right and select “Cherry pick”.
1. Select the branch to merge to e.g. `chromium/3968`.
1. The cherry-pick CL is created
   ([example](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/1928913)).
1. Get it reviewed if necessary.
1. Once merge request approval is granted (see step 1), click the hamburger menu on the cherry-pick CL and select “Submit”. (Setting the Commit-Queue bit (+2) has no effect because these branches don’t have a commit queue.)
1. Done.

### Merge conflicts

If the approach above causes conflicts that need resolving, you can use an alternative git workflow which allows you to resolve conflicts locally before uploading. This is very similar to the [chromium git merge steps](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/process/merge_request.md#using-git) but with different branch names. These steps will **create the cherry-pick CL via git**.

_It is suggested to use the Gerrit UI approach when possible, it is more straightforward and automated. Only use this approach if your cherry-pick causes conflicts._

For the commands below, replace `xxxx` with the Chromium branch number that you are merging into.

To set up your local environment run:

```
gclient sync --with_branch_heads
git fetch
git checkout -b BRANCH_NAME origin/chromium/xxxx
git cl upstream origin/chromium/xxxx
```

You can then cherry-pick your commit from the main branch:

```
git cherry-pick -x YOUR_COMMIT
```

You can then resolve any conflicts, run tests, build DevTools, etc, locally to verify everything is working. Then run `git cl upload` to upload the CL and get a review as normal.

**Make sure you remove the Change-ID: line** from the description to avoid issues when uploading the CL.

