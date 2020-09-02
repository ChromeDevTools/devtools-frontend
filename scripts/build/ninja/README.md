# DevTools build system templates

The DevTools build system contains several templates to integrate files in the build system.
Below you can find an overview of which template/combination of templates you need to use and when.

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

### Legacy: Non-TypeScript entrypoints

Not all modules are currently typechecked only by TypeScript.
There are two other options, related to the legacy Closure Compiler.

#### Typescriptified modules (e.g. TypeScript + Closure Compiler)

Any module that is fully typescriptified (e.g. a JavaScript file that is typechecked by both TypeScript and Compiler Compiler) can be imported from both TypeScript modules and Closure Compile-checked modules.

> Rule: Any typescriptified module can never contain an entrypoint or source file in their implementation that is TypeScript-authored. In practice this rule comes down to: you can only have a TypeScript-authored implementation file if the corresponding entrypoint is also TypeScript-authored.

As such, the following layout is used for TypeScriptified modules:

```python
import("../../scripts/build/ninja/devtools_entrypoint.gni")
import("../../scripts/build/ninja/devtools_module.gni")

devtools_module("my_module") {
  sources = [
    "implementation_detail.js",
    "some_other_file.js",
  ]

  deps = [
    "../other_dependency:bundle",
  ]
}

devtools_entrypoint("bundle") {
  entrypoint = "my_module.js"

  deps = [
    ":my_module",
  ]
}
```

Here, both the entrypoint and the sources of the module are all JavaScript files.
All of these files are typechecked by Closure Compiler and TypeScript.

## GRD file generation

To make sure that files are loaded in Chromium, DevTools generates a GRD file that includes all files that are allowed to be loaded by the backend.
To generate the GRD, there are numerous variables that list all kinds of files.

### Entrypoints

All entrypoints are listed in `/devtools_module_entrypoints.gni`.

> Rule: in both release and debug builds, entrypoints are always included in the GRD file

> Rule: all entrypoints that are checked by TypeScript (this includes typescriptified entrypoints) or implicitly typechecked by TypeScript (e.g. `third_party` packages) are listed in `generated_typescript_entrypoint_sources`

> Rule: all entrypoints that are **only** checked by Closure Compiler and are not part of `devtools_entrypoint` or `devtools_pre_built` are listed in `devtools_module_entrypoint_sources`. This includes the `-legacy.js` files

### Module implementation files

All implementation files for components are listed in `/all_devtools_modules.gni`.

> Rule: the implementation files are only present in the GRD file in a debug build, because the release build bundles all files into the respective entrypoint

> Rule: all implementation files that are checked by TypeScript (this includes typescriptified implementaion files) or are copied with `devtools_pre_built` are listed in `all_typescript_module_sources`
