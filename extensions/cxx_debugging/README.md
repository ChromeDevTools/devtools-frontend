# Chrome DevTools C/C++ Debugging Extension

This extension enables debugging capabilities in DevTools for C++ programs compiled to WebAssembly.

## Build the extension

**Note**: Currently, the extension supports only Linux builds.

Some of the extension's dependencies are not checked out by default together with `devtools-frontend`.
To enable the dependencies:

1. Set the `checkout_cxx_debugging_extension_deps` flag to `True` in your `.gclient` config.
   For example:

   ```python
   solutions = [
    {
      "name"        : "devtools-frontend",
      "url"         : "https://chromium.googlesource.com/devtools/devtools-frontend",
      "deps_file"   : "DEPS",
      "managed"     : True,
      "custom_deps" : {
      },
      "custom_vars": {
        "checkout_cxx_debugging_extension_deps": True
      },
    }
   ]
   ```

2. Make sure to update the dependencies. Run:

   ```bash
   gclient sync
   ```

3. Run the extension's two-stage build from the same directory:

   ```bash
   ./tools/bootstrap.py -debug ../../out
   ```

This creates two output directories in the `out` folder:

- `DevTools_CXX_Debugging.stage1` that contains some native binaries required for the second build stage.
- `DevTools_CXX_Debugging.stage2` that contains the built extension.

To get an overview of all available build options, run `./tools/bootstrap.py -help`.

## Run the extension

You can load the extension to Chrome directly from the DevTools repository root with the following command:

```bash
third_party/chrome/chrome-linux/chrome --load-extension=$PWD/out/DevTools_CXX_Debugging.stage2/src
```

## Unittests

The extension contains TypeScript and general front-end components, which are tested via
`karma`-based tests located in the `tests/` folder. They follow the `foo_test.ts` naming convention used in DevTools front-end.

These tests are automatically run by default by `tools/bootstrap.py` unless you pass the `-no-check`
argument there.

To explicitly execute them, run the `ninja check-extension` in the `stage2` output directory.

## E2e tests

There are e2e tests, found in the `e2e/` directory, which test the entire flow, from compiling a project with debug
symbols to running it in chrome and debugging it with devtools with the extension.

Running the e2e tests requires a special build which includes also building devtools-frontend and compiling the test
projects with emscripten. To do that, use:

```bash
./e2e/runner.py run --build-root ../../out/e2e --v -C
```

The -C argument is only necessary on the first run in order to fully compile everything once. Subsequently it can be
left out to run a little bit faster.
