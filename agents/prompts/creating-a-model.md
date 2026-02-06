# Creating or Migrating a Model in DevTools

This guide outlines the standard procedure for creating a new model or migrating an existing one to `front_end/models/`.

## 0. Preparation (Before you start)
*   **Baseline:** Run existing tests for the code you are moving to ensure they pass *before* you touch anything.
    *   `npm run test -- front_end/<old_location>`
*   **Impact Analysis:** Search for usages of the class/file to understand the scope of refactoring.
    *   `grep -r "ClassName" front_end/`

## 1. File Structure
*   **Location:** `front_end/models/<model_name>/` (must be lowercase).
*   **Entrypoint:** Create a barrel file `front_end/models/<model_name>/<model_name>.ts` that exports the model's public API.
*   **Implementation:** The actual logic goes in `<ClassName>.ts`.
*   **Tests:** Unit tests go in `<ClassName>.test.ts` alongside the implementation.

## 2. Build Configuration (`BUILD.gn`)
Every model requires a `BUILD.gn` file in its directory with three specific targets:

1.  **`devtools_module("<model_name>")`**: Lists implementation source files (`sources`) and dependencies (`deps`).
    *   **Crucial:** Do NOT include the barrel file (`<model_name>.ts`) in `sources`.
2.  **`devtools_entrypoint("bundle")`**: Defines the barrel file (`entrypoint = "<model_name>.ts"`).
    *   **Crucial:** Must depend on the module target: `deps = [ ":<model_name>" ]`.
3.  **`ts_library("unittests")`**: Lists test files and test-only dependencies.
    *   **Crucial:** Must depend on the bundle: `deps = [ ":bundle" ]`.

## 3. Global Registration (Crucial)
The build system does not auto-detect new modules. You must manually register them in **`config/gni/devtools_grd_files.gni`**:

*   **Bundled (Release) Build:** Add the new barrel file path (e.g., `front_end/models/<model_name>/<model_name>.js`) to the `grd_files_bundled_sources` list.
*   **Unbundled (Debug) Build:** Add all other implementation files (e.g., `front_end/models/<model_name>/<ClassName>.js`) to the `grd_files_unbundled_sources` list.
*   **Test Runner:** Add the new model's unittest target (e.g., `models/<model_name>:unittests`) to the `deps` list in **`front_end/BUILD.gn`**.

## 4. Refactoring Imports & Exports
*   **Consumers:** Update all files importing the model to use the new entrypoint:
    `import * as ModelName from '../../models/<model_name>/<model_name>.js';`
*   **Old Barrel File (Migration only):** If moving a file, **remove** its export from the original directory's barrel file (e.g., `front_end/panels/elements/elements.ts`).
*   **Internal Imports:** Files *within* the model directory must import each other via relative paths (e.g., `./OtherClass.js`), **never** via the model's own barrel file.

## 5. Verification Checklist
1.  **Build:** `autoninja -C out/Default` (Ensures BUILD.gn and GRD files are correct).
2.  **Lint:** `npm run lint` (Checks style and formatting).
3.  **Test:**
    *   `npm run test -- front_end/models/<model_name>` (New tests).
    *   `npm run test -- front_end/<old_location>` (Regression check for previous owner).

## Common Pitfalls
*   **Circular Dependencies:** Occur when internal files import from the directory's own barrel file.
*   **Missing Tests:** Failing to add the target to `front_end/BUILD.gn` means tests exist but never run.
*   **Legacy Exports:** Forgetting to remove the class from the old location's `files` or `exports` allows old patterns to persist.
*   **Build Errors:** Including the barrel file in `devtools_module` sources causes duplicate definition errors.