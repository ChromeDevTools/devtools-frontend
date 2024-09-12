# Contributing changes to Chromium DevTools

See [Get the Code](../get_the_code.md) for details on how to checkout the code,
and [Design Documents](design.md) for information regarding our design process.
Also check out [Contributing to
Chromium](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md)
for general information how to contribute to any Chromium project (including
its developer tools).

[TOC]

## Creating a change

Check out the documentation about [creating a change in Chromium] and [uploading
a change for review in Chromium], what's said in there basically applies to the
`devtools-frontend` repository as well.

At least two committers need to have been involved in the CL (change list) either
as reviewer or author. See the [committers policy] for more information.

*** promo
**BEST PRACTICE:** Favor [Small CLs] whenever possible, because they are much
easier to review in general, easier to reason about, and less likely to introduce
bugs. Apply common sense however, and don't take this to the extreme for the
sake of making a CL as small as possible, for example when fixing a bug, land
the actual code change together with the test in one CL.
***

### Change descriptions

In a nutshell, optimize for meaningful CL (change list) descriptions:

- Provide information on what was changed and why.
- Provide before/after screenshots (if applicable).
- Provide relevant link to demo or example (if applicable).
- Provide link to design doc (if applicable).

Descriptions for CLs should comply with [Google's Best Practices for good CL
descriptions] and follow the [Chromium-specific CL description tips]. We strive
to have CL descriptions that properly capture both the **what** and the **why**
of the change and ideally make sense on their own:

-   A CL description is a public record of what change is being made and why it
    was made. It will become a permanent part of our version control history,
    and will possibly be read by hundreds of people other than your reviewers
    over the years.
-   Future developers will search for your CL based on its description. Someone
    in the future might be looking for your change because of a faint memory of
    its relevance but without the specifics handy. If all the important
    information is in the code and not the description, it's going to be a lot
    harder for them to locate your CL.

Descriptions should be formatted as follows:

```
[area] Summary of change (one line)

Longer description of change addressing as appropriate: why the change
is made, context if it is part of many changes, description of previous
behavior and newly introduced differences, etc.

Long lines should be wrapped to 72 columns for easier log message
viewing in terminals.

Bug: 123456
Fixed: 654321
Doc: design doc and/or PRD (go/, bit.ly/ or goo.gle/ short link)
Demo: URL of some demo (ideally on devtools-dbg-stories.netlify.app)
Before: URL of screenshot before change
After: URL or screenshot after change
```

The individual items here are as follows:

1.  The first line should be a short summary of **what** exactly changed with
    this CL. The `[area]` is optional, but strongly encouraged to give an
    immediate idea of what's affected (the most) by the change. For example if
    you fix a bug in the Sources panel, prefixing the first line with
    `[sources]` makes this clear.
1.  The description should briefly describe the motivation for the change when
    appropriate (the **why**) and then go into a detailed description of
    **what** was changed specifically and **how**. You may find yourself
    repeating some of the information that is already found in the product
    requirements or the design document, but that's fine, because the time
    saving later when trying to understand the impact of a CL can be
    significant, and also the PRD or DD can evolve and might no longer
    appropriately capture the **why** and the **what** for this particular CL.
1.  Every CL that lands has to have a `Bug: <ID>` or `Fixed: <ID>` line,
    referencing the relevant [crbug(s)](http://crbug.com).
    -   Since Chromium, DevTools, and V8 have migrated to Buganizer, there's no
        need to use an explicit tracker, and we **strongly discourage the use of
        any prefixes**, in particular `b:<ID>` or `b/<ID>` since that creates an
        internal link.
    -   It is possible under rare circumstances to use `Bug: none`, for example
        to fix typos or update documentation (outside of the scope of a
        project).
1.  Every CL that is part of a bigger project should reference a design document
    (DD) via the `Doc:` line. It might also reference a product requirements
    document (PRD) directly, but that should rarely be the case (instead the DD
    should include appropriate references to the PRD).

    For public docs, consider adding a `bit.ly/` or `goo.gle/` short link.

    **Googlers:** Don't forget to create the mandatory
    `go/chrome-devtools:<project-name>-design` short link. For internal docs,
    use only the `go/chrome-devtools:<project-name>-design` short link directly,
    for public docs, you can optionally list the `go/` link in addition to the
    `bit.ly` or `goo.gle` short link.
1.  The `Demo:`, `Before:`, and `After:` lines are primarily there to support
    the Developer Advocates and Tech Writers (see
    [go/help-document-devtools](http://go/help-document-devtools)).
    -   The `Demo:` should ideally be pushed to [ChromeDevTools/devtools-dbg-stories]
        and will thus be automatically available on [devtools-dbg-stories.netlify.app].
    -   For `Before:` and `After:` please link directly to hosted images
        (preferably PNGs); these links can be either public services (like
        [imgur.com](https://imgur.com)) or hosted internally (on
        [screen/](http://screen/)).

### Creating demos (for repros)

See the section about [Creating demos for crbugs](https://github.com/ChromeDevTools/devtools-dbg-stories#creating-demos-for-crbugs)
and check out the [README](https://github.com/ChromeDevTools/devtools-dbg-stories#readme) for more information about non-trivial test
cases and the like.

## Merges and cherry-picks

_Merge request/approval is handled by Chromium Release Managers. DevTools follows [Chromium's merge criteria](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/process/merge_request.md#merge-criteria-phases). In exceptional cases please get in touch with hablich@chromium.org._

Step-by-step guide on how to merge:

1. Request approval to merge by adding the milestone to the `Merge-Request` filed of the relevant crbug. A bot will come by and either ask for more info ([example](http://crbug.com/1123307#c1)) or approve the request.
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


  [creating a change in Chromium]: https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#creating-a-change
  [uploading a change for review in Chromium]: https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#uploading-a-change-for-review
  [committers policy]: https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/committers_policy.md
  [Small CLs]: https://google.github.io/eng-practices/review/developer/small-cls.html
  [Google's Best Practices for good CL descriptions]: https://google.github.io/eng-practices/review/developer/cl-descriptions.html
  [Chromium-specific CL description tips]: https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#Chromium_specific-description-tips
  [ChromeDevTools/devtools-dbg-stories]: https://github.com/ChromeDevTools/devtools-dbg-stories
  [devtools-dbg-stories.netlify.app]: https://devtools-dbg-stories.netlify.app
