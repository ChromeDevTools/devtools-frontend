---
name: devtools-module-merging
description: Workflow for merging a DevTools submodule into its parent module. Covers BUILD.gn consolidation and updating devtools_grd_files.gni.
---

# Workflow: Merging a DevTools Submodule into its Parent

This document outlines the process for merging a submodule (e.g., `panels/timeline/extensions`) into its parent module (e.g., `panels/timeline`) within the DevTools build system. The goal is to simplify the build configuration by consolidating `BUILD.gn` files while keeping the original source file directory structure.

## Prerequisites

You will need the following information:
-   **Parent Module Path:** The path to the directory containing the primary module.
-   **Child Module Path:** The path to the directory of the submodule to be merged.

## Workflow Steps

### 1. Analyze Build Configurations

Read the contents of the `BUILD.gn` file from both the child module and the parent module. Identify the following from the child's `BUILD.gn`:
-   The list of `sources` in the `devtools_module`.
-   The list of `deps` (dependencies) in the `devtools_module`.
-   The `entrypoint` for the `devtools_entrypoint("bundle")`.

### 2. Modify the Parent `BUILD.gn`

Edit the `BUILD.gn` file in the parent module's directory to incorporate the child module's configuration.

1.  **Add Child's Sources:** Append the list of `sources` from the child's `devtools_module` to the parent's `sources` list. Remember to maintain the relative path from the parent's directory (e.g., `extensions/ExtensionUI.ts`).
2.  **Merge Dependencies:** Add the `deps` from the child's `devtools_module` to the parent's `deps` list. Remove any duplicate entries.
3.  **Remove Child Bundle Dependency:** Delete the dependency on the child's bundle from the parent's `deps` list (e.g., remove `./extensions:bundle`).

### 3. Delete the Child `BUILD.gn`

Once the parent `BUILD.gn` is updated and contains all the necessary information, the child's `BUILD.gn` is no longer needed. Delete it.

```bash
rm <child_module_path>/BUILD.gn
```

### 4. Update `devtools_grd_files.gni`

The global `.gni` file that lists all resources needs to be updated to reflect that the child module is no longer a separate, bundled entrypoint.

1.  **Locate and Read the File:** Open `config/gni/devtools_grd_files.gni`.
2.  **Remove Bundled Source:** Find and remove the line for the child's bundled JavaScript file from the `grd_files_bundled_sources` list. This path usually corresponds to the child's `entrypoint`.
3.  **Add Unbundled Sources:** Add the paths to all of the child's original TypeScript source files (`.ts`) to the `grd_files_unbundled_sources` list.

---

## Example: Merging `panels/timeline/extensions` into `panels/timeline`

-   **Parent Module:** `panels/timeline`
-   **Child Module:** `panels/timeline/extensions`

### 1. `panels/timeline/BUILD.gn` Modification

**Before:**
```gni
devtools_module("timeline") {
  sources = [
    ...
    "UIDevtoolsUtils.ts",
  ]

  deps = [
    ...
    "./components:bundle",
    "./extensions:bundle",
    "./overlays:bundle",
    ...
  ]
}
```

**After:**
```gni
devtools_module("timeline") {
  sources = [
    ...
    "UIDevtoolsUtils.ts",
    "extensions/ExtensionUI.ts", # Added from child
  ]

  deps = [
    ...
    "./components:bundle",
    # "./extensions:bundle", # Removed
    "./overlays:bundle",
    ...
    # Dependencies from extensions/BUILD.gn are merged here
    "../../../ui/components/helpers:bundle",
    "../../../ui/components/render_coordinator:bundle",
    "../../../ui/legacy:bundle",
  ]
}
```

### 2. `panels/timeline/extensions/BUILD.gn` Deletion

```bash
rm front_end/panels/timeline/extensions/BUILD.gn
```

### 3. `config/gni/devtools_grd_files.gni` Modification

**Before:**
```gni
grd_files_bundled_sources = [
  ...
  "front_end/panels/timeline/components/components.js",
  "front_end/panels/timeline/extensions/extensions.js",
  "front_end/panels/timeline/overlays/overlays.js",
  ...
]

grd_files_unbundled_sources = [
  ...
  "front_end/panels/timeline/extensions/ExtensionUI.ts", # This might not have been present before
  ...
]
```

**After:**
```gni
grd_files_bundled_sources = [
  ...
  "front_end/panels/timeline/components/components.js",
  # "front_end/panels/timeline/extensions/extensions.js", # Removed
  "front_end/panels/timeline/overlays/overlays.js",
  ...
]

grd_files_unbundled_sources = [
  ...
  "front_end/panels/timeline/extensions/extensions.ts", # Added
  "front_end/panels/timeline/extensions/ExtensionUI.ts",   # Added
  ...
]
```

## Removing Barrel Files

After merging modules, you may still have remaining barrel files (e.g. `index.ts` or `extensions.ts` that just re-export other files). These should be removed to simplify the module structure.

Manually updating all imports that rely on these barrels can be tedious and error-prone. The tool [unbarrelify](https://github.com/webpro/unbarrelify) can automate this process. It analyzes your codebase and replaces imports from barrel files with direct imports from the source files.

**Usage:**
Follow the instructions in the [unbarrelify repository](https://github.com/webpro/unbarrelify) to install and run the tool on your project. This is highly recommended to complete the refactoring process efficiently.
