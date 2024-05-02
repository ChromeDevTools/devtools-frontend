# The DevTools build system

DevTools is built using the [GN build system](https://gn.googlesource.com/gn/) with some additional conventions and tools on top of it.

## Entrypoints and modules

To understand how DevTools is structured it is important to understand how DevTools defines **modules**.

The code base is split into a series of modules, where a module can be considered any folder containing source code. A module will also contain a file named identically to the folder, which is considered the module's **entrypoint**.

For example, these are all modules:

- `front_end/models/trace` (entrypoint `front_end/models/trace/trace.ts`)
- `front_end/panels/timeline` (entrypoint `front_end/panels/timeline/timeline.ts`)
- `front_end/core/platform` (entrypoint `front_end/core/platform/platform.ts`)

This naming strategy is a firm rule, there are no exceptions and **all new folders in the codebase must follow this**.

Entrypoints are used to export what is considered the public API of a module and thus is what other modules can depend on. If you have code that you only want to be available within one module, you can define it in that module and not expose it in the entrypoint.

## Depending on other modules

Let's imagine you are in `front_end/panels/timeline` and you need to depend on some code from `front_end/core/sdk`. When you need to depend on code from another module, you **must import and refer to that module via its entrypoint**:

```ts
// in front_end/panels/timeline/TimelinePanel.ts

// Good:
import * as SDK from '../../core/sdk/sdk.js';
const target = new SDK.Target.Target()

// Bad and will fail the ESLint check:
import {Target} from '../../core/sdk/Target.js';
const target = new Target();
```

You must **always** use the `import * as SDK` syntax to import the entire module:

```ts
// in front_end/panels/timeline/TimelinePanel.ts

// Good:
import * as SDK from '../../core/sdk/sdk.js';
const target = new SDK.Target.Target()

// Bad and will fail the ESLint check:
import {Target} from '../../core/sdk/sdk.js';
const target = new Target.Target();
```

Although this does cause references to be more verbose, it also aids in clarity as it is clear where a piece of code is coming from, and it is also important to enable build optimisations in DevTools release builds (see below).

Depending on this module in the source code requires you to update the relevant `BUILD.gn` with the dependency too, keeping the dependencies in sync between the TypeScript source code and the GN build system.

In the example above, because we are working in `front_end/panels/timeline/TimelinePanel.ts`, we need to update `front_end/panels/timeline/BUILD.gn`. Each folder (or "module") in DevTools will have a `BUILD.gn` file within it. Whenever you update the dependencies of a file, you must update the dependencies of the `BUILD.gn` file too. It will always be in the same directory as the file is.

When you load up a `BUILD.gn` file, you will see a section that calls `devtools_module`:

```gn
devtools_module("timeline") {
  sources = [
    # more files listed, omitted to save space!
    "TimelinePanel.ts",
    "TimelineSelection.ts",
    # more files listed, omitted to save space!
  ]

  deps = [
    # more deps listed in reality, omitted to save space!
    "../../core/host:bundle",
  ]
}
```

Within the `devtools_module` we list all the source files - a list of every TypeScript file that is in this directory - and ensure that any dependencies are listed in the `deps` section. Because we just added an import to `../../core/sdk/sdk.ts`, we need to update the `deps` entry accordingly:

```gn
devtools_module("timeline") {
  sources = [...] # omitted

  deps = [
    "../../core/host:bundle",
    "../../core/sdk:bundle", # <--- this line added
  ]
}
```

Rather than reference the full path to the file we have imported, we use the folder's path, and add `:bundle` to the end. We do this to tell the build system that we are depending on the **entrypoint** of the `SDK` module.


## Entrypoints and modules

If you look at any `BUILD.gn` file, you will see that they always consist of at least two sections (and likely more):

```gn
# front_end/panels/timeline/BUILD.gn

devtools_module("timeline") {
  sources = [
    "AnimationsTrackAppender.ts",
    # omitted...
  ]

  deps = [
    "../../core/host:bundle",
    # omitted...
  ]
}

devtools_entrypoint("bundle") {
  entrypoint = "timeline.ts"

  deps = [
    ":timeline",
    # omitted...
  ]

  # more omitted here that isn't important for this example :)
}
```

As discussed earlier, each module consists of a series of source files, one of which is the **entrypoint**. The entrypoint is identified by being named identically to the folder.

When we depend on modules, we are depending on the entrypoint. In the build system, each entrypoint (defined using `devtools_entrypoint`) is named `bundle`. This is why when we depend on modules, we depend on `core/sdk:bundle`.

In a `BUILD.gn` file, any dependency that starts with a colon is a dependency to another target within the same `BUILD.gn` file. Notice here that the entrypoint depends on `:timeline`, which is the `devtools_module` target which lists all the other source files and dependencies that the module has.

> The [GN quick start guide](https://gn.googlesource.com/gn/+/main/docs/quick_start.md) explains some of the basic syntax in more detail.

## Debug and production builds

The reason behind the naming of `devtools_entrypoint` and why every entrypoint is always named `bundle` is due to how we build DevTools for production builds.

In a development build, each file is compiled by TypeScript and outputted into the build directory (you can look at the contents of `out/Default/gen` after doing a build to see this).

In production, to make our bundle smaller and reduce the amount of files that are loaded, we roll the modules up into one single file. In a release build, each entry point (e.g. `front_end/panels/timeline/timeline.ts`) is built to contain all of the code from that module. None of the other files are kept - their contents are placed into the entrypoint file.

## Depending on files that are in the same module

Let's imagine you are in `front_end/panels/timeline/TimelinePanel.ts` and you want to use some code that is defined in `front_end/panels/timeline/SaveFileFormatter.ts`. You can import items directly:

```ts
// in front_end/panels/timeline/TimelinePanel.ts

import {SaveFileFormatter} from './SaveFileFormatter.js';
```

And you do not have to make any changes to the `BUILD.gn`. The build system builds a representation of all the modules in our codebase and the dependencies between them; it does not need to know about dependencies across files in the same module.

## Listing all files in DevTools: GRD file generation

To make sure that files are loaded in Chromium, DevTools generates a GRD file that includes all files that are allowed to be loaded by the backend.

We ship DevTools in the Chromium binary as a compressed archive of DevTools' build output (concretely a brotli-compressed GRIT file). We need to tell Chromium which files to include in the archive.

We could do this automatically by looking at the build rules and targets (`devtools_entrypoint`/`devtools_module`), but that runs the risk of unintentionally including files in the final archive and shipping too much. At the same time we might add new files to build rules incorrectly and not ship them at all by mistake.

For the above reasons (shipping exactly what we intend), we maintain a manual list of all the files that are cross-checked against the list of files GN thinks we should pack into the final archive.

If you are adding a new file to the codebase, you must update this file else you will get errors when building.

### Entrypoints

All entrypoints are listed in `grd_files_release_sources` specified in `/config/gni/devtools_grd_files.gni`. If you create a new module and thus a new entrypoint, you must add it to this list.

> Rule: in both release and debug builds, entrypoints are always included in the GRD file.

### Module implementation files

All implementation files for components are listed in `grd_files_debug_sources` specified in `/config/gni/devtools_grd_files.gni`. If you create a new file within a module, you must add it to this list.

> Rule: the implementation files are only present in the GRD file in a debug build, because the release build bundles all files into the respective entrypoint.

# Implementing DevTools build system templates

Note: this section is useful only if you want to implement custom build templates. If you want help on using the existing templates and build system, this is not the section for you.

The DevTools build system contains several templates to integrate files in the build system.
Below you can find an overview of which template/combination of templates you need to use and when.

## General guidance

Whenever you are implementing a template, take into account that GN expects the source folder structure to be [mirrored](https://chromium.googlesource.com/chromium/src/+/HEAD/build/docs/writing_gn_templates.md#where-to-place-outputs) in the out-directory.
Historically, DevTools used the location-agnostic [`out/Default/resources/inspector`](https://groups.google.com/a/chromium.org/g/devtools-dev/c/BENZ8ZTW0Ls/m/W7BhAvOzBAAJ) folder, but we have since adopted the GN guidelines for mirroring our source folder.
Primary motivations are the instability of the separate folder, as well as required hacks to compute "relative" sub-folders in GN.
Since GN has no notion of a "root" folder for DevTools, computation of sub-folders can only be done based on heuristics, which will fail sooner rather than later.

Additionally, GN is a [timestamp-based build system](https://gn.googlesource.com/gn/+/master/docs/reference.md#target-declarations-action_declare-a-target-that-runs-a-script-a-single-time-outputs) when checking for correctness.
This means that you want to avoid writing to the file system if the content stays the same.
For Node scripts, use the `writeIfChanged` function from [write-if-changed.js](./write-if-changed.js) to integrate nicely with GN.

