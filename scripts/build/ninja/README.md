# DevTools build system templates

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

## Entrypoints and modules

The buildsystem has a concept of "entrypoints" and "modules".
An entrypoint is a file that exports all symbols that are considered the public API of that particular component.
For example, `front_end/common/` exposes its public API in `front_end/common/common.js`.
Therefore, the `common.js` file is considered the entrypoint.

> Rule: all entrypoints use the same name in their filename as the name of the folder.

All other files in a particular component are considered implementation details and therefore part of the "module".

> Rule: an entrypoint only exports symbols that are considered the public API of that component.
The public API includes functions/classes/etc... that are intended to be used by other modules

For example, for `front_end/common/`:
1. The entrypoint is `front_end/common/common.ts`
2. All other files such as `front_end/common/implementation_detail.ts` are part of the "module"

## `devtools_entrypoint` and `devtools_module`

The two templates `devtools_entrypoint` and `devtools_module` implement the respective roles of entrypoints/modules.
The `devtools_entrypoint` includes an `entrypoint`, which is the entrypoint filename.
The `devtools_module` contains a list of files that are considered the implementation of the component.

Example file for `front_end/my_module/BUILD.gn`:

```python
import("../../scripts/build/ninja/devtools_entrypoint.gni")
import("../../scripts/build/ninja/devtools_module.gni")

devtools_module("my_module") {
  sources = [
    "implementation_detail.ts",
    "some_other_file.ts",
  ]

  deps = [
    "../other_dependency:bundle",
  ]
}

devtools_entrypoint("bundle") {
  entrypoint = "my_module.ts"

  deps = [
    ":my_module",
  ]
}
```

> Rule: `devtools_module` is named the same name as the folder it resides in

> Rule: `devtools_entrypoints` is named "bundle", as in a release build it bundles with Rollup

## GRD file generation

To make sure that files are loaded in Chromium, DevTools generates a GRD file that includes all files that are allowed to be loaded by the backend.
To generate the GRD, there are numerous variables that list all kinds of files.

### Entrypoints

All entrypoints are listed in `grd_files_release_sources` specified in `/config/gni/devtools_grd_files.gni`.

> Rule: in both release and debug builds, entrypoints are always included in the GRD file

### Module implementation files

All implementation files for components are listed in `grd_files_debug_sources` specified in `/config/gni/devtools_grd_files.gni`.

> Rule: the implementation files are only present in the GRD file in a debug build, because the release build bundles all files into the respective entrypoint
