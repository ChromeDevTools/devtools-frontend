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
`package.json`; `scripts/deps/manage_node_deps.py` installs them. This Python
script has been approved by Chromium licensing to be used, on the basis that it
enforces all packages have a license that is compatible with a set of
pre-defined licensees.

`node_modules/` is not checked into git. `gclient sync` downloads it as one
archive from `gs://chromium-nodejs/devtools-frontend/<sha256>`, pinned by the
`node_modules` entry in `DEPS`, the same way Chromium's WebUI toolchain and
chromium-bidi ship their npm dependencies. Local edits inside `node_modules/`
only last until the next `gclient sync` that changes the pin.

gclient decides whether to re-extract the archive from the stamp files it
keeps in `node_modules/`, not from the extracted tree. Checking out a revision
from before `node_modules/` left git restores the tracked tree over the
extracted one and leaves the stamps alone; checking out a later revision again
deletes the tracked files, and `gclient sync` would consider the now empty
directory up to date. The `ensure_node_modules` hook
(`scripts/deps/ensure_node_modules.py`) catches this and re-extracts the
archive that gclient leaves in `node_modules/node_modules.tar.gz`; if that
archive is missing, it removes the stamps and asks you to run `gclient sync`
once more.

To add or update a package:

1. Change the version in `package.json`.
2. Run `./dt install-deps`. It runs `npm install`, post-processes the tree,
   checks licenses, applies `scripts/deps/npm_exclude.txt`, verifies that
   every `node_modules/` path referenced from GN or Python build files still
   exists and writes a deterministic `out/node_modules.tar.gz` (sorted
   entries, zeroed timestamps and ownership: the same tree always has the
   same sha256).
3. Build and test against the new tree: `./dt build && ./dt test`.
4. Run `./dt install-deps --upload`. It uploads the archive (a no-op if the
   object exists) and updates `DEPS`. This needs write access to the bucket;
   otherwise ask an infra owner (`config/owner/INFRA_OWNERS`) to run it on
   your branch.
5. Upload the CL: `package.json`, `package-lock.json` and the `DEPS` change.
   Presubmit checks that these change together; add a
   `Skip-Node-Modules-Check: <reason>` footer for intentional exceptions.

Reviewers can rebuild the archive from the lockfile with `./dt install-deps`
and compare the printed sha256 with `DEPS`.

Only add new license types to `LICENSES` after you received approval from
`opensource-licensing@google.com`. Their response time is typically within 24
hours, so this typically is not a big hurdle.

To avoid excessive package updates, it is typically easiest to update all
packages once a month. Since NPM packages can have a lot of (shared) transitive
dependencies, updating the packages on a specific day increases the chances
that shared dependencies are deduplicated and thus result in a smaller archive.

#### The exclude list

`scripts/deps/npm_exclude.txt` holds rsync filter rules that drop files the
build and tests don't need (tests, docs, source maps, non-declaration
TypeScript sources, dotfiles, ...) before the archive is built. Keep rules come
first and the first matching rule wins. Stick to generic patterns: anything
package-specific must be measured and verified with a full build and test run,
because the reference check only knows about paths mentioned in GN and Python
files, not about what Node resolves at runtime.

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
