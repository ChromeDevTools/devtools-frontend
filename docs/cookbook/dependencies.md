# Dependencies

[TOC]

## Managing dependencies

If you need to manually roll a git dependency, it's not sufficient to update the
revision in the DEPS file. Instead, use the gclient tool: `bash gclient setdep
-r DEP@REV # for example build@afe0125ef9e10b400d9ec145aa18fca932369346` This
will simultaneously update both the DEPS entry as well as the gitlink entry for
the corresponding git submodule.

To sync dependencies from Chromium to DevTools frontend, use
`scripts/deps/roll_deps.py`. Note that this may: - Introduce unneeded
whitespace/formatting changes. Presubmit scripts (e.g. invoked via `git cl
upload`) will automatically fix these locally, so just apply the changes
directly to your change (e.g. with `git commit --amend`) afterwards. - Introduce
breaking changes to the devtools protocol, causing compilation failures.
Unfortunately these need to be handled manually as there are some changes (e.g.
removing an enum value) that cannot fail gracefully.

The following scripts run as AutoRollers, but can be manually invoked if
desired:

-   To roll the `HEAD` commit of DevTools frontend into Chromium, use
    `scripts/deps/roll_to_chromium.py`.
-   To update DevTools frontend's DEPS, use `roll-dep`.

## Third-party Guidelines

When you want to integrate or use third-party content in DevTools, there are a
couple of different ways to do so. Most of the time, we have to make a
distinction between "third-party code we use as part of DevTools implementation"
and "third-party code we use to build DevTools itself, but is not included in
the product".

### Third-party code included in DevTools bundle

All third-party content that you want to ship as part of the DevTools bundle
must be included in `front_end/third_party`. The typical way to update these
packages is to download the relevant packages from [npm]. Since DevTools does
not use a `package.json` to handle its dependencies (to make it possible to
review third-party changes by legal), most packages bundles are fetched with
`wget`.

For all these packages, the [Chromium third-party guidelines] apply.

Since DevTools ships as part of the Chrome binary, bundle size limitations
apply. To make integration feasible, focus on small packages that (preferably)
have no dependencies. This will make licensing checks feasible for Chromium
reviewers and typically avoids inflating the bundle size.

### Third-party tooling packages

For all third-party packages that are used either as part of the DevTools build
process or to augment engineers workflows (for example linters), we add them to
`scripts/deps/manage_node_deps.py`. This Python script has been approved by
Chromium licensing to be used, on the basis that it enforces all packages have a
license that is compatible with a set of pre-defined licensees.

If you want to use a new package as tooling process in engineer workflows, you
can add the package to the `package.json` and run `npm run install-deps` to
check in the new contents.

Only add new license types to `LICENSES` after you received approval from
`opensource-licensing@google.com`. Their response time is typically within 24
hours, so this typically is not a big hurdle.

To avoid excessive package updates, it is typically easiest to update all
packages in `manage_node_deps.py` once a month. Since NPM packages can have a
lot of (shared) transitive dependencies, updating the packages on a specific day
increases the chances that shared dependencies are deduplicated and thus result
in smaller repository sizes.

> **WARNING:** Updating tools such as Rollup and TypeScript will cause all build
> cache output to be purged, as they are part of all DevTools modules. Whenever
> you are updating either of these tools, update these at the end of a working
> day to avoid full rebuilds for other engineers.

### Chromium third-party DEPS

Some packages related to infrastructure are maintained by Chromium infra teams.
These packages are typically uploaded to cloud storage buckets or are explicitly
mirrored to a repository on https://chromium.googlesource.com. Examples include
[GN][] (Chromium/DevTools build system) or [clang-format][] (multi-language
formatter).

The packages in `DEPS` are typically kept automatically up-to-date with
autorollers. These autorollers will periodically update packages, which
engineers can fetch with running `gclient sync`.

These `DEPS` are checked out on all bots, which includes Chromium and
DevTools-specific bots. To avoid excessive network bandwidth usage, by default
do not check out packages if they are only used in specific situations.

Only include packages that are maintained by Chromium infrastructure teams and
are used to build DevTools in `DEPS`. For packages that are DevTools-specific,
prefer adding them to `scripts/deps/manage_node_deps.py` instead.

[npm]: https://www.npmjs.com/
[Chromium third-party guidelines]: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/adding_to_third_party.md
[GN]: https://gn.googlesource.com/gn/+/master/docs/reference.md
[clang-format]: https://clang.llvm.org/docs/ClangFormat.html
